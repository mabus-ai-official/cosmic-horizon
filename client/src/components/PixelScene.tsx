import { useReducer, useEffect, useRef, useCallback } from "react";
import type { SpriteDefinition } from "../config/pixel-sprites";
import type {
  SceneDefinition,
  SceneRenderMode,
  SceneActor,
  SceneEffect,
} from "../config/scene-types";

// --- Shared utility: render a SpriteDefinition as SVG rects ---

export function renderSpriteGrid(
  def: SpriteDefinition,
  keyPrefix = "",
): React.ReactNode[] {
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < def.rows; y++) {
    for (let x = 0; x < def.cols; x++) {
      const idx = def.grid[y][x];
      if (idx === 0) continue;
      const fill = def.palette[idx];
      if (!fill) continue;
      rects.push(
        <rect
          key={`${keyPrefix}${x}-${y}`}
          x={x}
          y={y}
          width={1}
          height={1}
          fill={fill}
        />,
      );
    }
  }
  return rects;
}

// --- Actor state ---

interface ActorState {
  id: string;
  frames: SpriteDefinition[];
  frameDuration: number;
  currentFrameIndex: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  transform: string;
  flipX: boolean;
  transitionDuration: number;
  easing: string;
}

interface SceneState {
  currentPhase: number;
  actors: Map<string, ActorState>;
  activeEffects: SceneEffect[];
  phaseText: string | null;
  phaseTextClass: string;
}

type SceneAction =
  | { type: "INIT_PHASE"; phase: number; scene: SceneDefinition }
  | { type: "ADVANCE_PHASE" }
  | { type: "CYCLE_FRAME"; actorId: string }
  | { type: "RESET" };

function actorFromDef(def: SceneActor): ActorState {
  return {
    id: def.id,
    frames: def.frames,
    frameDuration: def.frameDuration ?? 200,
    currentFrameIndex: 0,
    x: def.x,
    y: def.y,
    size: def.size ?? 16,
    opacity: def.opacity ?? 1,
    transform: def.transform ?? "",
    flipX: def.flipX ?? false,
    transitionDuration: 300,
    easing: "ease",
  };
}

function sceneReducer(state: SceneState, action: SceneAction): SceneState {
  switch (action.type) {
    case "INIT_PHASE": {
      const phase = action.scene.phases[action.phase];
      if (!phase) return state;

      const actors = new Map(state.actors);

      // Remove actors
      if (phase.removeActors) {
        for (const id of phase.removeActors) {
          actors.delete(id);
        }
      }

      // Add actors
      if (phase.addActors) {
        for (const def of phase.addActors) {
          actors.set(def.id, actorFromDef(def));
        }
      }

      // Apply transitions
      if (phase.transitions) {
        for (const t of phase.transitions) {
          const actor = actors.get(t.actorId);
          if (!actor) continue;
          const updated = { ...actor };
          if (t.x !== undefined) updated.x = t.x;
          if (t.y !== undefined) updated.y = t.y;
          if (t.opacity !== undefined) updated.opacity = t.opacity;
          if (t.transform !== undefined) updated.transform = t.transform;
          if (t.size !== undefined) updated.size = t.size;
          if (t.duration !== undefined) updated.transitionDuration = t.duration;
          if (t.easing !== undefined) updated.easing = t.easing;
          if (t.replaceFrames) {
            updated.frames = t.replaceFrames;
            updated.currentFrameIndex = 0;
          }
          actors.set(t.actorId, updated);
        }
      }

      return {
        ...state,
        currentPhase: action.phase,
        actors,
        activeEffects: phase.effects ?? [],
        phaseText: phase.text ?? null,
        phaseTextClass: phase.textClass ?? "",
      };
    }
    case "ADVANCE_PHASE":
      return { ...state, currentPhase: state.currentPhase + 1 };
    case "CYCLE_FRAME": {
      const actors = new Map(state.actors);
      const actor = actors.get(action.actorId);
      if (actor && actor.frames.length > 1) {
        actors.set(action.actorId, {
          ...actor,
          currentFrameIndex:
            (actor.currentFrameIndex + 1) % actor.frames.length,
        });
      }
      return { ...state, actors };
    }
    case "RESET":
      return {
        currentPhase: -1,
        actors: new Map(),
        activeEffects: [],
        phaseText: null,
        phaseTextClass: "",
      };
    default:
      return state;
  }
}

// --- Props ---

interface PixelSceneProps {
  scene: SceneDefinition;
  renderMode: SceneRenderMode;
  onComplete: () => void;
  onSkip?: () => void;
  width?: number;
  height?: number;
}

// --- Component ---

