import { useState, useEffect, useCallback } from "react";
import type { ChatMessage } from "./SectorChatPanel";

interface ArcadeModalProps {
  onClose: () => void;
  alerts: ChatMessage[];
}

export default function ArcadeModal({ onClose, alerts }: ArcadeModalProps) {
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

  // Last few alerts to show in the ticker
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
            <div className="arcade-modal__placeholder">
              <div className="arcade-modal__placeholder-art">
                {`
   ╔══════════════════════════╗
   ║   ░▒▓ ARCADE TERMINAL ▓▒░  ║
   ║                          ║
   ║    SELECT YOUR GAME      ║
   ║                          ║
   ║    ▸ Coming Soon...      ║
   ║                          ║
   ╚══════════════════════════╝
              `.trim()}
              </div>
              <div className="arcade-modal__placeholder-text">
                Games loading into this terminal...
              </div>
            </div>
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
