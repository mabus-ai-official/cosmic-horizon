/**
 * PlanetExplorerModal — Large modal overlay for planet surface exploration.
 * Contains canvas engine + React HUD overlay.
 * Matches ArcadeModal pattern: confirm-exit on ESC, full-screen overlay.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { usePlanetExplorer } from "../hooks/usePlanetExplorer";
import PlanetHUD from "./PlanetHUD";
import PlanetDeathScreen from "./PlanetDeathScreen";
import PlanetExtractionUI from "./PlanetExtractionUI";
import "../styles/planet-explorer.css";

interface PlanetExplorerModalProps {
  planetId: string;
  planetName: string;
  playerId: string;
  on: (event: string, handler: (...args: any[]) => void) => () => void;
  emit: (event: string, data: any) => void;
  onClose: (extracted: boolean) => void;
}

export default function PlanetExplorerModal({
  planetId,
  planetName,
  playerId,
  on,
  emit,
  onClose,
}: PlanetExplorerModalProps) {
  const [confirmExit, setConfirmExit] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { state, canvasRef, join, leave, respawn } = usePlanetExplorer({
    planetId,
    playerId,
    on,
    emit,
  });

  // Join on mount
  useEffect(() => {
    join();
  }, [join]);

  // Handle ESC key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmExit) {
          // Second ESC = cancel exit
          setConfirmExit(false);
        } else {
          setConfirmExit(true);
        }
      }
    },
    [confirmExit],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Resize canvas to fill container
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = container?.querySelector("canvas");
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLeave = useCallback(async () => {
    const res = await leave();
    onClose(res?.nearPad ?? false);
  }, [leave, onClose]);

  const handleExtract = useCallback(async () => {
    await leave();
    onClose(true);
  }, [leave, onClose]);

  return (
    <div className="planet-explorer-modal">
      <div
        className="planet-explorer-modal__content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="planet-explorer-modal__header">
          <div className="planet-explorer-modal__title">
            <span className="planet-explorer-modal__title-icon">{">"}</span>
            PLANET SURFACE — {planetName.toUpperCase()}
            {state.biome && (
              <span className="planet-explorer-modal__biome">
                {" "}
                [{state.biome.name}]
              </span>
            )}
          </div>
          <button
            className="planet-explorer-modal__close"
            onClick={() => setConfirmExit(true)}
          >
            [ESC]
          </button>
        </div>

        {/* Game area */}
        <div className="planet-explorer-modal__game" ref={containerRef}>
          {confirmExit ? (
            <div className="planet-explorer-modal__confirm">
              <div className="planet-explorer-modal__confirm-title">
                LEAVE PLANET SURFACE?
              </div>
              <div className="planet-explorer-modal__confirm-text">
                {state.nearPad
                  ? "You are near the landing pad. Your session loot will be extracted to your ship."
                  : "You are NOT near the landing pad. All session loot will be LOST."}
              </div>
              <div className="planet-explorer-modal__confirm-buttons">
                <button
                  className="planet-explorer-modal__confirm-btn planet-explorer-modal__confirm-btn--stay"
                  onClick={() => setConfirmExit(false)}
                >
                  STAY
                </button>
                <button
                  className={`planet-explorer-modal__confirm-btn planet-explorer-modal__confirm-btn--leave ${!state.nearPad ? "planet-explorer-modal__confirm-btn--danger" : ""}`}
                  onClick={() => handleLeave()}
                >
                  {state.nearPad ? "EXTRACT & LEAVE" : "LEAVE (LOSE LOOT)"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <canvas
                ref={canvasRef}
                className="planet-explorer-modal__canvas"
              />

              {/* HUD overlay */}
              <PlanetHUD
                hp={state.hp}
                maxHp={state.maxHp}
                level={state.level}
                xp={state.xp}
                xpToNext={state.xpToNext}
                gold={state.gold}
                sp={state.sp}
                skillCooldowns={state.skillCooldowns}
                sessionLoot={state.sessionLoot}
                nearPad={state.nearPad}
              />

              {/* Session loot panel */}
              <PlanetExtractionUI
                sessionLoot={state.sessionLoot}
                nearPad={state.nearPad}
                onExtract={handleExtract}
              />

              {/* Death overlay */}
              {state.dead && (
                <PlanetDeathScreen
                  onRespawn={respawn}
                  lootLost={state.sessionLoot.reduce(
                    (acc, l) => acc + l.quantity,
                    0,
                  )}
                />
              )}

              {/* Loading */}
              {!state.connected && (
                <div className="planet-explorer-modal__loading">
                  Initializing ground systems...
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
