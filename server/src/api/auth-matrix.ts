import { Router } from "express";
import crypto from "crypto";
import db from "../db/connection";
import { GAME_CONFIG } from "../config/game";
import { SHIP_TYPES } from "../config/ship-types";
import { getRace, VALID_RACE_IDS, RaceId } from "../config/races";
import { signJwt } from "../middleware/jwt";
import { requireAuth } from "../middleware/auth";
import { getDefaultTutorialState } from "../config/tutorial-sandbox";
import { syncPlayer } from "../ws/sync";

const router = Router();

interface MatrixOpenIDToken {
  access_token: string;
  token_type: string;
  matrix_server_name: string;
  expires_in: number;
}

/**
 * Resolve the federation base URL for a Matrix server name.
 * Tries .well-known first, then falls back to direct HTTPS and port 8448.
 */
async function resolveFederationUrl(serverName: string): Promise<string[]> {
  const candidates: string[] = [];

  // Try .well-known/matrix/server delegation
  try {
    const wkRes = await fetch(
      `https://${serverName}/.well-known/matrix/server`,
      {
        signal: AbortSignal.timeout(5000),
      },
    );
    if (wkRes.ok) {
      const wk = (await wkRes.json()) as { "m.server"?: string };
      if (wk["m.server"]) {
        const delegated = wk["m.server"];
        // If it includes a port, use as-is; otherwise assume 443
        if (delegated.includes(":")) {
          candidates.push(`https://${delegated}`);
        } else {
          candidates.push(`https://${delegated}`);
          candidates.push(`https://${delegated}:8448`);
        }
      }
    }
  } catch {
    // .well-known not available, try direct
  }

  // Direct fallbacks
  candidates.push(`https://${serverName}`);
  candidates.push(`https://${serverName}:8448`);

  return candidates;
}

/**
 * Validate a Matrix OpenID token by calling the homeserver's federation endpoint.
 * Resolves the federation URL via .well-known, then tries port 8448 fallback.
 * Returns the Matrix user ID if valid, or null if invalid.
 */
async function validateMatrixToken(
  token: MatrixOpenIDToken,
): Promise<string | null> {
  const serverName = token.matrix_server_name;
  const accessToken = encodeURIComponent(token.access_token);

  try {
    const baseUrls = await resolveFederationUrl(serverName);

    for (const baseUrl of baseUrls) {
      try {
        const url = `${baseUrl}/_matrix/federation/v1/openid/userinfo?access_token=${accessToken}`;
        console.log(`[Matrix Auth] Trying: ${url}`);
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) continue;

        const data = (await res.json()) as { sub?: string };
        if (data.sub) {
          console.log(`[Matrix Auth] Validated user: ${data.sub}`);
          return data.sub;
        }
      } catch {
        continue;
      }
    }

    console.error(
      `[Matrix Auth] All federation endpoints failed for ${serverName}`,
    );
    return null;
  } catch (err) {
    console.error(`[Matrix Auth] Token validation error:`, err);
    return null;
  }
}

/**
 * POST /api/auth/matrix
 *
 * Authenticate via Matrix OpenID token. Creates a new player account
 * on first login, or returns the existing linked account.
 */
