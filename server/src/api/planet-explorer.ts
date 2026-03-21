/**
 * Planet Explorer API routes.
 * Handles joining/leaving planet surface instances, input processing,
 * loot extraction, respawn, and ground character management.
 */

import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import db from "../db/connection";
import { PlanetInstanceManager } from "../engine/planet-instance-mgr";
import { InputFrame } from "../engine/planet-world";
import {
  canUnlockNode,
  getSoulTreeNode,
  xpForLevel,
} from "../engine/planet-soul-tree";

const router = Router();

// Instance manager is set from index.ts after io is created
let instanceMgr: PlanetInstanceManager;

export function setPlanetInstanceManager(mgr: PlanetInstanceManager): void {
  instanceMgr = mgr;
}

// ── Helper: get or create planet character ───────────────

async function getOrCreatePlanetCharacter(playerId: string) {
  let char = await db("planet_characters")
    .where({ player_id: playerId })
    .first();
  if (!char) {
    const [inserted] = await db("planet_characters")
      .insert({ player_id: playerId })
      .returning("*");
    char =
      inserted ??
      (await db("planet_characters").where({ player_id: playerId }).first());
  }
  return char;
}

async function getSoulNodes(playerId: string): Promise<Map<string, number>> {
  const rows = await db("planet_soul_tree").where({ player_id: playerId });
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.node_id, row.ranks);
  }
  return map;
}

// ── POST /join — Join a planet's world instance ──────────

