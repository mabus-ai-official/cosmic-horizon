import type { Toast } from "../hooks/useToast";

const ICON_MAP: Record<string, string> = {
  info: "[i]",
  success: "[✓]",
  warning: "[⚠]",
  error: "[!]",
  combat: "[⚔]",
  system: "[★]",
  achievement: "[🏆]",
};

interface ToastManagerProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

export default function ToastManager({ toasts, onDismiss }: ToastManagerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type}`}
          onClick={() => onDismiss(toast.id)}
        >
          <span className="toast__icon">
            {ICON_MAP[toast.type] || ICON_MAP.info}
          </span>
          <span className="toast__message">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
