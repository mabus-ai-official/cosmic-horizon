import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { canAffordAction, deductEnergy, getActionCost } from "../engine/energy";
import {
  calculatePrice,
  executeTrade,
  CommodityType,
  OutpostState,
} from "../engine/trading";
import { getRace, RaceId } from "../config/races";
import { checkAndUpdateMissions } from "../services/mission-tracker";
import { applyUpgradesToShip } from "../engine/upgrades";
import { awardXP } from "../engine/progression";
import { checkAchievements } from "../engine/achievements";
import { updateDailyMissionProgress } from "./daily-missions";
import { onTradeComplete } from "../engine/npcs";
import { GAME_CONFIG } from "../config/game";
import { pickFlavor, outpostNpcRace } from "../config/flavor-text";
import {
  handleTutorialOutpost,
  handleTutorialBuy,
  handleTutorialSell,
} from "../services/tutorial-sandbox";
import db from "../db/connection";
import {
  incrementStat,
  logActivity,
  checkPersonalBest,
  checkMilestones,
} from "../engine/profile-stats";
import { syncPlayer } from "../ws/sync";
import { notifyPlayer } from "../ws/handlers";

const router = Router();

// View outpost prices — read-only price check without docking. Prices fluctuate
// based on supply/demand (stock vs capacity ratio). Players use this to scout
// profitable trades before committing AP to dock. No AP cost for viewing.
router.get("/outpost/:id", requireAuth, async (req, res) => {
  if (req.inTutorial) return handleTutorialOutpost(req, res);
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const outpost = await db("outposts").where({ id: req.params.id }).first();
    if (!outpost) return res.status(404).json({ error: "Outpost not found" });
    if (outpost.sector_id !== player.current_sector_id) {
      return res.status(400).json({ error: "Outpost is not in your sector" });
    }

    const prices = {
      cyrillium: {
        price: calculatePrice(
          "cyrillium",
          outpost.cyrillium_stock,
          outpost.cyrillium_capacity,
        ),
        stock: outpost.cyrillium_stock,
        capacity: outpost.cyrillium_capacity,
        mode: outpost.cyrillium_mode,
      },
      food: {
        price: calculatePrice(
          "food",
          outpost.food_stock,
          outpost.food_capacity,
        ),
        stock: outpost.food_stock,
        capacity: outpost.food_capacity,
        mode: outpost.food_mode,
      },
      tech: {
        price: calculatePrice(
          "tech",
          outpost.tech_stock,
          outpost.tech_capacity,
        ),
        stock: outpost.tech_stock,
        capacity: outpost.tech_capacity,
        mode: outpost.tech_mode,
      },
    };

    res.json({
      outpostId: outpost.id,
      name: outpost.name,
      treasury: outpost.treasury,
      prices,
    });
  } catch (err) {
    console.error("Outpost view error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Buy commodity from outpost — costs 1 AP. Requires docking. Validates cargo space
// (including upgrade bonuses), applies racial trade discount (Tar'ri get cheaper buys),
// then delegates to the pure executeTrade() engine function. Updates player credits,
// ship cargo, outpost stock/treasury, logs the trade, triggers mission progress,
// awards XP, and checks faction fame thresholds for significant trades.
router.post("/buy", requireAuth, async (req, res) => {
  if (req.inTutorial) return handleTutorialBuy(req, res);
  try {
    const { outpostId, commodity, quantity } = req.body;
    if (!outpostId || !commodity || !quantity || quantity < 1) {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }
    if (!["cyrillium", "food", "tech"].includes(commodity)) {
      return res.status(400).json({ error: "Invalid commodity" });
    }

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    if (!canAffordAction(player.energy, "trade")) {
      return res
        .status(400)
        .json({ error: "Not enough energy", cost: getActionCost("trade") });
    }

    const outpost = await db("outposts").where({ id: outpostId }).first();
    if (!outpost) return res.status(404).json({ error: "Outpost not found" });
    if (outpost.sector_id !== player.current_sector_id) {
      return res.status(400).json({ error: "Outpost is not in your sector" });
    }

    // Require docking
    if (player.docked_at_outpost_id !== outpost.id) {
      return res.status(400).json({
        error: 'Must be docked at this outpost to trade. Type "dock" first.',
      });
    }

    const ship = await db("ships")
      .where({ id: player.current_ship_id })
      .first();
    if (!ship) return res.status(400).json({ error: "No active ship" });

    // Check cargo space (including upgrade bonuses)
    const upgrades = await applyUpgradesToShip(ship.id);
    const currentCargo =
      (ship.cyrillium_cargo || 0) +
      (ship.food_cargo || 0) +
      (ship.tech_cargo || 0) +
      (ship.colonist_cargo || 0);
    const freeSpace = ship.max_cargo_holds + upgrades.cargoBonus - currentCargo;
    const maxBuyable = Math.min(quantity, freeSpace);
    if (maxBuyable <= 0) {
      return res.status(400).json({ error: "No cargo space available" });
    }

    const outpostState: OutpostState = {
      cyrilliumStock: outpost.cyrillium_stock,
      cyrilliumCapacity: outpost.cyrillium_capacity,
      cyrilliumMode: outpost.cyrillium_mode,
      foodStock: outpost.food_stock,
      foodCapacity: outpost.food_capacity,
      foodMode: outpost.food_mode,
      techStock: outpost.tech_stock,
      techCapacity: outpost.tech_capacity,
      techMode: outpost.tech_mode,
      treasury: outpost.treasury,
    };

    const result = executeTrade(
      outpostState,
      commodity as CommodityType,
      maxBuyable,
      "buy",
    );
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Apply racial trade bonus (discount on buy for Tar'ri)
    const playerRace = player.race ? getRace(player.race as RaceId) : null;
    const tradeDiscount = Math.floor(
      result.totalCost * (playerRace?.tradeBonus ?? 0),
    );
    const adjustedCost = result.totalCost - tradeDiscount;

    // Check player can afford
    if (adjustedCost > Number(player.credits)) {
      return res.status(400).json({ error: "Not enough credits" });
    }

    const newEnergy = deductEnergy(player.energy, "trade");

    // Update player credits and energy
    await db("players")
      .where({ id: player.id })
      .update({
        credits: Number(player.credits) - adjustedCost,
        energy: newEnergy,
      });

    // Update ship cargo
    const cargoField = `${commodity}_cargo`;
    await db("ships")
      .where({ id: ship.id })
      .update({
        [cargoField]: (ship[cargoField] || 0) + result.quantity,
      });

    // Update outpost stock and treasury
    const stockField = `${commodity}_stock`;
    await db("outposts")
      .where({ id: outpost.id })
      .update({
        [stockField]: result.newStock,
        treasury: result.newTreasury,
      });

    // Log trade
    await db("trade_logs").insert({
      player_id: player.id,
      outpost_id: outpost.id,
      commodity,
      quantity: result.quantity,
      price_per_unit: result.pricePerUnit,
      total_price: adjustedCost,
      direction: "buy",
    });

    // Mission progress: trade (buy)
    const io = req.app.get("io");
    checkAndUpdateMissions(
      player.id,
      "trade",
      {
        quantity: result.quantity,
        tradeType: "buy",
        commodity,
      },
      io,
    );
    updateDailyMissionProgress(player.id, "trade_value", adjustedCost).catch(
      () => {},
    );

    // Award trade XP for buying
    const xpResult = await awardXP(
      player.id,
      result.quantity * GAME_CONFIG.XP_TRADE_BUY,
      "trade",
    );
    const unlocked = await checkAchievements(player.id, "trade", {});
    if (io) {
      for (const a of unlocked) {
        notifyPlayer(io, player.id, "achievement:unlocked", {
          name: a.name,
          description: a.description,
          xpReward: a.xpReward,
          creditReward: a.creditReward,
        });
      }
    }

    // Faction fame for significant trades
    try {
      await onTradeComplete(player.id, adjustedCost);
    } catch {
      /* non-critical */
    }

    // Profile stats: buy
    incrementStat(player.id, "trades_completed", 1);
    incrementStat(player.id, "trade_credits_spent", adjustedCost);
    incrementStat(player.id, "energy_spent", getActionCost("trade"));
    logActivity(
      player.id,
      "trade",
      `Bought ${result.quantity} ${commodity} for ${adjustedCost} credits`,
      { commodity, quantity: result.quantity, cost: adjustedCost, type: "buy" },
    );
    checkPersonalBest(
      player.id,
      "biggest_trade",
      adjustedCost,
      `Bought ${result.quantity} ${commodity} for ${adjustedCost} credits`,
    );
    checkMilestones(player.id);

    // Multi-session sync
    if (io)
      syncPlayer(
        io,
        player.id,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({
      commodity,
      quantity: result.quantity,
      pricePerUnit: result.pricePerUnit,
      totalCost: adjustedCost,
      tradeBonus: tradeDiscount,
      newCredits: Number(player.credits) - adjustedCost,
      energy: newEnergy,
      xp: {
        awarded: xpResult.xpAwarded,
        total: xpResult.totalXp,
        level: xpResult.level,
        rank: xpResult.rank,
        levelUp: xpResult.levelUp,
      },
      message: pickFlavor("trade_buy", outpostNpcRace(outpost.id), {
        commodity,
        quantity: result.quantity,
        price: result.pricePerUnit,
        total: adjustedCost,
      }),
    });
  } catch (err) {
    console.error("Buy error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Sell commodity to outpost — mirror of /buy. Racial trade bonus boosts revenue
// instead of reducing cost. Sell is constrained by outpost treasury (can it afford
// to buy from you?) and remaining capacity. Also feeds into deliver_cargo mission
// type since selling the right commodity at the right place completes deliveries.
router.post("/sell", requireAuth, async (req, res) => {
  if (req.inTutorial) return handleTutorialSell(req, res);
  try {
    const { outpostId, commodity, quantity } = req.body;
    if (!outpostId || !commodity || !quantity || quantity < 1) {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }
    if (!["cyrillium", "food", "tech"].includes(commodity)) {
      return res.status(400).json({ error: "Invalid commodity" });
    }

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    if (!canAffordAction(player.energy, "trade")) {
      return res
        .status(400)
        .json({ error: "Not enough energy", cost: getActionCost("trade") });
    }

    const ship = await db("ships")
      .where({ id: player.current_ship_id })
      .first();
    if (!ship) return res.status(400).json({ error: "No active ship" });

    const cargoField = `${commodity}_cargo`;
    const availableCargo = ship[cargoField] || 0;
    if (availableCargo <= 0) {
      return res.status(400).json({ error: "No cargo of this type" });
    }

    const outpost = await db("outposts").where({ id: outpostId }).first();
    if (!outpost) return res.status(404).json({ error: "Outpost not found" });
    if (outpost.sector_id !== player.current_sector_id) {
      return res.status(400).json({ error: "Outpost is not in your sector" });
    }

    // Require docking
    if (player.docked_at_outpost_id !== outpost.id) {
      return res.status(400).json({
        error: 'Must be docked at this outpost to trade. Type "dock" first.',
      });
    }

    const sellQuantity = Math.min(quantity, availableCargo);

    const outpostState: OutpostState = {
      cyrilliumStock: outpost.cyrillium_stock,
      cyrilliumCapacity: outpost.cyrillium_capacity,
      cyrilliumMode: outpost.cyrillium_mode,
      foodStock: outpost.food_stock,
      foodCapacity: outpost.food_capacity,
      foodMode: outpost.food_mode,
      techStock: outpost.tech_stock,
      techCapacity: outpost.tech_capacity,
      techMode: outpost.tech_mode,
      treasury: outpost.treasury,
    };

    const result = executeTrade(
      outpostState,
      commodity as CommodityType,
      sellQuantity,
      "sell",
    );
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Apply racial trade bonus (boost on sell for Tar'ri)
    const playerRace = player.race ? getRace(player.race as RaceId) : null;
    const tradeBoost = Math.floor(
      result.totalCost * (playerRace?.tradeBonus ?? 0),
    );
    const adjustedRevenue = result.totalCost + tradeBoost;

    const newEnergy = deductEnergy(player.energy, "trade");

    // Update player credits and energy
    await db("players")
      .where({ id: player.id })
      .update({
        credits: Number(player.credits) + adjustedRevenue,
        energy: newEnergy,
      });

    // Update ship cargo
    await db("ships")
      .where({ id: ship.id })
      .update({
        [cargoField]: availableCargo - result.quantity,
      });

    // Update outpost
    const stockField = `${commodity}_stock`;
    await db("outposts")
      .where({ id: outpost.id })
      .update({
        [stockField]: result.newStock,
        treasury: result.newTreasury,
      });

    // Log trade
    await db("trade_logs").insert({
      player_id: player.id,
      outpost_id: outpost.id,
      commodity,
      quantity: result.quantity,
      price_per_unit: result.pricePerUnit,
      total_price: adjustedRevenue,
      direction: "sell",
    });

    // Mission progress: trade (sell) + deliver_cargo
    const io = req.app.get("io");
    checkAndUpdateMissions(
      player.id,
      "trade",
      {
        quantity: result.quantity,
        tradeType: "sell",
        commodity,
      },
      io,
    );
    updateDailyMissionProgress(player.id, "trade_value", adjustedRevenue).catch(
      () => {},
    );

    // Award trade XP for selling
    const xpResult = await awardXP(
      player.id,
      result.quantity * GAME_CONFIG.XP_TRADE_SELL,
      "trade",
    );
    const unlocked = await checkAchievements(player.id, "trade", {});
    if (io) {
      for (const a of unlocked) {
        notifyPlayer(io, player.id, "achievement:unlocked", {
          name: a.name,
          description: a.description,
          xpReward: a.xpReward,
          creditReward: a.creditReward,
        });
      }
    }

    // Faction fame for significant trades
    try {
      await onTradeComplete(player.id, adjustedRevenue);
    } catch {
      /* non-critical */
    }

    // Profile stats: sell
    incrementStat(player.id, "trades_completed", 1);
    incrementStat(player.id, "trade_credits_earned", adjustedRevenue);
    incrementStat(player.id, "energy_spent", getActionCost("trade"));
    logActivity(
      player.id,
      "trade",
      `Sold ${result.quantity} ${commodity} for ${adjustedRevenue} credits`,
      {
        commodity,
        quantity: result.quantity,
        revenue: adjustedRevenue,
        type: "sell",
      },
    );
    checkPersonalBest(
      player.id,
      "biggest_trade",
      adjustedRevenue,
      `Sold ${result.quantity} ${commodity} for ${adjustedRevenue} credits`,
    );
    checkMilestones(player.id);

    // Multi-session sync
    if (io)
      syncPlayer(
        io,
        player.id,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({
      commodity,
      quantity: result.quantity,
      pricePerUnit: result.pricePerUnit,
      totalCost: adjustedRevenue,
      tradeBonus: tradeBoost,
      newCredits: Number(player.credits) + adjustedRevenue,
      energy: newEnergy,
      xp: {
        awarded: xpResult.xpAwarded,
        total: xpResult.totalXp,
        level: xpResult.level,
        rank: xpResult.rank,
        levelUp: xpResult.levelUp,
      },
      message: pickFlavor("trade_sell", outpostNpcRace(outpost.id), {
        commodity,
        quantity: result.quantity,
        price: result.pricePerUnit,
        total: adjustedRevenue,
      }),
    });
  } catch (err) {
    console.error("Sell error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Trade Computer — directory of all outposts with live commodity info. Shows every
// outpost in the universe with current prices, stock levels, and trade modes.
// Players use this to plan trade routes: find where to buy cheap, sell expensive.
// No sector restriction — this is the "galactic market data" screen.
router.get("/directory", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const outposts = await db("outposts")
      .join("sectors", "outposts.sector_id", "sectors.id")
      .select(
        "outposts.id",
        "outposts.name",
        "outposts.sector_id",
        "outposts.sells_fuel",
        "outposts.cyrillium_stock",
        "outposts.cyrillium_capacity",
        "outposts.cyrillium_mode",
        "outposts.food_stock",
        "outposts.food_capacity",
        "outposts.food_mode",
        "outposts.tech_stock",
        "outposts.tech_capacity",
        "outposts.tech_mode",
        "sectors.has_star_mall",
      )
      .orderBy("outposts.name");

    const directory = outposts.map((o: any) => ({
      id: o.id,
      name: o.name,
      sectorId: o.sector_id,
      sellsFuel: !!o.sells_fuel,
      hasStarMall: !!o.has_star_mall,
      cyrillium: {
        mode: o.cyrillium_mode,
        stock: o.cyrillium_stock,
        capacity: o.cyrillium_capacity,
        price: calculatePrice(
          "cyrillium",
          o.cyrillium_stock,
          o.cyrillium_capacity,
        ),
      },
      food: {
        mode: o.food_mode,
        stock: o.food_stock,
        capacity: o.food_capacity,
        price: calculatePrice("food", o.food_stock, o.food_capacity),
      },
      tech: {
        mode: o.tech_mode,
        stock: o.tech_stock,
        capacity: o.tech_capacity,
        price: calculatePrice("tech", o.tech_stock, o.tech_capacity),
      },
    }));

    res.json({ outposts: directory });
  } catch (err) {
    console.error("Trade directory error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
