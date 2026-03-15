import { useState, useEffect, useRef } from "react";
import type { GameEvent } from "../config/event-overlay-config";

interface EventOverlayProps {
  event: GameEvent;
  onDismiss: () => void;
  onAction: (actionId: string) => void;
  narrationPlaying?: boolean;
  onSkipNarration?: () => void;
  postNarrationCountdown?: number; // duration in ms, set when narration ends
}

// Typing effect for story/lore text bodies
function TypingText({ text, speed = 25 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed("");
    indexRef.current = 0;
    const timer = setInterval(() => {
      indexRef.current++;
      if (indexRef.current >= text.length) {
        setDisplayed(text);
        clearInterval(timer);
      } else {
        setDisplayed(text.slice(0, indexRef.current));
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <p>
      {displayed}
      {displayed.length < text.length && (
        <span className="event-overlay__cursor">|</span>
      )}
    </p>
  );
}

// Progress bar for auto-dismiss countdown
function DismissProgress({
  duration,
  eventId,
}: {
  duration: number;
  eventId: number;
}) {
  const [progress, setProgress] = useState(100);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    setProgress(100);
    const timer = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, [duration, eventId]);

  return (
    <div className="event-overlay__progress">
      <div
        className="event-overlay__progress-bar"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// Category → extra CSS class for per-category animations
const CATEGORY_ANIMATION_CLASS: Record<string, string> = {
  story_act: "event-overlay--story",
  story_mission: "event-overlay--story",
  lore_reveal: "event-overlay--story",
  level_up: "event-overlay--milestone",
  faction_rankup: "event-overlay--milestone",
  first_time: "event-overlay--milestone",
  mission_complete: "event-overlay--milestone",
  resource_discovery: "event-overlay--discovery",
  player_choice: "event-overlay--choice",
  npc_dialogue: "event-overlay--choice",
  mission_choice: "event-overlay--choice",
  phase_intro: "event-overlay--story",
};

// Categories that use typing effect for text body
const TYPING_CATEGORIES = new Set([
  "story_act",
  "story_mission",
  "story_accept",
  "lore_reveal",
]);

export default function EventOverlay({
  event,
  onDismiss,
  onAction,
  narrationPlaying,
  onSkipNarration,
  postNarrationCountdown,
}: EventOverlayProps) {
  const hasNarration = !!event.narrationUrl;

  const handleBackdropClick = () => {
    if (event.dismissable || hasNarration) onDismiss();
  };

  const animClass = CATEGORY_ANIMATION_CLASS[event.category] || "";
  const useTyping =
    TYPING_CATEGORIES.has(event.category) && typeof event.body === "string";

  return (
    <div
      className={`event-overlay event-overlay--${event.colorScheme} ${animClass}`}
      onClick={handleBackdropClick}
    >
      <div
        className={`event-overlay__content ${event.portrait ? "event-overlay__content--with-portrait" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="event-overlay__burst" />
        {event.portrait && (
          <div className="event-overlay__portrait">
            <div className="event-overlay__portrait-frame">
              <div className="event-overlay__portrait-icon">
                {event.portrait.npcRace === "Vedic"
                  ? "🔮"
                  : event.portrait.npcRace === "Kalin"
                    ? "⚔️"
                    : event.portrait.npcRace === "Tar'ri"
                      ? "💰"
                      : event.portrait.npcRace === "Muscarian"
                        ? "🍄"
                        : "👤"}
              </div>
            </div>
            <div className="event-overlay__portrait-name">
              {event.portrait.npcName}
            </div>
            {event.portrait.npcTitle && (
              <div className="event-overlay__portrait-title">
                {event.portrait.npcTitle}
              </div>
            )}
          </div>
        )}
        <div className="event-overlay__title">{event.title}</div>
        {event.subtitle && (
          <div className="event-overlay__subtitle">{event.subtitle}</div>
        )}
        {event.body && (
          <div className="event-overlay__body">
            {useTyping ? (
              <TypingText text={event.body as string} speed={25} />
            ) : typeof event.body === "string" ? (
              <p>{event.body}</p>
            ) : (
              event.body
            )}
          </div>
        )}
        {event.actions && event.actions.length > 0 && (
          <div className="event-overlay__actions">
            {event.actions.map((action) => (
              <button
                key={action.id}
                className={`event-overlay__action-btn event-overlay__action-btn--${action.variant}`}
                onClick={() => onAction(action.id)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
        {narrationPlaying && onSkipNarration && (
          <button className="event-overlay__skip-btn" onClick={onSkipNarration}>
            Skip Narration ▶▶
          </button>
        )}
        {postNarrationCountdown && postNarrationCountdown > 0 ? (
          <DismissProgress
            duration={postNarrationCountdown}
            eventId={event.id + 10000}
          />
        ) : (
          !hasNarration &&
          event.dismissable &&
          event.duration > 0 && (
            <DismissProgress duration={event.duration} eventId={event.id} />
          )
        )}
        {hasNarration || event.dismissable ? (
          <div className="event-overlay__hint">Click anywhere to dismiss</div>
        ) : (
          !event.actions?.length && (
            <div className="event-overlay__hint">Click to dismiss</div>
          )
        )}
      </div>
    </div>
  );
}