router.post("/", async (req, res) => {
  try {
    const { openIdToken, matrixUserId, race: requestedRace } = req.body;
    if (!openIdToken?.access_token || !openIdToken?.matrix_server_name) {
      return res.status(400).json({ error: "Missing OpenID token" });
    }
    if (!matrixUserId) {
      return res.status(400).json({ error: "Missing Matrix user ID" });
    }

    // 1. Validate the OpenID token with the homeserver
    const validatedUserId = await validateMatrixToken(openIdToken);
    if (!validatedUserId) {
      return res.status(401).json({ error: "Invalid Matrix OpenID token" });
    }

    // Ensure the claimed user ID matches what the homeserver says
    if (validatedUserId !== matrixUserId) {
      return res.status(401).json({ error: "Matrix user ID mismatch" });
    }

    // 2. Check if player already exists with this Matrix user ID
    const existing = await db("players")
      .where({ matrix_user_id: matrixUserId })
      .first();
    if (existing) {
      // Existing player — log them in
      await db("players")
        .where({ id: existing.id })
        .update({ last_login: new Date() });
      req.session.playerId = existing.id;

      return res.json({
        token: signJwt(existing.id),
        player: {
          id: existing.id,
          username: existing.username,
          race: existing.race,
          gameMode: existing.game_mode || "multiplayer",
          currentSectorId: existing.current_sector_id,
          energy: existing.energy,
          maxEnergy: existing.max_energy,
          credits: existing.credits,
          currentShipId: existing.current_ship_id,
        },
        isNewPlayer: false,
      });
    }

    // 3. New player — auto-register
    // Derive a username from the Matrix ID: @user:server.com → user
    const localpart = matrixUserId.replace(/^@/, "").split(":")[0];
    let username = localpart.slice(0, 32);

    // Ensure uniqueness
    const nameConflict = await db("players").where({ username }).first();
    if (nameConflict) {
      username = `${username.slice(0, 26)}_${crypto.randomBytes(3).toString("hex")}`;
    }

    // Pick a race (use requested or random)
    const race =
      requestedRace && VALID_RACE_IDS.includes(requestedRace)
        ? (requestedRace as RaceId)
        : (VALID_RACE_IDS[
            Math.floor(Math.random() * VALID_RACE_IDS.length)
          ] as RaceId);

    const raceConfig = getRace(race);
    const shipTypeConfig = SHIP_TYPES.find(
      (s) => s.id === raceConfig.starterShipType,
    );
    if (!shipTypeConfig) {
      return res
        .status(500)
        .json({ error: "Invalid starter ship configuration" });
    }

    // Find a starting sector (star mall)
    const starMallSector = await db("sectors")
      .where({ has_star_mall: true, universe: "mp" })
      .orderByRaw("RANDOM()")
      .first();
    if (!starMallSector) {
      return res.status(500).json({ error: "Universe not initialized" });
    }

    const bonusUntil = new Date(
      Date.now() +
        GAME_CONFIG.ENERGY_REGEN_BONUS_DURATION_HOURS * 60 * 60 * 1000,
    );
    const startingCredits =
      GAME_CONFIG.STARTING_CREDITS + raceConfig.startingCreditsBonus;
    const startingMaxEnergy =
      GAME_CONFIG.MAX_ENERGY + raceConfig.startingMaxEnergyBonus;

    const playerId = crypto.randomUUID();
    // Matrix-only accounts get a random unusable password hash
    const passwordHash = `matrix:${crypto.randomBytes(32).toString("hex")}`;

    await db("players").insert({
      id: playerId,
      username,
      email: `${matrixUserId}@matrix.bridge`,
      password_hash: passwordHash,
      race,
      game_mode: "multiplayer",
      matrix_user_id: matrixUserId,
      current_sector_id: starMallSector.id,
      energy: startingMaxEnergy,
      max_energy: startingMaxEnergy,
      credits: startingCredits,
      explored_sectors: JSON.stringify([starMallSector.id]),
      energy_regen_bonus_until: bonusUntil,
      last_login: new Date(),
      tutorial_state: JSON.stringify(
        getDefaultTutorialState(startingCredits, startingMaxEnergy),
      ),
    });

    // Create starter ship
    const shipId = crypto.randomUUID();
    await db("ships").insert({
      id: shipId,
      ship_type_id: raceConfig.starterShipType,
      owner_id: playerId,
      sector_id: starMallSector.id,
      weapon_energy:
        shipTypeConfig.baseWeaponEnergy + raceConfig.starterWeaponBonus,
      max_weapon_energy: shipTypeConfig.maxWeaponEnergy,
      engine_energy:
        shipTypeConfig.baseEngineEnergy + raceConfig.starterEngineBonus,
      max_engine_energy: shipTypeConfig.maxEngineEnergy,
      cargo_holds: shipTypeConfig.baseCargoHolds,
      max_cargo_holds: shipTypeConfig.maxCargoHolds,
      hull_hp: shipTypeConfig.baseHullHp,
      max_hull_hp: shipTypeConfig.maxHullHp,
    });

    await db("players")
      .where({ id: playerId })
      .update({ current_ship_id: shipId });

    // Create player progression
    await db("player_progression").insert({
      player_id: playerId,
      level: 1,
      xp: 0,
      total_combat_xp: 0,
      total_mission_xp: 0,
      total_trade_xp: 0,
      total_explore_xp: 0,
    });

    req.session.playerId = playerId;
    res.status(201).json({
      token: signJwt(playerId),
      player: {
        id: playerId,
        username,
        race,
        gameMode: "multiplayer",
        currentSectorId: starMallSector.id,
        energy: startingMaxEnergy,
        maxEnergy: startingMaxEnergy,
        credits: startingCredits,
        currentShipId: shipId,
      },
      isNewPlayer: true,
    });
  } catch (err: any) {
    if (
      err.message?.includes("UNIQUE constraint failed: players.matrix_user_id")
    ) {
      return res.status(409).json({ error: "Matrix account already linked" });
    }
    console.error("Matrix auth error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/matrix/link
 *
 * Link a Matrix account to an existing (logged-in) player account.
 * The player authenticates normally (username/password), then calls this
 * endpoint with their Matrix OpenID token to link the accounts.
 */
router.post("/link", requireAuth, async (req, res) => {
  try {
    const { openIdToken, matrixUserId } = req.body;
    if (!openIdToken?.access_token || !openIdToken?.matrix_server_name) {
      return res.status(400).json({ error: "Missing OpenID token" });
    }
    if (!matrixUserId) {
      return res.status(400).json({ error: "Missing Matrix user ID" });
    }

    // Validate the token
    const validatedUserId = await validateMatrixToken(openIdToken);
    if (!validatedUserId || validatedUserId !== matrixUserId) {
      return res.status(401).json({ error: "Invalid Matrix OpenID token" });
    }

    const playerId = req.session.playerId!;

    // Check if this Matrix ID is already linked to another account
    const conflict = await db("players")
      .where({ matrix_user_id: matrixUserId })
      .whereNot({ id: playerId })
      .first();
    if (conflict) {
      return res
        .status(409)
        .json({ error: "Matrix account already linked to another player" });
    }

    // Check if this player already has a Matrix account linked
    const player = await db("players").where({ id: playerId }).first();
    if (player?.matrix_user_id) {
      return res
        .status(400)
        .json({
          error: "Player already has a Matrix account linked. Unlink first.",
        });
    }

    await db("players").where({ id: playerId }).update({
      matrix_user_id: matrixUserId,
    });

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        playerId,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({ linked: true, matrixUserId });
  } catch (err) {
    console.error("Matrix link error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/matrix/unlink
 *
 * Unlink the Matrix account from the current player.
 * Only allowed if the player has a password set (not a Matrix-only account).
 */
router.post("/unlink", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const player = await db("players").where({ id: playerId }).first();

    if (!player?.matrix_user_id) {
      return res.status(400).json({ error: "No Matrix account linked" });
    }

    // Prevent unlinking if this is a Matrix-only account (no real password)
    if (player.password_hash?.startsWith("matrix:")) {
      return res
        .status(400)
        .json({
          error:
            "Cannot unlink Matrix from a Matrix-only account. Set a password first.",
        });
    }

    await db("players").where({ id: playerId }).update({
      matrix_user_id: null,
    });

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        playerId,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({ unlinked: true });
  } catch (err) {
    console.error("Matrix unlink error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
