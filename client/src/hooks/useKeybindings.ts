import { useState, useCallback, useEffect } from "react";
import { PANEL_GROUPS } from "../types/panels";
import type { GroupId } from "../types/panels";

const STORAGE_KEY = "coho_keybindings";

export interface KeyBinding {
  action: string;
  label: string;
  key: string;
  defaultKey: string;
  category: "panels" | "gameplay";
}

function getDefaultBindings(): KeyBinding[] {
  const bindings: KeyBinding[] = [];

  // Panel group hotkeys
  for (const group of PANEL_GROUPS) {
    bindings.push({
      action: `group:${group.id}`,
      label: group.label,
      key: group.hotkey,
      defaultKey: group.hotkey,
      category: "panels",
    });
  }

  return bindings;
}

function loadBindings(): KeyBinding[] {
  const defaults = getDefaultBindings();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaults;
    const overrides: Record<string, string> = JSON.parse(stored);
    return defaults.map((b) => ({
      ...b,
      key: overrides[b.action] ?? b.key,
    }));
  } catch {
    return defaults;
  }
}

function saveBindings(bindings: KeyBinding[]) {
  const overrides: Record<string, string> = {};
  for (const b of bindings) {
    if (b.key !== b.defaultKey) {
      overrides[b.action] = b.key;
    }
  }
  if (Object.keys(overrides).length === 0) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  }
}

export function useKeybindings() {
  const [bindings, setBindings] = useState<KeyBinding[]>(loadBindings);

  // Persist on change
  useEffect(() => {
    saveBindings(bindings);
  }, [bindings]);

  const rebind = useCallback((action: string, newKey: string) => {
    setBindings((prev) =>
      prev.map((b) =>
        b.action === action ? { ...b, key: newKey.toUpperCase() } : b,
      ),
    );
  }, []);

  const resetAll = useCallback(() => {
    setBindings(getDefaultBindings());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const resetOne = useCallback((action: string) => {
    setBindings((prev) =>
      prev.map((b) => (b.action === action ? { ...b, key: b.defaultKey } : b)),
    );
  }, []);

  // Look up the key for a group
  const getGroupKey = useCallback(
    (groupId: GroupId): string => {
      const b = bindings.find((b) => b.action === `group:${groupId}`);
      return b?.key ?? "";
    },
    [bindings],
  );

  // Find which group a key maps to (for the keyboard listener)
  const keyToGroup = useCallback(
    (key: string): GroupId | null => {
      const upper = key.toUpperCase();
      const b = bindings.find(
        (b) => b.key === upper && b.action.startsWith("group:"),
      );
      if (!b) return null;
      return b.action.replace("group:", "") as GroupId;
    },
    [bindings],
  );

  // Check for conflicts
  const getConflicts = useCallback((): Map<string, string[]> => {
    const keyMap = new Map<string, string[]>();
    for (const b of bindings) {
      const existing = keyMap.get(b.key) ?? [];
      existing.push(b.action);
      keyMap.set(b.key, existing);
    }
    const conflicts = new Map<string, string[]>();
    for (const [key, actions] of keyMap) {
      if (actions.length > 1) {
        conflicts.set(key, actions);
      }
    }
    return conflicts;
  }, [bindings]);

  return {
    bindings,
    rebind,
    resetAll,
    resetOne,
    getGroupKey,
    keyToGroup,
    getConflicts,
  };
}
