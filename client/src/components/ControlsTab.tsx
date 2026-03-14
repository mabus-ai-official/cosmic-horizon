import { useState, useEffect, useCallback } from "react";
import type { KeyBinding } from "../hooks/useKeybindings";

interface ControlsTabProps {
  bindings: KeyBinding[];
  conflicts: Map<string, string[]>;
  onRebind: (action: string, newKey: string) => void;
  onResetOne: (action: string) => void;
  onResetAll: () => void;
}

export default function ControlsTab({
  bindings,
  conflicts,
  onRebind,
  onResetOne,
  onResetAll,
}: ControlsTabProps) {
  const [listening, setListening] = useState<string | null>(null);

  const conflictActions = new Set<string>();
  for (const actions of conflicts.values()) {
    for (const a of actions) conflictActions.add(a);
  }

  const handleKeyCapture = useCallback(
    (e: KeyboardEvent) => {
      if (!listening) return;
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setListening(null);
        return;
      }

      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      onRebind(listening, key);
      setListening(null);
    },
    [listening, onRebind],
  );

  useEffect(() => {
    if (!listening) return;
    document.addEventListener("keydown", handleKeyCapture, true);
    return () =>
      document.removeEventListener("keydown", handleKeyCapture, true);
  }, [listening, handleKeyCapture]);

  const panelBindings = bindings.filter((b) => b.category === "panels");

  return (
    <div className="controls-tab">
      <div className="controls-tab__header">
        <h4 className="settings-section__title">Keybindings</h4>
        <button className="btn btn-secondary btn-sm" onClick={onResetAll}>
          RESET ALL
        </button>
      </div>

      {conflicts.size > 0 && (
        <div className="controls-tab__warning">
          Conflict detected — multiple actions share the same key
        </div>
      )}

      <div className="controls-tab__section-label">Panel Navigation</div>
      <div className="controls-tab__grid">
        {panelBindings.map((b) => {
          const isListening = listening === b.action;
          const hasConflict = conflictActions.has(b.action);
          const isCustom = b.key !== b.defaultKey;
          return (
            <div
              key={b.action}
              className={`controls-tab__row${hasConflict ? " controls-tab__row--conflict" : ""}`}
            >
              <span className="controls-tab__action">{b.label}</span>
              <button
                className={`controls-tab__key${isListening ? " controls-tab__key--listening" : ""}${hasConflict ? " controls-tab__key--conflict" : ""}`}
                onClick={() => setListening(isListening ? null : b.action)}
              >
                {isListening ? "Press a key..." : b.key}
              </button>
              {isCustom && (
                <button
                  className="controls-tab__reset"
                  onClick={() => onResetOne(b.action)}
                  title={`Reset to ${b.defaultKey}`}
                >
                  ↩
                </button>
              )}
              {!isCustom && <span className="controls-tab__reset-spacer" />}
            </div>
          );
        })}
      </div>

      <div className="controls-tab__hint">
        Click a key to rebind. Press ESC to cancel.
      </div>
    </div>
  );
}
