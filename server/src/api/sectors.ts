import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { checkPrerequisite } from "../engine/missions";
import { GAME_CONFIG } from "../config/game";
import db from "../db/connection";
import { syncPlayer } from "../ws/sync";

const router = Router();

// Get sector claim info
router.get("/:id/info", requireAuth, async (req, res) => {
  try {
    const sectorId = parseInt(req.params.id as string);
    if (isNaN(sectorId))
      return res.status(400).json({ error: "Invalid sector ID" });

    const sector = await db("sectors").where({ id: sectorId }).first();
    if (!sector) return res.status(404).json({ error: "Sector not found" });

    let owner: { name: string; type: "player" | "syndicate" } | null = null;
    if (sector.claimed_by_player_id) {
      const player = await db("players")
        .where({ id: sector.claimed_by_player_id })
        .first();
      if (player) owner = { name: player.username, type: "player" };
    } else if (sector.claimed_by_syndicate_id) {
      const syndicate = await db("syndicates")
        .where({ id: sector.claimed_by_syndicate_id })
        .first();
      if (syndicate) owner = { name: syndicate.name, type: "syndicate" };
    }

    res.json({
      sectorId,
      sectorName: sector.sector_name,
      isNpcStarmall: !!sector.is_npc_starmall,
      owner,
      claimedAt: sector.claimed_at,
    });
  } catch (err) {
    console.error("Sector info error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Claim a sector
router.post("/:id/claim", requireAuth, async (req, res) => {
  try {
    const sectorId = parseInt(req.params.id as string);
    if (isNaN(sectorId))
      return res.status(400).json({ error: "Invalid sector ID" });

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });
    if (player.current_sector_id !== sectorId) {
      return res
        .status(400)
        .json({ error: "You must be in the sector to claim it" });
    }

    const sector = await db("sectors").where({ id: sectorId }).first();
    if (!sector) return res.status(404).json({ error: "Sector not found" });
    if (sector.is_npc_starmall || sector.has_star_mall) {
      return res
        .status(400)
        .json({ error: "Star Mall sectors cannot be claimed" });
    }
    if (sector.type === "protected") {
      return res
        .status(400)
        .json({ error: "Protected sectors cannot be claimed" });
    }
    if (sector.claimed_by_player_id || sector.claimed_by_syndicate_id) {
      return res.status(400).json({ error: "Sector is already claimed" });
    }

    const { claimType } = req.body;

    if (claimType === "syndicate") {
      const membership = await db("syndicate_members")
        .where({ player_id: player.id })
        .first();
      if (!membership) {
        return res.status(400).json({ error: "You are not in a syndicate" });
      }
      await db("sectors").where({ id: sectorId }).update({
        claimed_by_syndicate_id: membership.syndicate_id,
        claimed_at: new Date().toISOString(),
      });
    } else {
      await db("sectors").where({ id: sectorId }).update({
        claimed_by_player_id: player.id,
        claimed_at: new Date().toISOString(),
      });
    }

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        player.id,
        "sync:sector",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({ success: true, message: `Sector ${sectorId} claimed` });
  } catch (err) {
    console.error("Sector claim error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Name a claimed sector
router.post("/:id/name", requireAuth, async (req, res) => {
  try {
    const sectorId = parseInt(req.params.id as string);
    if (isNaN(sectorId))
      return res.status(400).json({ error: "Invalid sector ID" });

    const { name } = req.body;
    if (
      !name ||
      typeof name !== "string" ||
      name.trim().length < 3 ||
      name.trim().length > 32
    ) {
      return res.status(400).json({ error: "Name must be 3-32 characters" });
    }

    const sector = await db("sectors").where({ id: sectorId }).first();
    if (!sector) return res.status(404).json({ error: "Sector not found" });

    const playerId = req.session.playerId!;

    // Check naming authority (Stellar Census mission)
    const hasAuthority = await checkPrerequisite(
      playerId,
      GAME_CONFIG.NAMING_CONVENTION_MISSION_ID,
    );
    if (!hasAuthority) {
      return res.status(403).json({
        error:
          "Complete the 'Stellar Census' mission to unlock naming authority",
      });
    }

    // Check ownership
    if (sector.claimed_by_player_id === playerId) {
      // Player owns it directly
    } else if (sector.claimed_by_syndicate_id) {
      // Check if player is an officer in the syndicate
      const membership = await db("syndicate_members")
        .where({
          player_id: playerId,
          syndicate_id: sector.claimed_by_syndicate_id,
        })
        .first();
      if (
        !membership ||
        (membership.role !== "leader" && membership.role !== "officer")
      ) {
        return res.status(403).json({
          error: "Only syndicate officers can name syndicate sectors",
        });
      }
    } else {
      return res.status(403).json({ error: "You do not own this sector" });
    }

    await db("sectors")
      .where({ id: sectorId })
      .update({ sector_name: name.trim() });

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        playerId,
        "sync:sector",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({ success: true, sectorName: name.trim() });
  } catch (err) {
    console.error("Sector name error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Conquer a claimed sector
router.post("/:id/conquer", requireAuth, async (req, res) => {
  try {
    const sectorId = parseInt(req.params.id as string);
    if (isNaN(sectorId))
      return res.status(400).json({ error: "Invalid sector ID" });

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });
    if (player.current_sector_id !== sectorId) {
      return res
        .status(400)
        .json({ error: "You must be in the sector to conquer it" });
    }

    const sector = await db("sectors").where({ id: sectorId }).first();
    if (!sector) return res.status(404).json({ error: "Sector not found" });
    if (sector.is_npc_starmall || sector.has_star_mall) {
      return res
        .status(400)
        .json({ error: "Star Mall sectors cannot be conquered" });
    }
    if (sector.type === "protected") {
      return res
        .status(400)
        .json({ error: "Protected sectors cannot be conquered" });
    }
    if (!sector.claimed_by_player_id && !sector.claimed_by_syndicate_id) {
      return res
        .status(400)
        .json({ error: "Sector is not claimed — use claim instead" });
    }

    // Check if player owns majority of planets in sector
    const totalPlanets = await db("planets")
      .where({ sector_id: sectorId })
      .count("id as count")
      .first();
    const ownedPlanets = await db("planets")
      .where({ sector_id: sectorId, owner_id: player.id })
      .count("id as count")
      .first();
    const total = Number(totalPlanets?.count || 0);
    const owned = Number(ownedPlanets?.count || 0);

    if (total === 0 || owned <= total / 2) {
      return res.status(400).json({
        error: "You must own a majority of planets in the sector to conquer it",
      });
    }

    // Notify previous owner
    const io = req.app.get("io");
    if (sector.claimed_by_player_id && io) {
      io.to(`player:${sector.claimed_by_player_id}`).emit("notification", {
        type: "warning",
        message: `Your sector ${sectorId}${sector.sector_name ? ` (${sector.sector_name})` : ""} has been conquered by ${player.username}!`,
      });
    }

    const { claimType } = req.body;
    if (claimType === "syndicate") {
      const membership = await db("syndicate_members")
        .where({ player_id: player.id })
        .first();
      if (!membership)
        return res.status(400).json({ error: "You are not in a syndicate" });
      await db("sectors").where({ id: sectorId }).update({
        claimed_by_player_id: null,
        claimed_by_syndicate_id: membership.syndicate_id,
        claimed_at: new Date().toISOString(),
      });
    } else {
      await db("sectors").where({ id: sectorId }).update({
        claimed_by_player_id: player.id,
        claimed_by_syndicate_id: null,
        claimed_at: new Date().toISOString(),
      });
    }

    // Multi-session sync
    if (io)
      syncPlayer(
        io,
        player.id,
        "sync:sector",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({ success: true, message: `Sector ${sectorId} conquered` });
  } catch (err) {
    console.error("Sector conquer error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
