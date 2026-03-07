interface TutorialOverlayProps {
  tutorialStep: number;
  tutorialCompleted: boolean;
  onSkip: () => void;
}

const TOTAL_STEPS = 15;

const STEPS = [
  {
    title: "Getting Started",
    hint: 'Type "look" or "l" to survey your sector.',
  },
  {
    title: "Look Around",
    hint: 'Type "look" or "l" to see what\'s in your sector.',
  },
  {
    title: "Check Your Status",
    hint: 'Type "status" or "st" to see your stats.',
  },
  {
    title: "Move to a New Sector",
    hint: 'Type "move 90002" to head toward the Training Depot.',
  },
  {
    title: "Scan Your Surroundings",
    hint: 'Type "scan" to scan nearby sectors.',
  },
  { title: "Explore Further", hint: "Move through sectors 90003 and 90004." },
  {
    title: "Dock at an Outpost",
    hint: 'Head back to sector 90002 and type "dock".',
  },
  { title: "Buy Commodities", hint: 'While docked, type "buy cyrillium 5".' },
  {
    title: "Sell for Profit",
    hint: 'Travel to sector 90004 and "sell cyrillium 5".',
  },
  { title: "Discover a Planet", hint: 'Move to sector 90005 and "look".' },
  { title: "Land on a Planet", hint: 'Type "land 1" to land on the planet.' },
  { title: "Claim Your Planet", hint: 'Type "claim 1" to claim it.' },
  { title: "Return to Space", hint: 'Type "liftoff" to return to orbit.' },
  { title: "Use the Map", hint: 'Type "map" to view your galactic map.' },
  { title: "Check Help", hint: 'Type "help" to see all commands.' },
  { title: "Tutorial Complete!", hint: "" },
];

export default function TutorialOverlay({
  tutorialStep,
  tutorialCompleted,
  onSkip,
}: TutorialOverlayProps) {
  if (tutorialCompleted) return null;

  const currentStep = STEPS[tutorialStep + 1] || STEPS[STEPS.length - 1];
  const progress = Math.min(tutorialStep / TOTAL_STEPS, 1);

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-overlay__left">
        <span className="tutorial-overlay__label">TUTORIAL</span>
        <div className="tutorial-overlay__progress">
          <div
            className="tutorial-overlay__progress-bar"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="tutorial-overlay__step">
          {tutorialStep}/{TOTAL_STEPS}
        </span>
      </div>
      <div className="tutorial-overlay__center">
        <span className="tutorial-overlay__title">{currentStep.title}</span>
        {currentStep.hint && (
          <span className="tutorial-overlay__hint">{currentStep.hint}</span>
        )}
      </div>
      <div className="tutorial-overlay__right">
        <button
          className="tutorial-overlay__btn tutorial-overlay__btn--skip"
          onClick={onSkip}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
