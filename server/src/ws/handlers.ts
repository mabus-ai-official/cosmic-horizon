import { Server as SocketIOServer, Socket } from "socket.io";
import { sectorRoom, playerRoom, syndicateRoom, allianceRoom } from "./events";
import db from "../db/connection";
import { verifyJwt } from "../middleware/jwt";
import { incrementStat } from "../engine/profile-stats";
import { forwardToDiscord } from "../services/discord-bridge";
import { setupArcadeSocket } from "./arcade-handler";

// Track connected players: socketId -> playerId
const connectedPlayers = new Map<string, string>();

export function setupWebSocket(io: SocketIOServer): void {
  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join", async (data: { playerId?: string; token?: string }) => {
      let playerId = data.playerId;

      // If token provided, verify and extract playerId
      if (data.token) {
        try {
          const payload = verifyJwt(data.token);
          playerId = payload.playerId;
        } catch {
          return;
        }
      }

      if (!playerId) return;

      const player = await db("players").where({ id: playerId }).first();
      if (!player) return;

      connectedPlayers.set(socket.id, playerId);

      // Join personal room and current sector room
      socket.join(playerRoom(playerId));
      socket.join(sectorRoom(player.current_sector_id));

      // Auto-join syndicate room if in a syndicate
      const membership = await db("syndicate_members")
        .where({ player_id: playerId })
        .first();
      if (membership) {
        socket.join(syndicateRoom(membership.syndicate_id));

        // Also join alliance rooms
        const alliances = await db("alliances")
          .where(function () {
            this.where({ syndicate_a_id: membership.syndicate_id }).orWhere({
              syndicate_b_id: membership.syndicate_id,
            });
          })
          .whereNotNull("syndicate_a_id");
        for (const alliance of alliances) {
          socket.join(allianceRoom(alliance.id));
        }
      }

      // Notify sector
      socket.to(sectorRoom(player.current_sector_id)).emit("player:entered", {
        playerId,
        username: player.username,
        sectorId: player.current_sector_id,
      });

      // Wire arcade socket handlers
      setupArcadeSocket(socket, io, playerId);
    });

    socket.on("chat:sector", async (data: { message: string }) => {
      const playerId = connectedPlayers.get(socket.id);
      if (!playerId || !data.message) return;

      const player = await db("players").where({ id: playerId }).first();
      if (!player) return;

      // Broadcast to sector
      io.to(sectorRoom(player.current_sector_id)).emit("chat:sector", {
        senderId: playerId,
        senderName: player.username,
        message: data.message.slice(0, 500), // limit message length
        timestamp: Date.now(),
      });

      // Profile stats: chat
      incrementStat(playerId, "chat_messages_sent", 1);
    });

    // Galaxy-wide chat
    socket.on("chat:galaxy", async (data: { message: string }) => {
      const playerId = connectedPlayers.get(socket.id);
      if (!playerId || !data.message) return;

      const player = await db("players").where({ id: playerId }).first();
      if (!player) return;

      const truncated = data.message.slice(0, 500);

      // Broadcast to all connected clients
      io.emit("chat:galaxy", {
        senderId: playerId,
        senderName: player.username,
        message: truncated,
        timestamp: Date.now(),
      });

      // Forward to Discord bridge
      forwardToDiscord(player.username, truncated);

      incrementStat(playerId, "chat_messages_sent", 1);
    });

    // Syndicate chat
    socket.on("chat:syndicate", async (data: { message: string }) => {
      const playerId = connectedPlayers.get(socket.id);
      if (!playerId || !data.message) return;

      const player = await db("players").where({ id: playerId }).first();
      if (!player) return;

      const membership = await db("syndicate_members")
        .where({ player_id: playerId })
        .first();
      if (!membership) return;

      // Ensure socket is in syndicate room
      socket.join(syndicateRoom(membership.syndicate_id));

      io.to(syndicateRoom(membership.syndicate_id)).emit("chat:syndicate", {
        senderId: playerId,
        senderName: player.username,
        message: data.message.slice(0, 500),
        timestamp: Date.now(),
      });

      // Profile stats: chat
      incrementStat(playerId, "chat_messages_sent", 1);
    });

    // Alliance chat (broadcast to both syndicate rooms in the alliance)
    socket.on(
      "chat:alliance",
      async (data: { message: string; allianceId?: string }) => {
        const playerId = connectedPlayers.get(socket.id);
        if (!playerId || !data.message) return;

        const player = await db("players").where({ id: playerId }).first();
        if (!player) return;

        const membership = await db("syndicate_members")
          .where({ player_id: playerId })
          .first();
        if (!membership) return;

        const syndicate = await db("syndicates")
          .where({ id: membership.syndicate_id })
          .first();

        // Get syndicate alliances
        const alliances = await db("alliances")
          .where(function () {
            this.where({ syndicate_a_id: membership.syndicate_id }).orWhere({
              syndicate_b_id: membership.syndicate_id,
            });
          })
          .whereNotNull("syndicate_a_id");

        if (alliances.length === 0) return;

        // If allianceId specified, send to that alliance room; otherwise broadcast to all
        const targetAlliances = data.allianceId
          ? alliances.filter((a) => a.id === data.allianceId)
          : alliances;

        for (const alliance of targetAlliances) {
          io.to(allianceRoom(alliance.id)).emit("chat:alliance", {
            senderId: playerId,
            senderName: player.username,
            syndicateName: syndicate?.name || "Unknown",
            message: data.message.slice(0, 500),
            timestamp: Date.now(),
          });
        }
      },
    );

    socket.on("disconnect", async () => {
      const playerId = connectedPlayers.get(socket.id);
      if (playerId) {
        const player = await db("players").where({ id: playerId }).first();
        if (player) {
          socket.to(sectorRoom(player.current_sector_id)).emit("player:left", {
            playerId,
            sectorId: player.current_sector_id,
          });
        }
        connectedPlayers.delete(socket.id);
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

// Utility: notify a player via their personal room
export function notifyPlayer(
  io: SocketIOServer,
  playerId: string,
  event: string,
  data: any,
): void {
  io.to(playerRoom(playerId)).emit(event, data);
}

// Utility: broadcast to a sector
export function notifySector(
  io: SocketIOServer,
  sectorId: number,
  event: string,
  data: any,
): void {
  io.to(sectorRoom(sectorId)).emit(event, data);
}

// Utility: handle player sector change (leave old room, join new)
export function handleSectorChange(
  io: SocketIOServer,
  playerId: string,
  oldSectorId: number,
  newSectorId: number,
  username: string,
): void {
  const room = playerRoom(playerId);
  const sockets = io.sockets.adapter.rooms.get(room);
  if (sockets) {
    for (const socketId of sockets) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.leave(sectorRoom(oldSectorId));
        socket.join(sectorRoom(newSectorId));
      }
    }
  }

  io.to(sectorRoom(oldSectorId)).emit("player:left", {
    playerId,
    sectorId: oldSectorId,
  });
  io.to(sectorRoom(newSectorId)).emit("player:entered", {
    playerId,
    username,
    sectorId: newSectorId,
  });
}

export function getConnectedPlayers(): Map<string, string> {
  return connectedPlayers;
}

// Utility: notify a syndicate room
export function notifySyndicate(
  io: SocketIOServer,
  syndicateId: string,
  event: string,
  data: any,
): void {
  io.to(syndicateRoom(syndicateId)).emit(event, data);
}

// Utility: add/remove player from syndicate room
export function handleSyndicateJoin(
  io: SocketIOServer,
  playerId: string,
  syndicateId: string,
): void {
  const room = playerRoom(playerId);
  const sockets = io.sockets.adapter.rooms.get(room);
  if (sockets) {
    for (const socketId of sockets) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) socket.join(syndicateRoom(syndicateId));
    }
  }
}

export function handleSyndicateLeave(
  io: SocketIOServer,
  playerId: string,
  syndicateId: string,
): void {
  const room = playerRoom(playerId);
  const sockets = io.sockets.adapter.rooms.get(room);
  if (sockets) {
    for (const socketId of sockets) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) socket.leave(syndicateRoom(syndicateId));
    }
  }
}
