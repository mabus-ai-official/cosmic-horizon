import { useState, useEffect, useMemo } from "react";
import CollapsiblePanel from "./CollapsiblePanel";
import PixelSprite from "./PixelSprite";
import NPCDialogueView from "./NPCDialogueView";
import { getContacts, getFactionReps } from "../services/api";
import type { SectorState } from "../hooks/useGameState";

interface NPC {
  id: string;
  name: string;
  title: string;
  race: string;
  encountered: boolean;
  disposition?: number;
  faction?: string;
  factionId?: string | null;
  factionName?: string | null;
  locationType?: string;
  isKeyNpc?: boolean;
  reputation?: number;
  services?: string[];
}

interface Contact {
  npcId: string;
  name: string;
  title?: string | null;
  race: string;
  factionId?: string | null;
  factionName?: string | null;
  sectorId: number;
  reputation?: number;
  lastVisited: string | null;
}

const TIER_COLORS: Record<string, string> = {
  Idolized: "#58a6ff",
  Vilified: "#8b0000",
  Liked: "#3fb950",
  Hated: "#f85149",
  Mixed: "#f0883e",
  Accepted: "#6e7681",
  Shunned: "#bd5b00",
  Neutral: "#484f58",
};

interface Props {
  sector: SectorState | null;
  refreshKey?: number;
  bare?: boolean;
  onCommand?: (cmd: string) => void;
}

type TabView = "npcs" | "contacts";

const RACE_SPRITE_MAP: Record<string, string> = {
  muscarian: "npc_muscarian",
  vedic: "npc_vedic",
  kalin: "npc_kalin",
  tarri: "npc_tarri",
};

const SERVICE_LABELS: Record<string, { label: string; color: string }> = {
  trade: { label: "TRADE", color: "#d29922" },
  vendor: { label: "VENDOR", color: "#d29922" },
  quest: { label: "QUEST", color: "#58a6ff" },
  intel: { label: "INTEL", color: "#a371f7" },
  repair: { label: "REPAIR", color: "#3fb950" },
  bounty: { label: "BOUNTY", color: "#f85149" },
  transport: { label: "TRANSPORT", color: "#56d4dd" },
  hire: { label: "HIRE", color: "#f0883e" },
};

const LOCATION_LABELS: Record<string, string> = {
  outpost: "At Outpost",
  planet: "On Planet",
  sector: "In Space",
};

function getDispositionDots(level: number) {
  const dots = [];
  for (let i = 1; i <= 5; i++) {
    let cls = "npc-disposition__dot";
    if (i <= level) {
      if (level <= 2) cls += " npc-disposition__dot--filled-hostile";
      else if (level === 3) cls += " npc-disposition__dot--filled-neutral";
      else cls += " npc-disposition__dot--filled-friendly";
    }
    dots.push(<span key={i} className={cls} />);
  }
  return dots;
}

