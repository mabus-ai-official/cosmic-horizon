/**
 * ModalLayer — renders all overlay/modal UI on top of the game layout.
 * Includes ARIA comment toast, toasts, event overlay, SP complete modal,
 * settings overlay, arcade modal, and tutorial overlays.
 */
import { useEffect, useRef, useState } from "react";
import ToastManager from "./ToastManager";
import EventOverlay from "./EventOverlay";
import ArcadeModal from "./ArcadeModal";
import TutorialOverlay from "./TutorialOverlay";
import SettingsPanel from "./SettingsPanel";
import type { ChatMessage } from "./SectorChatPanel";
import type { KeyBinding } from "../hooks/useKeybindings";

interface ModalLayerProps {
  aria: any;
  toasts: any[];
  dismissToast: (id: number) => void;
  eventOverlay: any;
  narration: {
    playNarration: (url: string) => void;
    skipNarration: () => void;
    isPlaying: boolean;
    narrationEnabled: boolean;
    setNarrationEnabled: (enabled: boolean) => void;
    narrationVolume: number;
    setNarrationVolume: (v: number) => void;
  };
  showSPComplete: boolean;
  setShowSPComplete: React.Dispatch<React.SetStateAction<boolean>>;
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  showArcade: boolean;
  setShowArcade: React.Dispatch<React.SetStateAction<boolean>>;
  chatMessages: ChatMessage[];
  game: any;
  audio: any;
  onLogout?: () => void;
  onCommand: (input: string) => void;
  activePanel: string;
  selectPanel: (id: any) => void;
  on: (event: string, handler: (...args: any[]) => void) => () => void;
  emit: (event: string, data: any) => void;
  keybindings: KeyBinding[];
  keybindConflicts: Map<string, string[]>;
  onRebind: (action: string, newKey: string) => void;
  onResetKeybind: (action: string) => void;
  onResetAllKeybinds: () => void;
}

export default function ModalLayer({
  aria: _aria,
  toasts,
  dismissToast,
  eventOverlay,
  narration,
  showSPComplete,
  setShowSPComplete,
  showSettings,
  setShowSettings,
  showArcade,
  setShowArcade,
  chatMessages,
  game,
  audio,
  onLogout,
  onCommand,
  activePanel,
  selectPanel,
  on,
  emit,
  keybindings,
  keybindConflicts,
  onRebind,
  onResetKeybind,
  onResetAllKeybinds,
}: ModalLayerProps) {
  // Auto-play narration when a narrated event becomes current
  const lastNarratedEventId = useRef<number | null>(null);
  const wasPlayingRef = useRef(false);
  const [postNarrationCountdown, setPostNarrationCountdown] = useState(0);
  const currentEvent = eventOverlay.currentEvent;

  useEffect(() => {
    if (
      currentEvent?.narrationUrl &&
      narration.narrationEnabled &&
      currentEvent.id !== lastNarratedEventId.current
    ) {
      lastNarratedEventId.current = currentEvent.id;
      narration.playNarration(currentEvent.narrationUrl);
    }
  }, [currentEvent, narration]);

  // After narration ends, start the event's dismiss countdown (progress bar)
  useEffect(() => {
    if (narration.isPlaying) {
      wasPlayingRef.current = true;
      setPostNarrationCountdown(0);
    } else if (wasPlayingRef.current && currentEvent?.narrationUrl) {
      // Narration just ended — kick off the dismiss timer + show progress bar
      // But NOT for blocking events with actions (choices) — player must click
      wasPlayingRef.current = false;
      const hasActions =
        currentEvent.actions && currentEvent.actions.length > 0;
      if (!hasActions) {
        const duration =
          currentEvent.duration > 0 ? currentEvent.duration : 5000;
        setPostNarrationCountdown(duration);
        eventOverlay.startDismissTimer(duration);
      }
    }
  }, [narration.isPlaying, currentEvent, eventOverlay]);

  // Reset countdown when event changes
  useEffect(() => {
    setPostNarrationCountdown(0);
  }, [currentEvent?.id]);

  // Wrap dismiss to also stop narration (only if current event has narration)
  const handleDismiss = () => {
    wasPlayingRef.current = false;
    if (currentEvent?.narrationUrl) {
      narration.skipNarration();
    }
    eventOverlay.dismissCurrent();
  };

  // Wrap action handler to also stop narration (only if current event has narration)
  const handleAction = (actionId: string) => {
    wasPlayingRef.current = false;
    if (currentEvent?.narrationUrl) {
      narration.skipNarration();
    }
    eventOverlay.handleAction(actionId);
  };

  return (
    <>
      {/* ARIA comments now go through CommScreen in Game.tsx */}
      <ToastManager toasts={toasts} onDismiss={dismissToast} />
      {eventOverlay.currentEvent && (
        <EventOverlay
          event={eventOverlay.currentEvent}
          onDismiss={handleDismiss}
          onAction={handleAction}
          narrationPlaying={narration.isPlaying}
          onSkipNarration={narration.skipNarration}
          postNarrationCountdown={postNarrationCountdown}
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
              volume={audio.volume}
              onVolumeChange={audio.setVolume}
              narrationEnabled={narration.narrationEnabled}
              onNarrationToggle={narration.setNarrationEnabled}
              narrationVolume={narration.narrationVolume}
              onNarrationVolumeChange={narration.setNarrationVolume}
              onLogout={onLogout ?? (() => {})}
              keybindings={keybindings}
              keybindConflicts={keybindConflicts}
              onRebind={onRebind}
              onResetKeybind={onResetKeybind}
              onResetAllKeybinds={onResetAllKeybinds}
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
