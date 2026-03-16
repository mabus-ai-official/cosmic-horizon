import { Router } from "express";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth";
import db from "../db/connection";
import { incrementStat, logActivity } from "../engine/profile-stats";
import { syncPlayer } from "../ws/sync";
import {
  handleSyndicateJoin,
  handleSyndicateLeave,
  notifyPlayer,
} from "../ws/handlers";
import { isSettlementEnabled } from "../chain/config";
import {
  enqueue,
  settleCreditPlayer,
  settleDebitPlayer,
} from "../chain/tx-queue";
import type { Address } from "viem";
import { checkAndUpdateMissions } from "../services/mission-tracker";

const router = Router();

// --- Chain settlement helpers for syndicate membership ---

async function chainAddSyndicateMember(playerId: string, syndicateId: string) {
  if (!isSettlementEnabled("syndicate")) return;
  try {
    const player = await db("players")
      .where({ id: playerId })
      .select("wallet_address", "character_nft_id")
      .first();
    const syndicate = await db("syndicates")
      .where({ id: syndicateId })
      .select("chain_index")
      .first();
    if (!player?.wallet_address || syndicate?.chain_index == null) return;
    enqueue({
      type: "addSyndicateMember",
      syndicateIndex: BigInt(syndicate.chain_index),
      member: player.wallet_address as Address,
    });
    if (player.character_nft_id != null) {
      enqueue({
        type: "updateCharacterSyndicate",
        tokenId: BigInt(player.character_nft_id),
        syndicateIndex: BigInt(syndicate.chain_index),
      });
    }
  } catch (err) {
    console.warn("Chain addSyndicateMember enqueue failed:", err);
  }
}

async function chainRemoveSyndicateMember(
  playerId: string,
  syndicateId: string,
) {
  if (!isSettlementEnabled("syndicate")) return;
  try {
    const player = await db("players")
      .where({ id: playerId })
      .select("wallet_address", "character_nft_id")
      .first();
    const syndicate = await db("syndicates")
      .where({ id: syndicateId })
      .select("chain_index")
      .first();
    if (!player?.wallet_address || syndicate?.chain_index == null) return;
    enqueue({
      type: "removeSyndicateMember",
      syndicateIndex: BigInt(syndicate.chain_index),
      member: player.wallet_address as Address,
    });
    if (player.character_nft_id != null) {
      enqueue({
        type: "updateCharacterSyndicate",
        tokenId: BigInt(player.character_nft_id),
        syndicateIndex: 0n,
      });
    }
  } catch (err) {
    console.warn("Chain removeSyndicateMember enqueue failed:", err);
  }
}