export default function PixelScene({
  scene,
  renderMode,
  onComplete,
  onSkip,
  width,
  height,
}: PixelSceneProps) {
  const [state, dispatch] = useReducer(sceneReducer, {
    currentPhase: -1,
    actors: new Map(),
    activeEffects: [],
    phaseText: null,
    phaseTextClass: "",
  });

  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameIntervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map(),
  );
  const completedRef = useRef(false);

  // Cleanup all timers
  const clearAllTimers = useCallback(() => {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
    for (const interval of frameIntervalsRef.current.values()) {
      clearInterval(interval);
    }
    frameIntervalsRef.current.clear();
  }, []);

  // Initialize with initial actors, then start phase 0
  useEffect(() => {
    completedRef.current = false;
    dispatch({ type: "RESET" });

    // Add initial actors first
    if (scene.initialActors) {
      const initPhase = {
        duration: 0,
        addActors: scene.initialActors,
      };
      // Temporarily inject initialActors as a "phase -1" effect via INIT_PHASE
      // We do this by dispatching with a synthetic scene
      const syntheticScene: SceneDefinition = {
        ...scene,
        phases: [initPhase, ...scene.phases],
      };
      dispatch({ type: "INIT_PHASE", phase: 0, scene: syntheticScene });
      // Then start real phase 0 (which is index 1 in synthetic)
      // Use a small delay so state settles
      setTimeout(() => {
        dispatch({ type: "INIT_PHASE", phase: 1, scene: syntheticScene });
      }, 16);
    } else {
      dispatch({ type: "INIT_PHASE", phase: 0, scene });
    }

    return clearAllTimers;
  }, [scene, clearAllTimers]);

  // Phase progression timer
  useEffect(() => {
    const phaseIndex = scene.initialActors
      ? state.currentPhase - 1
      : state.currentPhase;
    if (phaseIndex < 0) return;
    const phase = scene.phases[phaseIndex];
    if (!phase) return;

    if (phaseIndex >= scene.phases.length - 1) {
      // Last phase - complete after duration
      phaseTimerRef.current = setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete();
        }
      }, phase.duration);
    } else {
      // Advance to next phase after duration
      phaseTimerRef.current = setTimeout(() => {
        const nextPhaseIndex = phaseIndex + 1;
        if (scene.initialActors) {
          dispatch({
            type: "INIT_PHASE",
            phase: nextPhaseIndex + 1,
            scene: {
              ...scene,
              phases: [
                { duration: 0, addActors: scene.initialActors },
                ...scene.phases,
              ],
            },
          });
        } else {
          dispatch({ type: "INIT_PHASE", phase: nextPhaseIndex, scene });
        }
      }, phase.duration);
    }

    return () => {
      if (phaseTimerRef.current) {
        clearTimeout(phaseTimerRef.current);
        phaseTimerRef.current = null;
      }
    };
  }, [state.currentPhase, scene, onComplete]);

  // Frame cycling for animated actors
  useEffect(() => {
    // Clear old intervals
    for (const interval of frameIntervalsRef.current.values()) {
      clearInterval(interval);
    }
    frameIntervalsRef.current.clear();

    // Set up new intervals for multi-frame actors
    for (const [actorId, actor] of state.actors) {
      if (actor.frames.length > 1) {
        const interval = setInterval(() => {
          dispatch({ type: "CYCLE_FRAME", actorId });
        }, actor.frameDuration);
        frameIntervalsRef.current.set(actorId, interval);
      }
    }

    return () => {
      for (const interval of frameIntervalsRef.current.values()) {
        clearInterval(interval);
      }
      frameIntervalsRef.current.clear();
    };
  }, [state.actors]);

  const handleSkip = useCallback(() => {
    clearAllTimers();
    if (!completedRef.current) {
      completedRef.current = true;
      (onSkip ?? onComplete)();
    }
  }, [clearAllTimers, onSkip, onComplete]);

  // --- Render effects ---

  const renderEffects = () => {
    return state.activeEffects.map((effect, i) => {
      switch (effect.type) {
        case "starfield":
          return <Starfield key={`effect-${i}`} config={effect.config} />;
        case "warp-lines":
          return <WarpLines key={`effect-${i}`} config={effect.config} />;
        case "flash":
          return (
            <rect
              key={`effect-${i}`}
              x={0}
              y={0}
              width={scene.stageWidth}
              height={scene.stageHeight}
              fill={(effect.config?.color as string) ?? WHITE}
              className="pixel-scene__flash"
              style={{
                animationDelay: `${effect.delay ?? 0}ms`,
                animationDuration: `${effect.duration ?? 400}ms`,
              }}
            />
          );
        case "laser":
          return (
            <Laser
              key={`effect-${i}`}
              stageWidth={scene.stageWidth}
              stageHeight={scene.stageHeight}
              config={effect.config}
            />
          );
        case "scanlines":
          return null; // Handled as HTML overlay
        default:
          return null;
      }
    });
  };

  const hasScanlines = state.activeEffects.some((e) => e.type === "scanlines");

  const containerClass = `pixel-scene pixel-scene--${renderMode}`;
  const bgTransparent = scene.bgColor
    ? `color-mix(in srgb, ${scene.bgColor} 40%, transparent)`
    : "var(--bg-primary)";

  const containerStyle: React.CSSProperties = {
    background: bgTransparent,
    ...(width && renderMode !== "fullscreen" ? { width } : {}),
    ...(height && renderMode !== "fullscreen" ? { height } : {}),
  };

  return (
    <div className={containerClass} style={containerStyle}>
      <svg
        className="pixel-scene__stage"
        viewBox={`0 0 ${scene.stageWidth} ${scene.stageHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ imageRendering: "pixelated" }}
      >
        {/* Background fill */}
        <rect
          x={0}
          y={0}
          width={scene.stageWidth}
          height={scene.stageHeight}
          style={{ fill: bgTransparent }}
        />

        {/* Effects behind actors */}
        {renderEffects()}

        {/* Actors */}
        {Array.from(state.actors.values()).map((actor) => {
          const frame = actor.frames[actor.currentFrameIndex];
          if (!frame) return null;
          const tx = (actor.x / 100) * scene.stageWidth - actor.size / 2;
          const ty = (actor.y / 100) * scene.stageHeight - actor.size / 2;
          const scaleX = actor.flipX ? -1 : 1;
          const actorScale = actor.size / frame.cols;

          return (
            <g
              key={actor.id}
              className="pixel-scene__actor"
              style={{
                transition: `all ${actor.transitionDuration}ms ${actor.easing}`,
                opacity: actor.opacity,
              }}
              transform={`translate(${tx}, ${ty}) scale(${actorScale * scaleX}, ${actorScale}) ${actor.flipX ? `translate(${-frame.cols}, 0)` : ""} ${actor.transform}`}
            >
              {renderSpriteGrid(frame, `${actor.id}-`)}
            </g>
          );
        })}
      </svg>

      {/* Scanlines overlay */}
      {hasScanlines && <div className="pixel-scene__scanlines" />}

      {/* Text overlay */}
      {state.phaseText && (
        <div className={`pixel-scene__text ${state.phaseTextClass}`}>
          {state.phaseText}
        </div>
      )}

      {/* Skip button (fullscreen only) */}
      {renderMode === "fullscreen" && onSkip && (
        <button className="pixel-scene__skip" onClick={handleSkip}>
          SKIP
        </button>
      )}
    </div>
  );
}

// --- Effect sub-components ---

const WHITE = "#c9d1d9";

function Starfield({ config }: { config?: Record<string, unknown> }) {
  const count = (config?.count as number) ?? 30;
  const stageW = (config?.stageWidth as number) ?? 64;
  const stageH = (config?.stageHeight as number) ?? 48;
  // Generate deterministic stars using index as seed
  const stars = [];
  for (let i = 0; i < count; i++) {
    const x = (i * 7.3 + 3.1) % stageW;
    const y = (i * 11.7 + 5.3) % stageH;
    const size = i % 3 === 0 ? 0.4 : 0.2;
    const delay = (i * 0.15) % 1.5;
    stars.push(
      <rect
        key={`star-${i}`}
        x={x}
        y={y}
        width={size}
        height={size}
        fill={WHITE}
        className="pixel-scene__star"
        style={{ animationDelay: `${delay}s` }}
      />,
    );
  }
  return <>{stars}</>;
}

function WarpLines({ config }: { config?: Record<string, unknown> }) {
  const count = (config?.count as number) ?? 12;
  const stageW = (config?.stageWidth as number) ?? 48;
  const stageH = (config?.stageHeight as number) ?? 16;
  const lines = [];
  for (let i = 0; i < count; i++) {
    const y = (i * 3.7 + 1.1) % stageH;
    const delay = (i * 0.08) % 0.6;
    lines.push(
      <rect
        key={`warp-${i}`}
        x={0}
        y={y}
        width={stageW * 0.3}
        height={0.2}
        fill={WHITE}
        className="pixel-scene__warp-line"
        style={{ animationDelay: `${delay}s` }}
      />,
    );
  }
  return <>{lines}</>;
}

function Laser({
  stageWidth,
  stageHeight,
  config,
}: {
  stageWidth: number;
  stageHeight: number;
  config?: Record<string, unknown>;
}) {
  const y = (config?.y as number) ?? stageHeight * 0.45;
  const color = (config?.color as string) ?? "#f85149";
  return (
    <rect
      x={0}
      y={y}
      width={stageWidth}
      height={0.5}
      fill={color}
      className="pixel-scene__laser"
    />
  );
}
