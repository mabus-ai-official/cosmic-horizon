import React, { useState, useCallback, useEffect } from "react";
import PixelSprite from "./PixelSprite";
import { PANELS } from "../types/panels";
import type { PanelId } from "../types/panels";

interface ActivityBarProps {
  activePanel: PanelId;
  onSelect: (id: PanelId) => void;
  badges: Record<string, number>;
}

const SEPARATOR_AFTER = new Set([2, 5, 9, 11]);

export default function ActivityBar({
  activePanel,
  onSelect,
  badges,
}: ActivityBarProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, idx: number) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPos({ top: rect.top + rect.height / 2, left: rect.right + 8 });
      setHoveredIndex(idx);
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return;

      const key = e.key.toUpperCase();
      const panel = PANELS.find((p) => p.hotkey === key);
      if (panel) onSelect(panel.id);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onSelect]);

  return (
    <>
      <div className="activity-bar">
        {PANELS.map((p, i) => {
          const isActive = activePanel === p.id;
          return (
            <React.Fragment key={p.id}>
              <button
                className={`activity-bar__btn${isActive ? " activity-bar__btn--active" : " activity-bar__btn--shimmer"}`}
                onClick={() => onSelect(p.id)}
                onMouseEnter={(e) => handleMouseEnter(e, i)}
                onMouseLeave={handleMouseLeave}
                style={
                  !isActive
                    ? ({
                        animationDelay: `${i * 0.4}s`,
                        "--shimmer-dur": `${8 + ((i * 3) % 7)}s`,
                        "--shimmer-delay": `${(i * 2.3) % 12}s`,
                      } as React.CSSProperties)
                    : undefined
                }
              >
                <PixelSprite spriteKey={p.spriteKey} size={22} />
                {(badges[p.id] || 0) > 0 && (
                  <span className="activity-bar__badge">{badges[p.id]}</span>
                )}
              </button>
              {SEPARATOR_AFTER.has(i) && (
                <div
                  className={`activity-bar__sep${i === 2 ? " activity-bar__sep--primary" : ""}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {hoveredIndex !== null && (
        <div
          className="activity-bar__tooltip activity-bar__tooltip--visible"
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
        >
          {PANELS[hoveredIndex].label} ({PANELS[hoveredIndex].hotkey})
        </div>
      )}
    </>
  );
}
