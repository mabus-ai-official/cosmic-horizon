// Chain Event Indexer — watches all deployed contracts for events and syncs to DB
// Turns on-chain state changes into DB rows for fast game queries.
// The DB is the read layer; the chain is the source of truth for assets.

import {
  type Address,
  type Log,
  parseAbiItem,
  decodeEventLog,
  parseAbi,
  toEventSelector,
} from "viem";
import { publicClient } from "./client";
import { contractAddresses } from "./addresses";
import { shipNftAbi, characterNftAbi, syndicateFactoryAbi } from "./abis";
import db from "../db/connection";

// ---------------------------------------------------------------------------
// Parsed event signatures for decoding
// ---------------------------------------------------------------------------

const EVENTS = {
  memberRegistered: parseAbiItem(
    "event MemberRegistered(address indexed player, address indexed memberContract)",
  ),
  characterMinted: parseAbiItem(
    "event CharacterMinted(uint256 indexed tokenId, address indexed owner, string race)",
  ),
  characterUpdated: parseAbiItem(
    "event CharacterUpdated(uint256 indexed tokenId)",
  ),
  factionRepUpdated: parseAbiItem(
    "event FactionRepUpdated(uint256 indexed tokenId, bytes32 indexed factionId, int64 rep)",
  ),
  shipMinted: parseAbiItem(
    "event ShipMinted(uint256 indexed tokenId, address indexed owner, string shipType)",
  ),
  shipDestroyed: parseAbiItem("event ShipDestroyed(uint256 indexed tokenId)"),
  shipUpdated: parseAbiItem("event ShipUpdated(uint256 indexed tokenId)"),
  equipmentMinted: parseAbiItem(
    "event EquipmentMinted(uint256 indexed tokenId, address indexed owner, string equipType)",
  ),
  equipmentInstalled: parseAbiItem(
    "event EquipmentInstalled(uint256 indexed tokenId, uint256 indexed shipId)",
  ),
  tokenTransfer: parseAbiItem(
    "event Transfer(address indexed from, address indexed to, uint256 value)",
  ),
  actionExecuted: parseAbiItem(
    "event ActionExecuted(bytes32 indexed actionType, uint256 logIndex)",
  ),
  syndicateCreated: parseAbiItem(
    "event SyndicateCreated(uint256 indexed index, string name, address indexed founder, address token, address treasury, address governor)",
  ),
  syndicateMemberAdded: parseAbiItem(
    "event MemberAdded(uint256 indexed syndicateIndex, address indexed member)",
  ),
  syndicateMemberRemoved: parseAbiItem(
    "event MemberRemoved(uint256 indexed syndicateIndex, address indexed member)",
  ),
} as const;

// Precompute event selectors (topic0) for routing
const SELECTORS = {
  characterMinted: toEventSelector(EVENTS.characterMinted),
  characterUpdated: toEventSelector(EVENTS.characterUpdated),
  factionRepUpdated: toEventSelector(EVENTS.factionRepUpdated),
  shipMinted: toEventSelector(EVENTS.shipMinted),
  shipDestroyed: toEventSelector(EVENTS.shipDestroyed),
  shipUpdated: toEventSelector(EVENTS.shipUpdated),
  equipmentMinted: toEventSelector(EVENTS.equipmentMinted),
  memberRegistered: toEventSelector(EVENTS.memberRegistered),
  equipmentInstalled: toEventSelector(EVENTS.equipmentInstalled),
  syndicateCreated: toEventSelector(EVENTS.syndicateCreated),
  syndicateMemberAdded: toEventSelector(EVENTS.syndicateMemberAdded),
  syndicateMemberRemoved: toEventSelector(EVENTS.syndicateMemberRemoved),
} as const;

// ---------------------------------------------------------------------------
// Indexer state management
// ---------------------------------------------------------------------------

async function getLastSyncedBlock(contractName: string): Promise<bigint> {
  const row = await db("indexer_state")
    .where({ contract_name: contractName })
    .first();
  return row ? BigInt(row.last_synced_block) : 0n;
}

