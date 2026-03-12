/**
 * ModalLayer — renders all overlay/modal UI on top of the game layout.
 * Includes ARIA comment toast, toasts, event overlay, SP complete modal,
 * settings overlay, arcade modal, and tutorial overlays.
 */
import AriaComment from "./AriaComment";
import ToastManager from "./ToastManager";
import EventOverlay from "./EventOverlay";
import ArcadeModal from "./ArcadeModal";
import TutorialWelcomeOverlay from "./TutorialWelcomeOverlay";
import TutorialOverlay from "./TutorialOverlay";
import SettingsPanel from "./SettingsPanel";
import type { ChatMessage } from "./SectorChatPanel";

interface ModalLayerProps {
  aria: any;
  toasts: any[];
  dismissToast: (id: number) => void;
  eventOverlay: any;
  showSPComplete: boolean;
  setShowSPComplete: React.Dispatch<React.SetStateAction<boolean>>;
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  showArcade: boolean;
  setShowArcade: React.Dispatch<React.SetStateAction<boolean>>;
  chatMessages: ChatMessage[];
  game: any;
  audio: any;
  map3D: boolean;
  setMap3D: React.Dispatch<React.SetStateAction<boolean>>;
  onLogout?: () => void;
  onCommand: (input: string) => void;
  activePanel: string;
  selectPanel: (id: any) => void;
  on: (event: string, handler: (...args: any[]) => void) => () => void;
  emit: (event: string, data: any) => void;
}

export default function ModalLayer({
  aria,
  toasts,
  dismissToast,
  eventOverlay,
  showSPComplete,
  setShowSPComplete,
  showSettings,
  setShowSettings,
  showArcade,
  setShowArcade,
  chatMessages,
  game,
  audio,
  map3D,
  setMap3D,
  onLogout,
  onCommand,
  activePanel,
  selectPanel,
  on,
  emit,
}: ModalLayerProps) {
  return (
    <>
      <AriaComment
        comment={aria.comment}
        visible={aria.showComment}
        onDismiss={aria.dismissComment}
      />
      <ToastManager toasts={toasts} onDismiss={dismissToast} />
      {eventOverlay.currentEvent && (
        <EventOverlay
          event={eventOverlay.currentEvent}
          onDismiss={eventOverlay.dismissCurrent}
          onAction={eventOverlay.handleAction}
        />
      )}
      {showSPComplete && (
        <div
          className="sp-complete-modal"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#1a1a2e",
              border: "1px solid #00ff88",
              borderRadius: "8px",
              padding: "32px",
              maxWidth: "480px",
              textAlign: "center",
            }}
          >
            <h2 style={{ color: "#00ff88", marginBottom: "16px" }}>
              FRONTIER CONQUERED
            </h2>
            <p style={{ color: "#ccc", marginBottom: "16px" }}>
              You have completed all 20 single player missions! The multiplayer
              frontier awaits — join other pilots in the shared universe.
            </p>
            <p
              style={{
                color: "#888",
                fontSize: "0.85rem",
                marginBottom: "24px",
              }}
            >
              Your level, XP, credits, ships, and upgrades will carry over. Your
              single player planets and sectors will be removed.
            </p>
            <div
              style={{ display: "flex", gap: "12px", justifyContent: "center" }}
            >
              <button
                className="btn btn-secondary"
                onClick={() => setShowSPComplete(false)}
              >
                STAY IN SP
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowSPComplete(false);
                  onCommand("profile transition");
                }}
              >
                GO MULTIPLAYER
              </button>
            </div>
          </div>
        </div>
      )}
      {showSettings && (
        <div
          className="settings-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSettings(false);
          }}
        >
          <div className="settings-overlay__content">
            <button
              className="settings-overlay__close"
              onClick={() => setShowSettings(false)}
            >
              X
            </button>
            <SettingsPanel
              playerRace={game.player?.race ?? undefined}
              playerUsername={game.player?.username ?? undefined}
              gameMode={game.player?.gameMode ?? undefined}
              volume={audio.volume}
              onVolumeChange={audio.setVolume}
              map3D={map3D}
              onToggleMap3D={() => setMap3D((v) => !v)}
              onLogout={onLogout ?? (() => {})}
              onRefresh={() => {
                game.refreshStatus();
                game.refreshSector();
                game.refreshMap();
              }}
            />
          </div>
        </div>
      )}
      {showArcade && (
        <ArcadeModal
          onClose={() => setShowArcade(false)}
          alerts={chatMessages}
          on={on}
          emit={emit}
          playerId={game.player?.id ?? ""}
          sectorPlayers={game.sector?.players ?? []}
        />
      )}
      <TutorialWelcomeOverlay
        tutorialCompleted={game.player?.tutorialCompleted ?? true}
        onPlay={() => {}}
        onSkip={game.skipTutorial}
      />
      <TutorialOverlay
        tutorialStep={game.player?.tutorialStep ?? 0}
        tutorialCompleted={game.player?.tutorialCompleted ?? true}
        onSkip={game.skipTutorial}
        onSelectPanel={(id) => selectPanel(id as any)}
        onAdvanceTutorial={game.advanceTutorial}
        activePanel={activePanel}
      />
    </>
  );
}
