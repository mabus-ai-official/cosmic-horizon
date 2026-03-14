import { Router } from "express";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth";
import { GAME_CONFIG } from "../config/game";
import db from "../db/connection";

const router = Router();

// Inbox
router.get("/inbox", requireAuth, async (req, res) => {
  try {
    const messages = await db("messages")
      .join("players as sender", "messages.sender_id", "sender.id")
      .where({
        "messages.recipient_id": req.session.playerId,
        "messages.recipient_deleted": false,
      })
      .orderBy("messages.created_at", "desc")
      .limit(GAME_CONFIG.MAX_MESSAGES_PER_PLAYER)
      .select(
        "messages.id",
        "messages.subject",
        "messages.read",
        "messages.created_at as createdAt",
        "sender.username as senderName",
      );

    res.json({ messages });
  } catch (err) {
    console.error("Inbox error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Sent messages
router.get("/sent", requireAuth, async (req, res) => {
  try {
    const messages = await db("messages")
      .join("players as recipient", "messages.recipient_id", "recipient.id")
      .where({
        "messages.sender_id": req.session.playerId,
        "messages.sender_deleted": false,
      })
      .orderBy("messages.created_at", "desc")
      .limit(GAME_CONFIG.MAX_MESSAGES_PER_PLAYER)
      .select(
        "messages.id",
        "messages.subject",
        "messages.created_at as createdAt",
        "recipient.username as recipientName",
      );

    res.json({ messages });
  } catch (err) {
    console.error("Sent messages error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Read a specific message — single query with joins instead of 3 separate lookups
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const message = await db("messages")
      .join("players as sender", "messages.sender_id", "sender.id")
      .join("players as recipient", "messages.recipient_id", "recipient.id")
      .where({ "messages.id": req.params.id })
      .where(function () {
        this.where({ "messages.sender_id": req.session.playerId }).orWhere({
          "messages.recipient_id": req.session.playerId,
        });
      })
      .select(
        "messages.id",
        "messages.subject",
        "messages.body",
        "messages.read",
        "messages.sender_id",
        "messages.recipient_id",
        "messages.created_at as createdAt",
        "sender.username as senderName",
        "recipient.username as recipientName",
      )
      .first();

    if (!message) return res.status(404).json({ error: "Message not found" });

    // Mark as read if recipient
    if (message.recipient_id === req.session.playerId && !message.read) {
      await db("messages").where({ id: message.id }).update({ read: true });
    }

    res.json({
      id: message.id,
      subject: message.subject,
      body: message.body,
      senderName: message.senderName,
      recipientName: message.recipientName,
      read: message.recipient_id === req.session.playerId ? true : message.read,
      createdAt: message.createdAt,
    });
  } catch (err) {
    console.error("Read message error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Send a message
router.post("/send", requireAuth, async (req, res) => {
  try {
    const { recipientName, subject, body } = req.body;
    if (!recipientName || !subject || !body) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (body.length > GAME_CONFIG.MAX_MESSAGE_BODY_LENGTH) {
      return res
        .status(400)
        .json({
          error: `Message body too long (max ${GAME_CONFIG.MAX_MESSAGE_BODY_LENGTH} characters)`,
        });
    }

    const recipient = await db("players")
      .where({ username: recipientName })
      .first();
    if (!recipient)
      return res.status(404).json({ error: "Recipient not found" });
    if (recipient.id === req.session.playerId) {
      return res.status(400).json({ error: "Cannot send message to yourself" });
    }

    const messageId = crypto.randomUUID();
    await db("messages").insert({
      id: messageId,
      sender_id: req.session.playerId,
      recipient_id: recipient.id,
      subject: subject.slice(0, 100),
      body,
      read: false,
      sender_deleted: false,
      recipient_deleted: false,
    });

    res.json({ sent: true, messageId });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a message (soft delete)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const message = await db("messages").where({ id: req.params.id }).first();
    if (!message) return res.status(404).json({ error: "Message not found" });

    if (message.sender_id === req.session.playerId) {
      await db("messages")
        .where({ id: message.id })
        .update({ sender_deleted: true });
    } else if (message.recipient_id === req.session.playerId) {
      await db("messages")
        .where({ id: message.id })
        .update({ recipient_deleted: true });
    } else {
      return res.status(403).json({ error: "Not your message" });
    }

    res.json({ deleted: true });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Unread count
router.get("/unread-count", requireAuth, async (req, res) => {
  try {
    const result = await db("messages")
      .where({
        recipient_id: req.session.playerId,
        read: false,
        recipient_deleted: false,
      })
      .count("* as count")
      .first();

    res.json({ unreadCount: Number(result?.count || 0) });
  } catch (err) {
    console.error("Unread count error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
