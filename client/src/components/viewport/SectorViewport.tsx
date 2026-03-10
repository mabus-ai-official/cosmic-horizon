import { useState, useEffect, useRef } from "react";
import type { SceneDefinition } from "../../config/scene-types";
import PixelScene from "../PixelScene";
import SectorScene from "./SectorScene";

type Context = "ambient" | "combat" | "docked" | "danger" | "warp";

interface SectorState {
  sectorId: number;
  type: string;
  hasStarMall: boolean;
  planets: {
    id: string;
    name: string;
    planetClass: string;
    ownerId: string | null;
  }[];
  outposts: { id: string; name: string }[];
  players: { id: string; username: string }[];
}

interface SectorViewportProps {
  actionScene: SceneDefinition | null;
  ambientScene: SceneDefinition | null;
  onActionComplete: () => void;
  sectorId?: number;
  shipType?: string;
  shake?: boolean;
  isDocked?: boolean;
  sectorType?: string;
  // New 3D sector props
  sector: SectorState | null;
  playerId: string;
  onPlanetClick?: (planetId: string) => void;
  onOutpostClick?: (outpostId: string) => void;
}

function deriveContext(sceneId?: string, isDocked?: boolean): Context {
  // Action scene context takes priority
  if (sceneId) {
    if (/combat|attack|volley|destroyed/i.test(sceneId)) return "combat";
    if (/danger|warning|pirate/i.test(sceneId)) return "danger";
    if (/warp|jump|hyperspace|flee/i.test(sceneId)) return "warp";
    if (/dock|mall|interior/i.test(sceneId)) return "docked";
  }
  // Player state context
  if (isDocked) return "docked";
  return "ambient";
}

export default function SectorViewport({
  actionScene,
  ambientScene,
  onActionComplete,
  sectorId,
  shipType,
  shake,
  isDocked,
  sector,
  playerId,
  onPlanetClick,
  onOutpostClick,
}: SectorViewportProps) {
  const [flash, setFlash] = useState(false);
  const prevSceneId = useRef<string | null>(null);

  // Flash on scene transition
  const currentSceneId = actionScene?.id ?? ambientScene?.id ?? null;
  useEffect(() => {
    if (prevSceneId.current && currentSceneId !== prevSceneId.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 250);
      return () => clearTimeout(t);
    }
    prevSceneId.current = currentSceneId;
  }, [currentSceneId]);

  const context = deriveContext(actionScene?.id, isDocked);
  const shakeClass = shake ? " scene-viewport--shake" : "";
  const contextClass =
    context !== "ambient" ? ` scene-viewport--${context}` : "";

  // Warp/flee scenes are handled by the 3D viewport now — don't show pixel overlay for them
  const is3DScene =
    actionScene &&
    /^(warp|warp-gate|flee|docking|undocking)$/.test(actionScene.id);
  const showPixelOverlay = actionScene && !is3DScene;

  // Auto-dequeue 3D-handled scenes after their total duration
  useEffect(() => {
    if (!is3DScene || !actionScene) return;
    const totalDuration = actionScene.phases.reduce(
      (sum, p) => sum + p.duration,
      0,
    );
    const t = setTimeout(onActionComplete, totalDuration);
    return () => clearTimeout(t);
  }, [is3DScene, actionScene, onActionComplete]);

  return (
    <div className={`scene-viewport${shakeClass}${contextClass}`}>
      {/* 3D sector scene (always running) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
        }}
      >
        <SectorScene
          sector={sector}
          playerId={playerId}
          shipTypeId={shipType || "scout"}
          context={context}
          sectorType={sector?.type}
          onPlanetClick={onPlanetClick}
          onOutpostClick={onOutpostClick}
        />
      </div>

      {/* Pixel art overlay (during non-warp action scenes — fully covers 3D) */}
      {showPixelOverlay && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background: "#050510",
          }}
        >
          <PixelScene
            scene={actionScene}
            onComplete={onActionComplete}
            renderMode="inline"
          />
        </div>
      )}

      {/* HUD overlay */}
      <div
        className="viewport-hud"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        {sectorId !== undefined && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 10,
              color: "#56d4dd",
              fontSize: "10px",
              fontFamily: "'Share Tech Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: "1px",
              opacity: 0.7,
            }}
          >
            SECTOR {sectorId}
          </div>
        )}
        {shipType && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 10,
              color: "#8899bb",
              fontSize: "10px",
              fontFamily: "'Share Tech Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: "1px",
              opacity: 0.7,
            }}
          >
            {shipType.replace(/_/g, " ")}
          </div>
        )}
      </div>

      {/* Vignette */}
      <div className="viewport-vignette" />

      {/* Flash transition */}
      {flash && <div className="viewport-flash" />}
    </div>
  );
}
