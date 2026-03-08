import { useState, useCallback, useEffect, useRef } from "react";
import { GAMEPLAY_TRACKS } from "./audio-tracks";
import type { AudioTrack } from "./audio-tracks";

// ---------------------------------------------------------------------------
// Mood definitions
// ---------------------------------------------------------------------------

export type MusicMood =
  | "silence"
  | "serene"
  | "exploration"
  | "momentum"
  | "tension";

interface MoodDefinition {
  id: MusicMood;
  label: string;
  trackIds: string[];
  /** Intensity range [min, max) — max is exclusive except for the last band */
  range: [number, number];
}

/**
 * Fibonacci-inspired thresholds:
 *   0.00 - 0.13  silence
 *   0.13 - 0.34  serene
 *   0.34 - 0.55  exploration
 *   0.55 - 0.79  momentum
 *   0.79 - 1.00  tension
 */
const MOOD_DEFINITIONS: MoodDefinition[] = [
  {
    id: "silence",
    label: "Bliss",
    range: [0.0, 0.13],
    trackIds: [], // silence state — current track fades to near-zero
  },
  {
    id: "serene",
    label: "Serene",
    range: [0.13, 0.34],
    trackIds: [
      "gameplay-9", // Aurora
      "gameplay-11", // Cirrus
      "gameplay-12", // Hymn to the Dawn
      "gameplay-18", // Moonlight
      "gameplay-19", // First Snow
      "gameplay-23", // Hiraeth
    ],
  },
  {
    id: "exploration",
    label: "Exploration",
    range: [0.34, 0.55],
    trackIds: [
      "gameplay-6", // Decoherence
      "gameplay-7", // Permafrost
      "gameplay-13", // Phase Shift
      "gameplay-17", // In Search of Solitude
      "gameplay-22", // Undertow
      "gameplay-24", // Sanctuary
    ],
  },
  {
    id: "momentum",
    label: "Momentum",
    range: [0.55, 0.79],
    trackIds: [
      "gameplay-14", // Echoes
      "gameplay-15", // Meanwhile
      "gameplay-16", // Effervescence
      "gameplay-1",
      "gameplay-2",
      "gameplay-3",
      "gameplay-4",
      "gameplay-5",
    ],
  },
  {
    id: "tension",
    label: "Tension",
    range: [0.79, 1.0],
    trackIds: [
      "gameplay-8", // Shadows and Dust
      "gameplay-10", // Incantation
      "gameplay-20", // Hour of the Witch
      "gameplay-25", // Balefire
      "gameplay-21", // Signal to Noise
    ],
  },
];

// Pre-build a map of trackId -> AudioTrack for fast lookup
const GAMEPLAY_TRACK_MAP = new Map<string, AudioTrack>(
  GAMEPLAY_TRACKS.map((t) => [t.id, t]),
);

// ---------------------------------------------------------------------------
// Intensity -> Mood resolution
// ---------------------------------------------------------------------------

const MOOD_THRESHOLDS: { ceiling: number; mood: MusicMood }[] = [
  { ceiling: 0.13, mood: "silence" },
  { ceiling: 0.34, mood: "serene" },
  { ceiling: 0.55, mood: "exploration" },
  { ceiling: 0.79, mood: "momentum" },
  { ceiling: 1.01, mood: "tension" }, // 1.01 to include 1.0
];

function intensityToMood(intensity: number): MusicMood {
  for (const { ceiling, mood } of MOOD_THRESHOLDS) {
    if (intensity < ceiling) return mood;
  }
  return "tension";
}

function getTracksForMood(mood: MusicMood): AudioTrack[] {
  const def = MOOD_DEFINITIONS.find((d) => d.id === mood);
  if (!def || def.trackIds.length === 0) return [];
  return def.trackIds
    .map((id) => GAMEPLAY_TRACK_MAP.get(id))
    .filter((t): t is AudioTrack => t !== undefined);
}

// ---------------------------------------------------------------------------
// Silence / Bliss state helpers
// ---------------------------------------------------------------------------

