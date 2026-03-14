import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { setSocketId } from '../services/api';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useSocket(playerId: string | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!playerId) return;

    const socket = io(SOCKET_URL, { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketId(socket.id ?? null);
      socket.emit('join', { playerId });
    });

    return () => {
      setSocketId(null);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [playerId]);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => { socketRef.current?.off(event, handler); };
  }, []);

  const emit = useCallback((event: string, data: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { on, emit, socket: socketRef };
}
