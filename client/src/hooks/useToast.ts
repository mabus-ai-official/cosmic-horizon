import { useState, useCallback, useRef } from "react";

export type ToastType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "combat"
  | "system"
  | "achievement"
  | "story";

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  expiresAt: number;
}

const MAX_TOASTS = 3;
let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration = 4000) => {
      const id = toastIdCounter++;
      const toast: Toast = {
        id,
        message,
        type,
        expiresAt: Date.now() + duration,
      };

      setToasts((prev) => {
        const next = [...prev, toast];
        return next.length > MAX_TOASTS
          ? next.slice(next.length - MAX_TOASTS)
          : next;
      });

      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timersRef.current.delete(id);
      }, duration);
      timersRef.current.set(id, timer);

      return id;
    },
    [],
  );

  return { toasts, showToast, dismissToast };
}
