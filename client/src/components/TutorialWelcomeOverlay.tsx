import { useState, useEffect } from "react";

interface Props {
  tutorialCompleted: boolean;
  onPlay: () => void;
  onSkip: () => void;
}

const STORAGE_KEY = "coho_tutorial_welcome_seen";

export default function TutorialWelcomeOverlay({
  tutorialCompleted,
  onPlay,
  onSkip,
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (tutorialCompleted) return;
    const seen = sessionStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setVisible(true);
    }
  }, [tutorialCompleted]);

  if (!visible) return null;

  const handlePlay = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
    onPlay();
  };

  const handleSkip = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
    onSkip();
  };

  return (
    <div className="tutorial-welcome">
      <div className="tutorial-welcome__backdrop" />
      <div className="tutorial-welcome__card">
        <div className="tutorial-welcome__icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle
              cx="24"
              cy="24"
              r="22"
              stroke="#00d4ff"
              strokeWidth="2"
              opacity="0.6"
            />
            <circle
              cx="24"
              cy="24"
              r="16"
              stroke="#00d4ff"
              strokeWidth="1.5"
              opacity="0.3"
            />
            <path
              d="M24 8 L26 20 L38 24 L26 28 L24 40 L22 28 L10 24 L22 20 Z"
              fill="#00d4ff"
              opacity="0.8"
            />
            <circle cx="24" cy="24" r="4" fill="#fff" />
          </svg>
        </div>
        <h2 className="tutorial-welcome__title">PILOT ORIENTATION</h2>
        <p className="tutorial-welcome__subtitle">
          Welcome to the Cosmic Horizon training program, Commander.
        </p>
        <p className="tutorial-welcome__desc">
          We'll walk you through navigation, trading, scanning, and planet
          colonization. Each step highlights exactly where to click. Takes about
          5 minutes.
        </p>
        <div className="tutorial-welcome__actions">
          <button
            className="tutorial-welcome__btn tutorial-welcome__btn--play"
            onClick={handlePlay}
          >
            BEGIN TRAINING
          </button>
          <button
            className="tutorial-welcome__btn tutorial-welcome__btn--skip"
            onClick={handleSkip}
          >
            SKIP — I KNOW WHAT I'M DOING
          </button>
        </div>
        <p className="tutorial-welcome__hint">
          You can always access the Databank (D) for help later.
        </p>
      </div>
    </div>
  );
}
