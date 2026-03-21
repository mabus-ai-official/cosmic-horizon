/**
 * Hook: manages planet explorer session.
 * Handles socket connection, input capture, canvas engine lifecycle.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { GameLoop } from "../engine/game-loop";
import { InputManager } from "../engine/input";
import type {
  WorldSnapshot,
  WorldEvent,
  BiomeInfo,
  SessionLootItem,
} from "../engine/types";
import api from "../../services/api";

interface UsePlanetExplorerParams {
  planetId: string;
  playerId: string;
  on: (event: string, handler: (...args: any[]) => void) => () => void;
  emit: (event: string, data: any) => void;
}

interface PlanetExplorerState {
  connected: boolean;
  dead: boolean;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  sp: number;
  skillCooldowns: number[];
  sessionLoot: SessionLootItem[];
  nearPad: boolean;
  biome: BiomeInfo | null;
}

export function usePlanetExplorer({
  planetId,
  playerId,
  on,
  emit: _emit,
}: UsePlanetExplorerParams) {
  const [state, setState] = useState<PlanetExplorerState>({
    connected: false,
    dead: false,
    hp: 100,
    maxHp: 100,
    level: 1,
    xp: 0,
    xpToNext: 100,
    gold: 0,
    sp: 0,
    skillCooldowns: [0, 0, 0, 0],
    sessionLoot: [],
    nearPad: false,
    biome: null,
  });

  const gameLoopRef = useRef<GameLoop | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputIntervalRef = useRef<number | null>(null);

  // Join the planet instance
  const join = useCallback(async () => {
    try {
      const socketId = (window as any).__planetSocketId;
      const res = await api.post(
        "/planet-explorer/join",
        { planetId },
        {
          headers: { "x-socket-id": socketId || "" },
        },
      );

      const data = res.data;
      setState((prev) => ({
        ...prev,
        connected: true,
        hp: data.character.hp,
        maxHp: data.character.maxHp,
        level: data.character.level,
        xp: data.character.xp ?? 0,
        xpToNext: data.character.xpToNext ?? 100,
        gold: data.character.gold,
        sp: data.character.sp,
        biome: data.biome,
        sessionLoot: data.sessionLoot ?? [],
      }));

      // Initialize game loop
      if (canvasRef.current && gameLoopRef.current) {
        const gl = gameLoopRef.current;
        gl.localPlayerId = playerId;
        if (data.biome) gl.setBiome(data.biome);
        if (data.chunks) gl.setChunks(data.chunks);
        if (data.snapshot) gl.onSnapshot(data.snapshot);
        gl.start();
      }
    } catch (err) {
      console.error("Failed to join planet:", err);
    }
  }, [planetId, playerId]);

  // Leave the planet instance
  const leave = useCallback(async () => {
    try {
      const res = await api.post("/planet-explorer/leave", { planetId });
      return res.data;
    } catch (err) {
      console.error("Failed to leave planet:", err);
      return null;
    }
  }, [planetId]);

  // Respawn
  const respawn = useCallback(async () => {
    try {
      await api.post("/planet-explorer/respawn", { planetId });
      setState((prev) => ({ ...prev, dead: false }));
    } catch (err) {
      console.error("Failed to respawn:", err);
    }
  }, [planetId]);

  // Send input frame to server
  const sendInput = useCallback(() => {
    if (!inputRef.current || state.dead) return;
    const frame = inputRef.current.getFrame();
    // Only send if there's actual input
    if (
      frame.dx !== 0 ||
      frame.dy !== 0 ||
      frame.attack ||
      frame.mine ||
      frame.skill >= 0
    ) {
      api
        .post("/planet-explorer/input", { planetId, input: frame })
        .catch(() => {});
    }
  }, [planetId, state.dead]);

  // Initialize canvas and game loop
  const initCanvas = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      canvasRef.current = canvas;

      const gl = new GameLoop(canvas);
      gl.localPlayerId = playerId;
      gl.callbacks = {
        onDeath: () => setState((prev) => ({ ...prev, dead: true })),
        onRespawn: () => setState((prev) => ({ ...prev, dead: false })),
        onLootPickup: (itemId, quantity) => {
          setState((prev) => {
            const loot = [...prev.sessionLoot];
            const existing = loot.find((l) => l.itemId === itemId);
            if (existing) {
              existing.quantity += quantity;
            } else {
              loot.push({ itemId, quantity });
            }
            return { ...prev, sessionLoot: loot };
          });
        },
        onMobKill: (_name, xp, sp, gold) => {
          setState((prev) => ({
            ...prev,
            xp: prev.xp + xp,
            sp: prev.sp + sp,
            gold: prev.gold + gold,
          }));
        },
      };
      gameLoopRef.current = gl;
    },
    [playerId],
  );

  // Socket event listeners
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(
      on("planet:state", (snapshot: WorldSnapshot) => {
        gameLoopRef.current?.onSnapshot(snapshot);
        // Update HP/nearPad from snapshot
        const localP = snapshot.players.find((p) => p.id === playerId);
        if (localP) {
          setState((prev) => ({
            ...prev,
            hp: localP.hp,
            maxHp: localP.maxHp,
            nearPad:
              Math.abs(localP.x - snapshot.landingPad.x) <= 3 &&
              Math.abs(localP.y - snapshot.landingPad.y) <= 3,
          }));
        }
      }),
    );

    unsubs.push(
      on("planet:event", (event: WorldEvent) => {
        gameLoopRef.current?.onEvent(event);
      }),
    );

    return () => unsubs.forEach((u) => u());
  }, [on, playerId]);

  // Input manager lifecycle
  useEffect(() => {
    const input = new InputManager();
    input.attach();
    inputRef.current = input;

    // Send input at 20Hz
    const interval = window.setInterval(sendInput, 50);
    inputIntervalRef.current = interval;

    return () => {
      input.detach();
      window.clearInterval(interval);
    };
  }, [sendInput]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      gameLoopRef.current?.stop();
    };
  }, []);

  return {
    state,
    canvasRef: initCanvas,
    join,
    leave,
    respawn,
  };
}
