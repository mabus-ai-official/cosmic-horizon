import { useEffect, useCallback } from "react";

interface Props {
  title: string;
  accentColor: string;
  icon?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function PanelModal({
  title,
  accentColor,
  icon = "◆",
  onClose,
  children,
}: Props) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="panel-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="panel-modal"
        style={
          {
            "--modal-accent": accentColor,
          } as React.CSSProperties
        }
      >
        <div className="panel-modal-header">
          <div className="panel-modal-title">
            <span className="panel-modal-title-icon">{icon}</span>
            {title}
          </div>
          <button className="panel-modal-close" onClick={onClose}>
            ESC
          </button>
        </div>
        <div className="panel-modal-body">{children}</div>
      </div>
    </div>
  );
}