async function setLastSyncedBlock(
  contractName: string,
  blockNumber: bigint,
): Promise<void> {
  const exists = await db("indexer_state")
    .where({ contract_name: contractName })
    .first();
  if (exists) {
    await db("indexer_state")
      .where({ contract_name: contractName })
      .update({
        last_synced_block: Number(blockNumber),
        updated_at: db.fn.now(),
      });
  } else {
    await db("indexer_state").insert({
      contract_name: contractName,
      last_synced_block: Number(blockNumber),
    });
  }
}

// ---------------------------------------------------------------------------
// Event handlers — each processes one event type and upserts DB rows
// ---------------------------------------------------------------------------

async function handleMemberRegistered(log: Log): Promise<void> {
  const decoded = decodeEventLog({
    abi: [EVENTS.memberRegistered],
    data: log.data,
    topics: log.topics,
  });
  const { player, memberContract } = decoded.args as {
    player: Address;
    memberContract: Address;
  };

  const updated = await db("players")
    .whereRaw("LOWER(wallet_address) = ?", [player.toLowerCase()])
    .update({ member_contract_address: memberContract });

  console.log(
    `[indexer] MemberRegistered: ${player} → ${memberContract} (${updated} rows updated)`,
  );
}

async function handleCharacterMinted(log: Log): Promise<void> {
  const decoded = decodeEventLog({
    abi: [EVENTS.characterMinted],
    data: log.data,
    topics: log.topics,
  });
  const { tokenId, owner } = decoded.args as {
    tokenId: bigint;
    owner: Address;
    race: string;
  };

  const updated = await db("players")
    .whereRaw("LOWER(member_contract_address) = ?", [owner.toLowerCase()])
    .update({ character_nft_id: Number(tokenId) });

  // Fallback: try wallet_address if member_contract_address didn't match
  if (!updated) {
    await db("players")
      .whereRaw("LOWER(wallet_address) = ?", [owner.toLowerCase()])
      .update({ character_nft_id: Number(tokenId) });
  }

  console.log(
    `[indexer] CharacterMinted: tokenId=${tokenId} owner=${owner} (${updated} rows)`,
  );
}

async function handleCharacterUpdated(log: Log): Promise<void> {
  const decoded = decodeEventLog({
    abi: [EVENTS.characterUpdated],
    data: log.data,
    topics: log.topics,
  });
  const { tokenId } = decoded.args as { tokenId: bigint };

  // Read updated data from chain
  const parsedAbi = parseAbi(characterNftAbi);
  const charData = (await publicClient.readContract({
    address: contractAddresses.characterNft,
    abi: parsedAbi,
    functionName: "getCharacter",
    args: [tokenId],
  })) as {
    race: string;
    level: number;
    xp: bigint;
    totalCombatXp: bigint;
    totalMissionXp: bigint;
    totalTradeXp: bigint;
    totalExploreXp: bigint;
  };

  // Find player by character_nft_id and update progression
  const player = await db("players")
    .where({ character_nft_id: Number(tokenId) })
    .first();
  if (player) {
    await db("player_progression")
      .where({ player_id: player.id })
      .update({
        level: charData.level,
        xp: Number(charData.xp),
        total_combat_xp: Number(charData.totalCombatXp),
        total_mission_xp: Number(charData.totalMissionXp),
        total_trade_xp: Number(charData.totalTradeXp),
        total_explore_xp: Number(charData.totalExploreXp),
      });
  }

  console.log(`[indexer] CharacterUpdated: tokenId=${tokenId}`);
}

async function handleFactionRepUpdated(log: Log): Promise<void> {
  const decoded = decodeEventLog({
    abi: [EVENTS.factionRepUpdated],
    data: log.data,
    topics: log.topics,
  });
  const { tokenId, factionId, rep } = decoded.args as {
    tokenId: bigint;
    factionId: `0x${string}`;
    rep: bigint;
  };

  const player = await db("players")
    .where({ character_nft_id: Number(tokenId) })
    .first();
  if (player) {
    // Upsert faction rep — factionId is a bytes32 hash
    const existing = await db("player_faction_rep")
      .where({ player_id: player.id, faction_id_hash: factionId })
      .first();
    if (existing) {
      await db("player_faction_rep")
        .where({ player_id: player.id, faction_id_hash: factionId })
        .update({ reputation: Number(rep) });
    } else {
      await db("player_faction_rep").insert({
        player_id: player.id,
        faction_id_hash: factionId,
        reputation: Number(rep),
      });
    }
  }

  console.log(
    `[indexer] FactionRepUpdated: tokenId=${tokenId} faction=${factionId} rep=${rep}`,
  );
}

