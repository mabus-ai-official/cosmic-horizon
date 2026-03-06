import { useState, useEffect } from "react";
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
}

interface Contact {
  npcId: string;
  name: string;
  race: string;
  sectorId: number;
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

  if (contacts.length === 0) {
    return <div className="text-muted">No contacts recorded.</div>;
  }

  return (
    <>
      {contacts.map((c) => {
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
        return (
          <div key={c.npcId} className="contact-item">
            <span className="contact-item__name">{c.name}</span>
            <span className="contact-item__detail">
              {" "}
              ({c.race}) - Sector {c.sectorId}
              {timeStr ? ` - ${timeStr}` : ""}
            </span>
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
