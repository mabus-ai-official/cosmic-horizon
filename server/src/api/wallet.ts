import { Router } from "express";
import { generateNonce, SiweMessage } from "siwe";
import {
  createPublicClient,
  http,
  formatEther,
  parseAbi,
  defineChain,
  type Address,
} from "viem";
import { mainnet } from "viem/chains";
import { requireAuth } from "../middleware/auth";
import db from "../db/connection";
import { syncPlayer } from "../ws/sync";
import {
  contractAddresses,
  resourceToToken,
  chainConfig,
} from "../chain/addresses";
import { memberContractAbi, gameTokenAbi } from "../chain/abis";
import {
  debitMember,
  tokenBalance,
  mintToken,
  burnToken,
  nftOwnerOf,
  nftInMemberLedger,
  withdrawNFTFromMember,
  getNftContractAddress,
} from "../chain/client";
import { isChainEnabled } from "../chain/config";
import { enqueueAndWait } from "../chain/tx-queue";

const router = Router();

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ETH_RPC_URL || "https://eth.llamarpc.com"),
});

const gameChain = defineChain({
  id: chainConfig.chainId,
  name: "Cosmic Horizon",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [chainConfig.rpcUrl] } },
});

const gameClient = createPublicClient({
  chain: gameChain,
  transport: http(chainConfig.rpcUrl),
});

const parsedMemberAbi = parseAbi(memberContractAbi);
const parsedTokenAbi = parseAbi(gameTokenAbi);

const TOKEN_DISPLAY: Record<string, { symbol: string; name: string }> = {
  credits: { symbol: "CRED", name: "Credits" },
  cyrillium: { symbol: "CYR", name: "Cyrillium" },
  food: { symbol: "FOOD", name: "Food" },
  tech: { symbol: "TECH", name: "Tech" },
  drift_fuel: { symbol: "DFUEL", name: "Drift Fuel" },
};

const NFT_CONTRACTS: Record<string, Address> = {
  ship: contractAddresses.shipNft,
  equipment: contractAddresses.equipmentNft,
  character: contractAddresses.characterNft,
  planet: contractAddresses.planetNft,
};

// In-memory nonce store keyed by playerId (single-server deployment)
const nonceStore = new Map<string, { nonce: string; expires: number }>();

// All routes require authentication
router.use(requireAuth);

// Generate SIWE nonce
router.get("/nonce", (req, res) => {
  const nonce = generateNonce();
  const playerId = req.session.playerId!;
  nonceStore.set(playerId, { nonce, expires: Date.now() + 5 * 60 * 1000 });
  res.json({ nonce });
});

// Verify SIWE signature and link wallet
router.post("/verify", async (req, res) => {
  try {
    const { message, signature } = req.body;
    if (!message || !signature) {
      return res.status(400).json({ error: "Missing message or signature" });
    }

    const siweMessage = new SiweMessage(message);
    const { data: verified } = await siweMessage.verify({ signature });

    const playerId = req.session.playerId!;
    const stored = nonceStore.get(playerId);
    if (
      !stored ||
      stored.nonce !== verified.nonce ||
      stored.expires < Date.now()
    ) {
      return res.status(400).json({ error: "Invalid nonce" });
    }
    nonceStore.delete(playerId);

    const walletAddress = verified.address.toLowerCase();

    const existing = await db("players")
      .where({ wallet_address: walletAddress })
      .whereNot({ id: req.session.playerId })
      .first();

    if (existing) {
      return res
        .status(409)
        .json({ error: "Wallet already linked to another account" });
    }

    await db("players").where({ id: req.session.playerId }).update({
      wallet_address: walletAddress,
      wallet_connected_at: db.fn.now(),
    });

    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        req.session.playerId!,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({ walletAddress });
  } catch (err) {
    console.error("Wallet verify error:", err);
    res.status(400).json({ error: "Signature verification failed" });
  }
});