export interface SilenceState {
  /** Whether we are in the silence/bliss state */
  active: boolean;
  /** Target volume multiplier (0.05 = whisper) */
  volumeMultiplier: number;
  /** Phase: "fading-down" | "holding" | "fading-up" | "inactive" */
  phase: "fading-down" | "holding" | "fading-up" | "inactive";
}

// ---------------------------------------------------------------------------
// MusicMoodEngine
// ---------------------------------------------------------------------------

/** Natural resting intensity — decays toward this over time */
const BASELINE_INTENSITY = 0.25;

/** How fast intensity decays toward baseline per tick (called every second) */
const DECAY_RATE = 0.002;

export class MusicMoodEngine {
  private _intensity: number;
  private _mood: MusicMood;
  private _silenceState: SilenceState;
  private _silenceTimer: number;
  private _listeners: Set<() => void>;

  constructor(initialIntensity = BASELINE_INTENSITY) {
    this._intensity = clamp(initialIntensity);
    this._mood = intensityToMood(this._intensity);
    this._silenceState = {
      active: false,
      volumeMultiplier: 1.0,
      phase: "inactive",
    };
    this._silenceTimer = 0;
    this._listeners = new Set();
  }

  // -- Getters --

  get intensity(): number {
    return this._intensity;
  }

  get mood(): MusicMood {
    return this._mood;
  }

  get silenceState(): SilenceState {
    return { ...this._silenceState };
  }

  /** Returns the filtered track list for the current mood */
  getMoodTracks(): AudioTrack[] {
    return getTracksForMood(this._mood);
  }

  // -- Event methods --

  onMove(): void {
    this._adjustIntensity(0.02);
  }

  onScan(): void {
    this._adjustIntensity(0.03);
  }

  onTrade(): void {
    this._adjustIntensity(0.03);
  }

  onDock(): void {
    this._adjustIntensity(-0.1);
  }

  onCombatStart(): void {
    this._adjustIntensity(0.3);
  }

  onCombatEnd(): void {
    this._adjustIntensity(-0.2);
  }

  onMissionComplete(): void {
    this._adjustIntensity(0.08);
  }

  onIdle(): void {
    this._adjustIntensity(-0.01);
  }

  // -- Natural decay (call once per second) --

  tick(): void {
    // Exponential decay toward baseline
    const diff = this._intensity - BASELINE_INTENSITY;
    if (Math.abs(diff) > 0.001) {
      const decayAmount = diff * DECAY_RATE * 10; // ~2% per tick toward baseline
      this._setIntensity(this._intensity - decayAmount);
    }

    // Manage silence/bliss state
    this._updateSilenceState();
  }

  // -- Subscribe to changes --

  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  // -- Internal --

  private _adjustIntensity(delta: number): void {
    this._setIntensity(this._intensity + delta);
  }

  private _setIntensity(value: number): void {
    const clamped = clamp(value);
    const prevMood = this._mood;
    this._intensity = clamped;
    this._mood = intensityToMood(clamped);

    // If we left silence, start fading back up
    if (prevMood === "silence" && this._mood !== "silence") {
      if (this._silenceState.active) {
        this._silenceState = {
          active: true,
          volumeMultiplier: this._silenceState.volumeMultiplier,
          phase: "fading-up",
        };
        this._silenceTimer = 0;
      }
    }

    this._notify();
  }

  private _updateSilenceState(): void {
    const inSilenceMood = this._mood === "silence";

    if (inSilenceMood && !this._silenceState.active) {
      // Enter silence — start fading down
      this._silenceState = {
        active: true,
        volumeMultiplier: 1.0,
        phase: "fading-down",
      };
      this._silenceTimer = 0;
    }

    if (!this._silenceState.active) return;

    this._silenceTimer += 1; // 1 second per tick

    switch (this._silenceState.phase) {
      case "fading-down": {
        // Fade to 0.05 over 30 seconds
        const progress = Math.min(this._silenceTimer / 30, 1.0);
        const vol = 1.0 - progress * 0.95; // 1.0 -> 0.05
        this._silenceState.volumeMultiplier = vol;
        if (progress >= 1.0) {
          this._silenceState.phase = "holding";
          this._silenceTimer = 0;
        }
        break;
      }
      case "holding": {
        // Hold at whisper for 60-120 seconds (90 avg)
        this._silenceState.volumeMultiplier = 0.05;
        const holdDuration = 90; // seconds
        if (this._silenceTimer >= holdDuration) {
          // If still in silence mood, stay holding; otherwise start fading up
          if (!inSilenceMood) {
            this._silenceState.phase = "fading-up";
            this._silenceTimer = 0;
          }
          // If intensity naturally recovers past silence threshold, fading-up
          // is triggered by _setIntensity above
        }
        break;
      }
      case "fading-up": {
        // Fade back to 1.0 over 15 seconds
        const progress = Math.min(this._silenceTimer / 15, 1.0);
        const vol = 0.05 + progress * 0.95; // 0.05 -> 1.0
        this._silenceState.volumeMultiplier = vol;
        if (progress >= 1.0) {
          this._silenceState = {
            active: false,
            volumeMultiplier: 1.0,
            phase: "inactive",
          };
          this._silenceTimer = 0;
        }
        break;
      }
      default:
        break;
    }
  }

