interface ScoreOverlayProps {
  round: number;
  maxRounds: number;
  myScore: number;
  opponentScore: number;
  opponentName: string;
}

export default function ScoreOverlay({
  round,
  maxRounds,
  myScore,
  opponentScore,
  opponentName,
}: ScoreOverlayProps) {
  return (
    <div className="arcade-score-overlay">
      <div className="arcade-score-overlay__round">
        ROUND {round}/{maxRounds}
      </div>
      <div className="arcade-score-overlay__scores">
        <span className="arcade-score-overlay__my-score">{myScore}</span>
        <span className="arcade-score-overlay__separator">|</span>
        <span className="arcade-score-overlay__opp-score">
          {opponentScore} {opponentName}
        </span>
      </div>
    </div>
  );
}