// Disconnect wallet
router.post("/disconnect", async (req, res) => {
  try {
    await db("players").where({ id: req.session.playerId }).update({
      wallet_address: null,
      wallet_connected_at: null,
    });
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        req.session.playerId!,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({ success: true });
  } catch (err) {
    console.error("Wallet disconnect error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get ETH balance
router.get("/balance", async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player?.wallet_address) {
      return res.status(400).json({ error: "No wallet connected" });
    }

    const balance = await publicClient.getBalance({
      address: player.wallet_address as `0x${string}`,
    });

    res.json({
      walletAddress: player.wallet_address,
      balanceEth: formatEther(balance),
    });
  } catch (err) {
    console.error("Wallet balance error:", err);
    res.json({ walletAddress: null, balanceEth: null });
  }
});

// Get wallet status
router.get("/status", async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .select(
        "wallet_address",
        "wallet_connected_at",
        "member_contract_address",
      )
      .first();

    res.json({
      walletAddress: player?.wallet_address || null,
      connectedAt: player?.wallet_connected_at || null,
      hasMemberContract: !!player?.member_contract_address,
    });
  } catch (err) {
    console.error("Wallet status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// In-game assets (MemberContract holdings)
// ---------------------------------------------------------------------------

// Get on-chain ERC-20 token balances from MemberContract
router.get("/tokens", async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .select("member_contract_address")
      .first();

    if (!player?.member_contract_address) {
      return res.json({ tokens: [] });
    }

    const memberAddr = player.member_contract_address as `0x${string}`;
    const tokens: {
      resource: string;
      symbol: string;
      name: string;
      balance: string;
    }[] = [];

    const entries = Object.entries(resourceToToken);
    const results = await Promise.allSettled(
      entries.map(([, tokenAddr]) =>
        gameClient.readContract({
          address: memberAddr,
          abi: parsedMemberAbi,
          functionName: "fungibleLedger",
          args: [tokenAddr],
        }),
      ),
    );

    for (let i = 0; i < entries.length; i++) {
      const [resource] = entries[i];
      const result = results[i];
      const display = TOKEN_DISPLAY[resource];
      const raw = result.status === "fulfilled" ? (result.value as bigint) : 0n;
      tokens.push({
        resource,
        symbol: display?.symbol ?? resource.toUpperCase(),
        name: display?.name ?? resource,
        balance: (Number(raw) / 1e18).toFixed(2),
      });
    }

    res.json({ tokens });
  } catch (err) {
    console.error("Wallet tokens error:", err);
    res.json({ tokens: [] });
  }
});

// Get NFTs held by the player (from DB, which mirrors chain state)
router.get("/nfts", async (req, res) => {
  try {
    const playerId = req.session.playerId!;

    // Ships
    const ships = await db("ships")
      .leftJoin("ship_types", "ships.ship_type_id", "ship_types.id")
      .where("ships.owner_id", playerId)
      .whereNotNull("ships.chain_token_id")
      .where("ships.is_destroyed", false)
      .select(
        "ships.id",
        "ships.chain_token_id as tokenId",
        "ships.name",
        "ship_types.name as typeName",
        "ships.ship_type_id as typeId",
      );

    // Equipment
    const equipment = await db("ship_upgrades")
      .join("ships", "ship_upgrades.ship_id", "ships.id")
      .join(
        "upgrade_types",
        "ship_upgrades.upgrade_type_id",
        "upgrade_types.id",
      )
      .where("ships.owner_id", playerId)
      .select(
        "ship_upgrades.id",
        "upgrade_types.name",
        "upgrade_types.slot",
        "ships.name as shipName",
      );

    // Character
    const player = await db("players")
      .where({ id: playerId })
      .select("character_nft_id", "race")
      .first();

    const progression = await db("player_progression")
      .where({ player_id: playerId })
      .select("level")
      .first();

    const character =
      player?.character_nft_id != null
        ? {
            tokenId: player.character_nft_id,
            race: player.race,
            level: progression?.level ?? 1,
          }
        : null;

    // Planets
    const planets = await db("planets")
      .where("owner_id", playerId)
      .whereNotNull("chain_token_id")
      .select(
        "id",
        "chain_token_id as tokenId",
        "name",
        "planet_class as planetClass",
        "sector_id as sectorId",
      );

    res.json({ ships, equipment, character, planets });
  } catch (err) {
    console.error("Wallet NFTs error:", err);
    res.json({ ships: [], equipment: [], character: null, planets: [] });
  }
});

// ---------------------------------------------------------------------------
// External wallet holdings (what's in the player's actual wallet, not in-game)
// ---------------------------------------------------------------------------

router.get("/holdings", async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .select("wallet_address")
      .first();

    if (!player?.wallet_address) {
      return res.json({ tokens: [], ethBalance: null });
    }

    const walletAddr = player.wallet_address as `0x${string}`;

    // Check game token balances in the player's actual wallet
    const entries = Object.entries(resourceToToken);
    const results = await Promise.allSettled(
      entries.map(([, tokenAddr]) =>
        gameClient.readContract({
          address: tokenAddr,
          abi: parsedTokenAbi,
          functionName: "balanceOf",
          args: [walletAddr],
        }),
      ),
    );

    const tokens: {
      resource: string;
      symbol: string;
      name: string;
      balance: string;
    }[] = [];

    for (let i = 0; i < entries.length; i++) {
      const [resource] = entries[i];
      const result = results[i];
      const display = TOKEN_DISPLAY[resource];
      const raw = result.status === "fulfilled" ? (result.value as bigint) : 0n;
      if (raw > 0n) {
        tokens.push({
          resource,
          symbol: display?.symbol ?? resource.toUpperCase(),
          name: display?.name ?? resource,
          balance: (Number(raw) / 1e18).toFixed(2),
        });
      }
    }

    // ETH balance on mainnet
    let ethBalance: string | null = null;
    try {
      const bal = await publicClient.getBalance({ address: walletAddr });
      ethBalance = formatEther(bal);
    } catch {
      // mainnet may not be reachable
    }

    res.json({ tokens, ethBalance });
  } catch (err) {
    console.error("Wallet holdings error:", err);
    res.json({ tokens: [], ethBalance: null });
  }
});

