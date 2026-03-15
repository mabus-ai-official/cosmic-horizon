import { Router } from "express";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth";
import db from "../db/connection";
import { notifyPlayer } from "../ws/handlers";
import {
  settleCreditPlayer,
  settleDebitPlayer,
  settleResourceCredit,
  settleResourceDebit,
  settleTransferPlanet,
  settleTransferBetweenPlayers,
} from "../chain/tx-queue";

const router = Router();

// ─── Types ───────────────────────────────────────────────────────────

interface TradeItem {
  itemType: "credits" | "resource" | "cargo" | "tablet" | "planet" | "upgrade";
  itemId?: string;
  quantity: number;
}

const VALID_ITEM_TYPES = [
  "credits",
  "resource",
  "cargo",
  "tablet",
  "planet",
  "upgrade",
];
const VALID_CARGO_TYPES = ["cyrillium", "food", "tech"];
const MAX_PENDING_OFFERS = 5;
const MAX_ITEMS_PER_SIDE = 10;
const OFFER_TTL_MS = 24 * 60 * 60 * 1000;

// ─── Helpers ─────────────────────────────────────────────────────────

function formatItem(item: any): string {
  const meta =
    typeof item.metadata === "string"
      ? JSON.parse(item.metadata || "{}")
      : item.metadata || {};
  const name = meta.name || item.item_id || item.item_type;
  if (item.item_type === "credits") return `${item.quantity} credits`;
  if (item.quantity > 1) return `${item.quantity}x ${name}`;
  return name;
}

function formatOfferDesc(items: any[]): string {
  return items.map(formatItem).join(", ");
}

async function enrichOffer(offer: any) {
  const items = await db("trade_offer_items")
    .where({ offer_id: offer.id })
    .select("*");
  return {
    id: offer.id,
    senderId: offer.sender_id,
    senderName: offer.sender_name,
    recipientId: offer.recipient_id,
    recipientName: offer.recipient_name,
    parentOfferId: offer.parent_offer_id || null,
    status: offer.status,
    message: offer.message || null,
    createdAt: offer.created_at,
    expiresAt: offer.expires_at,
    resolvedAt: offer.resolved_at || null,
    offeredItems: items
      .filter((i: any) => i.side === "offered")
      .map((i: any) => ({
        id: i.id,
        itemType: i.item_type,
        itemId: i.item_id,
        quantity: i.quantity,
        metadata:
          typeof i.metadata === "string"
            ? JSON.parse(i.metadata || "{}")
            : i.metadata || {},
      })),
    requestedItems: items
      .filter((i: any) => i.side === "requested")
      .map((i: any) => ({
        id: i.id,
        itemType: i.item_type,
        itemId: i.item_id,
        quantity: i.quantity,
        metadata:
          typeof i.metadata === "string"
            ? JSON.parse(i.metadata || "{}")
            : i.metadata || {},
      })),
  };
}

// ─── GET /tradeable-assets ───────────────────────────────────────────