// Named exports for use in CrewGroupPanel
export function NPCList({
  sector,
  onCommand: _onCommand,
  autoTalkNpcId,
}: {
  sector: SectorState | null;
  onCommand?: (cmd: string) => void;
  autoTalkNpcId?: string | null;
}) {
  const npcs: NPC[] = (sector?.npcs || []) as NPC[];
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);
  const [factionTiers, setFactionTiers] = useState<Record<string, string>>({});

  useEffect(() => {
    getFactionReps()
      .then(({ data }) => {
        const map: Record<string, string> = {};
        for (const f of data.factions || []) map[f.factionName] = f.tier;
        setFactionTiers(map);
      })
      .catch(() => {});
  }, []);

  // Auto-start dialogue when directed externally
  useEffect(() => {
    if (autoTalkNpcId && npcs.some((n) => n.id === autoTalkNpcId)) {
      setActiveNpcId(autoTalkNpcId);
    }
  }, [autoTalkNpcId]);

  const activeNpc = npcs.find((n) => n.id === activeNpcId);

  if (activeNpc) {
    return (
      <NPCDialogueView
        npcId={activeNpc.id}
        npcName={activeNpc.name}
        npcTitle={activeNpc.title}
        onClose={() => setActiveNpcId(null)}
      />
    );
  }

  if (npcs.length === 0) {
    return <div className="text-muted">No NPCs in this sector.</div>;
  }

  return (
    <>
      {npcs.map((npc) => {
        const spriteKey = RACE_SPRITE_MAP[npc.race] || "npc_generic_a";
        const factionDisplay = npc.factionName || npc.faction;
        const factionTier = factionDisplay
          ? factionTiers[factionDisplay]
          : null;
        const services = npc.services || [];
        const locationLabel =
          LOCATION_LABELS[npc.locationType || "sector"] || "In Space";

        return (
          <div
            key={npc.id}
            className="npc-list-item"
            style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}
          >
            {/* Top row: sprite + name + talk button */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PixelSprite spriteKey={spriteKey} size={24} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span className="npc-list-item__name">{npc.name}</span>
                  {npc.isKeyNpc && (
                    <span
                      style={{
                        color: "#d29922",
                        fontSize: "9px",
                        fontWeight: "bold",
                      }}
                    >
                      KEY
                    </span>
                  )}
                </div>
                {npc.title && (
                  <div style={{ fontSize: "10px", color: "#8899bb" }}>
                    {npc.title}
                  </div>
                )}
              </div>
              <button
                className="btn-sm btn-buy"
                onClick={() => setActiveNpcId(npc.id)}
              >
                TALK
              </button>
            </div>

            {/* Details row */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "4px 10px",
                fontSize: "10px",
                paddingLeft: 30,
              }}
            >
              {/* Race */}
              <span style={{ color: "#6e7681" }}>{npc.race}</span>

              {/* Location */}
              <span style={{ color: "#6e7681" }}>{locationLabel}</span>

              {/* Faction + standing */}
              {factionDisplay && (
                <span
                  style={{
                    color:
                      factionTier && factionTier !== "Neutral"
                        ? TIER_COLORS[factionTier] || "#6e7681"
                        : "#6e7681",
                  }}
                >
                  {factionDisplay}
                  {factionTier && factionTier !== "Neutral" && (
                    <span style={{ marginLeft: 3 }}>[{factionTier}]</span>
                  )}
                </span>
              )}

              {/* Disposition */}
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 1 }}
              >
                {getDispositionDots(npc.disposition ?? 3)}
              </span>
            </div>

            {/* Services tags */}
            {services.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 3,
                  paddingLeft: 30,
                }}
              >
                {services.map((svc) => {
                  const info = SERVICE_LABELS[svc] || {
                    label: svc.toUpperCase(),
                    color: "#6e7681",
                  };
                  return (
                    <span
                      key={svc}
                      style={{
                        fontSize: "8px",
                        padding: "1px 4px",
                        border: `1px solid ${info.color}44`,
                        color: info.color,
                        borderRadius: 2,
                        letterSpacing: "0.5px",
                      }}
                    >
                      {info.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export function ContactsList({ refreshKey }: { refreshKey?: number }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [locatedNpcId, setLocatedNpcId] = useState<string | null>(null);

  useEffect(() => {
    getContacts()
      .then(({ data }) => {
        const list = (data.contacts || []).sort(
          (a: Contact, b: Contact) =>
            new Date(b.lastVisited || 0).getTime() -
            new Date(a.lastVisited || 0).getTime(),
        );
        setContacts(list);
      })
      .catch(() => setContacts([]));
  }, [refreshKey]);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.race && c.race.toLowerCase().includes(q)) ||
        (c.factionName && c.factionName.toLowerCase().includes(q)) ||
        String(c.sectorId).includes(q),
    );
  }, [contacts, search]);

  if (contacts.length === 0) {
    return <div className="text-muted">No contacts recorded.</div>;
  }

  return (
    <>
      <div style={{ marginBottom: 6 }}>
        <input
          type="text"
          className="chat-input"
          placeholder="Filter contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "4px 6px",
            fontSize: "11px",
            background: "var(--bg-secondary, #1a1a2e)",
            border: "1px solid var(--border, #333)",
            color: "var(--text-primary, #ccc)",
            borderRadius: "3px",
          }}
        />
      </div>
      {filtered.length === 0 && (
        <div className="text-muted">No contacts match "{search}".</div>
      )}
      {filtered.map((c) => {
        let timeStr = "";
        if (c.lastVisited) {
          const ago = Date.now() - new Date(c.lastVisited).getTime();
          const mins = Math.floor(ago / 60000);
          const hrs = Math.floor(mins / 60);
          const days = Math.floor(hrs / 24);
          timeStr =
            days > 0
              ? `${days}d ago`
              : hrs > 0
                ? `${hrs}h ago`
                : `${mins}m ago`;
        }
        const isLocated = locatedNpcId === c.npcId;
        const spriteKey = RACE_SPRITE_MAP[c.race] || "npc_generic_a";
        return (
          <div
            key={c.npcId}
            className="contact-item"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 0",
            }}
          >
            <PixelSprite spriteKey={spriteKey} size={16} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="contact-item__name">{c.name}</span>
              <span className="contact-item__detail">
                {" "}
                ({c.race}){c.factionName ? ` - ${c.factionName}` : ""}
                {timeStr ? ` - ${timeStr}` : ""}
              </span>
              {isLocated && (
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--green, #0f0)",
                    marginTop: 1,
                  }}
                >
                  Located in Sector {c.sectorId}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
              <button
                className="btn-sm"
                onClick={() => setLocatedNpcId(isLocated ? null : c.npcId)}
                style={{
                  fontSize: "10px",
                  padding: "2px 6px",
                  color: isLocated
                    ? "var(--green, #0f0)"
                    : "var(--text-secondary, #888)",
                  borderColor: isLocated
                    ? "var(--green, #0f0)"
                    : "var(--text-secondary, #888)",
                }}
              >
                LOCATE
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}

export default function NPCsPanel({
  sector,
  refreshKey,
  bare,
  onCommand,
}: Props) {
  const [tab, setTab] = useState<TabView>("npcs");

  const tabBar = (
    <div className="group-panel-tabs">
      <span
        onClick={() => setTab("npcs")}
        style={{ cursor: "pointer", color: tab === "npcs" ? "#0f0" : "#666" }}
      >
        {tab === "npcs" ? "[NPCs]" : "NPCs"}
      </span>
      <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
      <span
        onClick={() => setTab("contacts")}
        style={{
          cursor: "pointer",
          color: tab === "contacts" ? "#0f0" : "#666",
        }}
      >
        {tab === "contacts" ? "[Contacts]" : "Contacts"}
      </span>
    </div>
  );

  const content = (
    <>
      {tabBar}
      {tab === "npcs" ? (
        <NPCList sector={sector} onCommand={onCommand} />
      ) : (
        <ContactsList refreshKey={refreshKey} />
      )}
    </>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return <CollapsiblePanel title="NPCs">{content}</CollapsiblePanel>;
}
