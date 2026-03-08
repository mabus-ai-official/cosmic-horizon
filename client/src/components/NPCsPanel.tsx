import { useState, useEffect, useMemo } from "react";
import CollapsiblePanel from "./CollapsiblePanel";
import PixelSprite from "./PixelSprite";
import NPCDialogueView from "./NPCDialogueView";
import { getContacts, getFactionReps, talkToNPC } from "../services/api";
import type { SectorState } from "../hooks/useGameState";

interface NPC {
  id: string;
  name: string;
  title: string;
  race: string;
  encountered: boolean;
  disposition?: number;
  faction?: string;
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
        return (
          <div key={npc.id} className="npc-list-item">
            <div className="npc-list-item__info">
              <PixelSprite spriteKey={spriteKey} size={20} />
              <div className="npc-list-item__text">
                <span className="npc-list-item__name">{npc.name}</span>
                <span className="npc-list-item__title">
                  {npc.title}
                  {npc.faction ? ` - ${npc.faction}` : ""}
                  {npc.faction &&
                    factionTiers[npc.faction] &&
                    factionTiers[npc.faction] !== "Neutral" && (
                      <span
                        className="faction-rep-tier"
                        style={{
                          color:
                            TIER_COLORS[factionTiers[npc.faction]] || "#484f58",
                          marginLeft: 4,
                        }}
                      >
                        [{factionTiers[npc.faction]}]
                      </span>
                    )}
                </span>
                <div className="npc-disposition">
                  {getDispositionDots(npc.disposition ?? 3)}
                </div>
              </div>
            </div>
            <button
              className="btn-sm btn-buy"
              onClick={() => setActiveNpcId(npc.id)}
            >
              TALK
            </button>
          </div>
        );
      })}
    </>
  );
}

export function ContactsList({ refreshKey }: { refreshKey?: number }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [talkingTo, setTalkingTo] = useState<Contact | null>(null);
  const [locatedNpcId, setLocatedNpcId] = useState<string | null>(null);
  const [inlineDialogue, setInlineDialogue] = useState<{
    npcId: string;
    text: string;
    options: Array<{
      label: string;
      index: number;
      locked: boolean;
      lockReason?: string;
    }>;
    ended: boolean;
  } | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [inlineLoading, setInlineLoading] = useState(false);

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

  const handleTalk = async (contact: Contact, choiceIndex?: number) => {
    setInlineLoading(true);
    setInlineError(null);
    try {
      const { data } = await talkToNPC(contact.npcId, choiceIndex);
      setTalkingTo(contact);
      setInlineDialogue({
        npcId: contact.npcId,
        text: data.text || data.dialogue || data.message || "",
        options: (data.options || data.choices || []).map(
          (opt: any, i: number) => ({
            label: typeof opt === "string" ? opt : opt.label || opt.text,
            index: typeof opt === "string" ? i : (opt.index ?? i),
            locked: opt.locked || false,
            lockReason: opt.lockReason,
          }),
        ),
        ended: data.isEnd || data.ended || false,
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to contact NPC";
      setInlineError(msg);
      setTalkingTo(contact);
      setInlineDialogue(null);
    } finally {
      setInlineLoading(false);
    }
  };

  const handleEndConversation = () => {
    setTalkingTo(null);
    setInlineDialogue(null);
    setInlineError(null);
  };

  // If actively talking to a contact, show inline dialogue
  if (talkingTo) {
    return (
      <div className="contact-dialogue">
        <div className="npc-dialogue__header">
          <div className="npc-dialogue__name">{talkingTo.name}</div>
          {talkingTo.title && (
            <div className="npc-dialogue__title">{talkingTo.title}</div>
          )}
          <div className="text-muted" style={{ fontSize: "10px" }}>
            Sector {talkingTo.sectorId}
            {talkingTo.factionName ? ` - ${talkingTo.factionName}` : ""}
          </div>
        </div>

        {inlineError && (
          <div className="mall-error" style={{ marginTop: 4 }}>
            {inlineError}
          </div>
        )}

        {inlineLoading && <div className="text-muted">...</div>}

        {inlineDialogue && !inlineLoading && (
          <>
            <div className="npc-dialogue__text">{inlineDialogue.text}</div>
            <div className="npc-dialogue__options">
              {inlineDialogue.options.map((opt) => (
                <button
                  key={opt.index}
                  className="npc-dialogue__option"
                  disabled={opt.locked}
                  title={opt.locked ? opt.lockReason : undefined}
                  onClick={() => handleTalk(talkingTo, opt.index)}
                  style={opt.locked ? { opacity: 0.5 } : undefined}
                >
                  {opt.label}
                  {opt.locked && opt.lockReason ? ` (${opt.lockReason})` : ""}
                </button>
              ))}
            </div>
          </>
        )}

        <button
          className="btn-sm"
          onClick={handleEndConversation}
          style={{
            marginTop: "8px",
            color: "var(--text-secondary)",
            borderColor: "var(--text-secondary)",
          }}
        >
          {inlineDialogue?.ended || inlineError
            ? "[End conversation]"
            : "[Leave]"}
        </button>
      </div>
    );
  }

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
                className="btn-sm btn-buy"
                onClick={() => handleTalk(c)}
                style={{ fontSize: "10px", padding: "2px 6px" }}
              >
                TALK
              </button>
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
