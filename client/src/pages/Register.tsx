import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import WalletPanel from "../components/WalletPanel";

interface RegisterProps {
  onRegister: (
    username: string,
    email: string,
    password: string,
    race: string,
    gameMode?: string,
  ) => Promise<any>;
}

const RACES = [
  {
    id: "muscarian",
    name: "Muscarian",
    nickname: "Muskie",
    ship: "Corvette",
    trait: "+5% attack",
    bonus: "+2,000 credits",
    desc: "Military fungoid warriors. Lightning reflexes in combat and mycelial trade networks that bankroll new pilots.",
  },
  {
    id: "vedic",
    name: "Vedic",
    nickname: "Scholar",
    ship: "Cruiser",
    trait: "+10% scan range",
    bonus: "+100 max energy (72h)",
    desc: "Ancient seekers channeling psionic resonance to perceive distant star systems. Unmatched inner energy reserves.",
  },
  {
    id: "kalin",
    name: "Kalin",
    nickname: "Raider",
    ship: "Battleship",
    trait: "+5% defense",
    bonus: "+10 weapon/engine on starter",
    desc: "Silicon-armored warriors forged in crushing gravity. Their ships are nearly impervious, outfitted with superior hardware.",
  },
  {
    id: "tarri",
    name: "Tar'ri",
    nickname: "Trader",
    ship: "Freighter",
    trait: "+5% trade profit",
    bonus: "+5,000 credits",
    desc: "Nomadic merchants with generations of barter instinct. No other species can rival their eye for profit.",
  },
];

export default function Register({ onRegister }: RegisterProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [selectedRace, setSelectedRace] = useState("");
  const [gameMode, setGameMode] = useState<"multiplayer" | "singleplayer">(
    "multiplayer",
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStep1 = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setStep(2);
  };

  const handleStep2 = async () => {
    if (!selectedRace) {
      setError("Choose your race");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await onRegister(username, email, password, selectedRace, gameMode);
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div
        className="auth-container"
        style={
          step === 2
            ? { width: "720px", maxWidth: "calc(100vw - 32px)" }
            : undefined
        }
      >
        <img src="/logo.png" alt="Cosmic Horizon" className="auth-logo" />
        <p className="auth-subtitle">
          {step === 1
            ? "New Pilot Registration"
            : step === 2
              ? "Choose Your Race"
              : "Connect Wallet"}
        </p>

        {step === 1 && (
          <form onSubmit={handleStep1} className="auth-form">
            {error && <div className="auth-error">{error}</div>}
            <div className="auth-field">
              <label>Username (3-32 chars)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={32}
                autoFocus
              />
            </div>
            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="auth-field">
              <label>Password (min 8 chars)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="auth-field">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              <p
                style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "4px" }}
              >
                {gameMode === "singleplayer"
                  ? "Your own 1000-sector universe with 20 missions. No social features. Can transition to multiplayer later."
                  : "Shared universe with all players. Full social features, PvP, syndicates, and leaderboards."}
              </p>
            </div>
            <button type="submit" className="btn btn-primary">
              NEXT
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="race-selection">
            {error && <div className="auth-error">{error}</div>}
            <div className="race-grid">
              {RACES.map((race) => (
                <div
                  key={race.id}
                  className={`race-card ${selectedRace === race.id ? "race-card--selected" : ""}`}
                  onClick={() => setSelectedRace(race.id)}
                >
                  <div className="race-card__header">
                    <span className="race-card__name">{race.name}</span>
                    <span className="race-card__nickname">{race.nickname}</span>
                  </div>
                  <p className="race-card__desc">{race.desc}</p>
                  <div className="race-card__stats">
                    <div className="race-card__stat">
                      <span className="race-card__label">Ship</span>
                      <span className="race-card__value">{race.ship}</span>
                    </div>
                    <div className="race-card__stat">
                      <span className="race-card__label">Trait</span>
                      <span className="race-card__value race-card__value--trait">
                        {race.trait}
                      </span>
                    </div>
                    <div className="race-card__stat">
                      <span className="race-card__label">Bonus</span>
                      <span className="race-card__value race-card__value--bonus">
                        {race.bonus}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="race-actions">
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                BACK
              </button>
              <button
                className="btn btn-primary"
                onClick={handleStep2}
                disabled={loading || !selectedRace}
              >
                {loading ? "Launching..." : "LAUNCH"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <WalletPanel
            inline
            onConnected={() => navigate("/game")}
            onSkipped={() => navigate("/game")}
          />
        )}

        <p className="auth-link">
          Already a pilot? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}