// ---------------------------------------------------------------------------
// Withdrawals — move assets from MemberContract to external wallet
// ---------------------------------------------------------------------------

router.post("/withdraw-tokens", async (req, res) => {
  try {
    const { resource, amount } = req.body;
    if (!resource || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid resource or amount" });
    }

    if (!resourceToToken[resource]) {
      return res.status(400).json({ error: "Unknown resource" });
    }

    const player = await db("players")
      .where({ id: req.session.playerId })
      .select("wallet_address", "member_contract_address")
      .first();

    if (!player?.wallet_address) {
      return res.status(400).json({ error: "No wallet linked" });
    }
    if (!player?.member_contract_address) {
      return res.status(400).json({ error: "No member contract" });
    }

    const memberAddr = player.member_contract_address as `0x${string}`;
    const walletAddr = player.wallet_address as `0x${string}`;
    const tokenAddr = resourceToToken[resource];
    const amountWei = BigInt(Math.floor(amount * 1e18));

    // Check on-chain balance
    const ledgerBalance = (await gameClient.readContract({
      address: memberAddr,
      abi: parsedMemberAbi,
      functionName: "fungibleLedger",
      args: [tokenAddr],
    })) as bigint;

    if (ledgerBalance < amountWei) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Debit the member contract ledger
    await debitMember(memberAddr, resource, amountWei);

    // Mint tokens directly to the player's wallet
    await mintToken(resource, walletAddr, amountWei);

    const display = TOKEN_DISPLAY[resource];
    res.json({
      success: true,
      message: `Withdrew ${amount} ${display?.symbol ?? resource} to wallet`,
    });
  } catch (err) {
    console.error("Withdraw tokens error:", err);
    res.status(500).json({ error: "Withdrawal failed" });
  }
});

