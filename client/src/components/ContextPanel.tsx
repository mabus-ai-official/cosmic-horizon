import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";
import PixelSprite from "./PixelSprite";
import { getInventory, getFactionReps } from "../services/api";
import type { PlayerState } from "../hooks/useGameState";
import type { ChatMessage, ChatChannel } from "./SectorChatPanel";
import {
  xpProgressPercent,
  xpToNextLevel,
  getNextMilestone,
} from "../config/progression";

interface ContextPanelProps {
  player: PlayerState | null;
  chatMessages: ChatMessage[];
  onChatSend: (message: string, channel: ChatChannel) => void;
  onCommand: (cmd: string) => void;
  hasSyndicate: boolean;
  hasAlliance: boolean;
  refreshKey?: number;
}

const RACE_COLORS: Record<string, string> = {
  muscarian: "#a371f7",
  vedic: "#58a6ff",
  kalin: "#8b949e",
  tarri: "#f0883e",
};

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

export default function ContextPanel({
  player,
  chatMessages,
  onChatSend,
  onCommand,
  hasSyndicate,
  hasAlliance,
  refreshKey,
}: ContextPanelProps) {
  const [chatInput, setChatInput] = useState("");
  const [chatChannel, setChatChannel] = useState<ChatChannel>("sector");
  const [cmdInput, setCmdInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [cmdHistoryIdx, setCmdHistoryIdx] = useState(-1);
  const chatListRef = useRef<HTMLDivElement>(null);
  const [confirmDestruct, setConfirmDestruct] = useState(0); // 0=none, 1=first, 2=confirmed
  const [hasRache, setHasRache] = useState(false);
  const [factionReps, setFactionReps] = useState<
    Array<{
      factionId: string;
      factionName: string;
      fame: number;
      infamy: number;
      tier: string;
    }>
  >([]);

  // Check inventory for Rache Device
  useEffect(() => {
    getInventory()
      .then(({ data }) => {
        const items = data.inventory || [];
        setHasRache(items.some((i: any) => i.itemId === "rache_device"));
      })
      .catch(() => setHasRache(false));
  }, [refreshKey]);

  // Load faction standings
  useEffect(() => {
    getFactionReps()
      .then(({ data }) => setFactionReps(data.factions || []))
      .catch(() => setFactionReps([]));
  }, [refreshKey]);

  const [showEmoji, setShowEmoji] = useState(false);
  const userScrolledUp = useRef(false);

  // Smart scroll: only auto-scroll if user hasn't scrolled up to read history
  useEffect(() => {
    if (chatListRef.current && !userScrolledUp.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [chatMessages.length]);

  const handleChatScroll = useCallback(() => {
    const el = chatListRef.current;
    if (!el) return;
    // If scrolled more than 30px from bottom, user is reading history
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    userScrolledUp.current = !atBottom;
  }, []);

  const handleChatSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const msg = chatInput.trim();
      if (!msg) return;
      onChatSend(msg, chatChannel);
      setChatInput("");
    },
    [chatInput, onChatSend, chatChannel],
  );

  const handleCmdKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && cmdInput.trim()) {
      onCommand(cmdInput.trim());
      setCmdHistory((prev) => [cmdInput.trim(), ...prev]);
      setCmdInput("");
      setCmdHistoryIdx(-1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdHistoryIdx < cmdHistory.length - 1) {
        const newIdx = cmdHistoryIdx + 1;
        setCmdHistoryIdx(newIdx);
        setCmdInput(cmdHistory[newIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (cmdHistoryIdx > 0) {
        const newIdx = cmdHistoryIdx - 1;
        setCmdHistoryIdx(newIdx);
        setCmdInput(cmdHistory[newIdx]);
      } else {
        setCmdHistoryIdx(-1);
        setCmdInput("");
      }
    }
  };

  const ship = player?.currentShip;
  const raceColor = RACE_COLORS[player?.race || ""] || "#8b949e";

  // Ship HP bar
  const hullPct = ship ? Math.round((ship.hullHp / ship.maxHullHp) * 100) : 0;
  const hullColor =
    hullPct < 25
      ? "var(--red)"
      : hullPct < 50
        ? "var(--orange)"
        : "var(--green)";

  // Cargo
  const totalCargo = ship
    ? ship.cyrilliumCargo +
      ship.foodCargo +
      ship.techCargo +
      ship.colonistsCargo
    : 0;
  const cargoPct =
    ship && ship.maxCargoHolds > 0
      ? Math.round((totalCargo / ship.maxCargoHolds) * 100)
      : 0;

  // Chat channels — sector and galaxy always visible
  const channels: { key: ChatChannel; label: string; show: boolean }[] = [
    { key: "sector", label: "Sector", show: true },
    { key: "galaxy", label: "Galaxy", show: true },
    { key: "syndicate", label: "Synd", show: hasSyndicate },
    { key: "alliance", label: "Ally", show: hasAlliance },
  ];
  const visibleChannels = channels.filter((c) => c.show);
  const channelMessages = chatMessages.filter(
    (m) => (m.channel || "sector") === chatChannel,
  );

  return (
    <div className="context-panel">
      {/* Player Profile */}
      <div className="profile-section">
        <div className="profile-portrait" style={{ borderColor: raceColor }}>
          <div
            className="profile-portrait__silhouette"
            style={{ color: raceColor }}
          >
            {player?.race ? player.race.charAt(0).toUpperCase() : "?"}
          </div>
        </div>
        <div className="profile-section__info">
          <div className="profile-section__name">
            {player?.username || "---"}
          </div>
          <div className="profile-section__race" style={{ color: raceColor }}>
            {player?.race || "Unknown"}
          </div>
          <div className="profile-section__credits">
            <span className="text-trade">
              {player?.credits?.toLocaleString() ?? 0}
            </span>{" "}
            cr
          </div>
        </div>
      </div>

      {/* Level & XP Progress */}
      {player && player.level > 0 && (
        <div className="xp-section">
          <div className="xp-section__header">
            <span className="xp-section__level">LVL {player.level}</span>
            {player.loginStreak > 0 && (
              <span
                className="xp-section__streak"
                title={`${player.loginStreak} day login streak`}
              >
                {player.loginStreak}d
              </span>
            )}
            <span className="xp-section__rank">{player.rank}</span>
          </div>
          <div className="ctx-bar">
            <div
              className="ctx-bar__fill ctx-bar__fill--xp"
              style={{
                width: `${xpProgressPercent(player.level, player.xp)}%`,
              }}
            />
          </div>
          <div className="xp-section__detail">
            <span>
              {xpToNextLevel(player.level, player.xp).toLocaleString()} XP to
              next
            </span>
            {(() => {
              const next = getNextMilestone(player.level);
              return next ? (
                <span className="xp-section__next">
                  Lvl {next.level}: {next.reward}
                </span>
              ) : null;
            })()}
          </div>
        </div>
      )}

      {/* Faction Standing */}
      {factionReps.length > 0 && (
        <div className="faction-rep-section">
          <div className="faction-rep-header">FACTION STANDING</div>
          {factionReps.map((f) => (
            <div key={f.factionId} className="faction-rep-row">
              <span className="faction-rep-name">{f.factionName}</span>
              <span
                className="faction-rep-tier"
                style={{ color: TIER_COLORS[f.tier] || "#484f58" }}
              >
                {f.tier}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Energy bar */}
      <div className="ctx-bar-section">
        <div className="ctx-bar-label">
          <span>Energy</span>
          <span>
            {player?.energy ?? 0}/{player?.maxEnergy ?? 100}
          </span>
        </div>
        <div className="ctx-bar">
          <div
            className="ctx-bar__fill ctx-bar__fill--energy"
            style={{
              width: `${player ? Math.round((player.energy / player.maxEnergy) * 100) : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Ship Card */}
      {ship && (
        <div className="ship-card">
          <div className="ship-card__header">
            <PixelSprite
              spriteKey={`ship_${ship.shipTypeId}`}
              size={36}
              className="ship-status-sprite ship-status-sprite--breathing"
            />
            <div className="ship-card__header-info">
              <div className="ship-card__type">{ship.shipTypeId}</div>
              <div className="ship-card__stats-row">
                <span className="text-combat" title="Weapon Energy">
                  W:{ship.weaponEnergy}
                </span>
                <span className="text-system" title="Engine Energy">
                  E:{ship.engineEnergy}
                </span>
              </div>
            </div>
          </div>

          {/* Hull bar */}
          <div className="ctx-bar-section">
            <div className="ctx-bar-label">
              <span>Hull</span>
              <span style={{ color: hullColor }}>
                {ship.hullHp}/{ship.maxHullHp}
              </span>
            </div>
            <div className="ctx-bar">
              <div
                className="ctx-bar__fill"
                style={{ width: `${hullPct}%`, background: hullColor }}
              />
            </div>
          </div>

          {/* Cargo bar */}
          <div className="ctx-bar-section">
            <div className="ctx-bar-label">
              <span>Cargo</span>
              <span>
                {totalCargo}/{ship.maxCargoHolds}
              </span>
            </div>
            <div className="ctx-bar">
              <div
                className="ctx-bar__fill ctx-bar__fill--cargo"
                style={{ width: `${Math.min(100, cargoPct)}%` }}
              />
            </div>
            {totalCargo > 0 && (
              <div className="ship-card__cargo-breakdown">
                {ship.cyrilliumCargo > 0 && (
                  <span className="cargo-item--cyr">
                    Cyr:{ship.cyrilliumCargo}
                  </span>
                )}
                {ship.foodCargo > 0 && (
                  <span className="cargo-item--food">Fd:{ship.foodCargo}</span>
                )}
                {ship.techCargo > 0 && (
                  <span className="cargo-item--tech">Tc:{ship.techCargo}</span>
                )}
                {ship.colonistsCargo > 0 && (
                  <span className="cargo-item--col">
                    Co:{ship.colonistsCargo}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Self-Destruct — requires Rache Device in inventory */}
          <button
            className={`btn-self-destruct${confirmDestruct > 0 ? " btn-self-destruct--active" : ""}`}
            disabled={!hasRache}
            title={
              hasRache
                ? "Detonate Rache Device — destroys your ship and damages all ships in sector"
                : "Requires a Rache Device (buy at Star Mall store)"
            }
            onClick={() => {
              if (!hasRache) return;
              if (confirmDestruct === 0) {
                setConfirmDestruct(1);
                return;
              }
              if (confirmDestruct === 1) {
                setConfirmDestruct(2);
                return;
              }
              onCommand("use rache_device");
              setConfirmDestruct(0);
            }}
            onBlur={() => setConfirmDestruct(0)}
          >
            {confirmDestruct === 0
              ? "SELF-DESTRUCT"
              : confirmDestruct === 1
                ? "ARE YOU SURE?"
                : "CONFIRM DESTRUCT"}
          </button>
        </div>
      )}

      {/* Mini Chat */}
      <div className="mini-chat">
        <div className="ctx-section-header">
          <span className="ctx-section-header__label">CHAT</span>
          <span className="ctx-section-header__channels">
            {visibleChannels.map((c, i) => (
              <span key={c.key}>
                {i > 0 && <span style={{ color: "#333" }}> | </span>}
                <span
                  onClick={() => setChatChannel(c.key)}
                  style={{
                    cursor: "pointer",
                    color:
                      chatChannel === c.key
                        ? c.key === "sector"
                          ? "#0f0"
                          : c.key === "galaxy"
                            ? "var(--yellow)"
                            : c.key === "syndicate"
                              ? "var(--magenta)"
                              : "var(--cyan)"
                        : "#555",
                    fontSize: 10,
                    fontWeight: chatChannel === c.key ? "bold" : "normal",
                  }}
                >
                  {chatChannel === c.key ? `[${c.label}]` : c.label}
                </span>
              </span>
            ))}
          </span>
        </div>
        <div
          className="mini-chat__messages"
          ref={chatListRef}
          onScroll={handleChatScroll}
        >
          {channelMessages.length === 0 ? (
            <div className="text-muted" style={{ fontSize: 10 }}>
              No messages
            </div>
          ) : (
            channelMessages.map((m) => (
              <div
                key={m.id}
                className={`mini-chat__msg${m.isOwn ? " mini-chat__msg--own" : ""}`}
              >
                <span className="mini-chat__sender">[{m.senderName}]</span>{" "}
                {m.message}
              </div>
            ))
          )}
        </div>
        <form className="mini-chat__input" onSubmit={handleChatSubmit}>
          <div className="mini-chat__input-row">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`${chatChannel} message...`}
              maxLength={500}
            />
            <button
              type="button"
              className="mini-chat__emoji-btn"
              onClick={() => setShowEmoji((v) => !v)}
              title="Emoji"
            >
              😀
            </button>
          </div>
        </form>
        {showEmoji && (
          <div className="mini-chat__emoji-grid">
            {[
              "😀",
              "😂",
              "🔥",
              "💀",
              "👍",
              "👎",
              "🚀",
              "⚔️",
              "💰",
              "🛡️",
              "⭐",
              "❤️",
              "😎",
              "🤔",
              "😈",
              "💎",
              "🎯",
              "⚡",
              "🏴‍☠️",
              "🌌",
            ].map((e) => (
              <button
                key={e}
                type="button"
                className="mini-chat__emoji-item"
                onClick={() => {
                  setChatInput((prev) => prev + e);
                  setShowEmoji(false);
                }}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Command Input */}
      <div className="cmd-input-section">
        <div className="ctx-section-header">
          <span className="ctx-section-header__label">COMMAND</span>
        </div>
        <div className="cmd-input-row">
          <span className="cmd-prompt">&gt;</span>
          <input
            className="cmd-input"
            value={cmdInput}
            onChange={(e) => setCmdInput(e.target.value)}
            onKeyDown={handleCmdKeyDown}
            placeholder="Command..."
          />
        </div>
      </div>
    </div>
  );
}