  private _notify(): void {
    for (const listener of this._listeners) {
      listener();
    }
  }
}

// ---------------------------------------------------------------------------
// React hook — useMusicMood
// ---------------------------------------------------------------------------

export interface UseMusicMoodReturn {
  currentMood: MusicMood;
  intensity: number;
  silenceState: SilenceState;
  getMoodTracks: () => AudioTrack[];
  onMove: () => void;
  onScan: () => void;
  onTrade: () => void;
  onDock: () => void;
  onCombatStart: () => void;
  onCombatEnd: () => void;
  onMissionComplete: () => void;
}

export function useMusicMood(): UseMusicMoodReturn {
  const engineRef = useRef<MusicMoodEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new MusicMoodEngine();
  }
  const engine = engineRef.current;

  const [currentMood, setCurrentMood] = useState<MusicMood>(engine.mood);
  const [intensity, setIntensity] = useState<number>(engine.intensity);
  const [silenceState, setSilenceState] = useState<SilenceState>(
    engine.silenceState,
  );

  // Idle timer ref — resets on any game action
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to engine changes
  useEffect(() => {
    const unsub = engine.subscribe(() => {
      setCurrentMood(engine.mood);
      setIntensity(engine.intensity);
      setSilenceState(engine.silenceState);
    });
    return unsub;
  }, [engine]);

  // Natural decay tick — runs every second
  useEffect(() => {
    const interval = setInterval(() => {
      engine.tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [engine]);

  // Reset idle timer helper
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      engine.onIdle();
      // Schedule recurring idle calls every 30s
      const recurse = () => {
        idleTimerRef.current = setTimeout(() => {
          engine.onIdle();
          recurse();
        }, 30_000);
      };
      recurse();
    }, 30_000);
  }, [engine]);

  // Start idle timer on mount
  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current !== null) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [resetIdleTimer]);

  // Wrap each action to also reset the idle timer
  const onMove = useCallback(() => {
    engine.onMove();
    resetIdleTimer();
  }, [engine, resetIdleTimer]);

  const onScan = useCallback(() => {
    engine.onScan();
    resetIdleTimer();
  }, [engine, resetIdleTimer]);

  const onTrade = useCallback(() => {
    engine.onTrade();
    resetIdleTimer();
  }, [engine, resetIdleTimer]);

  const onDock = useCallback(() => {
    engine.onDock();
    resetIdleTimer();
  }, [engine, resetIdleTimer]);

  const onCombatStart = useCallback(() => {
    engine.onCombatStart();
    resetIdleTimer();
  }, [engine, resetIdleTimer]);

  const onCombatEnd = useCallback(() => {
    engine.onCombatEnd();
    resetIdleTimer();
  }, [engine, resetIdleTimer]);

  const onMissionComplete = useCallback(() => {
    engine.onMissionComplete();
    resetIdleTimer();
  }, [engine, resetIdleTimer]);

  const getMoodTracks = useCallback(() => {
    return engine.getMoodTracks();
  }, [engine]);

  return {
    currentMood,
    intensity,
    silenceState,
    getMoodTracks,
    onMove,
    onScan,
    onTrade,
    onDock,
    onCombatStart,
    onCombatEnd,
    onMissionComplete,
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}
