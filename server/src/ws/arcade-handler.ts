import { Server as SocketIOServer, Socket } from "socket.io";
import { arcadeRoom, playerRoom } from "./events";
import db from "../db/connection";
import { ARCADE_CONFIG } from "../api/arcade/constants";
import {
  generateSweetSpotPositions,
  calculateBarSpeed,
} from "../api/arcade/validation";
import { generateTurretRoundConfig } from "../api/arcade/turret-validation";
import { generateNebulaRoundConfig } from "../api/arcade/nebula-validation";
import { generateCargoTetrisRoundConfig } from "../api/arcade/cargo-tetris-validation";
import { resolveDrinkEffects } from "../api/arcade/drinks";

// Track ready state: sessionId -> Set of playerIds who are ready
const readyPlayers = new Map<string, Set<string>>();

// Track active arcade sessions per player for disconnect handling
const playerSessions = new Map<string, string>();

export function setupArcadeSocket(
  socket: Socket,
  io: SocketIOServer,
  playerId: string,
): void {
  socket.on("arcade:ready", async (data: { sessionId: string }) => {
    const { sessionId } = data;
    if (!sessionId) return;

    const session = await db("arcade_sessions")
      .where({ id: sessionId })
      .first();
    if (!session) return;

    const isPlayer1 = session.player1_id === playerId;
    const isPlayer2 = session.player2_id === playerId;
    if (!isPlayer1 && !isPlayer2) return;

    // Join the arcade room
    socket.join(arcadeRoom(sessionId));
    playerSessions.set(playerId, sessionId);

    // For AI matches, the client calls startRound() via HTTP — don't duplicate here
    const isAI = !session.player2_id;
    if (isAI) return;

    // Track ready state (PvP only)
    if (!readyPlayers.has(sessionId)) {
      readyPlayers.set(sessionId, new Set());
    }
    readyPlayers.get(sessionId)!.add(playerId);

    const bothReady = readyPlayers.get(sessionId)!.size >= 2;

    if (bothReady) {
      readyPlayers.delete(sessionId);

      const p1Drinks = JSON.parse(session.player1_drinks);
      const p2Drinks = JSON.parse(session.player2_drinks);
      const { selfEffects: p1Self } = resolveDrinkEffects(p1Drinks, p2Drinks);
      const { selfEffects: p2Self } = resolveDrinkEffects(p2Drinks, p1Drinks);
      const { opponentEffects: p2OnP1 } = resolveDrinkEffects(
        p2Drinks,
        p1Drinks,
      );
      const { opponentEffects: p1OnP2 } = resolveDrinkEffects(
        p1Drinks,
        p2Drinks,
      );

      const round = session.round || 1;
      const roundData = JSON.parse(session.round_data || "{}");

      if (session.game_type === "turret_defense") {
        const p1RoundConfig = generateTurretRoundConfig(round, p1Self, [
          ...p2Self,
          ...p2OnP1,
        ]);
        const p2RoundConfig = generateTurretRoundConfig(round, p2Self, [
          ...p1Self,
          ...p1OnP2,
        ]);

        roundData[`round_${round}`] = {
          roundConfig: p1RoundConfig,
          player1Score: 0,
          player2Score: 0,
        };

        await db("arcade_sessions")
          .where({ id: sessionId })
          .update({
            status: "playing",
            round,
            round_data: JSON.stringify(roundData),
            updated_at: new Date().toISOString(),
          });

        io.to(playerRoom(session.player1_id)).emit("arcade:round_start", {
          round,
          roundConfig: p1RoundConfig,
          effects: p1Self,
        });

        io.to(playerRoom(session.player2_id)).emit("arcade:round_start", {
          round,
          roundConfig: p2RoundConfig,
          effects: p2Self,
        });
      } else if (session.game_type === "nebula_runner") {
        const p1RoundConfig = generateNebulaRoundConfig(round, p1Self, [
          ...p2Self,
          ...p2OnP1,
        ]);
        const p2RoundConfig = generateNebulaRoundConfig(round, p2Self, [
          ...p1Self,
          ...p1OnP2,
        ]);

        roundData[`round_${round}`] = {
          roundConfig: p1RoundConfig,
          player1Score: 0,
          player2Score: 0,
        };

        await db("arcade_sessions")
          .where({ id: sessionId })
          .update({
            status: "playing",
            round,
            round_data: JSON.stringify(roundData),
            updated_at: new Date().toISOString(),
          });

        io.to(playerRoom(session.player1_id)).emit("arcade:round_start", {
          round,
          roundConfig: p1RoundConfig,
          effects: p1Self,
        });

        io.to(playerRoom(session.player2_id)).emit("arcade:round_start", {
          round,
          roundConfig: p2RoundConfig,
          effects: p2Self,
        });
      } else if (session.game_type === "cargo_tetris") {
        const p1RoundConfig = generateCargoTetrisRoundConfig(round, p1Self, [
          ...p2Self,
          ...p2OnP1,
        ]);
        const p2RoundConfig = generateCargoTetrisRoundConfig(round, p2Self, [
          ...p1Self,
          ...p1OnP2,
        ]);

        roundData[`round_${round}`] = {
          roundConfig: p1RoundConfig,
          player1Score: 0,
          player2Score: 0,
        };

        await db("arcade_sessions")
          .where({ id: sessionId })
          .update({
            status: "playing",
            round,
            round_data: JSON.stringify(roundData),
            updated_at: new Date().toISOString(),
          });

        io.to(playerRoom(session.player1_id)).emit("arcade:round_start", {
          round,
          roundConfig: p1RoundConfig,
          effects: p1Self,
        });

        io.to(playerRoom(session.player2_id)).emit("arcade:round_start", {
          round,
          roundConfig: p2RoundConfig,
          effects: p2Self,
        });
      } else {
        // Asteroid mining (default)
        const sweetSpotPositions = generateSweetSpotPositions(
          ARCADE_CONFIG.HITS_PER_ROUND,
        );
        const p1BarSpeed = calculateBarSpeed(p1Self, p2OnP1);
        const p2BarSpeed = calculateBarSpeed(p2Self, p1OnP2);

        roundData[`round_${round}`] = {
          sweetSpotPositions,
          barSpeed: ARCADE_CONFIG.BASE_BAR_SPEED,
          player1Hits: [],
          player2Hits: [],
          player1Score: 0,
          player2Score: 0,
        };

        await db("arcade_sessions")
          .where({ id: sessionId })
          .update({
            status: "playing",
            round,
            round_data: JSON.stringify(roundData),
            updated_at: new Date().toISOString(),
          });

        io.to(playerRoom(session.player1_id)).emit("arcade:round_start", {
          round,
          sweetSpotPositions,
          barSpeed: p1BarSpeed,
          effects: p1Self,
        });

        io.to(playerRoom(session.player2_id)).emit("arcade:round_start", {
          round,
          sweetSpotPositions,
          barSpeed: p2BarSpeed,
          effects: p2Self,
        });
      }
    }
  });

  // Handle disconnect — forfeit after timeout
  socket.on("disconnect", async () => {
    const sessionId = playerSessions.get(playerId);
    if (!sessionId) return;

    playerSessions.delete(playerId);

    setTimeout(async () => {
      // Check if player reconnected
      const room = playerRoom(playerId);
      const sockets = io.sockets.adapter.rooms.get(room);
      if (sockets && sockets.size > 0) return; // Reconnected

      const session = await db("arcade_sessions")
        .where({ id: sessionId })
        .first();
      if (!session || session.status === "complete") return;

      // Forfeit — opponent wins
      const opponentId =
        session.player1_id === playerId
          ? session.player2_id
          : session.player1_id;

      await db("arcade_sessions").where({ id: sessionId }).update({
        status: "complete",
        winner_id: opponentId,
        updated_at: new Date().toISOString(),
      });

      if (opponentId) {
        io.to(playerRoom(opponentId)).emit("arcade:game_complete", {
          winnerId: opponentId,
          finalScores: {
            player1: session.player1_score,
            player2: session.player2_score,
          },
          forfeit: true,
        });
      }
    }, ARCADE_CONFIG.DISCONNECT_FORFEIT_SEC * 1000);
  });
}
