import { useState, useCallback, useRef, useEffect } from "react";
import {
  ARIA_IDLE,
  ARIA_MOVE,
  ARIA_DOCK,
  ARIA_COMBAT,
  ARIA_TRADE,
  ARIA_RARE,
  ARIA_MILESTONE,
  type AriaCommentPool,
} from "../config/aria-comments";

const MIN_GAP_MS = 60_000; // 60 seconds minimum between comments
const IDLE_MIN_MS = 2 * 60_000; // 2 minutes
const IDLE_MAX_MS = 5 * 60_000; // 5 minutes
const RECENT_HISTORY_SIZE = 10; // don't repeat within last 10 comments

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickComment(
  pool: AriaCommentPool,
  recentHistory: string[],
): string | null {
  // Filter out recently used comments
  const available = pool.comments.filter((c) => !recentHistory.includes(c));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export function useAria() {
  const [comment, setComment] = useState<string | null>(null);
  const [showComment, setShowComment] = useState(false);

  const lastCommentTimeRef = useRef<number>(0);
  const recentHistoryRef = useRef<string[]>([]);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<string[]>([]);

  const addToHistory = useCallback((text: string) => {
    recentHistoryRef.current = [
      ...recentHistoryRef.current.slice(-(RECENT_HISTORY_SIZE - 1)),
      text,
    ];
  }, []);

  const displayComment = useCallback(
    (text: string) => {
      const now = Date.now();
      const elapsed = now - lastCommentTimeRef.current;

      if (elapsed < MIN_GAP_MS) {
        // Queue it if we're within the gap window
        if (queueRef.current.length === 0) {
          queueRef.current.push(text);
        }
        return;
      }

      lastCommentTimeRef.current = now;
      addToHistory(text);
      setComment(text);
      setShowComment(true);

      // Calculate display duration: typing time + 6 seconds
      const typingDuration = text.length * 30;
      const totalDuration = typingDuration + 6000;

      if (displayTimerRef.current) clearTimeout(displayTimerRef.current);
      displayTimerRef.current = setTimeout(() => {
        setShowComment(false);
        // After fade-out, check queue
        setTimeout(() => {
          setComment(null);
          if (queueRef.current.length > 0) {
            const next = queueRef.current.shift()!;
            displayComment(next);
          }
        }, 500); // fade-out animation duration
      }, totalDuration);
    },
    [addToHistory],
  );

  const tryTrigger = useCallback(
    (pool: AriaCommentPool) => {
      // First check the rare pool (1% on any action)
      if (Math.random() < ARIA_RARE.chance) {
        const rare = pickComment(ARIA_RARE, recentHistoryRef.current);
        if (rare) {
          displayComment(rare);
          return;
        }
      }

      // Roll against pool's chance
      if (Math.random() >= pool.chance) return;

      const text = pickComment(pool, recentHistoryRef.current);
      if (text) displayComment(text);
    },
    [displayComment],
  );

  // --- Idle timer management ---
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    const delay = randomBetween(IDLE_MIN_MS, IDLE_MAX_MS);
    idleTimerRef.current = setTimeout(() => {
      tryTrigger(ARIA_IDLE);
      // Set up the next idle timer
      resetIdleTimer();
    }, delay);
  }, [tryTrigger]);

  // Start idle timer on mount
  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (displayTimerRef.current) clearTimeout(displayTimerRef.current);
    };
  }, [resetIdleTimer]);

  // --- Public trigger methods ---
  const triggerIdle = useCallback(() => {
    tryTrigger(ARIA_IDLE);
  }, [tryTrigger]);

  const triggerMove = useCallback(() => {
    resetIdleTimer();
    tryTrigger(ARIA_MOVE);
  }, [tryTrigger, resetIdleTimer]);

  const triggerDock = useCallback(() => {
    resetIdleTimer();
    tryTrigger(ARIA_DOCK);
  }, [tryTrigger, resetIdleTimer]);

  const triggerCombat = useCallback(() => {
    resetIdleTimer();
    tryTrigger(ARIA_COMBAT);
  }, [tryTrigger, resetIdleTimer]);

  const triggerTrade = useCallback(() => {
    resetIdleTimer();
    tryTrigger(ARIA_TRADE);
  }, [tryTrigger, resetIdleTimer]);

  const triggerMilestone = useCallback(() => {
    resetIdleTimer();
    tryTrigger(ARIA_MILESTONE);
  }, [tryTrigger, resetIdleTimer]);

  const dismissComment = useCallback(() => {
    setShowComment(false);
    if (displayTimerRef.current) clearTimeout(displayTimerRef.current);
    setTimeout(() => setComment(null), 500);
  }, []);

  return {
    comment,
    showComment,
    dismissComment,
    triggerIdle,
    triggerMove,
    triggerDock,
    triggerCombat,
    triggerTrade,
    triggerMilestone,
    resetIdleTimer,
  };
}
