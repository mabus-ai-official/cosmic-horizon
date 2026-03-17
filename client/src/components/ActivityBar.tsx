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
  onRestorePanel?: () => void;
  viewportMinimized?: boolean;
  onToggleViewport?: () => void;
}

const SEPARATOR_AFTER: GroupId[] = ["ship", "commerce"];

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
  onRestorePanel,
  viewportMinimized,
  onToggleViewport,
}: ActivityBarProps) {
  const [expandedGroup, setExpandedGroup] = useState<GroupId | null>(
    panelMinimized ? null : activeGroup,
  );

  // Sync expanded state when group changes externally (but not when minimized)
  useEffect(() => {
    if (!panelMinimized) setExpandedGroup(activeGroup);
  }, [activeGroup, panelMinimized]);

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
                    if (panelMinimized) onRestorePanel?.();
                  }
                }}
                data-tutorial={`group-${group.id}`}
                title={group.description}
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
                        onClick={() => {
                          onSelectTab(tab.id);
                          if (panelMinimized) onRestorePanel?.();
                        }}
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
            title="Open 2D sector map"
          >
            <div className="activity-bar__item-icon">
              <PixelSprite spriteKey="icon_explore" size={20} />
            </div>
            <div className="activity-bar__item-text">
              <span className="activity-bar__item-label">MAP</span>
            </div>
          </button>
        )}

        {onToggleViewport && (
          <button
            className={`activity-bar__item${!viewportMinimized ? " activity-bar__item--active" : ""}`}
            style={{ "--accent": "var(--cyan)" } as React.CSSProperties}
            onClick={onToggleViewport}
            title="Toggle viewscreen"
          >
            <div className="activity-bar__item-icon">
              <PixelSprite spriteKey="icon_nav" size={20} />
            </div>
            <div className="activity-bar__item-text">
              <span className="activity-bar__item-label">VIEWSCREEN</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