router.post("/withdraw-nft", async (req, res) => {
  try {
    const { nftType, tokenId } = req.body;
    if (!nftType || tokenId == null) {
      return res.status(400).json({ error: "Missing nftType or tokenId" });
    }

    const nftContract = NFT_CONTRACTS[nftType];
    if (!nftContract) {
      return res.status(400).json({ error: "Unknown NFT type" });
    }

    const player = await db("players")
      .where({ id: req.session.playerId })
      .select("wallet_address", "member_contract_address")
      .first();

    if (!player?.wallet_address) {
      return res.status(400).json({ error: "No wallet linked" });
    }
    if (!player?.member_contract_address) {
      return res.status(400).json({ error: "No member contract" });
    }

    const playerId = req.session.playerId!;
    const memberAddr = player.member_contract_address as `0x${string}`;
    const walletAddr = player.wallet_address as `0x${string}`;
    const chainTokenId = BigInt(tokenId);

    // --- Verify ownership via DB ---
    let owned = false;

    if (nftType === "ship") {
      const ship = await db("ships")
        .where({
          chain_token_id: tokenId,
          owner_id: playerId,
          is_destroyed: false,
        })
        .first();
      owned = !!ship;
    } else if (nftType === "equipment") {
      // Equipment: must be owned by player and uninstalled from ship
      const equip = await db("ship_upgrades")
        .join("ships", "ship_upgrades.ship_id", "ships.id")
        .where("ships.owner_id", playerId)
        .where("ship_upgrades.chain_token_id", tokenId)
        .first();
      owned = !!equip;
    } else if (nftType === "character") {
      const p = await db("players")
        .where({ id: playerId, character_nft_id: tokenId })
        .first();
      owned = !!p;
    } else if (nftType === "planet") {
      const planet = await db("planets")
        .where({ chain_token_id: tokenId, owner_id: playerId })
        .first();
      owned = !!planet;
    }

    if (!owned) {
      return res.status(403).json({ error: "You don't own this NFT" });
    }

    // --- Verify on-chain state if chain is enabled ---
    if (isChainEnabled()) {
      // Confirm the MemberContract's nftLedger has this NFT
      const inLedger = await nftInMemberLedger(
        memberAddr,
        nftType,
        chainTokenId,
      );
      if (!inLedger) {
        return res.status(400).json({
          error: "NFT not found in on-chain ledger (may already be withdrawn)",
        });
      }

      // Execute the on-chain transfer via tx-queue (waits for completion)
      await enqueueAndWait({
        type: "withdrawNFT",
        memberAddress: memberAddr,
        nftType,
        tokenId: chainTokenId,
        toWallet: walletAddr,
      });
    }

    // --- Update DB to reflect withdrawal ---
    if (nftType === "ship") {
      await db("ships")
        .where({ chain_token_id: tokenId, owner_id: playerId })
        .update({ withdrawn_to_wallet: true, withdrawn_at: db.fn.now() });
    } else if (nftType === "equipment") {
      await db("ship_upgrades")
        .where({ chain_token_id: tokenId })
        .update({ withdrawn_to_wallet: true, withdrawn_at: db.fn.now() });
    } else if (nftType === "character") {
      await db("players")
        .where({ id: playerId, character_nft_id: tokenId })
        .update({
          character_withdrawn: true,
          character_withdrawn_at: db.fn.now(),
        });
    } else if (nftType === "planet") {
      await db("planets")
        .where({ chain_token_id: tokenId, owner_id: playerId })
        .update({ withdrawn_to_wallet: true, withdrawn_at: db.fn.now() });
    }

    // Push updated state to connected clients
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        playerId,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    console.log(
      `[wallet] NFT withdrawn: ${nftType} #${tokenId} → ${walletAddr} (player ${playerId})`,
    );

    res.json({
      success: true,
      message: `${nftType} #${tokenId} withdrawn to ${walletAddr}`,
    });
  } catch (err) {
    console.error("Withdraw NFT error:", err);
    const message =
      err instanceof Error ? err.message : "NFT withdrawal failed";
    res.status(500).json({ error: message });
  }
});

export default router;
