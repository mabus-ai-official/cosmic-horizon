import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import db from "../db/connection";
import { GAME_CONFIG } from "../config/game";
import { SHIP_TYPES } from "../config/ship-types";
import { getRace, VALID_RACE_IDS, RaceId } from "../config/races";
import { signJwt } from "../middleware/jwt";
import { requireAuth } from "../middleware/auth";
import { getDefaultTutorialState } from "../config/tutorial-sandbox";
import { generateSPUniverse } from "../engine/sp-universe";
import { assignInitialSPMissions } from "../db/seeds/011_sp_missions";
import { awardXP } from "../engine/progression";
import { enqueue } from "../chain/tx-queue";
import { isChainEnabled } from "../chain/config";
import type { Address } from "viem";
import { createPlayerWallet } from "../chain/wallet-provider";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      race,
      gameMode: rawGameMode,
      matrixUserId,
    } = req.body;
    const gameMode =
      rawGameMode === "singleplayer" ? "singleplayer" : "multiplayer";
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!race || !VALID_RACE_IDS.includes(race)) {
      return res
        .status(400)
        .json({ error: "Invalid race. Choose: " + VALID_RACE_IDS.join(", ") });
    }
    if (username.length < 3 || username.length > 32) {
      return res
        .status(400)
        .json({ error: "Username must be 3-32 characters" });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    const raceConfig = getRace(race as RaceId);
    const shipTypeConfig = SHIP_TYPES.find(
      (s) => s.id === raceConfig.starterShipType,
    );
    if (!shipTypeConfig) {
      return res
        .status(500)
        .json({ error: "Invalid starter ship configuration" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // For MP: pick a random star mall. For SP: temporary sector, updated after universe generation.
    let startingSectorId: number;

    if (gameMode === "multiplayer") {
      const starMallSector = await db("sectors")
        .where({ has_star_mall: true, universe: "mp" })
        .orderByRaw("RANDOM()")
        .first();

      if (!starMallSector) {
        return res.status(500).json({ error: "Universe not initialized" });
      }
      startingSectorId = starMallSector.id;
    } else {
      // SP: we'll set the real starting sector after generating the universe
      // Use sector 1 temporarily
      startingSectorId = 1;
    }

    const bonusUntil = new Date(
      Date.now() +
        GAME_CONFIG.ENERGY_REGEN_BONUS_DURATION_HOURS * 60 * 60 * 1000,
    );
    const startingCredits =
      GAME_CONFIG.STARTING_CREDITS + raceConfig.startingCreditsBonus;
    const startingMaxEnergy =
      GAME_CONFIG.MAX_ENERGY + raceConfig.startingMaxEnergyBonus;

    // SQLite doesn't support .returning(), so generate ID and insert
    const playerId = crypto.randomUUID();

    const insertData: Record<string, any> = {
      id: playerId,
      username,
      email,
      password_hash: passwordHash,
      race,
      game_mode: gameMode,
      current_sector_id: startingSectorId,
      energy: startingMaxEnergy,
      max_energy: startingMaxEnergy,
      credits: startingCredits,
      explored_sectors: JSON.stringify([startingSectorId]),
      energy_regen_bonus_until: bonusUntil,
      last_login: new Date(),
      tutorial_state: JSON.stringify(
        getDefaultTutorialState(startingCredits, startingMaxEnergy),
      ),
    };
    if (matrixUserId) insertData.matrix_user_id = matrixUserId;
    await db("players").insert(insertData);

    // Create starter ship with racial bonuses
    const shipId = crypto.randomUUID();
    const starterWeapon =
      shipTypeConfig.baseWeaponEnergy + raceConfig.starterWeaponBonus;
    const starterEngine =
      shipTypeConfig.baseEngineEnergy + raceConfig.starterEngineBonus;

    await db("ships").insert({
      id: shipId,
      ship_type_id: raceConfig.starterShipType,
      owner_id: playerId,
      sector_id: startingSectorId,
      weapon_energy: starterWeapon,
      max_weapon_energy: shipTypeConfig.maxWeaponEnergy,
      engine_energy: starterEngine,
      max_engine_energy: shipTypeConfig.maxEngineEnergy,
      cargo_holds: shipTypeConfig.baseCargoHolds,
      max_cargo_holds: shipTypeConfig.maxCargoHolds,
      hull_hp: shipTypeConfig.baseHullHp,
      max_hull_hp: shipTypeConfig.maxHullHp,
    });

    await db("players")
      .where({ id: playerId })
      .update({ current_ship_id: shipId });

    // SP: Generate universe, assign missions, update starting sector
    if (gameMode === "singleplayer") {
      const spResult = await generateSPUniverse(playerId, db);
      startingSectorId = spResult.startingSectorId;

      // Move player and ship to SP starting sector
      await db("players")
        .where({ id: playerId })
        .update({
          current_sector_id: startingSectorId,
          explored_sectors: JSON.stringify([startingSectorId]),
        });
      await db("ships").where({ id: shipId }).update({
        sector_id: startingSectorId,
      });

      // Assign first tier of SP missions
      await assignInitialSPMissions(playerId, db);
    }

    // Create player_progression row
    await db("player_progression").insert({
      player_id: playerId,
      level: 1,
      xp: 0,
      total_combat_xp: 0,
      total_mission_xp: 0,
      total_trade_xp: 0,
      total_explore_xp: 0,
    });

    // ── Chain Registration (async, non-blocking) ──
    if (isChainEnabled()) {
      try {
        // Create embedded wallet for the player
        const walletResult = await createPlayerWallet(playerId, email);
        if (walletResult.wallet) {
          const wallet = walletResult.wallet as Address;
          await db("players")
            .where({ id: playerId })
            .update({
              wallet_address: wallet,
              wallet_provider_user_id: walletResult.providerUserId || null,
            });

          // Enqueue on-chain identity creation (all async via tx-queue)
          // registerMember deploys the MemberContract, then initMemberAssets
          // mints all starting assets INTO the MemberContract (not the wallet).
          // Player must withdraw from the contract to move assets to their wallet.
          enqueue({ type: "registerMember", playerWallet: wallet });
          enqueue({
            type: "initMemberAssets",
            playerWallet: wallet,
            resource: "credits",
            amount: BigInt(startingCredits) * 10n ** 18n,
            characterData: {
              race,
              level: 1,
              xp: 0n,
              totalCombatXp: 0n,
              totalMissionXp: 0n,
              totalTradeXp: 0n,
              totalExploreXp: 0n,
            },
            shipData: {
              shipType: raceConfig.starterShipType,
              hullHp: shipTypeConfig.baseHullHp,
              maxHullHp: shipTypeConfig.maxHullHp,
              weaponEnergy: starterWeapon,
              engineEnergy: starterEngine,
              cargoBays: shipTypeConfig.baseCargoHolds,
              hasCloakDevice: false,
              hasRacheDevice: false,
              hasJumpDrive: false,
            },
          });
        }
      } catch (chainErr) {
        // Chain registration failure should not block account creation
        console.error(
          "[auth] Chain registration failed (non-fatal):",
          chainErr,
        );
      }
    }

    req.session.playerId = playerId;
    res.status(201).json({
      token: signJwt(playerId),
      player: {
        id: playerId,
        username,
        email,
        race,
        gameMode,
        currentSectorId: startingSectorId,
        energy: startingMaxEnergy,
        maxEnergy: startingMaxEnergy,
        credits: startingCredits,
        currentShipId: shipId,
        tutorialStep: 0,
        tutorialCompleted: false,
        hasSeenIntro: false,
        hasSeenPostTutorial: false,
      },
    });
  } catch (err: any) {
    if (
      err.message?.includes("UNIQUE constraint failed: players.username") ||
      err.constraint === "players_username_unique"
    ) {
      return res.status(409).json({ error: "Username already taken" });
    }
    if (
      err.message?.includes("UNIQUE constraint failed: players.email") ||
      err.constraint === "players_email_unique"
    ) {
      return res.status(409).json({ error: "Email already registered" });
    }
    console.error("Registration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const player = await db("players")
      .where({ username })
      .orWhere({ email: username })
      .first();
    if (!player) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, player.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Login streak tracking
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const lastLoginDate = player.last_login_date;
    let loginStreak = player.login_streak || 0;
    let streakReward: { xp: number; credits: number } | null = null;

    if (lastLoginDate !== todayStr) {
      // Check if yesterday — continue streak; otherwise reset
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .slice(0, 10);
      if (lastLoginDate === yesterday) {
        loginStreak += 1;
      } else {
        loginStreak = 1;
      }

      // Streak rewards: escalating XP + credits
      const streakXp = loginStreak >= 7 ? 500 : loginStreak >= 3 ? 150 : 50;
      const streakCredits =
        loginStreak >= 7 ? 1000 : loginStreak >= 3 ? 300 : 100;

      await awardXP(player.id, streakXp, "explore");
      await db("players")
        .where({ id: player.id })
        .update({
          credits: db.raw(`credits + ${streakCredits}`),
        });

      streakReward = { xp: streakXp, credits: streakCredits };
    }

    await db("players").where({ id: player.id }).update({
      last_login: new Date(),
      last_login_date: todayStr,
      login_streak: loginStreak,
    });

    req.session.playerId = player.id;
    res.json({
      token: signJwt(player.id),
      player: {
        id: player.id,
        username: player.username,
        race: player.race,
        gameMode: player.game_mode || "multiplayer",
        currentSectorId: player.current_sector_id,
        energy: player.energy,
        maxEnergy: player.max_energy,
        credits: Number(player.credits) + (streakReward?.credits ?? 0),
        currentShipId: player.current_ship_id,
        tutorialStep: player.tutorial_step || 0,
        tutorialCompleted: !!player.tutorial_completed,
        hasSeenIntro: !!player.has_seen_intro,
        hasSeenPostTutorial: !!player.has_seen_post_tutorial,
      },
      loginStreak,
      streakReward,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/fcm-token", requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Missing FCM token" });
    }

    const playerId = req.session.playerId!;

    // Upsert: update timestamp if token exists, otherwise insert
    const existing = await db("player_devices")
      .where({ player_id: playerId, fcm_token: token })
      .first();

    if (existing) {
      await db("player_devices")
        .where({ id: existing.id })
        .update({ updated_at: new Date() });
    } else {
      await db("player_devices").insert({
        id: crypto.randomUUID(),
        player_id: playerId,
        fcm_token: token,
        platform: "android",
        updated_at: new Date(),
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("FCM token registration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.json({ success: true });
  });
});

// --- Settings endpoints ---

router.post("/change-username", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const { newUsername } = req.body;

    if (!newUsername || newUsername.length < 3 || newUsername.length > 32) {
      return res
        .status(400)
        .json({ error: "Username must be 3-32 characters" });
    }

    const player = await db("players").where({ id: playerId }).first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const usernameChanges = player.username_changes || 0;
    if (usernameChanges >= 3) {
      return res
        .status(400)
        .json({ error: "Maximum username changes reached (3)" });
    }

    // Check uniqueness
    const existing = await db("players")
      .where({ username: newUsername })
      .whereNot({ id: playerId })
      .first();
    if (existing) {
      return res.status(409).json({ error: "Username already taken" });
    }

    await db("players")
      .where({ id: playerId })
      .update({
        username: newUsername,
        username_changes: usernameChanges + 1,
      });

    res.json({
      success: true,
      username: newUsername,
      changesRemaining: 2 - usernameChanges,
    });
  } catch (err) {
    console.error("Change username error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/change-race", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const { newRace, password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password required" });
    }
    if (!newRace || !VALID_RACE_IDS.includes(newRace)) {
      return res
        .status(400)
        .json({ error: "Invalid race. Choose: " + VALID_RACE_IDS.join(", ") });
    }

    const player = await db("players").where({ id: playerId }).first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const valid = await bcrypt.compare(password, player.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    if (player.race === newRace) {
      return res.status(400).json({ error: "Already that race" });
    }

    // Reset all faction reputation
    await db("player_faction_rep").where({ player_id: playerId }).del();
    // Reset NPC reputation
    await db("player_npc_state")
      .where({ player_id: playerId })
      .update({ reputation: 0 });

    await db("players").where({ id: playerId }).update({ race: newRace });

    res.json({ success: true, race: newRace });
  } catch (err) {
    console.error("Change race error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both passwords required" });
    }
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    const player = await db("players").where({ id: playerId }).first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const valid = await bcrypt.compare(currentPassword, player.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect current password" });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db("players")
      .where({ id: playerId })
      .update({ password_hash: newHash });

    res.json({ success: true });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/account", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const { password } = req.body;

    if (!password) {
      return res
        .status(400)
        .json({ error: "Password required to delete account" });
    }

    const player = await db("players").where({ id: playerId }).first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const valid = await bcrypt.compare(password, player.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    // Delete all player data — tables with player_id column
    const playerIdTables = [
      "trade_logs",
      "game_events",
      "notes",
      "player_npc_state",
      "npc_encounters",
      "leaderboard_entries",
      "player_faction_rep",
      "player_devices",
      "player_achievements",
      "player_milestones",
      "player_personal_bests",
      "player_stats",
      "player_progression",
      "syndicate_pool_transactions",
      "syndicate_members",
      "warp_gate_access",
      "recipe_discoveries",
      "crafting_queue",
      "player_activities",
      "daily_missions",
      "player_tablets",
      "ship_inventory",
      "missions",
      "syndicate_join_requests",
      "syndicate_vote_ballots",
      "leaderboard_cache",
      "player_stats_daily",
    ];

    for (const table of playerIdTables) {
      await db(table)
        .where({ player_id: playerId })
        .del()
        .catch(() => {});
    }

    // Tables with non-standard FK column names
    await db("combat_logs")
      .where({ attacker_id: playerId })
      .del()
      .catch(() => {});
    await db("combat_logs")
      .where({ defender_id: playerId })
      .del()
      .catch(() => {});
    await db("bounties")
      .where({ placed_by_id: playerId })
      .del()
      .catch(() => {});
    await db("bounties")
      .where({ target_player_id: playerId })
      .update({ target_player_id: null })
      .catch(() => {});
    await db("bounties")
      .where({ claimed_by_id: playerId })
      .update({ claimed_by_id: null })
      .catch(() => {});
    await db("messages")
      .where({ sender_id: playerId })
      .del()
      .catch(() => {});
    await db("messages")
      .where({ recipient_id: playerId })
      .del()
      .catch(() => {});
    await db("ships")
      .where({ owner_id: playerId })
      .del()
      .catch(() => {});
    await db("deployables")
      .where({ owner_id: playerId })
      .del()
      .catch(() => {});
    await db("planets")
      .where({ owner_id: playerId })
      .update({ owner_id: null })
      .catch(() => {});
    await db("alliances")
      .where({ player_a_id: playerId })
      .orWhere({ player_b_id: playerId })
      .del()
      .catch(() => {});
    await db("trade_routes")
      .where({ owner_id: playerId })
      .del()
      .catch(() => {});
    await db("trade_offers")
      .where({ owner_id: playerId })
      .del()
      .catch(() => {});
    await db("sector_resource_events")
      .where({ claimed_by: playerId })
      .update({ claimed_by: null })
      .catch(() => {});
    await db("sector_events")
      .where({ resolved_by_id: playerId })
      .update({ resolved_by_id: null })
      .catch(() => {});
    await db("syndicate_invite_codes")
      .where({ created_by: playerId })
      .del()
      .catch(() => {});
    await db("syndicate_votes")
      .where({ proposed_by: playerId })
      .del()
      .catch(() => {});
    await db("syndicate_join_requests")
      .where({ reviewed_by: playerId })
      .update({ reviewed_by: null })
      .catch(() => {});
    await db("syndicates")
      .where({ leader_id: playerId })
      .del()
      .catch(() => {});
    await db("warp_gates")
      .where({ built_by_id: playerId })
      .del()
      .catch(() => {});

    // Delete the player
    await db("players").where({ id: playerId }).del();

    req.session.destroy(() => {});
    res.json({ success: true, message: "Account deleted" });
  } catch (err) {
    console.error("Account deletion error:", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
