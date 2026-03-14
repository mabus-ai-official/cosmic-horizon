import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getNPCsInSector,
  getUnencounteredNPCsInSector,
  processDialogue,
  markEncountered,
  getContacts,
  getNPCDetail,
  getPlayerFactionReps,
  getIntelLog,
} from "../engine/npcs";
import db from "../db/connection";
import {
  getVendorItemsForNPC,
  getAllVendorItems,
} from "../config/vendor-items";

const router = Router();

// List NPCs in player's current sector
router.get("/sector", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const npcs = await getNPCsInSector(player.current_sector_id, player.id);

    res.json({ npcs });
  } catch (err) {
    console.error("NPC sector list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Dialogue interaction with an NPC
router.post("/:npcId/talk", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const npc = await db("npc_definitions")
      .where({ id: req.params.npcId })
      .first();
    if (!npc) return res.status(404).json({ error: "NPC not found" });

    // If NPC is at an outpost, player must be docked to talk
    if (npc.location_type === "outpost" && !player.docked_at_outpost_id) {
      return res.status(400).json({
        error: "You need to dock at the outpost to speak with this NPC.",
      });
    }

    // Distance check with Muscarian bypass
    if (npc.sector_id !== player.current_sector_id) {
      const isMuscarian = player.race === "muscarian";
      const hasSporeCommunicator = !isMuscarian
        ? await db("game_events")
            .where({
              player_id: player.id,
              event_type: "item:spore_communicator",
              read: false,
            })
            .first()
        : true;

      if (!isMuscarian && !hasSporeCommunicator) {
        return res.status(400).json({
          error:
            "NPC is not in your sector. Acquire a Spore Communicator from the Muscarian to contact NPCs remotely.",
        });
      }
      // Allowed — remote talk via Muscarian race or Spore Communicator
    }

    const { choiceIndex } = req.body;
    const result = await processDialogue(player.id, npc.id, choiceIndex);

    res.json(result);
  } catch (err) {
    console.error("NPC talk error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark NPC as encountered (after cutscene)
router.post("/:npcId/encountered", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const npc = await db("npc_definitions")
      .where({ id: req.params.npcId })
      .first();
    if (!npc) return res.status(404).json({ error: "NPC not found" });
    if (npc.sector_id !== player.current_sector_id)
      return res.status(400).json({ error: "NPC is not in your sector" });

    const result = await markEncountered(player.id, req.params.npcId as string);

    res.json({
      encountered: true,
      xp: {
        awarded: result.xp.xpAwarded,
        total: result.xp.totalXp,
        level: result.xp.level,
        rank: result.xp.rank,
        levelUp: result.xp.levelUp,
      },
    });
  } catch (err) {
    console.error("NPC encountered error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Player's faction standing (fame/infamy)
router.get("/factions", requireAuth, async (req, res) => {
  try {
    const reps = await getPlayerFactionReps(req.session.playerId as string);
    res.json({ factions: reps });
  } catch (err) {
    console.error("Faction reps error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Player's contact journal
router.get("/contacts", requireAuth, async (req, res) => {
  try {
    const contacts = await getContacts(req.session.playerId as string);

    res.json({ contacts });
  } catch (err) {
    console.error("NPC contacts error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Player's NPC dialogue intel log
router.get("/intel", requireAuth, async (req, res) => {
  try {
    const entries = await getIntelLog(req.session.playerId as string);
    res.json({ entries });
  } catch (err) {
    console.error("Intel log error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Detailed NPC info (must have encountered)
router.get("/:npcId", requireAuth, async (req, res) => {
  try {
    const detail = await getNPCDetail(
      req.session.playerId as string,
      req.params.npcId as string,
    );
    if (!detail)
      return res
        .status(404)
        .json({ error: "NPC not found or not yet encountered" });

    res.json(detail);
  } catch (err) {
    console.error("NPC detail error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// NPC vendor - get items for sale
router.get("/:npcId/vendor", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const npc = await db("npc_definitions")
      .where({ id: req.params.npcId })
      .first();
    if (!npc) return res.status(404).json({ error: "NPC not found" });
    if (npc.sector_id !== player.current_sector_id) {
      return res.status(400).json({ error: "NPC is not in your sector" });
    }

    const services =
      typeof npc.services === "string"
        ? JSON.parse(npc.services)
        : npc.services;
    if (!services.includes("trade") && !services.includes("vendor")) {
      return res.status(400).json({ error: "This NPC does not sell items" });
    }

    // Get vendor items for this NPC based on race, faction, and type
    const items = getVendorItemsForNPC(npc);

    if (items.length === 0) {
      return res.json({ items: [], npcName: npc.name });
    }
    const playerReps = await db("player_faction_rep")
      .where({ player_id: player.id })
      .select("faction_id", "fame");
    const fameMap = new Map(playerReps.map((r: any) => [r.faction_id, r.fame]));

    const vendorItems = items.map((item) => ({
      ...item,
      playerFame: fameMap.get(item.requiredFactionId) || 0,
      available:
        (fameMap.get(item.requiredFactionId) || 0) >= item.requiredFame,
    }));

    res.json({ items: vendorItems, npcName: npc.name });
  } catch (err) {
    console.error("NPC vendor error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// NPC vendor - buy item
router.post("/:npcId/vendor/buy", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const npc = await db("npc_definitions")
      .where({ id: req.params.npcId })
      .first();
    if (!npc) return res.status(404).json({ error: "NPC not found" });
    if (npc.sector_id !== player.current_sector_id) {
      return res.status(400).json({ error: "NPC is not in your sector" });
    }

    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: "Missing itemId" });

    // Get all vendor items and find the requested one
    const allItems = getAllVendorItems();
    const item = allItems.find((i) => i.id === itemId);
    if (!item)
      return res.status(404).json({ error: "Item not found at this vendor" });

    // Check fame requirement
    const rep = await db("player_faction_rep")
      .where({ player_id: player.id, faction_id: item.requiredFactionId })
      .first();
    const playerFame = rep?.fame || 0;
    if (playerFame < item.requiredFame) {
      return res.status(400).json({
        error: `Requires ${item.requiredFame} fame with ${item.requiredFactionId} (you have ${playerFame})`,
      });
    }

    // Check credits
    if (Number(player.credits) < item.price) {
      return res.status(400).json({
        error: `Not enough credits (need ${item.price}, have ${player.credits})`,
      });
    }

    // Deduct credits and add to inventory (stored as game_events)
    await db("players")
      .where({ id: player.id })
      .decrement("credits", item.price);

    await db("game_events").insert({
      id: require("crypto").randomUUID(),
      player_id: player.id,
      event_type: `item:${itemId}`,
      data: JSON.stringify({
        itemId,
        purchasedAt: new Date(),
        source: "npc_vendor",
        npcId: req.params.npcId,
      }),
      read: false,
    });

    res.json({
      success: true,
      message: `Purchased ${item.name}`,
      creditsSpent: item.price,
    });
  } catch (err) {
    console.error("NPC vendor buy error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
