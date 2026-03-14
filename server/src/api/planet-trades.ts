import { Router } from "express";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth";
import db from "../db/connection";
import { notifyPlayer } from "../ws/handlers";
import { settleCreditPlayer, settleDebitPlayer } from "../chain/tx-queue";

const router = Router();

const BASE_COMMODITIES = ["cyrillium", "food", "tech"];

// Send a trade offer (resource from planet, or planet transfer)
router.post("/offer", requireAuth, async (req, res) => {
  try {
    const senderId = req.session.playerId as string;
    const {
      recipientName,
      tradeType,
      planetId,
      resourceType,
      quantity,
      transferPlanetId,
      price,
    } = req.body;

    if (!recipientName || !tradeType)
      return res
        .status(400)
        .json({ error: "recipientName and tradeType required" });

    if (tradeType !== "resource" && tradeType !== "planet")
      return res
        .status(400)
        .json({ error: "tradeType must be 'resource' or 'planet'" });

    const recipient = await db("players")
      .where({ username: recipientName })
      .first();
    if (!recipient)
      return res.status(404).json({ error: "Recipient not found" });
    if (recipient.id === senderId)
      return res.status(400).json({ error: "Cannot trade with yourself" });

    if (tradeType === "resource") {
      if (!planetId || !resourceType || !quantity || quantity <= 0)
        return res
          .status(400)
          .json({ error: "planetId, resourceType, and quantity required" });

      const planet = await db("planets").where({ id: planetId }).first();
      if (!planet) return res.status(404).json({ error: "Planet not found" });
      if (planet.owner_id !== senderId)
        return res.status(403).json({ error: "You don't own this planet" });

      // Verify resource availability
      if (BASE_COMMODITIES.includes(resourceType)) {
        const stock = planet[`${resourceType}_stock`] || 0;
        if (stock < quantity)
          return res
            .status(400)
            .json({ error: `Insufficient ${resourceType} (have ${stock})` });
      } else {
        const pr = await db("planet_resources")
          .where({ planet_id: planetId, resource_id: resourceType })
          .first();
        if (!pr || pr.stock < quantity)
          return res.status(400).json({
            error: `Insufficient ${resourceType} (have ${pr?.stock || 0})`,
          });
      }

      // Check for existing pending offer of same type
      const existing = await db("planet_trade_requests")
        .where({
          sender_id: senderId,
          recipient_id: recipient.id,
          trade_type: "resource",
          status: "pending",
          planet_id: planetId,
          resource_type: resourceType,
        })
        .first();
      if (existing)
        return res.status(400).json({
          error: "You already have a pending offer for this resource",
        });

      const id = crypto.randomUUID();
      await db("planet_trade_requests").insert({
        id,
        sender_id: senderId,
        recipient_id: recipient.id,
        trade_type: "resource",
        planet_id: planetId,
        resource_type: resourceType,
        quantity,
        price: price || 0,
        status: "pending",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      });

      const sender = await db("players").where({ id: senderId }).first();
      const io = req.app.get("io");
      if (io) {
        notifyPlayer(io, recipient.id, "notification", {
          message: `${sender.username} offered you ${quantity} ${resourceType}${price ? ` for ${price} credits` : " (gift)"}`,
        });
      }

      res.json({ id, action: "offered" });
    } else {
      // Planet transfer
      if (!transferPlanetId)
        return res.status(400).json({ error: "transferPlanetId required" });

      const planet = await db("planets")
        .where({ id: transferPlanetId })
        .first();
      if (!planet) return res.status(404).json({ error: "Planet not found" });
      if (planet.owner_id !== senderId)
        return res.status(403).json({ error: "You don't own this planet" });

      const existing = await db("planet_trade_requests")
        .where({
          sender_id: senderId,
          trade_type: "planet",
          transfer_planet_id: transferPlanetId,
          status: "pending",
        })
        .first();
      if (existing)
        return res.status(400).json({
          error: "You already have a pending transfer for this planet",
        });

      const id = crypto.randomUUID();
      await db("planet_trade_requests").insert({
        id,
        sender_id: senderId,
        recipient_id: recipient.id,
        trade_type: "planet",
        transfer_planet_id: transferPlanetId,
        price: price || 0,
        status: "pending",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const sender = await db("players").where({ id: senderId }).first();
      const io = req.app.get("io");
      if (io) {
        notifyPlayer(io, recipient.id, "notification", {
          message: `${sender.username} offered to transfer planet "${planet.name}"${price ? ` for ${price} credits` : " (gift)"}`,
        });
      }

      res.json({ id, action: "offered" });
    }
  } catch (err) {
    console.error("Planet trade offer error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get incoming trade offers
router.get("/incoming", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId as string;
    const offers = await db("planet_trade_requests")
      .where({ recipient_id: playerId, status: "pending" })
      .join("players", "planet_trade_requests.sender_id", "players.id")
      .leftJoin("planets as src", "planet_trade_requests.planet_id", "src.id")
      .leftJoin(
        "planets as xfer",
        "planet_trade_requests.transfer_planet_id",
        "xfer.id",
      )
      .select(
        "planet_trade_requests.id",
        "planet_trade_requests.trade_type as tradeType",
        "planet_trade_requests.resource_type as resourceType",
        "planet_trade_requests.quantity",
        "planet_trade_requests.price",
        "planet_trade_requests.created_at as createdAt",
        "planet_trade_requests.expires_at as expiresAt",
        "players.username as senderName",
        "players.id as senderId",
        "src.name as sourcePlanetName",
        "xfer.name as transferPlanetName",
        "xfer.planet_class as transferPlanetClass",
      )
      .orderBy("planet_trade_requests.created_at", "desc");

    res.json({ offers });
  } catch (err) {
    console.error("Incoming trades error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get outgoing trade offers
router.get("/outgoing", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId as string;
    const offers = await db("planet_trade_requests")
      .where({ sender_id: playerId, status: "pending" })
      .join("players", "planet_trade_requests.recipient_id", "players.id")
      .leftJoin("planets as src", "planet_trade_requests.planet_id", "src.id")
      .leftJoin(
        "planets as xfer",
        "planet_trade_requests.transfer_planet_id",
        "xfer.id",
      )
      .select(
        "planet_trade_requests.id",
        "planet_trade_requests.trade_type as tradeType",
        "planet_trade_requests.resource_type as resourceType",
        "planet_trade_requests.quantity",
        "planet_trade_requests.price",
        "planet_trade_requests.created_at as createdAt",
        "players.username as recipientName",
        "src.name as sourcePlanetName",
        "xfer.name as transferPlanetName",
      )
      .orderBy("planet_trade_requests.created_at", "desc");

    res.json({ offers });
  } catch (err) {
    console.error("Outgoing trades error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Accept a trade offer
router.post("/:offerId/accept", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId as string;
    const { offerId } = req.params;

    const offer = await db("planet_trade_requests")
      .where({ id: offerId, recipient_id: playerId, status: "pending" })
      .first();
    if (!offer)
      return res
        .status(404)
        .json({ error: "Offer not found or already resolved" });

    // Check expiry
    if (offer.expires_at && new Date(offer.expires_at) < new Date()) {
      await db("planet_trade_requests")
        .where({ id: offerId })
        .update({ status: "expired" });
      return res.status(400).json({ error: "Offer has expired" });
    }

    const recipient = await db("players").where({ id: playerId }).first();
    const sender = await db("players").where({ id: offer.sender_id }).first();

    // Price check
    if (offer.price > 0) {
      if (recipient.credits < offer.price)
        return res
          .status(400)
          .json({ error: `Insufficient credits (need ${offer.price})` });
    }

    if (offer.trade_type === "resource") {
      const planet = await db("planets").where({ id: offer.planet_id }).first();
      if (!planet || planet.owner_id !== offer.sender_id)
        return res
          .status(400)
          .json({ error: "Sender no longer owns the source planet" });

      // Re-verify resource availability
      if (BASE_COMMODITIES.includes(offer.resource_type)) {
        const stock = planet[`${offer.resource_type}_stock`] || 0;
        if (stock < offer.quantity)
          return res
            .status(400)
            .json({ error: "Insufficient resources on planet" });

        // Transfer: deduct from planet, add to recipient's player_resources
        await db("planets")
          .where({ id: offer.planet_id })
          .decrement(`${offer.resource_type}_stock`, offer.quantity);

        // Add to recipient's player_resources
        const existing = await db("player_resources")
          .where({ player_id: playerId, resource_id: offer.resource_type })
          .first();
        if (existing) {
          await db("player_resources")
            .where({ player_id: playerId, resource_id: offer.resource_type })
            .increment("quantity", offer.quantity);
        } else {
          await db("player_resources").insert({
            player_id: playerId,
            resource_id: offer.resource_type,
            quantity: offer.quantity,
          });
        }
      } else {
        // Unique resource
        const pr = await db("planet_resources")
          .where({
            planet_id: offer.planet_id,
            resource_id: offer.resource_type,
          })
          .first();
        if (!pr || pr.stock < offer.quantity)
          return res
            .status(400)
            .json({ error: "Insufficient resources on planet" });

        await db("planet_resources")
          .where({
            planet_id: offer.planet_id,
            resource_id: offer.resource_type,
          })
          .decrement("stock", offer.quantity);

        const existing = await db("player_resources")
          .where({ player_id: playerId, resource_id: offer.resource_type })
          .first();
        if (existing) {
          await db("player_resources")
            .where({ player_id: playerId, resource_id: offer.resource_type })
            .increment("quantity", offer.quantity);
        } else {
          await db("player_resources").insert({
            player_id: playerId,
            resource_id: offer.resource_type,
            quantity: offer.quantity,
          });
        }
      }
    } else {
      // Planet transfer
      const planet = await db("planets")
        .where({ id: offer.transfer_planet_id })
        .first();
      if (!planet || planet.owner_id !== offer.sender_id)
        return res
          .status(400)
          .json({ error: "Sender no longer owns this planet" });

      await db("planets")
        .where({ id: offer.transfer_planet_id })
        .update({ owner_id: playerId });
    }

    // Handle credits
    if (offer.price > 0) {
      await db("players")
        .where({ id: playerId })
        .decrement("credits", offer.price);
      await settleDebitPlayer(playerId, offer.price, "trade");
      await db("players")
        .where({ id: offer.sender_id })
        .increment("credits", offer.price);
      await settleCreditPlayer(offer.sender_id, offer.price, "trade");
    }

    await db("planet_trade_requests")
      .where({ id: offerId })
      .update({ status: "accepted" });

    const io = req.app.get("io");
    if (io) {
      const desc =
        offer.trade_type === "resource"
          ? `${offer.quantity} ${offer.resource_type}`
          : "planet transfer";
      notifyPlayer(io, offer.sender_id, "notification", {
        message: `${recipient.username} accepted your ${desc} offer!`,
      });
    }

    res.json({ action: "accepted" });
  } catch (err) {
    console.error("Accept trade error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reject a trade offer
router.post("/:offerId/reject", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId as string;
    const { offerId } = req.params;

    const offer = await db("planet_trade_requests")
      .where({ id: offerId, recipient_id: playerId, status: "pending" })
      .first();
    if (!offer)
      return res
        .status(404)
        .json({ error: "Offer not found or already resolved" });

    await db("planet_trade_requests")
      .where({ id: offerId })
      .update({ status: "rejected" });

    const recipient = await db("players").where({ id: playerId }).first();
    const io = req.app.get("io");
    if (io) {
      notifyPlayer(io, offer.sender_id, "notification", {
        message: `${recipient.username} declined your trade offer`,
      });
    }

    res.json({ action: "rejected" });
  } catch (err) {
    console.error("Reject trade error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Cancel (withdraw) own outgoing offer
router.post("/:offerId/cancel", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId as string;
    const { offerId } = req.params;

    const offer = await db("planet_trade_requests")
      .where({ id: offerId, sender_id: playerId, status: "pending" })
      .first();
    if (!offer)
      return res
        .status(404)
        .json({ error: "Offer not found or already resolved" });

    await db("planet_trade_requests").where({ id: offerId }).del();

    res.json({ action: "cancelled" });
  } catch (err) {
    console.error("Cancel trade error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
