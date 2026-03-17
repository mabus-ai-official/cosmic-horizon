import { useState, useCallback } from "react";
import type { PanelId, GroupId } from "../types/panels";
import { PANEL_GROUPS } from "../types/panels";

interface BadgeState {
  [key: string]: number;
}

/** Find which group a panel belongs to */
function groupForPanel(panelId: PanelId): GroupId {
  for (const g of PANEL_GROUPS) {
    if (g.tabs.some((t) => t.id === panelId)) return g.id;
  }
  return "helm";
}

export function useActivePanel(defaultPanel: PanelId = "nav") {
  const [activePanel, setActivePanel] = useState<PanelId>(defaultPanel);
  const [activeGroup, setActiveGroup] = useState<GroupId>(
    groupForPanel(defaultPanel),
  );
  const [badges, setBadges] = useState<BadgeState>({});

  const selectPanel = useCallback((id: PanelId) => {
    setActivePanel(id);
    setActiveGroup(groupForPanel(id));
    setBadges((prev) => ({ ...prev, [id]: 0 }));
  }, []);

  const selectGroup = useCallback(
    (groupId: GroupId) => {
      const group = PANEL_GROUPS.find((g) => g.id === groupId);
      if (!group) return;

      if (activeGroup === groupId) {
        // Already on this group — keep current tab
        return;
      }

      // Switch to group, default to first tab
      setActiveGroup(groupId);
      setActivePanel(group.tabs[0].id);
      // Only clear badge for the tab we're switching to (first tab)
      setBadges((prev) => ({ ...prev, [group.tabs[0].id]: 0 }));
    },
    [activeGroup],
  );

  const selectTab = useCallback((panelId: PanelId) => {
    setActivePanel(panelId);
    setBadges((prev) => ({ ...prev, [panelId]: 0 }));
  }, []);

  const incrementBadge = useCallback((id: PanelId) => {
    setBadges((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  }, []);

  /** Total badge count for a group (sum of its tabs) */
  const groupBadge = useCallback(
    (groupId: GroupId): number => {
      const group = PANEL_GROUPS.find((g) => g.id === groupId);
      if (!group) return 0;
      return group.tabs.reduce((sum, t) => sum + (badges[t.id] || 0), 0);
    },
    [badges],
  );

  return {
    activePanel,
    activeGroup,
    selectPanel,
    selectGroup,
    selectTab,
    badges,
    incrementBadge,
    groupBadge,
  };
}
