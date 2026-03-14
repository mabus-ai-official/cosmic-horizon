// Chain Reconciler — detects and reports discrepancies between DB and chain state
// Runs periodically or on-demand via admin API.
// Severity levels: INFO (expected lag), WARNING (>threshold mismatch), CRITICAL (missing asset)

import { type Address, parseAbi } from "viem";
import { publicClient } from "./client";
import { contractAddresses, resourceToToken } from "./addresses";
import { characterNftAbi, shipNftAbi } from "./abis";
import db from "../db/connection";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = "INFO" | "WARNING" | "CRITICAL";

export interface Discrepancy {
  playerId: string;
  field: string;
  dbValue: string;
  chainValue: string;
  severity: Severity;
  message: string;
}

export interface ReconcileResult {
  playerId: string;
  wallet: string;
  checkedAt: string;
  discrepancies: Discrepancy[];
  clean: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const parsedCharacterAbi = parseAbi(characterNftAbi);
const parsedShipAbi = parseAbi(shipNftAbi);

const TOKEN_ABI = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
]);

async function readTokenBalance(
  tokenAddr: Address,
  account: Address,
): Promise<bigint> {
  return publicClient.readContract({
    address: tokenAddr,
    abi: TOKEN_ABI,
    functionName: "balanceOf",
    args: [account],
  }) as Promise<bigint>;
}

// ---------------------------------------------------------------------------
// Per-player reconciliation
// ---------------------------------------------------------------------------

export async function reconcilePlayer(
  playerId: string,
): Promise<ReconcileResult> {
  const player = await db("players").where({ id: playerId }).first();
  if (!player) {
    return {
      playerId,
      wallet: "",
      checkedAt: new Date().toISOString(),
      discrepancies: [
        {
          playerId,
          field: "player",
          dbValue: "exists",
          chainValue: "not_found",
          severity: "CRITICAL",
          message: "Player not found in DB",
        },
      ],
      clean: false,
    };
  }

  const wallet = player.wallet_address as Address | null;
  if (!wallet) {
    return {
      playerId,
      wallet: "",
      checkedAt: new Date().toISOString(),
      discrepancies: [],
      clean: true, // No wallet = no chain state to reconcile
    };
  }

  const discrepancies: Discrepancy[] = [];

  // 1. Token balances
  for (const [resource, tokenAddr] of Object.entries(resourceToToken)) {
    try {
      const chainBalance = await readTokenBalance(tokenAddr as Address, wallet);
      // DB stores credits as a number on the players table
      const dbBalance =
        resource === "credits" ? BigInt(player.credits || 0) : 0n;

      if (resource === "credits" && chainBalance !== dbBalance) {
        const diff =
          chainBalance > dbBalance
            ? chainBalance - dbBalance
            : dbBalance - chainBalance;
        const pctDiff =
          dbBalance > 0n ? Number((diff * 100n) / dbBalance) : 100;

        discrepancies.push({
          playerId,
          field: `token:${resource}`,
          dbValue: dbBalance.toString(),
          chainValue: chainBalance.toString(),
          severity: pctDiff > 1 ? "WARNING" : "INFO",
          message: `${resource} balance mismatch: DB=${dbBalance} chain=${chainBalance} (${pctDiff}% diff)`,
        });
      }
    } catch {
      // Token might not be minted yet — skip
    }
  }

  // 2. Character NFT
  const charNftId = player.character_nft_id;
  if (charNftId != null) {
    try {
      const progression = await db("player_progression")
        .where({ player_id: playerId })
        .first();

      const charData = (await publicClient.readContract({
        address: contractAddresses.characterNft,
        abi: parsedCharacterAbi,
        functionName: "getCharacter",
        args: [BigInt(charNftId)],
      })) as { level: number; xp: bigint };

      if (progression) {
        if (Number(charData.level) !== progression.level) {
          discrepancies.push({
            playerId,
            field: "character:level",
            dbValue: String(progression.level),
            chainValue: String(charData.level),
            severity: "WARNING",
            message: `Level mismatch: DB=${progression.level} chain=${charData.level}`,
          });
        }
        if (Number(charData.xp) !== progression.xp) {
          const xpDiff = Math.abs(Number(charData.xp) - progression.xp);
          discrepancies.push({
            playerId,
            field: "character:xp",
            dbValue: String(progression.xp),
            chainValue: String(charData.xp),
            severity: xpDiff > 100 ? "WARNING" : "INFO",
            message: `XP mismatch: DB=${progression.xp} chain=${charData.xp}`,
          });
        }
      }
    } catch {
      discrepancies.push({
        playerId,
        field: "character:nft",
        dbValue: String(charNftId),
        chainValue: "not_found",
        severity: "CRITICAL",
        message: `CharacterNFT #${charNftId} not found on chain`,
      });
    }
  }

  // 3. Ships
  const ships = await db("ships")
    .where({ owner_id: playerId })
    .whereNotNull("chain_token_id")
    .select("id", "chain_token_id", "ship_type_id", "hull_hp");

  for (const ship of ships) {
    try {
      const owner = (await publicClient.readContract({
        address: contractAddresses.shipNft,
        abi: parsedShipAbi,
        functionName: "ownerOf",
        args: [BigInt(ship.chain_token_id)],
      })) as Address;

      if (owner.toLowerCase() !== wallet.toLowerCase()) {
        // Check if it's in their member contract
        const memberAddr = player.member_contract_address;
        if (!memberAddr || owner.toLowerCase() !== memberAddr.toLowerCase()) {
          discrepancies.push({
            playerId,
            field: `ship:${ship.id}:owner`,
            dbValue: wallet,
            chainValue: owner,
            severity: "CRITICAL",
            message: `Ship #${ship.chain_token_id} owned by ${owner} on chain, not player wallet or member contract`,
          });
        }
      }
    } catch {
      discrepancies.push({
        playerId,
        field: `ship:${ship.id}:existence`,
        dbValue: "exists",
        chainValue: "not_found",
        severity: "CRITICAL",
        message: `Ship NFT #${ship.chain_token_id} (DB ship ${ship.id}) not found on chain`,
      });
    }
  }

  return {
    playerId,
    wallet,
    checkedAt: new Date().toISOString(),
    discrepancies,
    clean: discrepancies.length === 0,
  };
}

