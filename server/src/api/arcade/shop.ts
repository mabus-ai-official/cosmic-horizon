import { Router } from "express";
import crypto from "crypto";
import { requireAuth } from "../../middleware/auth";
import db from "../../db/connection";
import {
  canInstallUpgrade,
  calculateEffectiveBonus,
} from "../../engine/upgrades";
import { syncPlayer } from "../../ws/sync";

const router = Router();

// List upgrades available for tokens
router.get("/shop", requireAuth, async (req, res) => {
  const playerId = req.session.playerId!;

  const player = await db("players")
    .where({ id: playerId })
    .select("arcade_tokens")
    .first();
  if (!player) return res.status(404).json({ error: "Player not found" });

  const items = await db("upgrade_types")
    .whereNotNull("token_price")
    .where("token_price", ">", 0)
    .select(
      "id",
      "name",
      "description",
      "slot",
      "stat_bonus",
      "token_price",
      "max_stack",
    );

  res.json({
    balance: Number(player.arcade_tokens),
    items,
  });
});

// Get token balance
router.get("/shop/balance", requireAuth, async (req, res) => {
  const playerId = req.session.playerId!;
  const player = await db("players")
    .where({ id: playerId })
    .select("arcade_tokens")
    .first();
  if (!player) return res.status(404).json({ error: "Player not found" });

  res.json({ balance: Number(player.arcade_tokens) });
});

// Buy upgrade with tokens
router.post("/shop/buy/:upgradeTypeId", requireAuth, async (req, res) => {
  const playerId = req.session.playerId!;
  const upgradeTypeId = req.params.upgradeTypeId as string;

  const player = await db("players").where({ id: playerId }).first();
  if (!player) return res.status(404).json({ error: "Player not found" });

  const upgradeType = await db("upgrade_types")
    .where({ id: upgradeTypeId })
    .first();
  if (!upgradeType || !upgradeType.token_price) {
    return res
      .status(404)
      .json({ error: "Upgrade not available in token shop" });
  }

  if (Number(player.arcade_tokens) < upgradeType.token_price) {
    return res.status(400).json({ error: "Not enough arcade tokens" });
  }

  if (!player.current_ship_id) {
    return res.status(400).json({ error: "No active ship" });
  }

  const check = await canInstallUpgrade(player.current_ship_id, upgradeTypeId);
  if (!check.allowed) {
    return res.status(400).json({ error: check.reason });
  }

  // Determine stack position
  const existingCount = await db("ship_upgrades")
    .where({ ship_id: player.current_ship_id, upgrade_type_id: upgradeTypeId })
    .count("* as count")
    .first();
  const stackPosition = Number(existingCount?.count || 0);
  const effectiveBonus = calculateEffectiveBonus(
    upgradeType.stat_bonus,
    stackPosition,
  );

  // Deduct tokens
  await db("players")
    .where({ id: playerId })
    .update({
      arcade_tokens: Number(player.arcade_tokens) - upgradeType.token_price,
    });

  // Install upgrade
  const installId = crypto.randomUUID();
  await db("ship_upgrades").insert({
    id: installId,
    ship_id: player.current_ship_id,
    upgrade_type_id: upgradeTypeId,
    stack_position: stackPosition,
    effective_bonus: effectiveBonus,
  });

  const io = req.app.get("io");
  syncPlayer(io, playerId, "sync:status");

  res.json({
    installed: true,
    installId,
    name: upgradeType.name,
    slot: upgradeType.slot,
    effectiveBonus,
    newBalance: Number(player.arcade_tokens) - upgradeType.token_price,
  });
});

export default router;
