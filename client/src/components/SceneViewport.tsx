import { useState, useEffect, useRef } from "react";
import BridgeView3D from "./BridgeView3D";
import PixelScene from "./PixelScene";
import type { SceneDefinition } from "../config/scene-types";

interface SceneViewportProps {
  actionScene: SceneDefinition | null;
  ambientScene: SceneDefinition | null;
  onActionComplete: () => void;
  sectorId?: number;
  shipType?: string;
  shake?: boolean;
}

export default function SceneViewport({
  actionScene,
  ambientScene,
  onActionComplete,
  sectorId,
  shipType,
  shake,
}: SceneViewportProps) {
  const scene = actionScene ?? ambientScene;
  const [flash, setFlash] = useState(false);
  const prevSceneId = useRef<string | null>(null);

  // Transition flash when scene changes
  useEffect(() => {
    if (scene && prevSceneId.current && scene.id !== prevSceneId.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 250);
      return () => clearTimeout(t);
    }
    prevSceneId.current = scene?.id ?? null;
  }, [scene?.id]);

  const label = actionScene
    ? actionScene.id
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .replace(/\d+$/, "")
        .trim()
    : sectorId != null
      ? `Sector ${sectorId}`
      : "Idle";

  // Derive context from scene ID
  const sceneId = scene?.id ?? "";
  let context: "ambient" | "combat" | "docked" | "danger" | "warp" = "ambient";
  let glowClass = "";
  if (actionScene && /combat|fire|volley|destroyed/.test(sceneId)) {
    context = "combat";
    glowClass = "scene-viewport--combat";
  } else if (/docked/.test(sceneId)) {
    context = "docked";
    glowClass = "scene-viewport--docked";
  } else if (actionScene && /flee|danger/.test(sceneId)) {
    context = "danger";
    glowClass = "scene-viewport--danger";
  } else if (/warp/.test(sceneId)) {
    context = "warp";
  }

  // Show pixel scene overlay during action scenes, 3D always runs behind
  const showPixelOverlay = !!actionScene;

  return (
    <div
      className={`scene-viewport ${glowClass}${shake ? " scene-viewport--shake" : ""}`}
    >
      {/* 3D background — always running */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
        }}
      >
        <BridgeView3D context={context} shipType={shipType} />
      </div>

      {/* Pixel scene overlay for action sequences */}
      {showPixelOverlay && scene && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background: "rgba(5, 5, 16, 0.7)",
          }}
        >
          <PixelScene
            key={scene.id}
            scene={scene}
            renderMode="inline"
            onComplete={onActionComplete}
          />
        </div>
      )}

      {/* HUD overlay */}
      <div className="viewport-hud">
        <span className="viewport-hud__tl">{label}</span>
        <span className="viewport-hud__tr">{shipType ?? ""}</span>
        <span className="viewport-hud__bl">
          {actionScene ? "ACTION" : "AMBIENT"}
        </span>
      </div>
      {/* Vignette */}
      <div className="viewport-vignette" />
      {/* Transition flash */}
      {flash && <div className="viewport-flash" />}
    </div>
  );
}
