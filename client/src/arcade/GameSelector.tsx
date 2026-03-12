import { useState } from "react";

interface GameSelectorProps {
  sectorPlayers: { id: string; username: string }[];
  playerId: string;
  onPlayAI: (difficulty: string) => void;
  onChallenge: (targetId: string) => void;
  error: string | null;
}

export default function GameSelector({
  sectorPlayers,
  playerId,
  onPlayAI,
  onChallenge,
  error,
}: GameSelectorProps) {
  const [difficulty, setDifficulty] = useState("medium");
  const otherPlayers = sectorPlayers.filter((p) => p.id !== playerId);

  return (
    <div className="arcade-selector">
      <div className="arcade-selector__title">ASTEROID MINING</div>
      <div className="arcade-selector__desc">
        Time your scanner hits on ore deposits. 5 hits per round, 3 rounds. Best
        score wins.
      </div>

      {error && <div className="arcade-selector__error">{error}</div>}

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
            onClick={() => onPlayAI(difficulty)}
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
                  onClick={() => onChallenge(p.id)}
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
