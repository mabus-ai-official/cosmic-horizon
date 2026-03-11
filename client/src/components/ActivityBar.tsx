import React, { useState, useEffect } from "react";
import PixelSprite from "./PixelSprite";
import { PANEL_GROUPS } from "../types/panels";
import type { PanelId, GroupId } from "../types/panels";

interface ActivityBarProps {
  activePanel: PanelId;
  activeGroup: GroupId;
  onSelectGroup: (id: GroupId) => void;
  onSelectTab: (id: PanelId) => void;
  badges: Record<string, number>;
  groupBadge: (id: GroupId) => number;
}

const SEPARATOR_AFTER: GroupId[] = ["ship", "market"];

export default function ActivityBar({
  activePanel,
  activeGroup,
  onSelectGroup,
  onSelectTab,
  badges,
  groupBadge,
}: ActivityBarProps) {
  const [expanded, setExpanded] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const active = document.activeElement as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable ||
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement ||
        active?.isContentEditable
      )
        return;

      const key = e.key.toUpperCase();
      const group = PANEL_GROUPS.find((g) => g.hotkey === key);
      if (group) onSelectGroup(group.id);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onSelectGroup]);

  const currentGroup = PANEL_GROUPS.find((g) => g.id === activeGroup);

  return (
    <div className={`activity-bar${expanded ? " activity-bar--expanded" : ""}`}>
      {/* Expand/collapse toggle */}
      <button
        className="activity-bar__toggle"
        onClick={() => setExpanded((v) => !v)}
        title={expanded ? "Collapse" : "Expand"}
      >
        {expanded ? "«" : "»"}
      </button>

      {/* Group buttons */}
      <div className="activity-bar__groups">
        {PANEL_GROUPS.map((group) => {
          const isActive = activeGroup === group.id;
          const badge = groupBadge(group.id);
          return (
            <React.Fragment key={group.id}>
              <button
                className={`activity-bar__item${isActive ? " activity-bar__item--active" : ""}`}
                style={
                  {
                    "--accent": group.accentColor,
                  } as React.CSSProperties
                }
                onClick={() => onSelectGroup(group.id)}
                data-tutorial={`group-${group.id}`}
              >
                <div className="activity-bar__item-icon">
                  <PixelSprite spriteKey={group.spriteKey} size={20} />
                </div>
                <div className="activity-bar__item-text">
                  <span className="activity-bar__item-label">
                    {group.label}
                  </span>
                  {expanded && (
                    <span className="activity-bar__item-desc">
                      {group.description}
                    </span>
                  )}
                </div>
                {badge > 0 && (
                  <span className="activity-bar__badge">{badge}</span>
                )}
              </button>
              {SEPARATOR_AFTER.includes(group.id) && (
                <div className="activity-bar__sep" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Tab bar for active group */}
      {currentGroup && currentGroup.tabs.length > 1 && (
        <div className="activity-bar__tabs">
          {currentGroup.tabs.map((tab) => {
            const isActiveTab = activePanel === tab.id;
            const tabBadge = badges[tab.id] || 0;
            return (
              <button
                key={tab.id}
                className={`activity-bar__tab${isActiveTab ? " activity-bar__tab--active" : ""}`}
                style={
                  {
                    "--accent": currentGroup.accentColor,
                  } as React.CSSProperties
                }
                onClick={() => onSelectTab(tab.id)}
              >
                {tab.label}
                {tabBadge > 0 && (
                  <span className="activity-bar__tab-badge">{tabBadge}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
