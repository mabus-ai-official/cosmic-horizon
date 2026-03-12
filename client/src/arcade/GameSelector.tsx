import { useState } from "react";

const GAMES = [
  {
    id: "asteroid_mining",
    name: "ASTEROID MINING",
    desc: "Time your scanner hits on ore deposits. 5 hits per round, 3 rounds.",
  },
  {
    id: "turret_defense",
    name: "TURRET DEFENSE",
    desc: "Defend your ship from drone waves. Place turrets, survive 5 waves per round.",
  },
];

interface GameSelectorProps {
  sectorPlayers: { id: string; username: string }[];
  playerId: string;
  onPlayAI: (difficulty: string, gameType: string) => void;
  onChallenge: (targetId: string, gameType: string) => void;
  onOpenShop: () => void;
  tokenBalance: number;
  error: string | null;
}

export default function GameSelector({
  sectorPlayers,
  playerId,
  onPlayAI,
  onChallenge,
  onOpenShop,
  tokenBalance,
  error,
}: GameSelectorProps) {
  const [difficulty, setDifficulty] = useState("medium");
  const [selectedGame, setSelectedGame] = useState("asteroid_mining");
  const otherPlayers = sectorPlayers.filter((p) => p.id !== playerId);

  return (
    <div className="arcade-selector">
      <div className="arcade-selector__header-row">
        <div className="arcade-selector__title">ARCADE</div>
        <button className="arcade-selector__shop-btn" onClick={onOpenShop}>
          TOKEN SHOP
          <span className="arcade-selector__token-badge">{tokenBalance}</span>
        </button>
      </div>

      {error && <div className="arcade-selector__error">{error}</div>}

      <div className="arcade-selector__game-grid">
        {GAMES.map((game) => (
          <button
            key={game.id}
            className={`arcade-selector__game-card${selectedGame === game.id ? " arcade-selector__game-card--selected" : ""}`}
            onClick={() => setSelectedGame(game.id)}
          >
            <div className="arcade-selector__game-name">{game.name}</div>
            <div className="arcade-selector__game-desc">{game.desc}</div>
          </button>
        ))}
      </div>

      <div className="arcade-selector__section">
        <div className="arcade-selector__section-title">SOLO MATCH</div>
        <div className="arcade-selector__ai-row">
          <select
            className="arcade-selector__difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button
            className="arcade-selector__btn arcade-selector__btn--ai"
            onClick={() => onPlayAI(difficulty, selectedGame)}
          >
            PLAY VS AI
          </button>
        </div>
        <div className="arcade-selector__note">
          AI matches award 50% rewards
        </div>
      </div>

      {otherPlayers.length > 0 && (
        <div className="arcade-selector__section">
          <div className="arcade-selector__section-title">PILOTS IN SECTOR</div>
          <div className="arcade-selector__player-list">
            {otherPlayers.map((p) => (
              <div key={p.id} className="arcade-selector__player">
                <span className="arcade-selector__player-name">
                  {p.username}
                </span>
                <button
                  className="arcade-selector__btn arcade-selector__btn--challenge"
                  onClick={() => onChallenge(p.id, selectedGame)}
                >
                  CHALLENGE
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
