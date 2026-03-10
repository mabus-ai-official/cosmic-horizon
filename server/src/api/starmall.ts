import { Router } from "express";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth";
import { SHIP_TYPES } from "../config/ship-types";
import { calculateEffectiveBonus, canInstallUpgrade } from "../engine/upgrades";
import {
  hasCantinaAccess,
  generateCantinaMissionPool,
} from "../engine/missions";
import { GAME_CONFIG } from "../config/game";
import db from "../db/connection";
import { pickFlavor, outpostNpcRace } from "../config/flavor-text";

const router = Router();

// Check if player is at a star mall (reused across endpoints)
async function requireStarMall(playerId: string) {
  const player = await db("players").where({ id: playerId }).first();
  if (!player)
    return {
      error: "Player not found",
      status: 404,
      player: null,
      sector: null,
    };

  const sector = await db("sectors")
    .where({ id: player.current_sector_id })
    .first();
  if (!sector?.has_star_mall) {
    return {
      error: "Must be at a star mall",
      status: 400,
      player: null,
      sector: null,
    };
  }
  return { error: null, status: 0, player, sector };
}

// === GARAGE: Ship Storage ===

// Store current ship in garage and switch to another
router.post("/garage/store", requireAuth, async (req, res) => {
  try {
    const { player, error, status } = await requireStarMall(
      req.session.playerId!,
    );
    if (error) return res.status(status).json({ error });

    const ship = await db("ships")
      .where({ id: player!.current_ship_id })
      .first();
    if (!ship) return res.status(400).json({ error: "No active ship" });
    if (ship.ship_type_id === "dodge_pod") {
      return res.status(400).json({ error: "Cannot store a dodge pod" });
    }

    // Mark ship as stored (not active)
    await db("ships").where({ id: ship.id }).update({ sector_id: null });

    // Give player a dodge pod if they have no other ships in this sector
    const otherShips = await db("ships")
      .where({ owner_id: player!.id, sector_id: player!.current_sector_id })
      .whereNot({ id: ship.id })
      .first();

    const garageRace = outpostNpcRace(player!.current_sector_id.toString());
    const storedShipType = SHIP_TYPES.find((s) => s.id === ship.ship_type_id);

    if (otherShips) {
      await db("players")
        .where({ id: player!.id })
        .update({ current_ship_id: otherShips.id });
      res.json({
        stored: ship.id,
        switchedTo: otherShips.id,
        message: pickFlavor("garage_store", garageRace, {
          ship: storedShipType?.name ?? ship.ship_type_id,
        }),
      });
    } else {
      // Create a temporary dodge pod
      const podId = crypto.randomUUID();
      await db("ships").insert({
        id: podId,
        ship_type_id: "dodge_pod",
        owner_id: player!.id,
        sector_id: player!.current_sector_id,
        weapon_energy: 0,
        max_weapon_energy: 0,
        engine_energy: 20,
        max_engine_energy: 20,
        cargo_holds: 0,
        max_cargo_holds: 0,
        hull_hp: 10,
        max_hull_hp: 10,
      });
      await db("players")
        .where({ id: player!.id })
        .update({ current_ship_id: podId });
      res.json({
        stored: ship.id,
        switchedTo: podId,
        note: "Boarding temporary dodge pod",
        message: pickFlavor("garage_store", garageRace, {
          ship: storedShipType?.name ?? ship.ship_type_id,
        }),
      });
    }
  } catch (err) {
    console.error("Garage store error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Retrieve ship from garage
router.post("/garage/retrieve/:shipId", requireAuth, async (req, res) => {
  try {
    const { player, error, status } = await requireStarMall(
      req.session.playerId!,
    );
    if (error) return res.status(status).json({ error });

    const shipId = req.params.shipId as string;
    const ship = await db("ships")
      .where({ id: shipId, owner_id: player!.id })
      .first();
    if (!ship)
      return res
        .status(404)
        .json({ error: "Ship not found or not owned by you" });
    if (ship.sector_id !== null) {
      return res.status(400).json({ error: "Ship is not in storage" });
    }

    // Move ship to current sector and switch to it
    await db("ships")
      .where({ id: ship.id })
      .update({ sector_id: player!.current_sector_id });
    await db("players")
      .where({ id: player!.id })
      .update({ current_ship_id: ship.id });

    const shipType = SHIP_TYPES.find((s) => s.id === ship.ship_type_id);

    const garageRace = outpostNpcRace(player!.current_sector_id.toString());
    res.json({
      retrieved: ship.id,
      shipType: ship.ship_type_id,
      name: shipType?.name ?? ship.ship_type_id,
      message: pickFlavor("garage_retrieve", garageRace, {
        ship: shipType?.name ?? ship.ship_type_id,
      }),
    });
  } catch (err) {
    console.error("Garage retrieve error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List ships in garage (stored ships)
router.get("/garage", requireAuth, async (req, res) => {
  try {
    const { player, error, status } = await requireStarMall(
      req.session.playerId!,
    );
    if (error) return res.status(status).json({ error });

    const storedShips = await db("ships")
      .where({ owner_id: player!.id })
      .whereNull("sector_id")
      .select(
        "id",
        "ship_type_id",
        "weapon_energy",
        "engine_energy",
        "cargo_holds",
      );

    const ships = storedShips.map((s) => {
      const shipType = SHIP_TYPES.find((st) => st.id === s.ship_type_id);
      return {
        id: s.id,
        type: s.ship_type_id,
        name: shipType?.name ?? s.ship_type_id,
        weaponEnergy: s.weapon_energy,
        engineEnergy: s.engine_energy,
        cargoHolds: s.cargo_holds,
      };
    });

    res.json({ ships });
  } catch (err) {
    console.error("Garage list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// === SHIP UPGRADES ===

// List available upgrade types
router.get("/garage/upgrades", requireAuth, async (req, res) => {
  try {
    const { player, error, status } = await requireStarMall(
      req.session.playerId!,
    );
    if (error) return res.status(status).json({ error });

    const upgrades = await db("upgrade_types").select("*");

    res.json({
      upgrades: upgrades.map((u) => ({
        id: u.id,
        name: u.name,
        description: u.description,
        slot: u.slot,
        statBonus: u.stat_bonus,
        price: u.price,
        maxStack: u.max_stack,
      })),
    });
  } catch (err) {
    console.error("Garage upgrades list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List upgrades installed on current ship
router.get("/garage/ship-upgrades", requireAuth, async (req, res) => {
  try {
    const { player, error, status } = await requireStarMall(
      req.session.playerId!,
    );
    if (error) return res.status(status).json({ error });

    if (!player!.current_ship_id) return res.json({ upgrades: [] });

    const upgrades = await db("ship_upgrades")
      .join(
        "upgrade_types",
        "ship_upgrades.upgrade_type_id",
        "upgrade_types.id",
      )
      .where({ "ship_upgrades.ship_id": player!.current_ship_id })
      .select(
        "ship_upgrades.id as installId",
        "upgrade_types.id as typeId",
        "upgrade_types.name",
        "upgrade_types.slot",
        "ship_upgrades.stack_position as stackPosition",
        "ship_upgrades.effective_bonus as effectiveBonus",
      );

    res.json({ upgrades });
  } catch (err) {
    console.error("Ship upgrades list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Install an upgrade on current ship
router.post("/garage/install/:id", requireAuth, async (req, res) => {
  try {
    const { player, error, status } = await requireStarMall(
      req.session.playerId!,
    );
    if (error) return res.status(status).json({ error });

    const upgradeTypeId = req.params.id as string;
    const upgradeType = await db("upgrade_types")
      .where({ id: upgradeTypeId })
      .first();
    if (!upgradeType)
      return res.status(404).json({ error: "Upgrade type not found" });

    if (!player!.current_ship_id)
      return res.status(400).json({ error: "No active ship" });

    // Check affordability
    if (Number(player!.credits) < upgradeType.price) {
      return res.status(400).json({ error: "Not enough credits" });
    }

    // Check if can install
    const check = await canInstallUpgrade(
      player!.current_ship_id,
      upgradeTypeId,
    );
    if (!check.allowed) return res.status(400).json({ error: check.reason });

    // Determine stack position
    const existingCount = await db("ship_upgrades")
      .where({
        ship_id: player!.current_ship_id,
        upgrade_type_id: upgradeTypeId,
      })
      .count("* as count")
      .first();
    const stackPosition = Number(existingCount?.count || 0);
    const effectiveBonus = calculateEffectiveBonus(
      upgradeType.stat_bonus,
      stackPosition,
    );

    // Deduct credits
    await db("players")
      .where({ id: player!.id })
      .update({
        credits: Number(player!.credits) - upgradeType.price,
      });

    // Install
    const installId = crypto.randomUUID();
    await db("ship_upgrades").insert({
      id: installId,
      ship_id: player!.current_ship_id,
      upgrade_type_id: upgradeTypeId,
      stack_position: stackPosition,
      effective_bonus: effectiveBonus,
    });

    res.json({
      installed: true,
      installId,
      name: upgradeType.name,
      slot: upgradeType.slot,
      effectiveBonus,
      newCredits: Number(player!.credits) - upgradeType.price,
    });
  } catch (err) {
    console.error("Install upgrade error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Uninstall an upgrade (no refund)
router.post("/garage/uninstall/:id", requireAuth, async (req, res) => {
  try {
    const { player, error, status } = await requireStarMall(
      req.session.playerId!,
    );
    if (error) return res.status(status).json({ error });

    const upgrade = await db("ship_upgrades")
      .where({ id: req.params.id })
      .first();

    if (!upgrade) return res.status(404).json({ error: "Upgrade not found" });

    // Verify the ship belongs to the player
    const ship = await db("ships")
      .where({ id: upgrade.ship_id, owner_id: player!.id })
      .first();
    if (!ship) return res.status(403).json({ error: "Not your ship" });

    await db("ship_upgrades").where({ id: upgrade.id }).del();

    res.json({ uninstalled: true, upgradeId: upgrade.id });
  } catch (err) {
    console.error("Uninstall upgrade error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// === SALVAGE YARD ===

// Sell a ship for salvage (50% of base price)
router.post("/salvage/sell/:shipId", requireAuth, async (req, res) => {
  try {
    const { player, error, status } = await requireStarMall(
      req.session.playerId!,
    );
    if (error) return res.status(status).json({ error });

    const shipId = req.params.shipId as string;
    if (shipId === player!.current_ship_id) {
      return res.status(400).json({
        error: "Cannot salvage your active ship. Switch to another first.",
      });
    }

    const ship = await db("ships")
      .where({ id: shipId, owner_id: player!.id })
      .first();
    if (!ship)
      return res
        .status(404)
        .json({ error: "Ship not found or not owned by you" });
    if (ship.ship_type_id === "dodge_pod") {
      return res
        .status(400)
        .json({ error: "Dodge pods have no salvage value" });
    }

    const shipType = SHIP_TYPES.find((s) => s.id === ship.ship_type_id);
    const salvageValue = Math.floor((shipType?.price ?? 0) * 0.5);

    // Check for cargo — must be empty
    const totalCargo =
      (ship.cyrillium_cargo || 0) +
      (ship.food_cargo || 0) +
      (ship.tech_cargo || 0) +
      (ship.colonist_cargo || 0);
    if (totalCargo > 0) {
      return res
        .status(400)
        .json({ error: "Ship must be empty of cargo before salvaging" });
    }

    await db("ships").where({ id: ship.id }).del();
    await db("players")
      .where({ id: player!.id })
      .update({
        credits: Number(player!.credits) + salvageValue,
      });

    const salvageRace = outpostNpcRace(player!.current_sector_id.toString());
    res.json({
      salvaged: ship.id,
      shipType: ship.ship_type_id,
      salvageValue,
      newCredits: Number(player!.credits) + salvageValue,
      message: pickFlavor("salvage", salvageRace, {
        ship: shipType?.name ?? ship.ship_type_id,
        value: salvageValue,
      }),
    });
  } catch (err) {
    console.error("Salvage sell error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// View salvage prices for owned ships
router.get("/salvage", requireAuth, async (req, res) => {
  try {
    const { player, error, status } = await requireStarMall(
      req.session.playerId!,
    );
    if (error) return res.status(status).json({ error });

    const ships = await db("ships")
      .where({ owner_id: player!.id })
      .whereNot({ id: player!.current_ship_id })
      .select(
        "id",
        "ship_type_id",
        "cyrillium_cargo",
        "food_cargo",
        "tech_cargo",
        "colonist_cargo",
      );

    const salvageOptions = ships
      .filter((s) => s.ship_type_id !== "dodge_pod")
      .map((s) => {
        const shipType = SHIP_TYPES.find((st) => st.id === s.ship_type_id);
        const totalCargo =
          (s.cyrillium_cargo || 0) +
          (s.food_cargo || 0) +
          (s.tech_cargo || 0) +
          (s.colonist_cargo || 0);
        return {
          id: s.id,
          type: s.ship_type_id,
          name: shipType?.name ?? s.ship_type_id,
          salvageValue: Math.floor((shipType?.price ?? 0) * 0.5),
          hasCargo: totalCargo > 0,
        };
      });

    res.json({ ships: salvageOptions });
  } catch (err) {
    console.error("Salvage list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// === CANTINA ===

const CANTINA_RUMORS = [
  "I heard there's a rich cyrillium vein in the outer sectors...",
  "Watch out for pirates near sector 2500. They've been ambushing freighters.",
  'The Syndicate "Void Runners" controls most of the northern trade routes.',
  "A barnacle mine nearly took out my engines last week. Check your scanner!",
  "They say there's an uncharted sector with three habitable planets...",
  "The price of tech components has been skyrocketing near the frontier.",
  "I saw a Shadow Runner decloak right in front of me. Scared me half to death.",
  "The star malls are running low on jump drives. Better grab one while you can.",
  "Some pilot found a volcanic planet producing 500 cyrillium per cycle.",
  "There's a bounty board near the entrance. Some big rewards posted lately.",
  "The food trade between ocean worlds and desert worlds is incredibly profitable.",
  "Never trust a pilot with a Rache device. They're desperate.",
  "Colony ships are slow, but the cargo capacity is worth it for colonization runs.",
  "I heard the best-defended planets have level 7 upgrades. Practically impenetrable.",
  "Toll drones in the chokepoints are making some pilots very rich.",
];

const CANTINA_INTEL_COST = 500;

// Visit cantina — get a random rumor for free
router.get("/cantina", requireAuth, async (req, res) => {
  try {
    const { player, error, status } = await requireStarMall(
      req.session.playerId!,
    );
    if (error) return res.status(status).json({ error });

    const rumor =
      CANTINA_RUMORS[Math.floor(Math.random() * CANTINA_RUMORS.length)];
    const cantinaUnlocked = await hasCantinaAccess(player!.id);

    const cantinaRace = outpostNpcRace(player!.current_sector_id.toString());
    res.json({
      rumor,
      intelAvailable: true,
      intelCost: CANTINA_INTEL_COST,
      cantinaUnlocked,
      message: pickFlavor("cantina_rumor", cantinaRace),
    });
  } catch (err) {
    console.error("Cantina error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Talk to the bartender — may offer a cantina mission
router.post("/cantina/talk", requireAuth, async (req, res) => {
  try {
    const { player, error, status } = await requireStarMall(
      req.session.playerId!,
    );
    if (error) return res.status(status).json({ error });

    const unlocked = await hasCantinaAccess(player!.id);
    if (!unlocked) {
      return res.json({
        hasMission: false,
        dialogue:
          "The bartender eyes you suspiciously. 'You haven't proven yourself yet, pilot. Come back when you've earned some trust around here.'",
        cantinaUnlocked: false,
      });
    }

    // Block cantina missions during active story mission
    try {
      const { hasActiveStoryMission } =
        await import("../engine/story-missions");
      const storyActive = await hasActiveStoryMission(player!.id);
      if (storyActive) {
        return res.json({
          hasMission: false,
          dialogue:
            "The bartender leans back and studies you. 'I can see you're on an important quest, spacer. Come back when you need more work.'",
          cantinaUnlocked: true,
        });
      }
    } catch {
      /* story tables may not exist yet */
    }

    // Check random chance
    if (Math.random() > GAME_CONFIG.CANTINA_MISSION_CHANCE) {
      const noMissionDialogues = [
        "The bartender polishes a glass. 'Nothing right now, friend. Check back later.'",
        "'I might have something for you soon. Come back in a while.'",
        "The bartender shakes their head. 'The underworld is quiet today. Try again later.'",
        "'My contacts haven't reached out yet. Give it some time.'",
      ];
      return res.json({
        hasMission: false,
        dialogue:
          noMissionDialogues[
            Math.floor(Math.random() * noMissionDialogues.length)
          ],
        cantinaUnlocked: true,
      });
    }

    // Get player level
    const prog = await db("player_progression")
      .where({ player_id: player!.id })
      .first();
    const playerLevel = prog?.level || 1;

    const mission = await generateCantinaMissionPool(player!.id, playerLevel);
    if (!mission) {
      return res.json({
        hasMission: false,
        dialogue:
          "The bartender leans in. 'You've done everything I have for now. Impressive.'",
        cantinaUnlocked: true,
      });
    }

    res.json({
      hasMission: true,
      dialogue: `The bartender slides a datapad across the counter. 'I've got a job for you: ${mission.title}. Interested?'`,
      mission,
      cantinaUnlocked: true,
    });
  } catch (err) {
    console.error("Cantina talk error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Buy sector intel — reveals top-traded outposts and dangerous sectors
router.post("/cantina/intel", requireAuth, async (req, res) => {
  try {
    const { player, error, status } = await requireStarMall(
      req.session.playerId!,
    );
    if (error) return res.status(status).json({ error });

    if (Number(player!.credits) < CANTINA_INTEL_COST) {
      return res.status(400).json({ error: "Not enough credits for intel" });
    }

    await db("players")
      .where({ id: player!.id })
      .update({
        credits: Number(player!.credits) - CANTINA_INTEL_COST,
      });

    // Gather intel: richest outposts, most populated planets, recent combat
    const richOutposts = await db("outposts")
      .orderBy("treasury", "desc")
      .limit(5)
      .select("name", "sector_id as sectorId", "treasury");

    const topPlanets = await db("planets")
      .where("colonists", ">", 0)
      .orderBy("colonists", "desc")
      .limit(5)
      .select(
        "name",
        "sector_id as sectorId",
        "colonists",
        "planet_class as planetClass",
      );

    const recentCombat = await db("combat_logs")
      .orderBy("created_at", "desc")
      .limit(5)
      .select("sector_id as sectorId", "outcome", "created_at as timestamp");

    const dangerousSectors = recentCombat.map((c) => c.sectorId);

    const intelRace = outpostNpcRace(player!.current_sector_id.toString());
    res.json({
      intel: {
        richOutposts,
        topPlanets,
        dangerousSectors: [...new Set(dangerousSectors)],
      },
      cost: CANTINA_INTEL_COST,
      newCredits: Number(player!.credits) - CANTINA_INTEL_COST,
      message: pickFlavor("intel_buy", intelRace),
    });
  } catch (err) {
    console.error("Cantina intel error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// === STAR MALL OVERVIEW ===

// Get overview of all star mall services available
router.get("/overview", requireAuth, async (req, res) => {
  try {
    const { player, error, status } = await requireStarMall(
      req.session.playerId!,
    );
    if (error) return res.status(status).json({ error });

    const storedShipCount = await db("ships")
      .where({ owner_id: player!.id })
      .whereNull("sector_id")
      .count("* as count")
      .first();

    const activeBounties = await db("bounties")
      .where({ active: true })
      .count("* as count")
      .first();

    const mallRace = outpostNpcRace(player!.current_sector_id.toString());
    res.json({
      sectorId: player!.current_sector_id,
      message: pickFlavor("mall_welcome", mallRace),
      services: {
        shipDealer: { available: true, endpoint: "/api/ships/dealer" },
        generalStore: { available: true, endpoint: "/api/store/catalog" },
        garage: {
          available: true,
          endpoint: "/api/starmall/garage",
          storedShips: Number(storedShipCount?.count ?? 0),
        },
        salvageYard: { available: true, endpoint: "/api/starmall/salvage" },
        cantina: { available: true, endpoint: "/api/starmall/cantina" },
        refueling: { available: true, endpoint: "/api/store/refuel" },
        bountyBoard: {
          available: true,
          endpoint: "/api/social/bounties",
          activeBounties: Number(activeBounties?.count ?? 0),
        },
      },
      credits: Number(player!.credits),
    });
  } catch (err) {
    console.error("Star mall overview error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
