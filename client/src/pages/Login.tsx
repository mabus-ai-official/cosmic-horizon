import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { transitionToMP, transitionToSP } from "../services/api";

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<any>;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [gameMode, setGameMode] = useState<"multiplayer" | "singleplayer">(
    "multiplayer",
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const player = await onLogin(username, password);
      const currentMode = player?.gameMode || "multiplayer";

      // Switch mode if needed
      if (currentMode !== gameMode) {
        try {
          if (gameMode === "singleplayer") {
            await transitionToSP();
          } else {
            await transitionToMP(true);
          }
        } catch (err: any) {
          // Non-fatal — still navigate to game
          console.warn("Mode transition failed:", err.response?.data?.error);
        }
      }

      navigate("/game");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <img src="/logo.png" alt="Cosmic Horizon" className="auth-logo" />
        <p className="auth-subtitle">Sector Terminal Access</p>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          <div className="auth-field">
            <label>Username or Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label>Game Mode</label>
            <div
              className="game-mode-toggle"
              style={{ display: "flex", gap: "8px", marginTop: "4px" }}
            >
              <button
                type="button"
                className={`btn ${gameMode === "multiplayer" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setGameMode("multiplayer")}
                style={{ flex: 1 }}
              >
                MULTIPLAYER
              </button>
              <button
                type="button"
                className={`btn ${gameMode === "singleplayer" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setGameMode("singleplayer")}
                style={{ flex: 1 }}
              >
                SINGLE PLAYER
              </button>
            </div>
            <p style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "4px" }}>
              {gameMode === "singleplayer"
                ? "Switch to your own 1000-sector universe."
                : "Play in the shared universe with all players."}
            </p>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Connecting..." : "LOGIN"}
          </button>
        </form>
        <p className="auth-link">
          New pilot? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}
