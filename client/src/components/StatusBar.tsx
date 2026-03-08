import { useRef, useEffect, useState } from "react";
import type { PlayerState } from "../hooks/useGameState";
import PixelSprite from "./PixelSprite";
import ProfileDropdown from "./ProfileDropdown";

interface StatusBarProps {
  player: PlayerState | null;
  muted?: boolean;
  paused?: boolean;
  onToggleMute?: () => void;
  onTogglePause?: () => void;
  onSkipTrack?: () => void;
  onPrevTrack?: () => void;
  canSkipTrack?: boolean;
  canPrevTrack?: boolean;
  currentTrackId?: string | null;
  onLogout?: () => void;
  onSettings?: () => void;
}

/** Wraps a numeric value with a brief flash on change */
function FlashValue({
  value,
  className,
}: {
  value: number | string;
  className?: string;
}) {
  const prevRef = useRef(value);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    if (prevRef.current !== value) {
      const increased =
        typeof value === "number" &&
        typeof prevRef.current === "number" &&
        value > prevRef.current;
      setFlash(increased ? "status-flash--gain" : "status-flash--loss");
      const t = setTimeout(() => setFlash(""), 600);
      prevRef.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span className={`${className ?? ""} ${flash}`}>
      {typeof value === "number" ? value.toLocaleString() : value}
    </span>
  );
}

export default function StatusBar({
  player,
  muted,
  paused,
  onToggleMute,
  onTogglePause,
  onSkipTrack,
  onPrevTrack,
  canSkipTrack,
  canPrevTrack,
  currentTrackId,
  onLogout,
  onSettings,
}: StatusBarProps) {
  const [showProfile, setShowProfile] = useState(false);

  if (!player) return null;

  const ship = player.currentShip;
  const totalCargo = ship
    ? ship.cyrilliumCargo +
      ship.foodCargo +
      ship.techCargo +
      ship.colonistsCargo
    : 0;

  return (
    <div className="status-bar">
      <div className="status-section" style={{ position: "relative" }}>
        <div className="status-label">PILOT</div>
        <div
          className="status-value status-value--clickable status-value--flicker"
          onClick={() => setShowProfile((prev) => !prev)}
          title="View profile"
          style={
            {
              "--flicker-dur": "28s",
              "--flicker-delay": "0s",
            } as React.CSSProperties
          }
        >
          {player.username}
        </div>
        {showProfile && (
          <ProfileDropdown onClose={() => setShowProfile(false)} />
        )}
      </div>
      <div className="status-section">
        <div className="status-label">
          <PixelSprite spriteKey="icon_nav" size={9} /> SECTOR
        </div>
        <div
          className="status-value status-value--flicker"
          style={
            {
              "--flicker-dur": "36s",
              "--flicker-delay": "9.2s",
            } as React.CSSProperties
          }
        >
          {player.currentSectorId}
        </div>
      </div>
      <div className="status-section">
        <div className="status-label">ENERGY</div>
        <div
          className="status-value status-value--flicker"
          style={
            {
              "--flicker-dur": "44s",
              "--flicker-delay": "16.4s",
            } as React.CSSProperties
          }
        >
          <FlashValue
            value={player.energy}
            className={player.energy < 50 ? "text-warning" : "text-success"}
          />
          /{player.maxEnergy}
        </div>
      </div>
      <div className="status-section">
        <div className="status-label">
          <PixelSprite spriteKey="icon_trade" size={9} /> CREDITS
        </div>
        <div
          className="status-value text-trade status-value--flicker"
          style={
            {
              "--flicker-dur": "32s",
              "--flicker-delay": "26.8s",
            } as React.CSSProperties
          }
        >
          <FlashValue value={player.credits} />
        </div>
      </div>
      {ship && (
        <>
          <div className="status-section">
            <div className="status-label">SHIP</div>
            <div
              className="status-value status-value--flicker"
              style={
                {
                  "--flicker-dur": "40s",
                  "--flicker-delay": "6s",
                } as React.CSSProperties
              }
            >
              <PixelSprite spriteKey={`ship_${ship.shipTypeId}`} size={12} />{" "}
              {ship.shipTypeId}
            </div>
          </div>
          <div className="status-section">
            <div className="status-label">
              <PixelSprite spriteKey="icon_combat" size={9} /> WEAPONS
            </div>
            <div
              className="status-value text-combat status-value--flicker"
              style={
                {
                  "--flicker-dur": "24s",
                  "--flicker-delay": "32.8s",
                } as React.CSSProperties
              }
            >
              {ship.weaponEnergy}
            </div>
          </div>
          <div className="status-section">
            <div className="status-label">ENGINES</div>
            <div
              className="status-value status-value--flicker"
              style={
                {
                  "--flicker-dur": "48s",
                  "--flicker-delay": "15.6s",
                } as React.CSSProperties
              }
            >
              {ship.engineEnergy}
            </div>
          </div>
          <div className="status-section">
            <div className="status-label">HULL</div>
            <div
              className="status-value status-value--flicker"
              style={
                {
                  "--flicker-dur": "28s",
                  "--flicker-delay": "40.4s",
                } as React.CSSProperties
              }
            >
              <FlashValue
                value={ship.hullHp}
                className={`${ship.hullHp < ship.maxHullHp * 0.25 ? "text-error hull-critical" : ship.hullHp < ship.maxHullHp * 0.5 ? "text-warning" : "text-success"}`}
              />
              /{ship.maxHullHp}
            </div>
          </div>
          <div className="status-section">
            <div className="status-label">CARGO</div>
            <div
              className="status-value status-value--flicker"
              style={
                {
                  "--flicker-dur": "36s",
                  "--flicker-delay": "22s",
                } as React.CSSProperties
              }
            >
              {totalCargo}/{ship.maxCargoHolds}
            </div>
          </div>
        </>
      )}
      {player.dockedAtOutpostId && (
        <div className="status-section">
          <div className="status-label">STATUS</div>
          <div className="status-value text-success">DOCKED</div>
        </div>
      )}
      {player.walletAddress && (
        <div className="status-section">
          <div className="status-label">WALLET</div>
          <div className="status-value text-success">
            {player.walletAddress.slice(0, 6)}...
            {player.walletAddress.slice(-4)}
          </div>
        </div>
      )}
      <div className="status-bar__actions">
        <div className="audio-controls">
          {onToggleMute && (
            <button
              className="audio-controls__btn"
              onClick={onToggleMute}
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? "\u{1F507}" : "\u{1F50A}"}
            </button>
          )}
          {canPrevTrack && onPrevTrack && (
            <button
              className="audio-controls__btn"
              onClick={onPrevTrack}
              title="Previous track"
            >
              &#x23EE;
            </button>
          )}
          {onTogglePause && currentTrackId && (
            <button
              className="audio-controls__btn"
              onClick={onTogglePause}
              title={paused ? "Play" : "Pause"}
            >
              {paused ? "\u25B6" : "\u23F8"}
            </button>
          )}
          {canSkipTrack && onSkipTrack && (
            <button
              className="audio-controls__btn"
              onClick={onSkipTrack}
              title={
                currentTrackId ? `Now: ${currentTrackId} — skip` : "Next track"
              }
            >
              &#x23ED;
            </button>
          )}
        </div>
        {onSettings && (
          <button
            className="audio-toggle"
            onClick={onSettings}
            title="Settings"
          >
            SETTINGS
          </button>
        )}
        {onLogout && (
          <button
            className="audio-toggle audio-toggle--logout"
            onClick={onLogout}
            title="Logout"
          >
            LOGOUT
          </button>
        )}
      </div>
    </div>
  );
}
