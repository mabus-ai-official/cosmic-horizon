/**
 * Admin API endpoints for Nexus economy tool.
 * Secured by ADMIN_API_KEY header, not player auth.
 */

import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import db from "../db/connection";
import { GAME_CONFIG } from "../config/game";
import { calculatePrice } from "../engine/trading";
import { checkChainHealth } from "../chain/client";
import {
  reconcilePlayer,
  forceSyncPlayer,
  reconcileAll,
} from "../chain/reconciler";
import { getQueueStats, getFailedEntries } from "../chain/tx-queue";

const router = Router();

// Admin API key auth
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "nexus-dev-key";

function requireAdminKey(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const key = req.headers["x-admin-key"];
  if (key !== ADMIN_API_KEY) {
    res.status(403).json({ error: "Invalid admin key" });
    return;
  }
  next();
}

router.use(requireAdminKey);

// ─── Economy Snapshot ────────────────────────────────────────────────────────

router.get("/economy/snapshot", async (_req: Request, res: Response) => {
  try {
    const [playerStats] = (await db("players")
      .where("game_mode", "multiplayer")
      .select(
        db.raw("COUNT(*) as totalPlayers"),
        db.raw("SUM(credits) as totalCredits"),
        db.raw("AVG(credits) as avgCreditsPerPlayer"),
      )) as any[];

    const [planetStats] = (await db("planets")
      .whereNotNull("owner_id")
      .where("colonists", ">", 0)
      .select(
        db.raw("SUM(colonists) as totalPopulation"),
        db.raw("AVG(happiness) as avgHappiness"),
        db.raw("COUNT(*) as totalPlanets"),
      )) as any[];

    const outposts = await db("outposts").select(
      "id",
      "name",
      "treasury",
      "cyrillium_stock",
      "cyrillium_capacity",
      "food_stock",
      "food_capacity",
      "tech_stock",
      "tech_capacity",
    );

    const outpostData = outposts.map((o: any) => ({
      id: o.id,
      name: o.name,
      treasury: o.treasury,
      prices: {
        cyrillium: calculatePrice(
          "cyrillium",
          o.cyrillium_stock,
          o.cyrillium_capacity,
        ),
        food: calculatePrice("food", o.food_stock, o.food_capacity),
        tech: calculatePrice("tech", o.tech_stock, o.tech_capacity),
      },
      stocks: {
        cyrillium: {
          current: o.cyrillium_stock,
          capacity: o.cyrillium_capacity,
        },
        food: { current: o.food_stock, capacity: o.food_capacity },
        tech: { current: o.tech_stock, capacity: o.tech_capacity },
      },
    }));

    res.json({
      players: {
        total: playerStats.totalPlayers || 0,
        totalCredits: playerStats.totalCredits || 0,
        avgCredits: Math.round(playerStats.avgCreditsPerPlayer || 0),
      },
      planets: {
        total: planetStats.totalPlanets || 0,
        totalPopulation: planetStats.totalPopulation || 0,
        avgHappiness: Math.round((planetStats.avgHappiness || 0) * 100) / 100,
      },
      outposts: outpostData,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Price Distribution ──────────────────────────────────────────────────────

router.get("/economy/prices", async (_req: Request, res: Response) => {
  try {
    const outposts = await db("outposts").select(
      "id",
      "name",
      "cyrillium_stock",
      "cyrillium_capacity",
      "food_stock",
      "food_capacity",
      "tech_stock",
      "tech_capacity",
    );

    const prices = outposts.map((o: any) => ({
      id: o.id,
      name: o.name,
      cyrillium: calculatePrice(
        "cyrillium",
        o.cyrillium_stock,
        o.cyrillium_capacity,
      ),
      food: calculatePrice("food", o.food_stock, o.food_capacity),
      tech: calculatePrice("tech", o.tech_stock, o.tech_capacity),
    }));

    res.json(prices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Population by Planet Class ──────────────────────────────────────────────

router.get("/economy/population", async (_req: Request, res: Response) => {
  try {
    const data = await db("planets")
      .whereNotNull("owner_id")
      .where("colonists", ">", 0)
      .groupBy("planet_class")
      .select(
        "planet_class",
        db.raw("SUM(colonists) as totalPopulation"),
        db.raw("COUNT(*) as planetCount"),
        db.raw("AVG(happiness) as avgHappiness"),
      );

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Config Overrides ────────────────────────────────────────────────────────

router.get("/config/overrides", async (_req: Request, res: Response) => {
  try {
    const hasTable = await db.schema.hasTable("game_config_overrides");
    if (!hasTable) return res.json([]);

    const rows = await db("game_config_overrides").select(
      "key",
      "value",
      "updated_at",
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/config/overrides", async (req: Request, res: Response) => {
  const { key, value } = req.body;
  if (!key || value === undefined)
    return res.status(400).json({ error: "key and value required" });

  try {
    const hasTable = await db.schema.hasTable("game_config_overrides");
    if (!hasTable) {
      await db.schema.createTable("game_config_overrides", (t) => {
        t.string("key").primary();
        t.string("value").notNullable();
        t.timestamp("updated_at").defaultTo(db.fn.now());
      });
    }

    const existing = await db("game_config_overrides").where({ key }).first();
    if (existing) {
      await db("game_config_overrides")
        .where({ key })
        .update({
          value: String(value),
          updated_at: new Date().toISOString(),
        });
    } else {
      await db("game_config_overrides").insert({
        key,
        value: String(value),
        updated_at: new Date().toISOString(),
      });
    }

    res.json({ key, value, updated: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/config/overrides/:key", async (req: Request, res: Response) => {
  try {
    await db("game_config_overrides").where({ key: req.params.key }).del();
    res.json({ key: req.params.key, reverted: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Chain Health & Reconciliation ───────────────────────────────────────────

router.get("/chain/health", async (_req: Request, res: Response) => {
  try {
    const health = await checkChainHealth();
    const queueStats = getQueueStats();
    res.json({ ...health, queue: queueStats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/chain/queue-status", async (_req: Request, res: Response) => {
  try {
    res.json({
      stats: getQueueStats(),
      recentFailures: getFailedEntries(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get(
  "/chain/reconcile/:playerId",
  async (req: Request, res: Response) => {
    try {
      const result = await reconcilePlayer(req.params.playerId as string);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.get("/chain/reconcile", async (_req: Request, res: Response) => {
  try {
    const result = await reconcileAll();
    // Don't send individual results for all players — just summary
    res.json({
      total: result.total,
      clean: result.clean,
      withIssues: result.withIssues,
      critical: result.critical,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  "/chain/force-sync/:playerId",
  async (req: Request, res: Response) => {
    try {
      const result = await forceSyncPlayer(req.params.playerId as string);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
