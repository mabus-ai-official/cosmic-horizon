/**
 * Crew API — Phase 4: Hire, assign, manage crew members.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import db from "../db/connection";
import { syncPlayer } from "../ws/sync";
import type { SubsystemType } from "../engine/combat-v2";

const router = Router();

const VALID_STATIONS: SubsystemType[] = [
  "shields",
  "weapons",
  "engines",
  "sensors",
  "life_support",
];

const CREW_NAMES = [
  "Kira Vasquez",
  "Jax Thornton",
  "Ren Akamatsu",
  "Sable Orin",
  "Dag Voss",
  "Lena Hark",
  "Tarek Sol",
  "Nyx Ember",
  "Cole Bridger",
  "Aya Reeves",
  "Finn Okoro",
  "Zara Dune",
  "Pike Morrow",
  "Iris Tan",
  "Rook Severn",
  "Mira Cortez",
  "Ash Delgado",
  "Kai Wren",
  "Suri Patel",
  "Dex Ramone",
];

const CREW_ROLES = ["gunner", "engineer", "medic", "pilot", "tactician"];

/**
 * GET /roster — List player's crew.
 */
router.get("/roster", requireAuth, async (req, res) => {
  try {
    const crew = await db("crew_members")
      .where({ player_id: req.session.playerId! })
      .select("*");
    res.json({ crew });
  } catch (err) {
    console.error("Crew roster error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /for-hire — List crew available at current starmall.
 */
router.get("/for-hire", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId! })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const sector = await db("sectors")
      .where({ id: player.current_sector_id })
      .first();
    if (!sector?.has_star_mall) {
      return res.status(400).json({ error: "Not at a Star Mall" });
    }

    // Check if this sector has crew for hire, generate if not
    let available = await db("crew_for_hire")
      .where({ sector_id: player.current_sector_id })
      .select("*");

    if (available.length === 0) {
      // Generate 3-5 crew for hire at this location
      const count = 3 + Math.floor(Math.random() * 3);
      const usedNames = new Set<string>();

      for (let i = 0; i < count; i++) {
        let name: string;
        do {
          name = CREW_NAMES[Math.floor(Math.random() * CREW_NAMES.length)];
        } while (usedNames.has(name));
        usedNames.add(name);

        const role = CREW_ROLES[Math.floor(Math.random() * CREW_ROLES.length)];
        const skillLevel = 1 + Math.floor(Math.random() * 3); // 1-3
        const hireCost = skillLevel * 2000 + Math.floor(Math.random() * 1000);

        await db("crew_for_hire").insert({
          sector_id: player.current_sector_id,
          name,
          role,
          skill_level: skillLevel,
          hire_cost: hireCost,
        });
      }

      available = await db("crew_for_hire")
        .where({ sector_id: player.current_sector_id })
        .select("*");
    }

    res.json({ available, credits: Number(player.credits) });
  } catch (err) {
    console.error("Crew for-hire error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /hire/:crewForHireId — Hire a crew member.
 */
router.post("/hire/:crewForHireId", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId! })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const recruit = await db("crew_for_hire")
      .where({ id: req.params.crewForHireId })
      .first();
    if (!recruit) return res.status(404).json({ error: "Recruit not found" });

    if (Number(player.credits) < recruit.hire_cost) {
      return res.status(400).json({ error: "Insufficient credits" });
    }

    // Max 5 crew
    const crewCount = await db("crew_members")
      .where({ player_id: player.id })
      .count("id as count")
      .first();
    if (Number(crewCount?.count ?? 0) >= 5) {
      return res.status(400).json({ error: "Crew is full (max 5)" });
    }

    await db("players")
      .where({ id: player.id })
      .decrement("credits", recruit.hire_cost);

    await db("crew_members").insert({
      player_id: player.id,
      name: recruit.name,
      role: recruit.role,
      skill_level: recruit.skill_level,
      hp: 100,
      max_hp: 100,
      status: "idle",
      morale: 75,
    });

    await db("crew_for_hire").where({ id: recruit.id }).del();

    const io = req.app.get("io");
    if (io) syncPlayer(io, player.id, "sync:status");

    res.json({
      message: `Hired ${recruit.name} (${recruit.role})`,
      newCredits: Number(player.credits) - recruit.hire_cost,
    });
  } catch (err) {
    console.error("Crew hire error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /assign — Assign a crew member to a station.
 */
router.post("/assign", requireAuth, async (req, res) => {
  try {
    const { crewMemberId, station } = req.body;
    if (!crewMemberId) {
      return res.status(400).json({ error: "Missing crewMemberId" });
    }

    const crew = await db("crew_members")
      .where({ id: crewMemberId, player_id: req.session.playerId! })
      .first();
    if (!crew) return res.status(404).json({ error: "Crew member not found" });

    if (crew.status === "dead" || crew.status === "injured") {
      return res.status(400).json({ error: "Crew member is unavailable" });
    }

    if (station === null) {
      // Unassign
      await db("crew_members").where({ id: crewMemberId }).update({
        assigned_station: null,
        status: "idle",
      });
    } else {
      if (!VALID_STATIONS.includes(station)) {
        return res.status(400).json({ error: "Invalid station" });
      }

      // Unassign anyone currently at this station
      await db("crew_members")
        .where({ player_id: req.session.playerId!, assigned_station: station })
        .update({ assigned_station: null, status: "idle" });

      await db("crew_members").where({ id: crewMemberId }).update({
        assigned_station: station,
        status: "stationed",
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Crew assign error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /dismiss/:crewMemberId — Dismiss a crew member.
 */
router.post("/dismiss/:crewMemberId", requireAuth, async (req, res) => {
  try {
    const deleted = await db("crew_members")
      .where({
        id: req.params.crewMemberId,
        player_id: req.session.playerId!,
      })
      .del();

    if (deleted === 0) {
      return res.status(404).json({ error: "Crew member not found" });
    }

    res.json({ success: true, message: "Crew member dismissed" });
  } catch (err) {
    console.error("Crew dismiss error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