async function handleShipMinted(log: Log): Promise<void> {
  const decoded = decodeEventLog({
    abi: [EVENTS.shipMinted],
    data: log.data,
    topics: log.topics,
  });
  const { tokenId, owner, shipType } = decoded.args as {
    tokenId: bigint;
    owner: Address;
    shipType: string;
  };

  // Link ship in DB to chain token ID — match by member contract (NFTs are held by MemberContract)
  let player = await db("players")
    .whereRaw("LOWER(member_contract_address) = ?", [owner.toLowerCase()])
    .first();
  // Fallback: try wallet_address
  if (!player) {
    player = await db("players")
      .whereRaw("LOWER(wallet_address) = ?", [owner.toLowerCase()])
      .first();
  }
  if (player) {
    await db("ships")
      .where({ owner_id: player.id })
      .whereNull("chain_token_id")
      .orderBy("created_at", "desc")
      .limit(1)
      .update({ chain_token_id: Number(tokenId) });
  }

  console.log(
    `[indexer] ShipMinted: tokenId=${tokenId} owner=${owner} type=${shipType}`,
  );
}

async function handleShipDestroyed(log: Log): Promise<void> {
  const decoded = decodeEventLog({
    abi: [EVENTS.shipDestroyed],
    data: log.data,
    topics: log.topics,
  });
  const { tokenId } = decoded.args as { tokenId: bigint };

  await db("ships")
    .where({ chain_token_id: Number(tokenId) })
    .update({ is_destroyed: true });

  console.log(`[indexer] ShipDestroyed: tokenId=${tokenId}`);
}

async function handleShipUpdated(log: Log): Promise<void> {
  const decoded = decodeEventLog({
    abi: [EVENTS.shipUpdated],
    data: log.data,
    topics: log.topics,
  });
  const { tokenId } = decoded.args as { tokenId: bigint };

  // Read updated ship data from chain
  const parsedAbi = parseAbi(shipNftAbi);
  const shipData = (await publicClient.readContract({
    address: contractAddresses.shipNft,
    abi: parsedAbi,
    functionName: "getShip",
    args: [tokenId],
  })) as {
    shipType: string;
    hullHp: number;
    maxHullHp: number;
    weaponEnergy: number;
    engineEnergy: number;
    cargoBays: number;
    hasCloakDevice: boolean;
    hasRacheDevice: boolean;
    hasJumpDrive: boolean;
  };

  await db("ships")
    .where({ chain_token_id: Number(tokenId) })
    .update({
      hull_hp: shipData.hullHp,
      max_hull_hp: shipData.maxHullHp,
      weapon_energy: shipData.weaponEnergy,
      engine_energy: shipData.engineEnergy,
      cargo_holds: shipData.cargoBays,
      is_cloaked: shipData.hasCloakDevice ? 1 : 0,
      has_rache_device: shipData.hasRacheDevice ? 1 : 0,
      has_jump_drive: shipData.hasJumpDrive ? 1 : 0,
    });

  console.log(`[indexer] ShipUpdated: tokenId=${tokenId}`);
}

async function handleEquipmentMinted(log: Log): Promise<void> {
  const decoded = decodeEventLog({
    abi: [EVENTS.equipmentMinted],
    data: log.data,
    topics: log.topics,
  });
  const { tokenId, owner, equipType } = decoded.args as {
    tokenId: bigint;
    owner: Address;
    equipType: string;
  };

  console.log(
    `[indexer] EquipmentMinted: tokenId=${tokenId} owner=${owner} type=${equipType}`,
  );
}

async function handleEquipmentInstalled(log: Log): Promise<void> {
  const decoded = decodeEventLog({
    abi: [EVENTS.equipmentInstalled],
    data: log.data,
    topics: log.topics,
  });
  const { tokenId, shipId } = decoded.args as {
    tokenId: bigint;
    shipId: bigint;
  };

  console.log(
    `[indexer] EquipmentInstalled: tokenId=${tokenId} on ship=${shipId}`,
  );
}

