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
  keyToGroup?: (key: string) => GroupId | null;
  onMapClick?: () => void;
  panelMinimized?: boolean;
  viewportMinimized?: boolean;
  onRestorePanel?: () => void;
  onRestoreViewport?: () => void;
  panelLabel?: string;
  panelSpriteKey?: string;
}

const SEPARATOR_AFTER: GroupId[] = ["ship", "starmall"];

export default function ActivityBar({
  activePanel,
  activeGroup,
  onSelectGroup,
  onSelectTab,
  badges,
  groupBadge,
  keyToGroup,
  onMapClick,
  panelMinimized,
  viewportMinimized,
  onRestorePanel,
  onRestoreViewport,
  panelLabel,
  panelSpriteKey,
}: ActivityBarProps) {
  const [expandedGroup, setExpandedGroup] = useState<GroupId | null>(
    activeGroup,
  );

  // Sync expanded state when group changes externally
  useEffect(() => {
    setExpandedGroup(activeGroup);
  }, [activeGroup]);

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
      if (keyToGroup) {
        const groupId = keyToGroup(key);
        if (groupId) onSelectGroup(groupId);
      } else {
        const group = PANEL_GROUPS.find((g) => g.hotkey === key);
        if (group) onSelectGroup(group.id);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onSelectGroup, keyToGroup]);

  return (
    <div className="activity-bar">
      {/* Group buttons with inline tabs */}
      <div className="activity-bar__groups">
        {PANEL_GROUPS.map((group) => {
          const isActive = activeGroup === group.id;
          const badge = groupBadge(group.id);
          const hasTabs = group.tabs.length > 1;
          return (
            <React.Fragment key={group.id}>
              <button
                className={`activity-bar__item${isActive ? " activity-bar__item--active" : ""}${isActive && hasTabs && expandedGroup === group.id ? " activity-bar__item--expanded" : ""}`}
                style={
                  {
                    "--accent": group.accentColor,
                  } as React.CSSProperties
                }
                onClick={() => {
                  if (activeGroup === group.id) {
                    setExpandedGroup(
                      expandedGroup === group.id ? null : group.id,
                    );
                  } else {
                    onSelectGroup(group.id);
                    setExpandedGroup(group.id);
                  }
                }}
                data-tutorial={`group-${group.id}`}
              >
                <div className="activity-bar__item-icon">
                  <PixelSprite spriteKey={group.spriteKey} size={20} />
                </div>
                <div className="activity-bar__item-text">
                  <span className="activity-bar__item-label">
                    {group.label}
                    {isActive && hasTabs && expandedGroup === group.id && (
                      <span className="activity-bar__expand-indicator"> ▾</span>
                    )}
                    {(!isActive || expandedGroup !== group.id) && hasTabs && (
                      <span className="activity-bar__expand-indicator"> ›</span>
                    )}
                  </span>
                </div>
                {badge > 0 && (
                  <span className="activity-bar__badge">{badge}</span>
                )}
                <span className="activity-bar__tooltip">
                  {group.description}
                </span>
              </button>
              {/* Inline tabs under active group */}
              {isActive && hasTabs && expandedGroup === group.id && (
                <div
                  className="activity-bar__inline-tabs"
                  style={
                    { "--accent": group.accentColor } as React.CSSProperties
                  }
                >
                  {group.tabs.map((tab) => {
                    const isActiveTab = activePanel === tab.id;
                    const tabBadge = badges[tab.id] || 0;
                    return (
                      <button
                        key={tab.id}
                        className={`activity-bar__inline-tab${isActiveTab ? " activity-bar__inline-tab--active" : ""}`}
                        data-tutorial={`tab-${tab.id}`}
                        onClick={() => onSelectTab(tab.id)}
                      >
                        <span className="activity-bar__inline-tab-dot">
                          {isActiveTab ? "▸" : "·"}
                        </span>
                        {tab.label}
                        {tabBadge > 0 && (
                          <span className="activity-bar__tab-badge">
                            {tabBadge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {SEPARATOR_AFTER.includes(group.id) && (
                <div className="activity-bar__sep" />
              )}
            </React.Fragment>
          );
        })}

        {/* Separator before utility items */}
        <div className="activity-bar__sep" />

        {/* MAP button */}
        {onMapClick && (
          <button
            className="activity-bar__item"
            style={{ "--accent": "var(--cyan)" } as React.CSSProperties}
            onClick={onMapClick}
          >
            <div className="activity-bar__item-icon">
              <PixelSprite spriteKey="icon_explore" size={20} />
            </div>
            <div className="activity-bar__item-text">
              <span className="activity-bar__item-label">MAP</span>
            </div>
            <span className="activity-bar__tooltip">Open 2D sector map</span>
          </button>
        )}

        {/* Restore minimized panels */}
        {panelMinimized && onRestorePanel && (
          <button
            className="activity-bar__item"
            style={{ "--accent": "var(--magenta)" } as React.CSSProperties}
            onClick={onRestorePanel}
          >
            <div className="activity-bar__item-icon">
              <PixelSprite spriteKey={panelSpriteKey ?? "icon_nav"} size={20} />
            </div>
            <div className="activity-bar__item-text">
              <span className="activity-bar__item-label">
                {panelLabel ?? "PANEL"}
              </span>
            </div>
            <span className="activity-bar__tooltip">
              Restore activity panel
            </span>
          </button>
        )}
        {viewportMinimized && onRestoreViewport && (
          <button
            className="activity-bar__item"
            style={{ "--accent": "var(--cyan)" } as React.CSSProperties}
            onClick={onRestoreViewport}
          >
            <div className="activity-bar__item-icon">
              <PixelSprite spriteKey="icon_nav" size={20} />
            </div>
            <div className="activity-bar__item-text">
              <span className="activity-bar__item-label">BRIDGE</span>
            </div>
            <span className="activity-bar__tooltip">Restore bridge view</span>
          </button>
        )}
      </div>
    </div>
  );
}
