import { Server as SocketIOServer } from 'socket.io';
import { playerRoom } from './events';

export type SyncScope = 'sync:status' | 'sync:sector' | 'sync:map' | 'sync:full';

/**
 * Tell a player's other sessions to refresh their state.
 * The event carries no data — the client calls its existing refresh functions.
 *
 * @param io          Socket.IO server instance
 * @param playerId    Target player
 * @param scope       Which refresh to trigger
 * @param excludeSocketId  Socket that initiated the action (skip to avoid double-refresh)
 */
export function syncPlayer(
  io: SocketIOServer,
  playerId: string,
  scope: SyncScope | SyncScope[],
  excludeSocketId?: string | null,
): void {
  const room = playerRoom(playerId);
  const scopes = Array.isArray(scope) ? scope : [scope];

  for (const s of scopes) {
    if (excludeSocketId) {
      io.to(room).except(excludeSocketId).emit(s);
    } else {
      io.to(room).emit(s);
    }
  }
}
