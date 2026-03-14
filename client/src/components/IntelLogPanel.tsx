import { useState, useEffect, useMemo } from "react";
import CollapsiblePanel from "./CollapsiblePanel";
import { getIntelLog } from "../services/api";

interface IntelEntry {
  id: string;
  npcId: string;
  npcName: string;
  npcTitle: string | null;
  text: string;
  nodeKey: string;
  timestamp: string;
  createdAt: string;
}

interface Props {
  refreshKey?: number;
  bare?: boolean;
}

export default function IntelLogPanel({ refreshKey, bare }: Props) {
  const [entries, setEntries] = useState<IntelEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getIntelLog()
      .then(({ data }) => setEntries(data.entries || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      (e) =>
        e.npcName.toLowerCase().includes(q) ||
        (e.npcTitle && e.npcTitle.toLowerCase().includes(q)) ||
        e.text.toLowerCase().includes(q),
    );
  }, [entries, search]);

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return (
      d.toLocaleDateString() +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const content = (
    <div className="panel-sections">
      <div className="panel-section">
        <div className="panel-section__header panel-section__header--muted">
          Search
        </div>
        <div className="intel-panel__search-row">
          <input
            className="intel-panel__input"
            type="text"
            placeholder="Search intel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="panel-section panel-section--accent">
        <div className="panel-section__header">Intel ({filtered.length})</div>
        {loading ? (
          <div className="text-muted">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-muted">
            {entries.length === 0
              ? "No intel recorded yet. Talk to NPCs to gather information."
              : "No matches found."}
          </div>
        ) : (
          <div className="intel-panel__list">
            {filtered.map((e) => (
              <div key={e.id} className="intel-entry">
                <div className="intel-entry__header">
                  <span className="intel-entry__npc">{e.npcName}</span>
                  {e.npcTitle && (
                    <span className="intel-entry__title">{e.npcTitle}</span>
                  )}
                  <span className="intel-entry__time">
                    {formatTimestamp(e.timestamp)}
                  </span>
                </div>
                <div className="intel-entry__text">{e.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return (
    <CollapsiblePanel title="INTEL LOG" badge={entries.length || null}>
      {content}
    </CollapsiblePanel>
  );
}
