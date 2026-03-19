import { useState, useEffect, useRef, useCallback } from "react";
import PixelSprite from "./PixelSprite";

export interface CommMessage {
  id: number;
  portrait?: string; // pixel sprite key (e.g., "npc_muscarian")
  sender: string; // display name (e.g., "ARIA", "Bartender")
  text: string;
  duration?: number; // auto-dismiss ms (0 = manual only)
  priority?: "low" | "normal" | "high";
}

interface Props {
  message: CommMessage | null;
  onDismiss: () => void;
}

const CHAR_DELAY_MS = 25;
const STORAGE_KEY = "comm-screen-pos";

function loadPosition(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function savePosition(pos: { x: number; y: number }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {}
}

export default function CommScreen({ message, onDismiss }: Props) {
  const [minimized, setMinimized] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    loadPosition,
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  // Un-minimize when a new message arrives
  useEffect(() => {
    if (message) setMinimized(false);
  }, [message?.id]);

  // Typing animation
  useEffect(() => {
    if (!message) {
      setDisplayedText("");
      setIsTyping(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      return;
    }

    setDisplayedText("");
    setIsTyping(true);
    indexRef.current = 0;

    intervalRef.current = setInterval(() => {
      indexRef.current++;
      if (indexRef.current >= message.text.length) {
        setDisplayedText(message.text);
        setIsTyping(false);
        if (intervalRef.current) clearInterval(intervalRef.current);

        const duration = message.duration ?? 8000;
        if (duration > 0) {
          dismissTimerRef.current = setTimeout(onDismiss, duration);
        }
      } else {
        setDisplayedText(message.text.slice(0, indexRef.current));
      }
    }, CHAR_DELAY_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [message?.id]);

  // Drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only drag from header, not buttons
      if ((e.target as HTMLElement).closest(".comm-screen__btn")) return;
      e.preventDefault();

      const el = screenRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const origX = position?.x ?? rect.left;
      const origY = position?.y ?? rect.top;

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX,
        origY,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        const newX = Math.max(
          0,
          Math.min(window.innerWidth - 100, dragRef.current.origX + dx),
        );
        const newY = Math.max(
          0,
          Math.min(window.innerHeight - 50, dragRef.current.origY + dy),
        );
        setPosition({ x: newX, y: newY });
      };

      const handleMouseUp = () => {
        if (dragRef.current) {
          // Save final position
          const el2 = screenRef.current;
          if (el2) {
            const rect2 = el2.getBoundingClientRect();
            savePosition({ x: rect2.left, y: rect2.top });
          }
        }
        dragRef.current = null;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [position],
  );

  const posStyle = position
    ? {
        position: "fixed" as const,
        top: position.y,
        left: position.x,
        right: "auto" as const,
      }
    : {};

  if (minimized) {
    return (
      <div
        className="comm-screen comm-screen--minimized"
        style={posStyle}
        onClick={() => setMinimized(false)}
        title="Open comm screen"
      >
        <div className="comm-screen__mini-icon">◈</div>
      </div>
    );
  }

  return (
    <div
      ref={screenRef}
      className={`comm-screen${message ? " comm-screen--active" : ""}`}
      style={posStyle}
    >
      {/* Scanline overlay */}
      <div className="comm-screen__scanlines" />

      {/* Header bar — draggable */}
      <div className="comm-screen__header" onMouseDown={handleMouseDown}>
        <span className="comm-screen__freq">COMM LINK</span>
        <div className="comm-screen__controls">
          <button
            className="comm-screen__btn"
            onClick={() => setMinimized(true)}
            title="Minimize"
          >
            −
          </button>
          {message && (
            <button
              className="comm-screen__btn"
              onClick={onDismiss}
              title="Dismiss"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="comm-screen__body">
        {message ? (
          <>
            <div className="comm-screen__portrait">
              {message.portrait ? (
                <PixelSprite spriteKey={message.portrait} size={48} />
              ) : (
                <div className="comm-screen__portrait-placeholder">◈</div>
              )}
            </div>
            <div className="comm-screen__dialogue">
              <div className="comm-screen__sender">{message.sender}</div>
              <div className="comm-screen__text">
                {displayedText}
                {isTyping && <span className="comm-screen__cursor">▊</span>}
              </div>
            </div>
          </>
        ) : (
          <div className="comm-screen__idle">
            <div className="comm-screen__static" />
            <span className="comm-screen__idle-text">NO SIGNAL</span>
          </div>
        )}
      </div>
    </div>
  );
}