router.get("/tradeable-assets", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const player = await db("players").where({ id: playerId }).first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    // Credits
    const credits = Number(player.credits) || 0;

    // Player resources
    const resources = await db("player_resources as pr")
      .join("resource_definitions as rd", "pr.resource_id", "rd.id")
      .where({ "pr.player_id": playerId })
      .andWhere("pr.quantity", ">", 0)
      .select("pr.resource_id as id", "rd.name", "pr.quantity");

    // Ship cargo
    const cargo: { commodity: string; quantity: number }[] = [];
    if (player.current_ship_id) {
      const ship = await db("ships")
        .where({ id: player.current_ship_id })
        .first();
      if (ship) {
        if (ship.cyrillium_cargo > 0)
          cargo.push({
            commodity: "cyrillium",
            quantity: ship.cyrillium_cargo,
          });
        if (ship.food_cargo > 0)
          cargo.push({ commodity: "food", quantity: ship.food_cargo });
        if (ship.tech_cargo > 0)
          cargo.push({ commodity: "tech", quantity: ship.tech_cargo });
      }
    }

    // Tablets (unequipped only)
    const tablets = await db("player_tablets as pt")
      .join("tablet_definitions as td", "pt.tablet_definition_id", "td.id")
      .where({ "pt.player_id": playerId })
      .whereNull("pt.equipped_slot")
      .select("pt.id", "td.name", "td.rarity", "td.effects");

    // Planets
    const planets = await db("planets")
      .where({ owner_id: playerId })
      .select("id", "name", "planet_class as class", "sector_id as sectorId");

    // Upgrade inventory
    const upgrades = await db("player_upgrade_inventory as pui")
      .join("upgrade_types as ut", "pui.upgrade_type_id", "ut.id")
      .where({ "pui.player_id": playerId })
      .select("pui.id", "ut.id as typeId", "ut.name as typeName", "ut.slot");

    res.json({ credits, resources, cargo, tablets, planets, upgrades });
  } catch (err) {
    console.error("Tradeable assets error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /offer ─────────────────────────────────────────────────────

router.post("/offer", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const {
      recipientName,
      message,
      parentOfferId,
      offeredItems,
      requestedItems,
    } = req.body as {
      recipientName: string;
      message?: string;
      parentOfferId?: string;
      offeredItems: TradeItem[];
      requestedItems: TradeItem[];
    };

    if (!recipientName)
      return res.status(400).json({ error: "Recipient name required" });

    const allItems = [...(offeredItems || []), ...(requestedItems || [])];
    if (allItems.length === 0)
      return res.status(400).json({ error: "Must include at least one item" });

    if ((offeredItems || []).length > MAX_ITEMS_PER_SIDE)
      return res
        .status(400)
        .json({ error: `Max ${MAX_ITEMS_PER_SIDE} offered items` });
    if ((requestedItems || []).length > MAX_ITEMS_PER_SIDE)
      return res
        .status(400)
        .json({ error: `Max ${MAX_ITEMS_PER_SIDE} requested items` });

    // Validate item types
    for (const item of allItems) {
      if (!VALID_ITEM_TYPES.includes(item.itemType))
        return res
          .status(400)
          .json({ error: `Invalid item type: ${item.itemType}` });
      if (item.quantity < 1)
        return res.status(400).json({ error: "Quantity must be positive" });
    }

    // Resolve recipient
    const recipient = await db("players")
      .where({ username: recipientName })
      .first();
    if (!recipient)
      return res
        .status(404)
        .json({ error: `Player "${recipientName}" not found` });
    if (recipient.id === playerId)
      return res.status(400).json({ error: "Cannot trade with yourself" });

    // Check pending offer limit
    const pendingCount = await db("trade_offers")
      .where({ sender_id: playerId, status: "pending" })
      .count("* as count")
      .first();
    if (Number(pendingCount?.count || 0) >= MAX_PENDING_OFFERS)
      return res.status(400).json({
        error: `Max ${MAX_PENDING_OFFERS} pending offers. Cancel one first.`,
      });

    // Validate sender owns offered items
    const player = await db("players").where({ id: playerId }).first();
    const ship = player!.current_ship_id
      ? await db("ships").where({ id: player!.current_ship_id }).first()
      : null;

    for (const item of offeredItems || []) {
      switch (item.itemType) {
        case "credits":
          if (Number(player!.credits) < item.quantity)
            return res.status(400).json({
              error: `Not enough credits (have ${player!.credits}, offering ${item.quantity})`,
            });
          break;
        case "resource": {
          const pr = await db("player_resources")
            .where({ player_id: playerId, resource_id: item.itemId })
            .first();
          if (!pr || pr.quantity < item.quantity)
            return res.status(400).json({
              error: `Not enough ${item.itemId} (have ${pr?.quantity || 0})`,
            });
          break;
        }
        case "cargo": {
          if (!VALID_CARGO_TYPES.includes(item.itemId || ""))
            return res
              .status(400)
              .json({ error: `Invalid cargo type: ${item.itemId}` });
          if (!ship)
            return res
              .status(400)
              .json({ error: "No active ship for cargo trade" });
          const col = `${item.itemId}_cargo`;
          if ((ship as any)[col] < item.quantity)
            return res.status(400).json({
              error: `Not enough ${item.itemId} cargo (have ${(ship as any)[col]})`,
            });
          break;
        }
        case "tablet": {
          const tab = await db("player_tablets")
            .where({ id: item.itemId, player_id: playerId })
            .whereNull("equipped_slot")
            .first();
          if (!tab)
            return res.status(400).json({
              error: "Tablet not found or is equipped",
            });
          break;
        }
        case "planet": {
          const planet = await db("planets")
            .where({ id: item.itemId, owner_id: playerId })
            .first();
          if (!planet)
            return res
              .status(400)
              .json({ error: "Planet not found or not owned" });
          break;
        }
        case "upgrade": {
          const inv = await db("player_upgrade_inventory")
            .where({ id: item.itemId, player_id: playerId })
            .first();
          if (!inv)
            return res.status(400).json({ error: "Upgrade not in inventory" });
          break;
        }
      }
    }

    // Handle counter-offer: mark parent as 'countered'
    if (parentOfferId) {
      const parent = await db("trade_offers")
        .where({ id: parentOfferId, recipient_id: playerId, status: "pending" })
        .first();
      if (!parent)
        return res
          .status(400)
          .json({ error: "Parent offer not found or not pending" });
      await db("trade_offers")
        .where({ id: parentOfferId })
        .update({ status: "countered", resolved_at: new Date() });
    }

    // Build metadata for items
    const buildMeta = async (item: TradeItem) => {
      const meta: Record<string, any> = {};
      switch (item.itemType) {
        case "resource": {
          const rd = await db("resource_definitions")
            .where({ id: item.itemId })
            .first();
          meta.name = rd?.name || item.itemId;
          break;
        }
        case "cargo":
          meta.name =
            item.itemId === "cyrillium"
              ? "Cyrillium"
              : item.itemId === "food"
                ? "Food"
                : "Tech";
          break;
        case "tablet": {
          const td = await db("player_tablets as pt")
            .join(
              "tablet_definitions as td",
              "pt.tablet_definition_id",
              "td.id",
            )
            .where({ "pt.id": item.itemId })
            .select("td.name", "td.rarity")
            .first();
          meta.name = td?.name || "Tablet";
          meta.rarity = td?.rarity || "common";
          break;
        }
        case "planet": {
          const p = await db("planets").where({ id: item.itemId }).first();
          meta.name = p?.name || "Planet";
          meta.class = p?.planet_class;
          break;
        }
        case "upgrade": {
          const u = await db("player_upgrade_inventory as pui")
            .join("upgrade_types as ut", "pui.upgrade_type_id", "ut.id")
            .where({ "pui.id": item.itemId })
            .select("ut.name", "ut.slot")
            .first();
          meta.name = u?.name || "Upgrade";
          meta.slot = u?.slot;
          break;
        }
      }
      return meta;
    };

    // Create offer
    const offerId = crypto.randomUUID();
    await db("trade_offers").insert({
      id: offerId,
      sender_id: playerId,
      recipient_id: recipient.id,
      parent_offer_id: parentOfferId || null,
      status: "pending",
      message: message?.slice(0, 200) || null,
      created_at: new Date(),
      expires_at: new Date(Date.now() + OFFER_TTL_MS),
    });

    // Insert items
    for (const item of offeredItems || []) {
      const meta = await buildMeta(item);
      await db("trade_offer_items").insert({
        id: crypto.randomUUID(),
        offer_id: offerId,
        side: "offered",
        item_type: item.itemType,
        item_id: item.itemId || null,
        quantity: item.quantity,
        metadata: JSON.stringify(meta),
      });
    }
    for (const item of requestedItems || []) {
      const meta = await buildMeta(item);
      await db("trade_offer_items").insert({
        id: crypto.randomUUID(),
        offer_id: offerId,
        side: "requested",
        item_type: item.itemType,
        item_id: item.itemId || null,
        quantity: item.quantity,
        metadata: JSON.stringify(meta),
      });
    }

    // Notify recipient
    const io = req.app.get("io");
    const sender = await db("players")
      .where({ id: playerId })
      .select("username")
      .first();
    if (io) {
      notifyPlayer(io, recipient.id, "notification", {
        message: `${sender?.username || "Someone"} sent you a trade offer!`,
      });
    }

    res.json({ id: offerId, status: "pending" });
  } catch (err) {
    console.error("Create barter offer error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /incoming ───────────────────────────────────────────────────

router.get("/incoming", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const offers = await db("trade_offers as o")
      .join("players as s", "o.sender_id", "s.id")
      .join("players as r", "o.recipient_id", "r.id")
      .where({ "o.recipient_id": playerId, "o.status": "pending" })
      .select(
        "o.*",
        "s.username as sender_name",
        "r.username as recipient_name",
      )
      .orderBy("o.created_at", "desc");

    const enriched = await Promise.all(offers.map(enrichOffer));
    res.json(enriched);
  } catch (err) {
    console.error("Get incoming offers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /outgoing ───────────────────────────────────────────────────

router.get("/outgoing", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const offers = await db("trade_offers as o")
      .join("players as s", "o.sender_id", "s.id")
      .join("players as r", "o.recipient_id", "r.id")
      .where({ "o.sender_id": playerId })
      .whereIn("o.status", ["pending", "countered"])
      .select(
        "o.*",
        "s.username as sender_name",
        "r.username as recipient_name",
      )
      .orderBy("o.created_at", "desc");

    const enriched = await Promise.all(offers.map(enrichOffer));
    res.json(enriched);
  } catch (err) {
    console.error("Get outgoing offers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /history ────────────────────────────────────────────────────

router.get("/history", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const offers = await db("trade_offers as o")
      .join("players as s", "o.sender_id", "s.id")
      .join("players as r", "o.recipient_id", "r.id")
      .where(function () {
        this.where("o.sender_id", playerId).orWhere("o.recipient_id", playerId);
      })
      .whereIn("o.status", [
        "accepted",
        "rejected",
        "cancelled",
        "countered",
        "expired",
      ])
      .select(
        "o.*",
        "s.username as sender_name",
        "r.username as recipient_name",
      )
      .orderBy("o.resolved_at", "desc")
      .limit(20);

    const enriched = await Promise.all(offers.map(enrichOffer));
    res.json(enriched);
  } catch (err) {
    console.error("Get barter history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /:id/accept ────────────────────────────────────────────────

router.post("/:id/accept", requireAuth, async (req, res) => {
  const offerId = req.params.id;
  const playerId = req.session.playerId!;

  try {
    await db.transaction(async (trx) => {
      const offer = await trx("trade_offers").where({ id: offerId }).first();
      if (!offer) return res.status(404).json({ error: "Offer not found" });
      if (offer.recipient_id !== playerId)
        return res.status(403).json({ error: "Not your offer to accept" });
      if (offer.status !== "pending")
        return res.status(400).json({ error: `Offer is ${offer.status}` });

      // Check expiry
      if (new Date(offer.expires_at) < new Date()) {
        await trx("trade_offers")
          .where({ id: offerId })
          .update({ status: "expired", resolved_at: new Date() });
        return res.status(400).json({ error: "Offer has expired" });
      }

      const items = await trx("trade_offer_items")
        .where({ offer_id: offerId })
        .select("*");
      const offeredItems = items.filter((i: any) => i.side === "offered");
      const requestedItems = items.filter((i: any) => i.side === "requested");

      const senderId = offer.sender_id;
      const recipientId = playerId;

      const sender = await trx("players").where({ id: senderId }).first();
      const recipient = await trx("players").where({ id: recipientId }).first();
      const senderShip = sender?.current_ship_id
        ? await trx("ships").where({ id: sender.current_ship_id }).first()
        : null;
      const recipientShip = recipient?.current_ship_id
        ? await trx("ships").where({ id: recipient.current_ship_id }).first()
        : null;

      // ── Re-validate sender has offered items ──
      for (const item of offeredItems) {
        switch (item.item_type) {
          case "credits":
            if (Number(sender!.credits) < item.quantity)
              throw new Error(
                `Sender no longer has enough credits (needs ${item.quantity}, has ${sender!.credits})`,
              );
            break;
          case "resource": {
            const pr = await trx("player_resources")
              .where({ player_id: senderId, resource_id: item.item_id })
              .first();
            if (!pr || pr.quantity < item.quantity)
              throw new Error(`Sender no longer has enough ${item.item_id}`);
            break;
          }
          case "cargo": {
            if (!senderShip) throw new Error("Sender has no active ship");
            const col = `${item.item_id}_cargo`;
            if ((senderShip as any)[col] < item.quantity)
              throw new Error(
                `Sender no longer has enough ${item.item_id} cargo`,
              );
            break;
          }
          case "tablet": {
            const tab = await trx("player_tablets")
              .where({ id: item.item_id, player_id: senderId })
              .whereNull("equipped_slot")
              .first();
            if (!tab) throw new Error("Sender's tablet no longer available");
            break;
          }
          case "planet": {
            const p = await trx("planets")
              .where({ id: item.item_id, owner_id: senderId })
              .first();
            if (!p) throw new Error("Sender no longer owns the planet");
            break;
          }
          case "upgrade": {
            const u = await trx("player_upgrade_inventory")
              .where({ id: item.item_id, player_id: senderId })
              .first();
            if (!u) throw new Error("Sender's upgrade no longer in inventory");
            break;
          }
        }
      }

      // ── Re-validate recipient has requested items ──
      for (const item of requestedItems) {
        switch (item.item_type) {
          case "credits":
            if (Number(recipient!.credits) < item.quantity)
              throw new Error(
                `You don't have enough credits (need ${item.quantity}, have ${recipient!.credits})`,
              );
            break;
          case "resource": {
            const pr = await trx("player_resources")
              .where({ player_id: recipientId, resource_id: item.item_id })
              .first();
            if (!pr || pr.quantity < item.quantity)
              throw new Error(`You don't have enough ${item.item_id}`);
            break;
          }
          case "cargo": {
            if (!recipientShip) throw new Error("You have no active ship");
            const col = `${item.item_id}_cargo`;
            if ((recipientShip as any)[col] < item.quantity)
              throw new Error(`You don't have enough ${item.item_id} cargo`);
            break;
          }
          case "tablet": {
            const tab = await trx("player_tablets")
              .where({ id: item.item_id, player_id: recipientId })
              .whereNull("equipped_slot")
              .first();
            if (!tab) throw new Error("Your tablet is no longer available");
            break;
          }
          case "planet": {
            const p = await trx("planets")
              .where({ id: item.item_id, owner_id: recipientId })
              .first();
            if (!p) throw new Error("You no longer own the planet");
            break;
          }
          case "upgrade": {
            const u = await trx("player_upgrade_inventory")
              .where({ id: item.item_id, player_id: recipientId })
              .first();
            if (!u) throw new Error("Your upgrade is no longer in inventory");
            break;
          }
        }
      }

      // ── Execute transfers: offered items (sender → recipient) ──
      for (const item of offeredItems) {
        await transferItem(
          trx,
          item,
          senderId,
          recipientId,
          senderShip,
          recipientShip,
        );
      }

      // ── Execute transfers: requested items (recipient → sender) ──
      for (const item of requestedItems) {
        await transferItem(
          trx,
          item,
          recipientId,
          senderId,
          recipientShip,
          senderShip,
        );
      }

      // Mark accepted
      await trx("trade_offers")
        .where({ id: offerId })
        .update({ status: "accepted", resolved_at: new Date() });

      // Cancel conflicting pending offers referencing same unique items
      const uniqueItemIds = [...offeredItems, ...requestedItems]
        .filter((i: any) =>
          ["tablet", "planet", "upgrade"].includes(i.item_type),
        )
        .map((i: any) => i.item_id)
        .filter(Boolean);

      if (uniqueItemIds.length > 0) {
        const conflicting = await trx("trade_offer_items")
          .whereIn("item_id", uniqueItemIds)
          .whereIn("item_type", ["tablet", "planet", "upgrade"])
          .select("offer_id");
        const conflictingIds = [
          ...new Set(conflicting.map((c: any) => c.offer_id)),
        ].filter((id) => id !== offerId);
        if (conflictingIds.length > 0) {
          await trx("trade_offers")
            .whereIn("id", conflictingIds)
            .where({ status: "pending" })
            .update({ status: "cancelled", resolved_at: new Date() });
        }
      }

      // Chain settlement (non-critical)
      try {
        for (const item of offeredItems) {
          await settleItemTransfer(item, senderId, recipientId);
        }
        for (const item of requestedItems) {
          await settleItemTransfer(item, recipientId, senderId);
        }
      } catch {
        /* chain settlement failure is non-critical */
      }

      // Notify sender
      const io = req.app.get("io");
      if (io) {
        const desc = formatOfferDesc(offeredItems);
        notifyPlayer(io, senderId, "notification", {
          message: `${recipient!.username} accepted your trade offer! (${desc})`,
        });
      }

      res.json({ action: "accepted" });
    });
  } catch (err: any) {
    if (err.message && !err.message.includes("Internal")) {
      return res.status(400).json({ error: err.message });
    }
    console.error("Accept barter offer error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Transfer helpers ────────────────────────────────────────────────

async function transferItem(
  trx: any,
  item: any,
  fromId: string,
  toId: string,
  fromShip: any,
  toShip: any,
) {
  switch (item.item_type) {
    case "credits":
      await trx("players")
        .where({ id: fromId })
        .decrement("credits", item.quantity);
      await trx("players")
        .where({ id: toId })
        .increment("credits", item.quantity);
      break;
    case "resource": {
      // Decrement from sender
      await trx("player_resources")
        .where({ player_id: fromId, resource_id: item.item_id })
        .decrement("quantity", item.quantity);
      // Increment for recipient (upsert)
      const existing = await trx("player_resources")
        .where({ player_id: toId, resource_id: item.item_id })
        .first();
      if (existing) {
        await trx("player_resources")
          .where({ player_id: toId, resource_id: item.item_id })
          .increment("quantity", item.quantity);
      } else {
        await trx("player_resources").insert({
          player_id: toId,
          resource_id: item.item_id,
          quantity: item.quantity,
        });
      }
      break;
    }
    case "cargo": {
      const col = `${item.item_id}_cargo`;
      if (fromShip) {
        await trx("ships")
          .where({ id: fromShip.id })
          .decrement(col, item.quantity);
      }
      if (toShip) {
        await trx("ships")
          .where({ id: toShip.id })
          .increment(col, item.quantity);
      }
      break;
    }
    case "tablet":
      await trx("player_tablets")
        .where({ id: item.item_id })
        .update({ player_id: toId });
      break;
    case "planet":
      await trx("planets")
        .where({ id: item.item_id })
        .update({ owner_id: toId });
      break;
    case "upgrade":
      await trx("player_upgrade_inventory")
        .where({ id: item.item_id })
        .update({ player_id: toId });
      break;
  }
}

async function settleItemTransfer(item: any, fromId: string, toId: string) {
  switch (item.item_type) {
    case "credits":
      await settleDebitPlayer(fromId, item.quantity, "trade");
      await settleCreditPlayer(toId, item.quantity, "trade");
      break;
    case "resource":
    case "cargo":
      await settleTransferBetweenPlayers(
        fromId,
        toId,
        item.item_id,
        item.quantity,
        "trade",
      );
      break;
    case "planet":
      await settleTransferPlanet(item.item_id, fromId, toId);
      break;
    // tablets and upgrades don't have chain settlement yet
  }
}

// ─── POST /:id/reject ────────────────────────────────────────────────

router.post("/:id/reject", requireAuth, async (req, res) => {
  try {
    const offerId = req.params.id;
    const playerId = req.session.playerId!;

    const offer = await db("trade_offers")
      .where({ id: offerId, recipient_id: playerId, status: "pending" })
      .first();
    if (!offer)
      return res.status(404).json({ error: "Offer not found or not pending" });

    await db("trade_offers")
      .where({ id: offerId })
      .update({ status: "rejected", resolved_at: new Date() });

    const io = req.app.get("io");
    if (io) {
      const recipient = await db("players")
        .where({ id: playerId })
        .select("username")
        .first();
      notifyPlayer(io, offer.sender_id, "notification", {
        message: `${recipient?.username || "Someone"} rejected your trade offer.`,
      });
    }

    res.json({ action: "rejected" });
  } catch (err) {
    console.error("Reject barter offer error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /:id/cancel ────────────────────────────────────────────────

router.post("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const offerId = req.params.id;
    const playerId = req.session.playerId!;

    const offer = await db("trade_offers")
      .where({ id: offerId, sender_id: playerId, status: "pending" })
      .first();
    if (!offer)
      return res.status(404).json({ error: "Offer not found or not pending" });

    await db("trade_offers")
      .where({ id: offerId })
      .update({ status: "cancelled", resolved_at: new Date() });

    const io = req.app.get("io");
    if (io) {
      notifyPlayer(io, offer.recipient_id, "notification", {
        message: "A trade offer to you was cancelled.",
      });
    }

    res.json({ action: "cancelled" });
  } catch (err) {
    console.error("Cancel barter offer error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Counter-offers: Client calls POST /offer with parentOfferId set.
// The /offer handler marks the parent as 'countered' automatically.

export default router;
