import { useState, useEffect, useCallback } from "react";
import type { ChatMessage } from "./SectorChatPanel";
import { ArcadeContainer } from "../arcade";

interface ArcadeModalProps {
  onClose: () => void;
  alerts: ChatMessage[];
  on: (event: string, handler: (...args: any[]) => void) => () => void;
  emit: (event: string, data: any) => void;
  playerId: string;
  sectorPlayers: { id: string; username: string }[];
}

export default function ArcadeModal({
  onClose,
  alerts,
  on,
  emit,
  playerId,
  sectorPlayers,
}: ArcadeModalProps) {
  const [confirmExit, setConfirmExit] = useState(false);

  const handleClose = useCallback(() => {
    setConfirmExit(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirmExit) {
        setConfirmExit(true);
      }
    },
    [confirmExit],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const recentAlerts = alerts.slice(-5);

  return (
    <div
      className="arcade-modal"
      onClick={confirmExit ? undefined : handleClose}
    >
      <div
        className="arcade-modal__content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="arcade-modal__header">
          <div className="arcade-modal__title">
            <span className="arcade-modal__title-icon">{">"}</span>
            ARCADE
          </div>
          <button
            className="arcade-modal__close"
            onClick={confirmExit ? undefined : handleClose}
            disabled={confirmExit}
          >
            [ESC]
          </button>
        </div>

        {/* Game Area */}
        <div className="arcade-modal__game-area">
          {confirmExit ? (
            <div className="arcade-modal__confirm">
              <div className="arcade-modal__confirm-title">LEAVE ARCADE?</div>
              <div className="arcade-modal__confirm-text">
                All game progress will be lost.
              </div>
              <div className="arcade-modal__confirm-buttons">
                <button
                  className="arcade-modal__confirm-btn arcade-modal__confirm-btn--stay"
                  onClick={() => setConfirmExit(false)}
                >
                  STAY
                </button>
                <button
                  className="arcade-modal__confirm-btn arcade-modal__confirm-btn--leave"
                  onClick={onClose}
                >
                  LEAVE
                </button>
              </div>
            </div>
          ) : (
            <ArcadeContainer
              on={on}
              emit={emit}
              playerId={playerId}
              sectorPlayers={sectorPlayers}
              onExit={onClose}
            />
          )}
        </div>

        {/* Alert Ticker */}
        {recentAlerts.length > 0 && (
          <div className="arcade-modal__alerts">
            <span className="arcade-modal__alerts-label">COMMS</span>
            <div className="arcade-modal__alerts-ticker">
              {recentAlerts.map((a) => (
                <span key={a.id} className="arcade-modal__alert-item">
                  <span className="arcade-modal__alert-sender">
                    [{a.senderName}]
                  </span>{" "}
                  {a.message}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
