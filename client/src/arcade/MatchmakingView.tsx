import { useState, useEffect } from "react";

interface MatchmakingViewProps {
  pendingChallenge: {
    challengeId: string;
    challengerName: string;
    gameType: string;
  } | null;
  onAccept: (challengeId: string) => void;
  onDecline: (challengeId: string) => void;
  onCancel: () => void;
  isChallenger: boolean;
}

export default function MatchmakingView({
  pendingChallenge,
  onAccept,
  onDecline,
  onCancel,
  isChallenger,
}: MatchmakingViewProps) {
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          onCancel();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onCancel]);

  if (isChallenger) {
    return (
      <div className="arcade-matchmaking">
        <div className="arcade-matchmaking__title">CHALLENGE SENT</div>
        <div className="arcade-matchmaking__timer">
          Waiting for response... {timer}s
        </div>
        <div className="arcade-matchmaking__spinner">{">>>"}</div>
        <button className="arcade-matchmaking__cancel" onClick={onCancel}>
          CANCEL
        </button>
      </div>
    );
  }

  if (pendingChallenge) {
    return (
      <div className="arcade-matchmaking">
        <div className="arcade-matchmaking__title">INCOMING CHALLENGE</div>
        <div className="arcade-matchmaking__challenger">
          {pendingChallenge.challengerName} wants to play Asteroid Mining
        </div>
        <div className="arcade-matchmaking__timer">{timer}s remaining</div>
        <div className="arcade-matchmaking__buttons">
          <button
            className="arcade-matchmaking__btn arcade-matchmaking__btn--accept"
            onClick={() => onAccept(pendingChallenge.challengeId)}
          >
            ACCEPT
          </button>
          <button
            className="arcade-matchmaking__btn arcade-matchmaking__btn--decline"
            onClick={() => onDecline(pendingChallenge.challengeId)}
          >
            DECLINE
          </button>
        </div>
      </div>
    );
  }

  return null;
}
