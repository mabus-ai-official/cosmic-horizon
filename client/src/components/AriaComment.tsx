import { useState, useEffect, useRef } from "react";

interface AriaCommentProps {
  comment: string | null;
  visible: boolean;
  onDismiss: () => void;
}

const CHAR_DELAY_MS = 30;

export default function AriaComment({
  comment,
  visible,
  onDismiss,
}: AriaCommentProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);

  // Typing animation
  useEffect(() => {
    if (!comment || !visible) {
      setDisplayedText("");
      setIsTyping(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    setDisplayedText("");
    setIsTyping(true);
    indexRef.current = 0;

    intervalRef.current = setInterval(() => {
      indexRef.current++;
      if (indexRef.current >= comment.length) {
        setDisplayedText(comment);
        setIsTyping(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        setDisplayedText(comment.slice(0, indexRef.current));
      }
    }, CHAR_DELAY_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [comment, visible]);

  if (!comment) return null;

  return (
    <div
      className={`aria-comment${visible ? " aria-comment--visible" : " aria-comment--fading"}`}
      onClick={onDismiss}
      role="status"
      aria-live="polite"
    >
      <div className="aria-comment__icon" aria-hidden="true" />
      <div className="aria-comment__body">
        <span className="aria-comment__prefix">ARIA:</span>
        <span className="aria-comment__text">
          {displayedText}
          {isTyping && <span className="aria-comment__cursor">|</span>}
        </span>
      </div>
    </div>
  );
}