// ---------------------------------------------------------------------------
// Batch reconciliation — all players with wallets
// ---------------------------------------------------------------------------

export async function reconcileAll(): Promise<{
  total: number;
  clean: number;
  withIssues: number;
  critical: number;
  results: ReconcileResult[];
}> {
  const players = await db("players")
    .whereNotNull("wallet_address")
    .select("id");

  const results: ReconcileResult[] = [];
  let critical = 0;

  for (const player of players) {
    try {
      const result = await reconcilePlayer(player.id);
      results.push(result);
      if (result.discrepancies.some((d) => d.severity === "CRITICAL")) {
        critical++;
      }
    } catch (err) {
      console.error(`[reconciler] Error reconciling player ${player.id}:`, err);
    }
  }

  const withIssues = results.filter((r) => !r.clean).length;

  console.log(
    `[reconciler] Reconciled ${results.length} players: ${results.length - withIssues} clean, ${withIssues} with issues, ${critical} critical`,
  );

  return {
    total: results.length,
    clean: results.length - withIssues,
    withIssues,
    critical,
    results,
  };
}

// ---------------------------------------------------------------------------
// Force sync — chain wins, overwrite DB
// ---------------------------------------------------------------------------

export async function forceSyncPlayer(playerId: string): Promise<{
  synced: string[];
  errors: string[];
}> {
  const player = await db("players").where({ id: playerId }).first();
  if (!player?.wallet_address) {
    return { synced: [], errors: ["Player has no wallet"] };
  }

  const wallet = player.wallet_address as Address;
  const synced: string[] = [];
  const errors: string[] = [];

  // Sync credit balance
  try {
    const chainBalance = await readTokenBalance(
      contractAddresses.credits as Address,
      wallet,
    );
    await db("players")
      .where({ id: playerId })
      .update({ credits: Number(chainBalance) });
    synced.push(`credits: ${chainBalance}`);
  } catch (err) {
    errors.push(`credits: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Sync character data
  const charNftId = player.character_nft_id;
  if (charNftId != null) {
    try {
      const charData = (await publicClient.readContract({
        address: contractAddresses.characterNft,
        abi: parsedCharacterAbi,
        functionName: "getCharacter",
        args: [BigInt(charNftId)],
      })) as {
        level: number;
        xp: bigint;
        totalCombatXp: bigint;
        totalMissionXp: bigint;
        totalTradeXp: bigint;
        totalExploreXp: bigint;
      };

      await db("player_progression")
        .where({ player_id: playerId })
        .update({
          level: charData.level,
          xp: Number(charData.xp),
          total_combat_xp: Number(charData.totalCombatXp),
          total_mission_xp: Number(charData.totalMissionXp),
          total_trade_xp: Number(charData.totalTradeXp),
          total_explore_xp: Number(charData.totalExploreXp),
        });
      synced.push(`character: level=${charData.level} xp=${charData.xp}`);
    } catch (err) {
      errors.push(
        `character: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { synced, errors };
}
