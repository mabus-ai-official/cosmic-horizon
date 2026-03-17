import { useState, useCallback, useRef } from "react";
import type { GameEvent, EventPriority } from "../config/event-overlay-config";
import { EVENT_DEFAULTS } from "../config/event-overlay-config";

let eventIdCounter = 0;

type EnqueueParams = Omit<
  GameEvent,
  "id" | "priority" | "duration" | "dismissable" | "colorScheme"
> & {
  priority?: EventPriority;
  duration?: number;
  dismissable?: boolean;
  colorScheme?: string;
};

export function useEventOverlay(
  showToast?: (msg: string, type: string, duration: number) => void,
) {
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const queueRef = useRef<GameEvent[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether an event is currently displayed — prevents double-processNext
  // when multiple events are enqueued in the same synchronous batch
  const showingRef = useRef(false);
  // Store current event's onAction in a ref so it's always accessible
  const onActionRef = useRef<((id: string) => void) | undefined>(undefined);

  const processNext = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (queueRef.current.length === 0) {
      showingRef.current = false;
      onActionRef.current = undefined;
      setCurrentEvent(null);
      return;
    }

    const next = queueRef.current.shift()!;
    showingRef.current = true;
    onActionRef.current = next.onAction;
    setCurrentEvent(next);

    // Suppress auto-dismiss when narration is attached — user must dismiss manually
    if (next.duration > 0 && !next.narrationUrl) {
      timerRef.current = setTimeout(() => {
        next.onDismiss?.();
        showingRef.current = false;
        processNext();
      }, next.duration);
    }
  }, []);

  const enqueueEvent = useCallback(
    (params: EnqueueParams) => {
      const defaults = EVENT_DEFAULTS[params.category];

      // Toast priority bypasses the overlay queue
      const priority = params.priority ?? defaults.priority;
      if (priority === "toast") {
        showToast?.(
          params.title + (params.subtitle ? `: ${params.subtitle}` : ""),
          "system",
          params.duration ?? 4000,
        );
        return;
      }

      const event: GameEvent = {
        id: eventIdCounter++,
        category: params.category,
        priority,
        title: params.title,
        subtitle: params.subtitle,
        body: params.body,
        duration: params.duration ?? defaults.duration,
        dismissable: params.dismissable ?? defaults.dismissable,
        actions: params.actions,
        colorScheme: params.colorScheme ?? defaults.colorScheme,
        narrationUrl: params.narrationUrl,
        onDismiss: params.onDismiss,
        onAction: params.onAction,
      };

      // Priority insertion: blocking events go to front, interstitials after blocking
      if (priority === "blocking") {
        const firstNonBlocking = queueRef.current.findIndex(
          (e) => e.priority !== "blocking",
        );
        if (firstNonBlocking === -1) {
          queueRef.current.push(event);
        } else {
          queueRef.current.splice(firstNonBlocking, 0, event);
        }
      } else {
        queueRef.current.push(event);
      }

      // If nothing is currently showing, start processing
      if (!showingRef.current) {
        setTimeout(() => processNext(), 0);
      }
    },
    [processNext, showToast],
  );

  const dismissCurrent = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onActionRef.current = undefined;
    setCurrentEvent((current) => {
      current?.onDismiss?.();
      return null;
    });
    showingRef.current = false;
    // Process next after a brief moment for animation
    setTimeout(() => processNext(), 50);
  }, [processNext]);

  const handleAction = useCallback(
    (actionId: string) => {
      // Grab onAction from ref before clearing state
      const action = onActionRef.current;
      onActionRef.current = undefined;
      setCurrentEvent(null);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // Fire onAction after clearing the overlay
      action?.(actionId);
      showingRef.current = false;
      setTimeout(() => processNext(), 50);
    },
    [processNext],
  );

  // Start the auto-dismiss timer for the current event (called after narration ends)
  const startDismissTimer = useCallback(
    (duration: number) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      timerRef.current = setTimeout(() => {
        setCurrentEvent((current) => {
          current?.onDismiss?.();
          return null;
        });
        showingRef.current = false;
        setTimeout(() => processNext(), 50);
      }, duration);
    },
    [processNext],
  );

  return {
    currentEvent,
    queueLength: queueRef.current.length,
    enqueueEvent,
    dismissCurrent,
    handleAction,
    startDismissTimer,
  };
}