// ---------------------------------------------------------------------------
// Event handlers — Syndicate DAO
// ---------------------------------------------------------------------------

async function handleSyndicateCreated(log: Log): Promise<void> {
  const decoded = decodeEventLog({
    abi: [EVENTS.syndicateCreated],
    data: log.data,
    topics: log.topics,
  });
  const { index, name, founder, token, treasury, governor } = decoded.args as {
    index: bigint;
    name: string;
    founder: Address;
    token: Address;
    treasury: Address;
    governor: Address;
  };

  // Find the syndicate by founder's wallet and update with chain addresses
  const player = await db("players")
    .whereRaw("LOWER(wallet_address) = ?", [founder.toLowerCase()])
    .first();
  if (player) {
    const syndicate = await db("syndicates")
      .where({ leader_id: player.id })
      .whereNull("chain_index")
      .orderBy("created_at", "desc")
      .first();
    if (syndicate) {
      await db("syndicates")
        .where({ id: syndicate.id })
        .update({
          chain_index: Number(index),
          governor_address: governor.toLowerCase(),
          treasury_address: treasury.toLowerCase(),
          token_address: token.toLowerCase(),
        });
    }
  }

  console.log(
    `[indexer] SyndicateCreated: index=${index} name=${name} founder=${founder}`,
  );
}

async function handleSyndicateMemberAdded(log: Log): Promise<void> {
  const decoded = decodeEventLog({
    abi: [EVENTS.syndicateMemberAdded],
    data: log.data,
    topics: log.topics,
  });
  const { syndicateIndex, member } = decoded.args as {
    syndicateIndex: bigint;
    member: Address;
  };

  console.log(
    `[indexer] SyndicateMemberAdded: syndicate=${syndicateIndex} member=${member}`,
  );
}

async function handleSyndicateMemberRemoved(log: Log): Promise<void> {
  const decoded = decodeEventLog({
    abi: [EVENTS.syndicateMemberRemoved],
    data: log.data,
    topics: log.topics,
  });
  const { syndicateIndex, member } = decoded.args as {
    syndicateIndex: bigint;
    member: Address;
  };

  console.log(
    `[indexer] SyndicateMemberRemoved: syndicate=${syndicateIndex} member=${member}`,
  );
}

// ---------------------------------------------------------------------------
// Main indexer — watches events and replays from last synced block
// ---------------------------------------------------------------------------

type UnwatchFn = () => void;
const watchers: UnwatchFn[] = [];

/** Replay historical events from a given block for a contract */
async function replayEvents(
  address: Address,
  contractName: string,
  fromBlock: bigint,
  toBlock: bigint,
  handler: (log: Log) => Promise<void>,
): Promise<void> {
  if (fromBlock >= toBlock) return;

  // Process in chunks of 1000 blocks to avoid RPC limits
  const CHUNK_SIZE = 1000n;
  let current = fromBlock;

  while (current < toBlock) {
    const end = current + CHUNK_SIZE > toBlock ? toBlock : current + CHUNK_SIZE;
    const logs = await publicClient.getLogs({
      address,
      fromBlock: current,
      toBlock: end,
    });

    for (const log of logs) {
      try {
        await handler(log);
      } catch (err) {
        console.error(
          `[indexer] Error processing ${contractName} event at block ${log.blockNumber}:`,
          err,
        );
      }
    }

    current = end + 1n;
  }

  await setLastSyncedBlock(contractName, toBlock);
}