router.post("/join", requireAuth, async (req: Request, res: Response) => {
  try {
    const player = (req as any).player;
    if (!player) return res.status(401).json({ error: "Not authenticated" });

    const { planetId } = req.body;
    if (!planetId) return res.status(400).json({ error: "planetId required" });

    // Must be landed on this planet
    if (player.landed_at_planet_id !== planetId) {
      return res.status(400).json({ error: "Must be landed on this planet" });
    }

    // Get planet info
    const planet = await db("planets").where({ id: planetId }).first();
    if (!planet) return res.status(404).json({ error: "Planet not found" });

    // Get or create ground character
    const char = await getOrCreatePlanetCharacter(player.id);
    const soulNodes = await getSoulNodes(player.id);

    // Get socket ID from header (injected by client)
    const socketId = req.headers["x-socket-id"] as string;
    if (!socketId) return res.status(400).json({ error: "Socket ID required" });

    // Hash planet ID to number for seed
    const seedNum =
      planetId
        .split("")
        .reduce((acc: number, c: string) => acc * 31 + c.charCodeAt(0), 0) >>>
      0;

    // Get or create world instance
    instanceMgr.getOrCreate(
      planetId,
      planet.planet_class,
      planet.upgrade_level ?? 0,
      seedNum,
    );

    // Join the instance
    const world = instanceMgr.joinPlayer(
      planetId,
      player.id,
      socketId,
      player.username,
      char.level,
      char.role,
      char.hp,
      char.max_hp,
      soulNodes,
      char.hero_sprite,
    );

    if (!world) {
      return res.status(500).json({ error: "Failed to join instance" });
    }

    // Get initial state
    const state = instanceMgr.getPlayerState(planetId, player.id);

    res.json({
      joined: true,
      planetId,
      character: {
        level: char.level,
        xp: char.xp,
        hp: char.hp,
        maxHp: char.max_hp,
        gold: char.gold,
        sp: char.sp,
        role: char.role,
        pickaxeId: char.pickaxe_id,
      },
      ...state,
    });
  } catch (err: any) {
    console.error("planet-explorer join error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /leave — Leave the planet, extract loot if at pad ─

router.post("/leave", requireAuth, async (req: Request, res: Response) => {
  try {
    const player = (req as any).player;
    if (!player) return res.status(401).json({ error: "Not authenticated" });

    const { planetId } = req.body;
    if (!planetId) return res.status(400).json({ error: "planetId required" });

    const result = instanceMgr.leavePlayer(planetId, player.id);
    if (!result) {
      return res.status(400).json({ error: "Not in this planet instance" });
    }

    let extracted: { itemId: string; quantity: number }[] = [];

    if (result.nearPad && result.loot.length > 0) {
      extracted = result.loot;

      // Convert loot to ship cargo
      for (const item of result.loot) {
        const cargoMap: Record<string, string> = {
          tech: "tech",
          cyrillium: "cyrillium",
          scrap_metal: "tech",
          circuit_board: "tech",
          power_core: "tech",
          // Planet unique resources → stored by name
        };
        const cargoType = cargoMap[item.itemId] ?? item.itemId;

        // Add to player's ship cargo
        const ship = await db("ships")
          .where({ owner_id: player.id, is_active: true })
          .first();
        if (ship) {
          const currentCargo = ship[cargoType] ?? 0;
          await db("ships")
            .where({ id: ship.id })
            .update({ [cargoType]: currentCargo + item.quantity });
        }

        // Log extraction
        await db("planet_extraction_log").insert({
          player_id: player.id,
          planet_id: planetId,
          resource_type: item.itemId,
          amount: item.quantity,
        });
      }
    }

    // Save ground character HP
    const worldPlayer = instanceMgr.getWorld(planetId)?.players.get(player.id);
    if (worldPlayer) {
      await db("planet_characters")
        .where({ player_id: player.id })
        .update({ hp: worldPlayer.hp, updated_at: db.fn.now() });
    }

    res.json({
      left: true,
      nearPad: result.nearPad,
      extracted,
      lootLost: !result.nearPad,
    });
  } catch (err: any) {
    console.error("planet-explorer leave error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /input — Send an input frame ───────────────────

router.post("/input", requireAuth, async (req: Request, res: Response) => {
  try {
    const player = (req as any).player;
    if (!player) return res.status(401).json({ error: "Not authenticated" });

    const { planetId, input } = req.body as {
      planetId: string;
      input: InputFrame;
    };
    if (!planetId || !input) {
      return res.status(400).json({ error: "planetId and input required" });
    }

    instanceMgr.processInput(planetId, player.id, input);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /state — Reconnect/refresh state ─────────────────

router.get("/state", requireAuth, async (req: Request, res: Response) => {
  try {
    const player = (req as any).player;
    if (!player) return res.status(401).json({ error: "Not authenticated" });

    const planetId = req.query.planetId as string;
    if (!planetId) return res.status(400).json({ error: "planetId required" });

    const state = instanceMgr.getPlayerState(planetId, player.id);
    if (!state) {
      return res.status(404).json({ error: "Not in this planet instance" });
    }

    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /respawn — Respawn at landing pad ───────────────

router.post("/respawn", requireAuth, async (req: Request, res: Response) => {
  try {
    const player = (req as any).player;
    if (!player) return res.status(401).json({ error: "Not authenticated" });

    const { planetId } = req.body;
    if (!planetId) return res.status(400).json({ error: "planetId required" });

    instanceMgr.respawnPlayer(planetId, player.id);
    res.json({ respawned: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /soul-tree/unlock — Spend SP on a soul tree node ─

router.post(
  "/soul-tree/unlock",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const player = (req as any).player;
      if (!player) return res.status(401).json({ error: "Not authenticated" });

      const { nodeId } = req.body;
      if (!nodeId) return res.status(400).json({ error: "nodeId required" });

      const char = await getOrCreatePlanetCharacter(player.id);
      const soulNodes = await getSoulNodes(player.id);

      const check = canUnlockNode(nodeId, soulNodes, char.sp);
      if (!check.ok) {
        return res.status(400).json({ error: check.reason });
      }

      const node = getSoulTreeNode(nodeId)!;
      const currentRanks = soulNodes.get(nodeId) ?? 0;

      // Deduct SP
      await db("planet_characters")
        .where({ player_id: player.id })
        .update({ sp: char.sp - node.costPerRank, updated_at: db.fn.now() });

      // Upsert soul tree node
      if (currentRanks > 0) {
        await db("planet_soul_tree")
          .where({ player_id: player.id, node_id: nodeId })
          .update({ ranks: currentRanks + 1 });
      } else {
        await db("planet_soul_tree").insert({
          player_id: player.id,
          node_id: nodeId,
          ranks: 1,
        });
      }

      res.json({
        unlocked: true,
        nodeId,
        newRank: currentRanks + 1,
        spRemaining: char.sp - node.costPerRank,
      });
    } catch (err: any) {
      console.error("soul-tree unlock error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

// ── GET /character — Get ground character state ──────────

router.get("/character", requireAuth, async (req: Request, res: Response) => {
  try {
    const player = (req as any).player;
    if (!player) return res.status(401).json({ error: "Not authenticated" });

    const char = await getOrCreatePlanetCharacter(player.id);
    const soulNodes = await getSoulNodes(player.id);
    const nodesArray = Array.from(soulNodes.entries()).map(
      ([nodeId, ranks]) => ({
        nodeId,
        ranks,
      }),
    );

    res.json({
      level: char.level,
      xp: char.xp,
      xpToNext: xpForLevel(char.level + 1),
      hp: char.hp,
      maxHp: char.max_hp,
      gold: char.gold,
      sp: char.sp,
      role: char.role,
      heroSprite: char.hero_sprite,
      pickaxeId: char.pickaxe_id,
      pickaxeDurability: char.pickaxe_durability,
      skillLoadout: char.skill_loadout ? JSON.parse(char.skill_loadout) : null,
      soulTree: nodesArray,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /instances — Admin: list active instances ────────

router.get("/instances", async (req: Request, res: Response) => {
  const adminKey = req.headers["x-admin-key"];
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: "Invalid admin key" });
  }
  res.json(instanceMgr.getActiveInstances());
});

export default router;