// Send alliance request (pending) or cancel existing alliance
router.post("/alliance/:playerId", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const targetId = req.params.playerId as string;
    if (targetId === player.id)
      return res.status(400).json({ error: "Cannot ally with yourself" });

    const target = await db("players").where({ id: targetId }).first();
    if (!target)
      return res.status(404).json({ error: "Target player not found" });

    // Check existing alliance (schema uses player_a_id / player_b_id)
    const existing = await db("alliances")
      .where(function () {
        this.where({ player_a_id: player.id, player_b_id: targetId }).orWhere({
          player_a_id: targetId,
          player_b_id: player.id,
        });
      })
      .first();

    if (existing) {
      // Cancel active alliance or withdraw pending request
      await db("alliances").where({ id: existing.id }).del();
      const io = req.app.get("io");
      if (io) {
        const msg =
          existing.status === "pending"
            ? `${player.username} withdrew their alliance request`
            : `${player.username} cancelled their alliance with you`;
        notifyPlayer(io, targetId, "notification", { message: msg });
      }
      return res.json({ action: "cancelled", allyId: targetId });
    }

    // Create pending alliance request
    await db("alliances").insert({
      id: crypto.randomUUID(),
      player_a_id: player.id,
      player_b_id: targetId,
      status: "pending",
      initiated_by: player.id,
    });

    const io = req.app.get("io");
    if (io) {
      notifyPlayer(io, targetId, "notification", {
        message: `${player.username} sent you an alliance request!`,
      });
      notifyPlayer(io, targetId, "alliance:request", {
        fromId: player.id,
        fromName: player.username,
      });
    }

    res.json({ action: "requested", allyId: targetId });
  } catch (err) {
    console.error("Alliance error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Accept pending alliance request
router.post("/alliance/:playerId/accept", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId as string;
    const fromId = req.params.playerId as string;

    const pending = await db("alliances")
      .where(function () {
        this.where({ player_a_id: fromId, player_b_id: playerId }).orWhere({
          player_a_id: playerId,
          player_b_id: fromId,
        });
      })
      .where({ status: "pending", initiated_by: fromId })
      .first();

    if (!pending)
      return res
        .status(404)
        .json({ error: "No pending request from this player" });

    await db("alliances")
      .where({ id: pending.id })
      .update({ status: "active" });

    const player = await db("players").where({ id: playerId }).first();
    const io = req.app.get("io");
    if (io && player) {
      notifyPlayer(io, fromId, "notification", {
        message: `${player.username} accepted your alliance request!`,
      });
    }

    res.json({ action: "accepted", allyId: fromId });
  } catch (err) {
    console.error("Alliance accept error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reject pending alliance request
router.post("/alliance/:playerId/reject", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId as string;
    const fromId = req.params.playerId as string;

    const pending = await db("alliances")
      .where(function () {
        this.where({ player_a_id: fromId, player_b_id: playerId }).orWhere({
          player_a_id: playerId,
          player_b_id: fromId,
        });
      })
      .where({ status: "pending", initiated_by: fromId })
      .first();

    if (!pending)
      return res
        .status(404)
        .json({ error: "No pending request from this player" });

    await db("alliances").where({ id: pending.id }).del();

    const player = await db("players").where({ id: playerId }).first();
    const io = req.app.get("io");
    if (io && player) {
      notifyPlayer(io, fromId, "notification", {
        message: `${player.username} declined your alliance request`,
      });
    }

    res.json({ action: "rejected", allyId: fromId });
  } catch (err) {
    console.error("Alliance reject error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get pending alliance requests (incoming)
router.get("/alliance/pending", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId as string;

    const pending = await db("alliances")
      .where(function () {
        this.where({ player_b_id: playerId }).orWhere({
          player_a_id: playerId,
        });
      })
      .where({ status: "pending" })
      .whereNot({ initiated_by: playerId })
      .join("players", "alliances.initiated_by", "players.id")
      .select(
        "alliances.id",
        "alliances.initiated_by as fromId",
        "players.username as fromName",
        "alliances.created_at as sentAt",
      );

    res.json({ pendingRequests: pending });
  } catch (err) {
    console.error("Pending alliances error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create syndicate (enhanced with settings + preset roles)
router.post("/syndicate/create", requireAuth, async (req, res) => {
  try {
    const {
      name,
      motto,
      description,
      recruitment_mode,
      min_level,
      quorum_percent,
      vote_duration_hours,
      succession_rule,
      treasury_withdrawal_limit,
    } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const existingMembership = await db("syndicate_members")
      .where({ player_id: player.id })
      .first();
    if (existingMembership)
      return res.status(400).json({ error: "Already in a syndicate" });

    const syndicateId = crypto.randomUUID();
    await db("syndicates").insert({
      id: syndicateId,
      name,
      leader_id: player.id,
    });

    await db("syndicate_members").insert({
      syndicate_id: syndicateId,
      player_id: player.id,
      role: "leader",
    });

    // Create syndicate settings + preset roles (governance tables)
    try {
      await db("syndicate_settings").insert({
        syndicate_id: syndicateId,
        recruitment_mode: recruitment_mode || "closed",
        min_level: min_level || 1,
        quorum_percent: quorum_percent || 60,
        vote_duration_hours: vote_duration_hours || 48,
        succession_rule: succession_rule || "officer_vote",
        treasury_withdrawal_limit: treasury_withdrawal_limit || 0,
        motto: motto || null,
        description: description || null,
      });

      const presetRoles = [
        { name: "Recruiter", priority: 10, permissions: ["invite"] },
        { name: "Treasurer", priority: 20, permissions: ["withdraw_treasury"] },
        { name: "Warlord", priority: 30, permissions: ["kick", "start_vote"] },
        {
          name: "Admin",
          priority: 40,
          permissions: [
            "invite",
            "kick",
            "promote",
            "withdraw_treasury",
            "start_vote",
            "manage_projects",
            "edit_charter",
            "manage_roles",
          ],
        },
      ];

      for (const role of presetRoles) {
        const roleId = crypto.randomUUID();
        await db("syndicate_roles").insert({
          id: roleId,
          syndicate_id: syndicateId,
          name: role.name,
          priority: role.priority,
          is_preset: true,
        });
        for (const perm of role.permissions) {
          await db("syndicate_role_permissions").insert({
            role_id: roleId,
            permission: perm,
          });
        }
      }
    } catch {
      // Governance tables may not exist yet — syndicate still created successfully
    }

    // --- Chain settlement: deploy syndicate DAO on-chain ---
    if (isSettlementEnabled("syndicate") && player.wallet_address) {
      try {
        const settings = await db("syndicate_settings")
          .where({ syndicate_id: syndicateId })
          .first();
        const voteDurationSecs = BigInt(
          (settings?.vote_duration_hours || 48) * 3600,
        );
        const quorum = BigInt(settings?.quorum_percent || 60);

        enqueue({
          type: "createSyndicate",
          name,
          founder: player.wallet_address as Address,
          votingPeriod: voteDurationSecs,
          quorumPercent: quorum,
        });
      } catch (chainErr) {
        console.warn("Syndicate chain deployment enqueue failed:", chainErr);
      }
    }

    // Mission tracking: join_syndicate (creating counts as joining)
    const io = req.app.get("io");
    checkAndUpdateMissions(player.id, "join_syndicate", { syndicateId }, io);

    res.status(201).json({ syndicateId, name });
  } catch (err: any) {
    if (err.message?.includes("UNIQUE constraint failed") || err.constraint) {
      return res.status(409).json({ error: "Syndicate name already taken" });
    }
    console.error("Syndicate create error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Invite to syndicate
router.post("/syndicate/invite/:playerId", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const membership = await db("syndicate_members")
      .where({ player_id: player.id })
      .first();
    if (!membership || membership.role === "member") {
      return res
        .status(403)
        .json({ error: "Only leaders and officers can invite" });
    }

    const targetId = req.params.playerId as string;
    const target = await db("players").where({ id: targetId }).first();
    if (!target)
      return res.status(404).json({ error: "Target player not found" });

    const existingMembership = await db("syndicate_members")
      .where({ player_id: targetId })
      .first();
    if (existingMembership)
      return res
        .status(400)
        .json({ error: "Player is already in a syndicate" });

    await db("syndicate_members").insert({
      syndicate_id: membership.syndicate_id,
      player_id: targetId,
      role: "member",
    });

    // Wire socket room + multi-session sync for invited player
    const io = req.app.get("io");
    if (io) {
      handleSyndicateJoin(io, targetId, membership.syndicate_id);
      syncPlayer(io, targetId, "sync:status");
    }

    res.json({ invited: targetId, syndicateId: membership.syndicate_id });
  } catch (err) {
    console.error("Syndicate invite error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Syndicate info
router.get("/syndicate", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const membership = await db("syndicate_members")
      .where({ player_id: player.id })
      .first();
    if (!membership)
      return res.status(404).json({ error: "Not in a syndicate" });

    const syndicate = await db("syndicates")
      .where({ id: membership.syndicate_id })
      .first();
    let settings = null;
    try {
      settings =
        (await db("syndicate_settings")
          .where({ syndicate_id: membership.syndicate_id })
          .first()) || null;
    } catch {
      /* table may not exist yet */
    }
    const members = await db("syndicate_members")
      .join("players", "syndicate_members.player_id", "players.id")
      .leftJoin(
        "player_progression",
        "players.id",
        "player_progression.player_id",
      )
      .where({ syndicate_id: membership.syndicate_id })
      .select(
        "players.id",
        "players.username",
        "player_progression.level",
        "syndicate_members.role",
      );

    res.json({
      id: syndicate.id,
      name: syndicate.name,
      leaderId: syndicate.leader_id,
      treasury: syndicate.treasury,
      charter: syndicate.charter,
      settings: settings || null,
      members,
    });
  } catch (err) {
    console.error("Syndicate info error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Promote member to officer (leader only)
router.post("/syndicate/promote/:playerId", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const membership = await db("syndicate_members")
      .where({ player_id: player.id })
      .first();
    if (!membership || membership.role !== "leader") {
      return res
        .status(403)
        .json({ error: "Only the leader can promote members" });
    }

    const targetId = req.params.playerId as string;
    const targetMembership = await db("syndicate_members")
      .where({ syndicate_id: membership.syndicate_id, player_id: targetId })
      .first();
    if (!targetMembership)
      return res.status(404).json({ error: "Player not in your syndicate" });
    if (targetMembership.role === "leader")
      return res.status(400).json({ error: "Cannot promote the leader" });

    const newRole = targetMembership.role === "member" ? "officer" : "member";
    await db("syndicate_members")
      .where({ syndicate_id: membership.syndicate_id, player_id: targetId })
      .update({ role: newRole });

    res.json({ playerId: targetId, newRole });
  } catch (err) {
    console.error("Syndicate promote error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Kick member (leader or officer can kick members, leader can kick officers)
router.post("/syndicate/kick/:playerId", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const membership = await db("syndicate_members")
      .where({ player_id: player.id })
      .first();
    if (!membership || membership.role === "member") {
      return res
        .status(403)
        .json({ error: "Only leaders and officers can kick members" });
    }

    const targetId = req.params.playerId as string;
    const targetMembership = await db("syndicate_members")
      .where({ syndicate_id: membership.syndicate_id, player_id: targetId })
      .first();
    if (!targetMembership)
      return res.status(404).json({ error: "Player not in your syndicate" });
    if (targetMembership.role === "leader")
      return res.status(400).json({ error: "Cannot kick the leader" });
    if (targetMembership.role === "officer" && membership.role !== "leader") {
      return res
        .status(403)
        .json({ error: "Only the leader can kick officers" });
    }

    await db("syndicate_members")
      .where({ syndicate_id: membership.syndicate_id, player_id: targetId })
      .del();

    // Wire socket room + multi-session sync for kicked player
    const io = req.app.get("io");
    if (io) {
      handleSyndicateLeave(io, targetId, membership.syndicate_id);
      syncPlayer(io, targetId, "sync:status");
    }
    chainRemoveSyndicateMember(targetId, membership.syndicate_id);

    res.json({ kicked: targetId });
  } catch (err) {
    console.error("Syndicate kick error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Leave syndicate
router.post("/syndicate/leave", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const membership = await db("syndicate_members")
      .where({ player_id: player.id })
      .first();
    if (!membership)
      return res.status(404).json({ error: "Not in a syndicate" });
    if (membership.role === "leader") {
      return res
        .status(400)
        .json({ error: "Leader must disband or transfer leadership first" });
    }

    const syndicateId = membership.syndicate_id;
    await db("syndicate_members")
      .where({ syndicate_id: syndicateId, player_id: player.id })
      .del();

    // Wire socket room + multi-session sync
    const io = req.app.get("io");
    if (io) {
      handleSyndicateLeave(io, player.id, syndicateId);
      syncPlayer(
        io,
        player.id,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );
    }
    chainRemoveSyndicateMember(player.id, syndicateId);

    res.json({ left: syndicateId });
  } catch (err) {
    console.error("Syndicate leave error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Disband syndicate (leader only)
router.post("/syndicate/disband", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const membership = await db("syndicate_members")
      .where({ player_id: player.id })
      .first();
    if (!membership || membership.role !== "leader") {
      return res.status(403).json({ error: "Only the leader can disband" });
    }

    const syndicate = await db("syndicates")
      .where({ id: membership.syndicate_id })
      .first();

    // Return treasury to leader
    if (syndicate && Number(syndicate.treasury) > 0) {
      await db("players")
        .where({ id: player.id })
        .update({
          credits: Number(player.credits) + Number(syndicate.treasury),
        });
      await settleCreditPlayer(
        player.id,
        Number(syndicate.treasury),
        "syndicate",
      );
    }

    // Remove all members and syndicate alliances
    await db("syndicate_members")
      .where({ syndicate_id: membership.syndicate_id })
      .del();
    await db("alliances")
      .where({ syndicate_a_id: membership.syndicate_id })
      .orWhere({ syndicate_b_id: membership.syndicate_id })
      .del();
    await db("syndicates").where({ id: membership.syndicate_id }).del();

    res.json({
      disbanded: membership.syndicate_id,
      treasuryReturned: Number(syndicate?.treasury ?? 0),
    });
  } catch (err) {
    console.error("Syndicate disband error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Transfer leadership
router.post("/syndicate/transfer/:playerId", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const membership = await db("syndicate_members")
      .where({ player_id: player.id })
      .first();
    if (!membership || membership.role !== "leader") {
      return res
        .status(403)
        .json({ error: "Only the leader can transfer leadership" });
    }

    const targetId = req.params.playerId as string;
    const targetMembership = await db("syndicate_members")
      .where({ syndicate_id: membership.syndicate_id, player_id: targetId })
      .first();
    if (!targetMembership)
      return res.status(404).json({ error: "Player not in your syndicate" });

    await db("syndicate_members")
      .where({ syndicate_id: membership.syndicate_id, player_id: targetId })
      .update({ role: "leader" });
    await db("syndicate_members")
      .where({ syndicate_id: membership.syndicate_id, player_id: player.id })
      .update({ role: "officer" });
    await db("syndicates")
      .where({ id: membership.syndicate_id })
      .update({ leader_id: targetId });

    res.json({ newLeader: targetId });
  } catch (err) {
    console.error("Syndicate transfer error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Deposit credits to syndicate treasury
router.post("/syndicate/deposit", requireAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 1)
      return res.status(400).json({ error: "Invalid amount" });

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const membership = await db("syndicate_members")
      .where({ player_id: player.id })
      .first();
    if (!membership)
      return res.status(404).json({ error: "Not in a syndicate" });

    if (Number(player.credits) < amount) {
      return res.status(400).json({ error: "Not enough credits" });
    }

    await db("players")
      .where({ id: player.id })
      .update({
        credits: Number(player.credits) - amount,
      });
    await settleDebitPlayer(player.id, amount, "syndicate");
    await db("syndicates")
      .where({ id: membership.syndicate_id })
      .increment("treasury", amount);

    const syndicate = await db("syndicates")
      .where({ id: membership.syndicate_id })
      .first();

    res.json({
      deposited: amount,
      newCredits: Number(player.credits) - amount,
      syndicateTreasury: Number(syndicate.treasury),
    });
  } catch (err) {
    console.error("Syndicate deposit error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Withdraw from syndicate treasury (leader only)
router.post("/syndicate/withdraw", requireAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 1)
      return res.status(400).json({ error: "Invalid amount" });

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const membership = await db("syndicate_members")
      .where({ player_id: player.id })
      .first();
    if (!membership || membership.role !== "leader") {
      return res
        .status(403)
        .json({ error: "Only the leader can withdraw from treasury" });
    }

    const syndicate = await db("syndicates")
      .where({ id: membership.syndicate_id })
      .first();
    if (Number(syndicate.treasury) < amount) {
      return res.status(400).json({ error: "Insufficient treasury funds" });
    }

    await db("syndicates")
      .where({ id: membership.syndicate_id })
      .decrement("treasury", amount);
    await db("players")
      .where({ id: player.id })
      .update({
        credits: Number(player.credits) + amount,
      });
    await settleCreditPlayer(player.id, amount, "syndicate");

    res.json({
      withdrawn: amount,
      newCredits: Number(player.credits) + amount,
      syndicateTreasury: Number(syndicate.treasury) - amount,
    });
  } catch (err) {
    console.error("Syndicate withdraw error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update syndicate charter
router.post("/syndicate/charter", requireAuth, async (req, res) => {
  try {
    const { charter } = req.body;
    if (!charter)
      return res.status(400).json({ error: "Charter text required" });

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const membership = await db("syndicate_members")
      .where({ player_id: player.id })
      .first();
    if (!membership || membership.role === "member") {
      return res
        .status(403)
        .json({ error: "Only leaders and officers can update the charter" });
    }

    await db("syndicates")
      .where({ id: membership.syndicate_id })
      .update({ charter });

    res.json({ updated: true });
  } catch (err) {
    console.error("Syndicate charter error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Form syndicate-to-syndicate alliance
router.post(
  "/syndicate/alliance/:syndicateId",
  requireAuth,
  async (req, res) => {
    try {
      const player = await db("players")
        .where({ id: req.session.playerId })
        .first();
      if (!player) return res.status(404).json({ error: "Player not found" });

      const membership = await db("syndicate_members")
        .where({ player_id: player.id })
        .first();
      if (!membership || membership.role === "member") {
        return res.status(403).json({
          error: "Only leaders and officers can form syndicate alliances",
        });
      }

      const targetSyndicateId = req.params.syndicateId as string;
      if (targetSyndicateId === membership.syndicate_id) {
        return res
          .status(400)
          .json({ error: "Cannot ally with your own syndicate" });
      }

      const targetSyndicate = await db("syndicates")
        .where({ id: targetSyndicateId })
        .first();
      if (!targetSyndicate)
        return res.status(404).json({ error: "Syndicate not found" });

      // Check existing syndicate alliance
      const existing = await db("alliances")
        .where(function () {
          this.where({
            syndicate_a_id: membership.syndicate_id,
            syndicate_b_id: targetSyndicateId,
          }).orWhere({
            syndicate_a_id: targetSyndicateId,
            syndicate_b_id: membership.syndicate_id,
          });
        })
        .first();

      if (existing) {
        await db("alliances").where({ id: existing.id }).del();
        return res.json({
          action: "cancelled",
          targetSyndicate: targetSyndicate.name,
        });
      }

      await db("alliances").insert({
        id: crypto.randomUUID(),
        syndicate_a_id: membership.syndicate_id,
        syndicate_b_id: targetSyndicateId,
      });

      res.json({ action: "formed", targetSyndicate: targetSyndicate.name });
    } catch (err) {
      console.error("Syndicate alliance error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Share planet with syndicate
router.post(
  "/syndicate/share-planet/:planetId",
  requireAuth,
  async (req, res) => {
    try {
      const player = await db("players")
        .where({ id: req.session.playerId })
        .first();
      if (!player) return res.status(404).json({ error: "Player not found" });

      const membership = await db("syndicate_members")
        .where({ player_id: player.id })
        .first();
      if (!membership)
        return res.status(404).json({ error: "Not in a syndicate" });

      const planetId = req.params.planetId as string;
      const planet = await db("planets").where({ id: planetId }).first();
      if (!planet) return res.status(404).json({ error: "Planet not found" });
      if (planet.owner_id !== player.id) {
        return res.status(403).json({ error: "You do not own this planet" });
      }

      // Toggle shared status by setting syndicate_id on the planet
      // If already shared, unshare; if not shared, share
      if (planet.syndicate_id === membership.syndicate_id) {
        await db("planets")
          .where({ id: planetId })
          .update({ syndicate_id: null });
        return res.json({ shared: false, planetId });
      }

      await db("planets")
        .where({ id: planetId })
        .update({ syndicate_id: membership.syndicate_id });
      res.json({
        shared: true,
        planetId,
        syndicateId: membership.syndicate_id,
      });
    } catch (err) {
      console.error("Share planet error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// View syndicate's shared planets
router.get("/syndicate/planets", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const membership = await db("syndicate_members")
      .where({ player_id: player.id })
      .first();
    if (!membership)
      return res.status(404).json({ error: "Not in a syndicate" });

    const planets = await db("planets")
      .where({ syndicate_id: membership.syndicate_id })
      .join("players", "planets.owner_id", "players.id")
      .select(
        "planets.id",
        "planets.name",
        "planets.planet_class as planetClass",
        "planets.sector_id as sectorId",
        "planets.colonists",
        "planets.upgrade_level as upgradeLevel",
        "players.username as ownerName",
      );

    res.json({ planets });
  } catch (err) {
    console.error("Syndicate planets error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Place bounty
router.post("/bounty", requireAuth, async (req, res) => {
  try {
    const { targetPlayerId, amount } = req.body;
    if (!targetPlayerId || !amount || amount < 100) {
      return res
        .status(400)
        .json({ error: "Target and amount (min 100) required" });
    }

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    if (Number(player.credits) < amount) {
      return res.status(400).json({ error: "Not enough credits" });
    }

    const target = await db("players").where({ id: targetPlayerId }).first();
    if (!target)
      return res.status(404).json({ error: "Target player not found" });

    await db("players")
      .where({ id: player.id })
      .update({
        credits: Number(player.credits) - amount,
      });
    await settleDebitPlayer(player.id, amount, "combat");

    // Schema uses placed_by_id, target_player_id, reward
    await db("bounties").insert({
      id: crypto.randomUUID(),
      placed_by_id: player.id,
      target_player_id: targetPlayerId,
      reward: amount,
    });

    // Profile stats: bounty placed
    incrementStat(player.id, "bounties_placed", 1);
    logActivity(
      player.id,
      "bounty_placed",
      `Placed ${amount} credit bounty on ${target.username}`,
      { targetId: targetPlayerId, amount },
    );

    res.json({
      targetId: targetPlayerId,
      amount,
      newCredits: Number(player.credits) - amount,
    });
  } catch (err) {
    console.error("Bounty error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// View active bounties
router.get("/bounties", requireAuth, async (req, res) => {
  try {
    const bounties = await db("bounties")
      .where({ active: true })
      .join("players as target", "bounties.target_player_id", "target.id")
      .join("players as placer", "bounties.placed_by_id", "placer.id")
      .select(
        "bounties.id",
        "bounties.reward as amount",
        "target.username as targetUsername",
        "target.id as targetId",
        "placer.username as placedByUsername",
        "bounties.created_at",
      )
      .orderBy("bounties.reward", "desc");

    res.json({ bounties });
  } catch (err) {
    console.error("Bounties error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// View bounty history (claimed bounties)
router.get("/bounties/history", requireAuth, async (req, res) => {
  try {
    const bounties = await db("bounties")
      .where({ active: false })
      .join("players as target", "bounties.target_player_id", "target.id")
      .join("players as placer", "bounties.placed_by_id", "placer.id")
      .leftJoin("players as claimer", "bounties.claimed_by_id", "claimer.id")
      .select(
        "bounties.id",
        "bounties.reward as amount",
        "target.username as targetUsername",
        "placer.username as placedByUsername",
        "claimer.username as claimedByUsername",
        "bounties.created_at as placedAt",
        "bounties.claimed_at as claimedAt",
      )
      .orderBy("bounties.claimed_at", "desc")
      .limit(50);

    res.json({ bounties });
  } catch (err) {
    console.error("Bounty history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// View bounties I've claimed
router.get("/bounties/claimed", requireAuth, async (req, res) => {
  try {
    const bounties = await db("bounties")
      .where({ claimed_by_id: req.session.playerId })
      .join("players as target", "bounties.target_player_id", "target.id")
      .select(
        "bounties.id",
        "bounties.reward as amount",
        "target.username as targetUsername",
        "bounties.claimed_at as claimedAt",
      )
      .orderBy("bounties.claimed_at", "desc");

    res.json({ bounties });
  } catch (err) {
    console.error("Claimed bounties error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// View bounties on me
router.get("/bounties/on-me", requireAuth, async (req, res) => {
  try {
    const bounties = await db("bounties")
      .where({ target_player_id: req.session.playerId, active: true })
      .join("players as placer", "bounties.placed_by_id", "placer.id")
      .select(
        "bounties.id",
        "bounties.reward as amount",
        "placer.username as placedByUsername",
        "bounties.created_at as placedAt",
      )
      .orderBy("bounties.reward", "desc");

    const totalBounty = bounties.reduce((sum, b) => sum + Number(b.amount), 0);
    res.json({ bounties, totalBounty });
  } catch (err) {
    console.error("Bounties on me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// View combat log
router.get("/combat-log", requireAuth, async (req, res) => {
  try {
    const logs = await db("combat_logs")
      .where(function () {
        this.where({ attacker_id: req.session.playerId }).orWhere({
          defender_id: req.session.playerId,
        });
      })
      .join("players as attacker", "combat_logs.attacker_id", "attacker.id")
      .join("players as defender", "combat_logs.defender_id", "defender.id")
      .select(
        "combat_logs.id",
        "attacker.username as attackerName",
        "defender.username as defenderName",
        "combat_logs.sector_id as sectorId",
        "combat_logs.energy_expended as energyExpended",
        "combat_logs.damage_dealt as damageDealt",
        "combat_logs.outcome",
        "combat_logs.created_at as timestamp",
      )
      .orderBy("combat_logs.created_at", "desc")
      .limit(50);

    res.json({ logs });
  } catch (err) {
    console.error("Combat log error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all alliances (personal + syndicate)
router.get("/alliances", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    // Personal alliances (active only)
    const playerAlliances = await db("alliances")
      .where(function () {
        this.where({ player_a_id: player.id }).orWhere({
          player_b_id: player.id,
        });
      })
      .whereNotNull("player_a_id")
      .where({ status: "active" })
      .join("players as a", "alliances.player_a_id", "a.id")
      .join("players as b", "alliances.player_b_id", "b.id")
      .select(
        "alliances.id",
        "a.id as playerAId",
        "a.username as playerAName",
        "b.id as playerBId",
        "b.username as playerBName",
        "alliances.created_at as formedAt",
      );

    const personalAllies = playerAlliances.map((a) => ({
      id: a.id,
      allyId: a.playerAId === player.id ? a.playerBId : a.playerAId,
      allyName: a.playerAId === player.id ? a.playerBName : a.playerAName,
      formedAt: a.formedAt,
    }));

    // Syndicate alliances
    let syndicateAllies: any[] = [];
    const membership = await db("syndicate_members")
      .where({ player_id: player.id })
      .first();
    if (membership) {
      const syndAlliances = await db("alliances")
        .where(function () {
          this.where({ syndicate_a_id: membership.syndicate_id }).orWhere({
            syndicate_b_id: membership.syndicate_id,
          });
        })
        .whereNotNull("syndicate_a_id")
        .join("syndicates as a", "alliances.syndicate_a_id", "a.id")
        .join("syndicates as b", "alliances.syndicate_b_id", "b.id")
        .select(
          "alliances.id",
          "a.id as syndAId",
          "a.name as syndAName",
          "b.id as syndBId",
          "b.name as syndBName",
          "alliances.created_at as formedAt",
        );

      syndicateAllies = syndAlliances.map((a) => ({
        id: a.id,
        allySyndicateId:
          a.syndAId === membership.syndicate_id ? a.syndBId : a.syndAId,
        allySyndicateName:
          a.syndAId === membership.syndicate_id ? a.syndBName : a.syndAName,
        formedAt: a.formedAt,
      }));
    }

    res.json({ personalAllies, syndicateAllies });
  } catch (err) {
    console.error("Alliances list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Browse/search syndicates
router.get("/syndicates/browse", requireAuth, async (req, res) => {
  try {
    const { search, recruitment_mode, min_members, max_members, sort_by } =
      req.query;

    let query = db("syndicates")
      .leftJoin(
        "syndicate_settings",
        "syndicates.id",
        "syndicate_settings.syndicate_id",
      )
      .leftJoin(
        db("syndicate_members")
          .select("syndicate_id")
          .count("* as member_count")
          .groupBy("syndicate_id")
          .as("mc"),
        "syndicates.id",
        "mc.syndicate_id",
      )
      .select(
        "syndicates.id",
        "syndicates.name",
        "syndicates.treasury",
        "syndicates.created_at",
        "syndicate_settings.recruitment_mode",
        "syndicate_settings.min_level",
        "syndicate_settings.motto",
        db.raw("COALESCE(mc.member_count, 0) as member_count"),
      );

    // Exclude invite_only unless exact name search
    if (search) {
      query = query.where(function () {
        this.where("syndicates.name", "like", `%${search}%`).orWhere(
          "syndicate_settings.motto",
          "like",
          `%${search}%`,
        );
      });
    } else {
      query = query.where(function () {
        this.whereNull("syndicate_settings.recruitment_mode").orWhereNot(
          "syndicate_settings.recruitment_mode",
          "invite_only",
        );
      });
    }

    if (recruitment_mode && recruitment_mode !== "all") {
      query = query.where(
        "syndicate_settings.recruitment_mode",
        recruitment_mode as string,
      );
    }

    if (min_members) {
      query = query.havingRaw("COALESCE(mc.member_count, 0) >= ?", [
        Number(min_members),
      ]);
    }
    if (max_members) {
      query = query.havingRaw("COALESCE(mc.member_count, 0) <= ?", [
        Number(max_members),
      ]);
    }

    const sortField =
      sort_by === "members"
        ? "member_count"
        : sort_by === "treasury"
          ? "syndicates.treasury"
          : "syndicates.created_at";
    query = query.orderBy(sortField, "desc").limit(50);

    const syndicates = await query;
    res.json({ syndicates });
  } catch (err) {
    console.error("Browse syndicates error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Join open syndicate or request to join closed
router.post("/syndicate/:id/join", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const existing = await db("syndicate_members")
      .where({ player_id: player.id })
      .first();
    if (existing)
      return res.status(400).json({ error: "Already in a syndicate" });

    const syndicateId = req.params.id as string;
    const syndicate = await db("syndicates").where({ id: syndicateId }).first();
    if (!syndicate)
      return res.status(404).json({ error: "Syndicate not found" });

    const settings = await db("syndicate_settings")
      .where({ syndicate_id: syndicateId })
      .first();
    const mode = settings?.recruitment_mode || "closed";

    if (mode === "invite_only") {
      return res.status(403).json({ error: "This syndicate is invite-only" });
    }

    if (settings?.min_level && player.level < settings.min_level) {
      return res
        .status(403)
        .json({ error: `Minimum level ${settings.min_level} required` });
    }

    if (mode === "open") {
      await db("syndicate_members").insert({
        syndicate_id: syndicateId,
        player_id: player.id,
        role: "member",
      });
      // Wire socket room + multi-session sync
      const io = req.app.get("io");
      if (io) {
        handleSyndicateJoin(io, player.id, syndicateId);
        syncPlayer(
          io,
          player.id,
          "sync:status",
          req.headers["x-socket-id"] as string | undefined,
        );
      }
      chainAddSyndicateMember(player.id, syndicateId);
      // Mission tracking: join_syndicate
      checkAndUpdateMissions(player.id, "join_syndicate", { syndicateId }, io);
      return res.json({ action: "joined", syndicateId });
    }

    // Closed — create join request
    const existingReq = await db("syndicate_join_requests")
      .where({
        syndicate_id: syndicateId,
        player_id: player.id,
        status: "pending",
      })
      .first();
    if (existingReq)
      return res.status(400).json({ error: "Already have a pending request" });

    await db("syndicate_join_requests").insert({
      id: crypto.randomUUID(),
      syndicate_id: syndicateId,
      player_id: player.id,
      message: req.body.message || null,
    });

    res.json({ action: "requested", syndicateId });
  } catch (err) {
    console.error("Join syndicate error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Join via invite code
router.post("/syndicate/join-code", requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Code required" });

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const existing = await db("syndicate_members")
      .where({ player_id: player.id })
      .first();
    if (existing)
      return res.status(400).json({ error: "Already in a syndicate" });

    const invite = await db("syndicate_invite_codes")
      .where({ code: code.toUpperCase() })
      .where("uses_remaining", ">", 0)
      .where("expires_at", ">", new Date().toISOString())
      .first();

    if (!invite)
      return res.status(404).json({ error: "Invalid or expired invite code" });

    await db("syndicate_members").insert({
      syndicate_id: invite.syndicate_id,
      player_id: player.id,
      role: "member",
    });

    await db("syndicate_invite_codes")
      .where({ id: invite.id })
      .update({
        uses_remaining: invite.uses_remaining - 1,
      });

    // Wire socket room + multi-session sync
    const io = req.app.get("io");
    if (io) {
      handleSyndicateJoin(io, player.id, invite.syndicate_id);
      syncPlayer(
        io,
        player.id,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );
    }

    chainAddSyndicateMember(player.id, invite.syndicate_id);
    // Mission tracking: join_syndicate (via invite code)
    checkAndUpdateMissions(
      player.id,
      "join_syndicate",
      { syndicateId: invite.syndicate_id },
      io,
    );
    res.json({ action: "joined", syndicateId: invite.syndicate_id });
  } catch (err) {
    console.error("Join by code error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List pending join requests (officer+)
router.get("/syndicate/:id/requests", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const membership = await db("syndicate_members")
      .where({ player_id: player.id })
      .first();
    if (!membership || membership.role === "member") {
      return res
        .status(403)
        .json({ error: "Only leaders and officers can view requests" });
    }
    if (membership.syndicate_id !== req.params.id) {
      return res.status(403).json({ error: "Not your syndicate" });
    }

    const requests = await db("syndicate_join_requests")
      .where({ syndicate_id: req.params.id, status: "pending" })
      .join("players", "syndicate_join_requests.player_id", "players.id")
      .select(
        "syndicate_join_requests.id",
        "players.id as playerId",
        "players.username",
        "players.level",
        "syndicate_join_requests.message",
        "syndicate_join_requests.created_at",
      )
      .orderBy("syndicate_join_requests.created_at", "asc");

    res.json({ requests });
  } catch (err) {
    console.error("Join requests error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Accept/reject join request (officer+)
router.post(
  "/syndicate/:id/requests/:reqId/review",
  requireAuth,
  async (req, res) => {
    try {
      const { accept } = req.body;
      const player = await db("players")
        .where({ id: req.session.playerId })
        .first();
      if (!player) return res.status(404).json({ error: "Player not found" });

      const membership = await db("syndicate_members")
        .where({ player_id: player.id })
        .first();
      if (!membership || membership.role === "member") {
        return res
          .status(403)
          .json({ error: "Only leaders and officers can review requests" });
      }
      if (membership.syndicate_id !== req.params.id) {
        return res.status(403).json({ error: "Not your syndicate" });
      }

      const request = await db("syndicate_join_requests")
        .where({ id: req.params.reqId, status: "pending" })
        .first();
      if (!request) return res.status(404).json({ error: "Request not found" });

      if (accept) {
        // Check if player is already in a syndicate
        const alreadyIn = await db("syndicate_members")
          .where({ player_id: request.player_id })
          .first();
        if (alreadyIn) {
          await db("syndicate_join_requests")
            .where({ id: request.id })
            .update({ status: "rejected", reviewed_by: player.id });
          return res
            .status(400)
            .json({ error: "Player already in a syndicate" });
        }

        await db("syndicate_members").insert({
          syndicate_id: request.syndicate_id,
          player_id: request.player_id,
          role: "member",
        });
        await db("syndicate_join_requests")
          .where({ id: request.id })
          .update({ status: "accepted", reviewed_by: player.id });
        // Wire socket room + multi-session sync for accepted player
        const io = req.app.get("io");
        if (io) {
          handleSyndicateJoin(io, request.player_id, request.syndicate_id);
          syncPlayer(io, request.player_id, "sync:status");
        }
        chainAddSyndicateMember(request.player_id, request.syndicate_id);
        res.json({ action: "accepted", playerId: request.player_id });
      } else {
        await db("syndicate_join_requests")
          .where({ id: request.id })
          .update({ status: "rejected", reviewed_by: player.id });
        res.json({ action: "rejected", playerId: request.player_id });
      }
    } catch (err) {
      console.error("Review request error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Generate invite code (officer+ with invite perm)
router.post("/syndicate/:id/invite-code", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const membership = await db("syndicate_members")
      .where({ player_id: player.id })
      .first();
    if (!membership || membership.role === "member") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    if (membership.syndicate_id !== req.params.id) {
      return res.status(403).json({ error: "Not your syndicate" });
    }

    const { uses = 1, expires_hours = 24 } = req.body;
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const expiresAt = new Date(
      Date.now() + expires_hours * 60 * 60 * 1000,
    ).toISOString();

    const id = crypto.randomUUID();
    await db("syndicate_invite_codes").insert({
      id,
      syndicate_id: req.params.id,
      code,
      created_by: player.id,
      uses_remaining: uses,
      expires_at: expiresAt,
    });

    res.json({ id, code, uses_remaining: uses, expires_at: expiresAt });
  } catch (err) {
    console.error("Invite code error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List active invite codes (officer+)
router.get("/syndicate/:id/invite-codes", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const membership = await db("syndicate_members")
      .where({ player_id: player.id })
      .first();
    if (!membership || membership.role === "member") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    if (membership.syndicate_id !== req.params.id) {
      return res.status(403).json({ error: "Not your syndicate" });
    }

    const codes = await db("syndicate_invite_codes")
      .where({ syndicate_id: req.params.id })
      .where("uses_remaining", ">", 0)
      .where("expires_at", ">", new Date().toISOString())
      .join("players", "syndicate_invite_codes.created_by", "players.id")
      .select(
        "syndicate_invite_codes.id",
        "syndicate_invite_codes.code",
        "syndicate_invite_codes.uses_remaining",
        "syndicate_invite_codes.expires_at",
        "players.username as createdBy",
      )
      .orderBy("syndicate_invite_codes.created_at", "desc");

    res.json({ codes });
  } catch (err) {
    console.error("List invite codes error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Revoke invite code
router.delete(
  "/syndicate/:id/invite-code/:codeId",
  requireAuth,
  async (req, res) => {
    try {
      const player = await db("players")
        .where({ id: req.session.playerId })
        .first();
      if (!player) return res.status(404).json({ error: "Player not found" });

      const membership = await db("syndicate_members")
        .where({ player_id: player.id })
        .first();
      if (!membership || membership.role === "member") {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      if (membership.syndicate_id !== req.params.id) {
        return res.status(403).json({ error: "Not your syndicate" });
      }

      await db("syndicate_invite_codes")
        .where({ id: req.params.codeId, syndicate_id: req.params.id })
        .del();
      res.json({ revoked: true });
    } catch (err) {
      console.error("Revoke invite code error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
