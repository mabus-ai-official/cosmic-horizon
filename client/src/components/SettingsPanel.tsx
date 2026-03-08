import { useState } from "react";
import {
  changeUsername,
  changeRace,
  changePassword,
  deleteAccount,
  transitionToMP,
  transitionToSP,
} from "../services/api";

const RACES = [
  { id: "muscarian", name: "Muscarian" },
  { id: "vedic", name: "Vedic" },
  { id: "kalin", name: "Kalin" },
  { id: "tarri", name: "Tar'ri" },
];

interface SettingsPanelProps {
  playerRace?: string;
  playerUsername?: string;
  gameMode?: string;
  volume: number;
  onVolumeChange: (v: number) => void;
  map3D: boolean;
  onToggleMap3D: () => void;
  onLogout: () => void;
  onRefresh: () => void;
}

export default function SettingsPanel({
  playerRace,
  playerUsername,
  gameMode,
  volume,
  onVolumeChange,
  map3D,
  onToggleMap3D,
  onLogout,
  onRefresh,
}: SettingsPanelProps) {
  // Username
  const [newUsername, setNewUsername] = useState("");
  const [usernameMsg, setUsernameMsg] = useState("");
  const [usernameBusy, setUsernameBusy] = useState(false);

  // Race
  const [selectedRace, setSelectedRace] = useState(playerRace || "");
  const [racePassword, setRacePassword] = useState("");
  const [raceMsg, setRaceMsg] = useState("");
  const [raceBusy, setRaceBusy] = useState(false);

  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  // Game Mode
  const [modeMsg, setModeMsg] = useState("");
  const [modeBusy, setModeBusy] = useState(false);

  // Delete
  const [deletePw, setDeletePw] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const handleChangeUsername = async () => {
    if (!newUsername.trim()) return;
    setUsernameBusy(true);
    setUsernameMsg("");
    try {
      const { data } = await changeUsername(newUsername.trim());
      setUsernameMsg(
        `Username changed to "${data.username}". ${data.changesRemaining} change(s) remaining.`,
      );
      setNewUsername("");
    } catch (err: any) {
      setUsernameMsg(err.response?.data?.error || "Failed");
    } finally {
      setUsernameBusy(false);
    }
  };

  const handleChangeRace = async () => {
    if (!racePassword) return;
    if (selectedRace === playerRace) {
      setRaceMsg("Already that race");
      return;
    }
    setRaceBusy(true);
    setRaceMsg("");
    try {
      await changeRace(selectedRace, racePassword);
      setRaceMsg(
        `Race changed to ${RACES.find((r) => r.id === selectedRace)?.name}. All reputation has been reset.`,
      );
      setRacePassword("");
    } catch (err: any) {
      setRaceMsg(err.response?.data?.error || "Failed");
    } finally {
      setRaceBusy(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {
      setPwMsg("Passwords don't match");
      return;
    }
    setPwBusy(true);
    setPwMsg("");
    try {
      await changePassword(currentPw, newPw);
      setPwMsg("Password changed successfully");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: any) {
      setPwMsg(err.response?.data?.error || "Failed");
    } finally {
      setPwBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePw) return;
    setDeleteBusy(true);
    setDeleteMsg("");
    try {
      await deleteAccount(deletePw);
      setDeleteMsg("Account deleted. Redirecting...");
      setTimeout(() => onLogout(), 1500);
    } catch (err: any) {
      setDeleteMsg(err.response?.data?.error || "Failed");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="panel-content settings-panel">
      <h3 className="panel-subheader">Settings</h3>

      {/* Audio */}
      <div className="settings-section">
        <h4 className="settings-section__title">Audio</h4>
        <div className="settings-row">
          <label>Volume</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="settings-slider"
          />
          <span className="settings-value">{Math.round(volume * 100)}%</span>
        </div>
      </div>

      {/* Display */}
      <div className="settings-section">
        <h4 className="settings-section__title">Display</h4>
        <div className="settings-row">
          <label>Galaxy Map</label>
          <button className="btn btn-secondary btn-sm" onClick={onToggleMap3D}>
            {map3D ? "3D" : "2D"} — Click to switch
          </button>
        </div>
      </div>

      {/* Game Mode */}
      <div className="settings-section">
        <h4 className="settings-section__title">Game Mode</h4>
        <p className="settings-hint">
          Current:{" "}
          <strong>
            {gameMode === "singleplayer" ? "Single Player" : "Multiplayer"}
          </strong>
        </p>
        <div className="settings-row">
          <button
            className="btn btn-primary btn-sm"
            disabled={modeBusy}
            onClick={async () => {
              setModeBusy(true);
              setModeMsg("");
              try {
                if (gameMode === "singleplayer") {
                  await transitionToMP(true);
                  setModeMsg("Switched to Multiplayer. Refreshing...");
                } else {
                  await transitionToSP();
                  setModeMsg("Switched to Single Player. Refreshing...");
                }
                setTimeout(() => {
                  onRefresh();
                }, 1000);
              } catch (err: any) {
                setModeMsg(err.response?.data?.error || "Failed");
              } finally {
                setModeBusy(false);
              }
            }}
          >
            {modeBusy
              ? "SWITCHING..."
              : gameMode === "singleplayer"
                ? "SWITCH TO MULTIPLAYER"
                : "SWITCH TO SINGLE PLAYER"}
          </button>
        </div>
        {modeMsg && <p className="settings-msg">{modeMsg}</p>}
      </div>

      {/* Change Username */}
      <div className="settings-section">
        <h4 className="settings-section__title">Change Username</h4>
        <p className="settings-hint">
          Current: <strong>{playerUsername}</strong> (max 3 changes ever)
        </p>
        <div className="settings-row">
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="New username"
            className="settings-input"
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleChangeUsername}
            disabled={usernameBusy || !newUsername.trim()}
          >
            {usernameBusy ? "..." : "CHANGE"}
          </button>
        </div>
        {usernameMsg && <p className="settings-msg">{usernameMsg}</p>}
      </div>

      {/* Change Race */}
      <div className="settings-section">
        <h4 className="settings-section__title">Change Race</h4>
        <p className="settings-hint settings-hint--warning">
          All faction and NPC reputation will be permanently reset.
        </p>
        <div className="settings-row">
          <select
            value={selectedRace}
            onChange={(e) => setSelectedRace(e.target.value)}
            className="settings-select"
          >
            {RACES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.id === playerRace ? " (current)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="settings-row">
          <input
            type="password"
            value={racePassword}
            onChange={(e) => setRacePassword(e.target.value)}
            placeholder="Confirm password"
            className="settings-input"
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleChangeRace}
            disabled={raceBusy || !racePassword || selectedRace === playerRace}
          >
            {raceBusy ? "..." : "CHANGE RACE"}
          </button>
        </div>
        {raceMsg && <p className="settings-msg">{raceMsg}</p>}
      </div>

      {/* Change Password */}
      <div className="settings-section">
        <h4 className="settings-section__title">Change Password</h4>
        <div className="settings-row settings-row--stack">
          <input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            placeholder="Current password"
            className="settings-input"
          />
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="New password (min 8 chars)"
            className="settings-input"
          />
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="Confirm new password"
            className="settings-input"
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleChangePassword}
            disabled={pwBusy || !currentPw || !newPw || !confirmPw}
          >
            {pwBusy ? "..." : "UPDATE PASSWORD"}
          </button>
        </div>
        {pwMsg && <p className="settings-msg">{pwMsg}</p>}
      </div>

      {/* Delete Account */}
      <div className="settings-section settings-section--danger">
        <h4 className="settings-section__title settings-section__title--danger">
          Delete Account
        </h4>
        <p className="settings-hint settings-hint--danger">
          This is permanent. All game data, ships, planets, and progress will be
          destroyed.
        </p>
        {!deleteConfirm ? (
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setDeleteConfirm(true)}
          >
            I WANT TO DELETE MY ACCOUNT
          </button>
        ) : (
          <>
            <div className="settings-row">
              <input
                type="password"
                value={deletePw}
                onChange={(e) => setDeletePw(e.target.value)}
                placeholder="Enter password to confirm"
                className="settings-input"
              />
              <button
                className="btn btn-danger btn-sm"
                onClick={handleDeleteAccount}
                disabled={deleteBusy || !deletePw}
              >
                {deleteBusy ? "DELETING..." : "PERMANENTLY DELETE"}
              </button>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setDeleteConfirm(false);
                setDeletePw("");
                setDeleteMsg("");
              }}
              style={{ marginTop: 4 }}
            >
              CANCEL
            </button>
          </>
        )}
        {deleteMsg && (
          <p className="settings-msg settings-msg--danger">{deleteMsg}</p>
        )}
      </div>
    </div>
  );
}
