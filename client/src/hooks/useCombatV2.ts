/**
 * useCombatV2 — Client-side combat V2 state management hook.
 *
 * Manages: session info, round/deadline/countdown, player/opponent state,
 * local order building (power sliders, target selection, weapon toggles),
 * submit/flee/surrender actions, socket event subscriptions, round log history.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../services/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SubsystemType =
  | "shields"
  | "weapons"
  | "engines"
  | "sensors"
  | "life_support";

export interface SubsystemState {
  type: SubsystemType;
  currentHp: number;
  maxHp: number;
  isDisabled: boolean;
}

export interface WeaponState {
  slotIndex: number;
  weaponTypeId: string;
  damageBase: number;
  cooldownRounds: number;
  powerCost: number;
  accuracy: number;
  weaponClass: "energy" | "kinetic" | "missile";
  cooldownRemaining: number;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  skillLevel: number;
  hp: number;
  maxHp: number;
  assignedStation: SubsystemType | null;
  status: string;
}

export interface CombatPlayerState {
  playerId: string;
  shipId: string;
  hullHp: number;
  maxHullHp: number;
  reactorPower: number;
  maxReactorPower: number;
  subsystems: SubsystemState[];
  weapons: WeaponState[];
  crew: CrewMember[];
}

export interface PowerAllocation {
  shields: number;
  weapons: number;
  engines: number;
  sensors: number;
}

export interface RoundLogEntry {
  roundNumber: number;
  resolution: any;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseCombatV2Props {
  playerId: string;
  on: (event: string, handler: (...args: any[]) => void) => () => void;
}

export function useCombatV2({ playerId, on }: UseCombatV2Props) {
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inCombat, setInCombat] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [submitted, setSubmitted] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Combat states
  const [playerState, setPlayerState] = useState<CombatPlayerState | null>(
    null,
  );
  const [opponentState, setOpponentState] = useState<CombatPlayerState | null>(
    null,
  );

  // Local order building
  const [powerAllocation, setPowerAllocation] = useState<PowerAllocation>({
    shields: 0,
    weapons: 0,
    engines: 0,
    sensors: 0,
  });
  const [targetSubsystem, setTargetSubsystem] =
    useState<SubsystemType>("shields");
  const [selectedWeapons, setSelectedWeapons] = useState<number[]>([]);
  const [repairTarget, setRepairTarget] = useState<SubsystemType | null>(null);
  const [hackTarget, setHackTarget] = useState<SubsystemType | null>(null);
  const [wantsToBoard, setWantsToBoard] = useState(false);
  const [hazard, setHazard] = useState<string | null>(null);

  // Round log
  const [roundLog, setRoundLog] = useState<RoundLogEntry[]>([]);

  // End state
  const [combatResult, setCombatResult] = useState<{
    winnerId: string | null;
    endReason: string;
    destroyedPlayerId?: string;
    fledPlayerId?: string;
    capturedPlayerId?: string;
  } | null>(null);

  // Countdown timer
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!deadline || !inCombat) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000),
      );
      setCountdown(remaining);
      if (remaining <= 0 && countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };

    updateCountdown();
    countdownRef.current = setInterval(updateCountdown, 250);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [deadline, inCombat]);

  // ─── Socket Events ─────────────────────────────────────────────────────────

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(
      on("combat-v2:session_start", (data: any) => {
        setSessionId(data.sessionId);
        setInCombat(true);
        setRoundNumber(data.roundNumber);
        setDeadline(data.deadline);
        setSubmitted(false);
        setOpponentReady(false);
        setCombatResult(null);
        setRoundLog([]);

        // Determine which state is ours
        if (data.playerAState.playerId === playerId) {
          setPlayerState(data.playerAState);
          setOpponentState(data.playerBState);
        } else {
          setPlayerState(data.playerBState);
          setOpponentState(data.playerAState);
        }

        // Initialize power allocation to balanced
        initializePowerAllocation(
          data.playerAState.playerId === playerId
            ? data.playerAState
            : data.playerBState,
        );

        if (data.hazard) setHazard(data.hazard);
      }),
    );

    unsubs.push(
      on("combat-v2:round_start", (data: any) => {
        setRoundNumber(data.roundNumber);
        setDeadline(data.deadline);
        setSubmitted(false);
        setOpponentReady(false);
        setResolving(false);

        if (data.playerAState.playerId === playerId) {
          setPlayerState(data.playerAState);
          setOpponentState(data.playerBState);
        } else {
          setPlayerState(data.playerBState);
          setOpponentState(data.playerAState);
        }
      }),
    );

    unsubs.push(
      on("combat-v2:opponent_ready", () => {
        setOpponentReady(true);
      }),
    );

    unsubs.push(
      on("combat-v2:round_resolved", (data: any) => {
        setResolving(false);
        setRoundLog((prev) => [
          ...prev,
          {
            roundNumber: data.resolution.roundNumber,
            resolution: data.resolution,
          },
        ]);
      }),
    );

    unsubs.push(
      on("combat-v2:combat_end", (data: any) => {
        setCombatResult({
          winnerId: data.winnerId,
          endReason: data.endReason,
          destroyedPlayerId: data.destroyedPlayerId,
          fledPlayerId: data.fledPlayerId,
          capturedPlayerId: data.capturedPlayerId,
        });
        setInCombat(false);
      }),
    );

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [on, playerId]);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function initializePowerAllocation(state: CombatPlayerState) {
    const reactor = state.maxReactorPower;
    const balanced: PowerAllocation = {
      shields: Math.round(reactor * 0.25),
      weapons: Math.round(reactor * 0.35),
      engines: Math.round(reactor * 0.25),
      sensors:
        reactor -
        Math.round(reactor * 0.25) -
        Math.round(reactor * 0.35) -
        Math.round(reactor * 0.25),
    };
    setPowerAllocation(balanced);
    setSelectedWeapons(
      state.weapons
        .filter((w) => w.cooldownRemaining === 0)
        .map((w) => w.slotIndex),
    );
  }

  const totalPowerUsed =
    powerAllocation.shields +
    powerAllocation.weapons +
    powerAllocation.engines +
    powerAllocation.sensors;
  const maxReactor = playerState?.maxReactorPower ?? 0;
  const powerRemaining = maxReactor - totalPowerUsed;

  // ─── Actions ───────────────────────────────────────────────────────────────

  const submitOrders = useCallback(async () => {
    if (!sessionId || submitted) return;

    try {
      setSubmitted(true);
      setResolving(true);
      await api.combatV2SubmitOrders(sessionId, {
        powerAllocation,
        targetSubsystem,
        fireWeapons: selectedWeapons,
        flee: false,
        repair: repairTarget ?? undefined,
        board: wantsToBoard || undefined,
        hack: hackTarget ?? undefined,
      });
    } catch (err) {
      console.error("Failed to submit orders:", err);
      setSubmitted(false);
      setResolving(false);
    }
  }, [sessionId, submitted, powerAllocation, targetSubsystem, selectedWeapons]);

  const flee = useCallback(async () => {
    if (!sessionId) return;
    try {
      setSubmitted(true);
      setResolving(true);
      await api.combatV2Flee(sessionId);
    } catch (err) {
      console.error("Failed to flee:", err);
      setSubmitted(false);
      setResolving(false);
    }
  }, [sessionId]);

  const surrenderAction = useCallback(async () => {
    if (!sessionId) return;
    try {
      await api.combatV2Surrender(sessionId);
    } catch (err) {
      console.error("Failed to surrender:", err);
    }
  }, [sessionId]);

  const toggleWeapon = useCallback((slotIndex: number) => {
    setSelectedWeapons((prev) =>
      prev.includes(slotIndex)
        ? prev.filter((i) => i !== slotIndex)
        : [...prev, slotIndex],
    );
  }, []);

  const setPower = useCallback(
    (system: keyof PowerAllocation, value: number) => {
      setPowerAllocation((prev) => {
        const newAlloc = { ...prev, [system]: Math.max(0, value) };
        const total =
          newAlloc.shields +
          newAlloc.weapons +
          newAlloc.engines +
          newAlloc.sensors;
        if (total > maxReactor) {
          // Reduce this system to fit
          newAlloc[system] = Math.max(0, value - (total - maxReactor));
        }
        return newAlloc;
      });
    },
    [maxReactor],
  );

  // ─── Check for existing combat on mount ────────────────────────────────────

  const checkExistingCombat = useCallback(async () => {
    try {
      const { data } = await api.combatV2GetState();
      if (data.inCombat) {
        setSessionId(data.session.id);
        setInCombat(true);
        setRoundNumber(data.session.currentRound);
        setDeadline(data.session.roundDeadline);
        setPlayerState(data.playerState);
        setOpponentState(data.opponentState);
        setRoundLog(data.roundHistory || []);
        setSubmitted(data.round?.playerSubmitted || false);
        setOpponentReady(data.round?.opponentSubmitted || false);
        setCombatResult(null);

        if (data.playerState) {
          initializePowerAllocation(data.playerState);
        }
      }
    } catch {
      // No active combat
    }
  }, []);

  return {
    // State
    inCombat,
    sessionId,
    roundNumber,
    countdown,
    submitted,
    opponentReady,
    resolving,
    playerState,
    opponentState,
    combatResult,

    // Order building
    powerAllocation,
    totalPowerUsed,
    powerRemaining,
    maxReactor,
    targetSubsystem,
    selectedWeapons,

    // Actions
    submitOrders,
    flee,
    surrender: surrenderAction,
    setPower,
    setTargetSubsystem,
    toggleWeapon,
    checkExistingCombat,

    // Phase 3-6 actions
    repairTarget,
    setRepairTarget,
    hackTarget,
    setHackTarget,
    wantsToBoard,
    setWantsToBoard,
    hazard,

    // History
    roundLog,
  };
}
