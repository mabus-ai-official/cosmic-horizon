import { useState } from "react";

interface ResultsViewProps {
  myScore: number;
  opponentScore: number;
  winnerId: string | null;
  playerId: string;
  opponentName: string;
  isAI: boolean;
  isSolo: boolean;
  rewardClaimed: boolean;
  roundResults: any[];
  onClaim: () => Promise<any>;
  onRematch: () => void;
  onExit: () => void;
}

export default function ResultsView({
  myScore,
  opponentScore,
  winnerId,
  playerId,
  opponentName,
  isAI,
  isSolo,
  rewardClaimed,
  roundResults,
  onClaim,
  onRematch,
  onExit,
}: ResultsViewProps) {
  const [claiming, setClaiming] = useState(false);
  const [reward, setReward] = useState<{
    credits: number;
    xp: number;
    tokens: number;
  } | null>(null);

  const isWinner = winnerId === playerId;
  const isDraw = !winnerId;

  const titleText = isSolo
    ? "COMPLETE"
    : isDraw
      ? "DRAW"
      : isWinner
        ? "VICTORY"
        : "DEFEAT";
  const titleColor = isSolo
    ? "#56d4dd"
    : isDraw
      ? "#56d4dd"
      : isWinner
        ? "#3fb950"
        : "#f85149";

  const handleClaim = async () => {
    setClaiming(true);
    const result = await onClaim();
    if (result) {
      setReward({
        credits: result.credits,
        xp: result.xp,
        tokens: result.tokens,
      });
    }
    setClaiming(false);
  };

  return (
    <div className="arcade-results">
      <div className="arcade-results__title" style={{ color: titleColor }}>
        {titleText}
      </div>

      <div className="arcade-results__scores">
        <div className="arcade-results__score arcade-results__score--mine">
          <div className="arcade-results__score-label">YOU</div>
          <div className="arcade-results__score-value">{myScore}</div>
        </div>
        {!isSolo && (
          <>
            <div className="arcade-results__vs">VS</div>
            <div className="arcade-results__score arcade-results__score--opponent">
              <div className="arcade-results__score-label">{opponentName}</div>
              <div className="arcade-results__score-value">{opponentScore}</div>
            </div>
          </>
        )}
      </div>

      {!isSolo && roundResults.length > 0 && (
        <div className="arcade-results__breakdown">
          {roundResults.map((r, i) => (
            <div key={i} className="arcade-results__round">
              <span className="arcade-results__round-label">R{i + 1}</span>
              <span className="arcade-results__round-scores">
                {r.scores?.player1 ?? "?"} - {r.scores?.player2 ?? "?"}
              </span>
            </div>
          ))}
        </div>
      )}

      {!rewardClaimed && !reward && (
        <button
          className="arcade-results__btn arcade-results__btn--claim"
          onClick={handleClaim}
          disabled={claiming}
        >
          {claiming ? "CLAIMING..." : "CLAIM REWARDS"}
        </button>
      )}

      {reward && (
        <div className="arcade-results__reward">
          {reward.tokens > 0 && (
            <div className="arcade-results__reward-tokens">
              You earned {reward.tokens} arcade tokens!
            </div>
          )}
          <div className="arcade-results__reward-item">
            +{reward.credits} credits
          </div>
          <div className="arcade-results__reward-item">+{reward.xp} XP</div>
          {isSolo && (
            <div className="arcade-results__reward-note">
              (30% solo play rewards)
            </div>
          )}
          {isAI && !isSolo && (
            <div className="arcade-results__reward-note">
              (50% AI match penalty)
            </div>
          )}
        </div>
      )}

      <div className="arcade-results__actions">
        <button
          className="arcade-results__btn arcade-results__btn--rematch"
          onClick={onRematch}
        >
          {isSolo ? "PLAY AGAIN" : "REMATCH"}
        </button>
        <button
          className="arcade-results__btn arcade-results__btn--exit"
          onClick={onExit}
        >
          EXIT
        </button>
      </div>
    </div>
  );
}
