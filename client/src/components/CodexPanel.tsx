import { useState, useEffect } from "react";
import CollapsiblePanel from "./CollapsiblePanel";
import { getStoryCodex } from "../services/api";

const ACT_TITLES: Record<number, string> = {
  1: "Call of Destiny",
  2: "The Rising Storm",
  3: "Quest for Harmony",
  4: "Legacy of the Stars",
};

interface CodexEntry {
  id: string;
  title: string;
  content: string | null;
  chapter: string | null;
  storyOrder: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

interface Props {
  refreshKey?: number;
  bare?: boolean;
}

export default function CodexPanel({ refreshKey, bare }: Props) {
  const [codex, setCodex] = useState<Record<string, CodexEntry[]>>({});
  const [totalEntries, setTotalEntries] = useState(0);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [expandedAct, setExpandedAct] = useState<number | null>(1);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  useEffect(() => {
    getStoryCodex()
      .then(({ data }) => {
        setCodex(data.codex || {});
        setTotalEntries(data.totalEntries || 0);
        setUnlockedCount(data.unlockedCount || 0);
      })
      .catch(() => {
        setCodex({});
      });
  }, [refreshKey]);

  const content = (
    <div className="codex-panel">
      <div className="codex-progress">
        CODEX: {unlockedCount}/{totalEntries} entries
      </div>

      {[1, 2, 3, 4].map((act) => {
        const entries = codex[act] || [];
        const actUnlocked = entries.filter((e) => e.unlocked).length;
        const isExpanded = expandedAct === act;

        return (
          <div key={act} className="codex-act-section">
            <div
              className="codex-act-header"
              onClick={() => setExpandedAct(isExpanded ? null : act)}
            >
              <span className="codex-act-toggle">
                {isExpanded ? "[-]" : "[+]"}
              </span>
              <span className="codex-act-label">
                ACT {act}: {ACT_TITLES[act]}
              </span>
              <span className="codex-act-count">
                {actUnlocked}/{entries.length}
              </span>
            </div>

            {isExpanded && (
              <div className="codex-entries">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`codex-entry ${entry.unlocked ? "codex-entry--unlocked" : "codex-entry--locked"}`}
                  >
                    <div
                      className="codex-entry-header"
                      onClick={() =>
                        entry.unlocked &&
                        setExpandedEntry(
                          expandedEntry === entry.id ? null : entry.id,
                        )
                      }
                      style={{
                        cursor: entry.unlocked ? "pointer" : "default",
                      }}
                    >
                      <span className="codex-entry-order">
                        {entry.storyOrder}.
                      </span>
                      <span className="codex-entry-title">{entry.title}</span>
                      {entry.chapter && entry.unlocked && (
                        <span className="codex-entry-chapter">
                          {entry.chapter}
                        </span>
                      )}
                    </div>

                    {expandedEntry === entry.id && entry.unlocked && (
                      <div className="codex-entry-content">{entry.content}</div>
                    )}

                    {!entry.unlocked && (
                      <div className="codex-entry-locked">
                        Complete mission {entry.storyOrder} to unlock
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return (
    <CollapsiblePanel title="LORE CODEX" badge={unlockedCount || null}>
      {content}
    </CollapsiblePanel>
  );
}