/** Route a raw log to the appropriate handler based on event signature */
async function routeLog(contractAddress: string, log: Log): Promise<void> {
  const topic0 = log.topics[0];
  if (!topic0) return;

  const addr = contractAddress.toLowerCase();

  if (addr === contractAddresses.memberFactory.toLowerCase()) {
    if (topic0 === SELECTORS.memberRegistered)
      await handleMemberRegistered(log);
  } else if (addr === contractAddresses.characterNft.toLowerCase()) {
    if (topic0 === SELECTORS.characterMinted) await handleCharacterMinted(log);
    else if (topic0 === SELECTORS.characterUpdated)
      await handleCharacterUpdated(log);
    else if (topic0 === SELECTORS.factionRepUpdated)
      await handleFactionRepUpdated(log);
  } else if (addr === contractAddresses.shipNft.toLowerCase()) {
    if (topic0 === SELECTORS.shipMinted) await handleShipMinted(log);
    else if (topic0 === SELECTORS.shipDestroyed) await handleShipDestroyed(log);
    else if (topic0 === SELECTORS.shipUpdated) await handleShipUpdated(log);
  } else if (addr === contractAddresses.equipmentNft.toLowerCase()) {
    if (topic0 === SELECTORS.equipmentMinted) await handleEquipmentMinted(log);
    else if (topic0 === SELECTORS.equipmentInstalled)
      await handleEquipmentInstalled(log);
  } else if (addr === contractAddresses.syndicateFactory.toLowerCase()) {
    if (topic0 === SELECTORS.syndicateCreated)
      await handleSyndicateCreated(log);
    else if (topic0 === SELECTORS.syndicateMemberAdded)
      await handleSyndicateMemberAdded(log);
    else if (topic0 === SELECTORS.syndicateMemberRemoved)
      await handleSyndicateMemberRemoved(log);
  }
}

/** Start watching a contract for new events */
function watchContract(address: Address, contractName: string): UnwatchFn {
  const unwatch = publicClient.watchBlockNumber({
    onBlockNumber: async (blockNumber) => {
      try {
        const lastSynced = await getLastSyncedBlock(contractName);
        if (blockNumber <= lastSynced) return;

        const logs = await publicClient.getLogs({
          address,
          fromBlock: lastSynced + 1n,
          toBlock: blockNumber,
        });

        for (const log of logs) {
          try {
            await routeLog(address, log);
          } catch (err) {
            console.error(
              `[indexer] Error processing ${contractName} event:`,
              err,
            );
          }
        }

        await setLastSyncedBlock(contractName, blockNumber);
      } catch (err) {
        console.error(`[indexer] Error watching ${contractName}:`, err);
      }
    },
    pollingInterval: 2_000, // Match anvil block time
  });

  return unwatch;
}

/** Start the indexer — replays missed events then watches for new ones */
export async function startIndexer(): Promise<void> {
  console.log("[indexer] Starting chain event indexer...");

  try {
    const currentBlock = await publicClient.getBlockNumber();
    console.log(`[indexer] Current block: ${currentBlock}`);

    // Contracts to index
    const contracts: { address: Address; name: string }[] = [
      { address: contractAddresses.memberFactory, name: "memberFactory" },
      { address: contractAddresses.characterNft, name: "characterNft" },
      { address: contractAddresses.shipNft, name: "shipNft" },
      { address: contractAddresses.equipmentNft, name: "equipmentNft" },
      {
        address: contractAddresses.syndicateFactory,
        name: "syndicateFactory",
      },
    ];

    // Replay missed events for each contract
    for (const contract of contracts) {
      const lastSynced = await getLastSyncedBlock(contract.name);
      if (lastSynced < currentBlock) {
        console.log(
          `[indexer] Replaying ${contract.name} events from block ${lastSynced} to ${currentBlock}`,
        );
        await replayEvents(
          contract.address,
          contract.name,
          lastSynced + 1n,
          currentBlock,
          (log) => routeLog(contract.address, log),
        );
      }
    }

    // Start watching for new events
    for (const contract of contracts) {
      const unwatch = watchContract(contract.address, contract.name);
      watchers.push(unwatch);
      console.log(`[indexer] Watching ${contract.name} at ${contract.address}`);
    }

    console.log("[indexer] Chain event indexer started successfully");
  } catch (err) {
    console.error("[indexer] Failed to start indexer:", err);
    console.error("[indexer] Game will continue without chain indexing");
  }
}

/** Stop the indexer — unsubscribe from all event watchers */
export function stopIndexer(): void {
  for (const unwatch of watchers) {
    unwatch();
  }
  watchers.length = 0;
  console.log("[indexer] Indexer stopped");
}
