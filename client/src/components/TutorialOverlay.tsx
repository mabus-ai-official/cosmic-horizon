import { useState, useEffect, useRef, useCallback } from "react";

interface TutorialOverlayProps {
  tutorialStep: number;
  tutorialCompleted: boolean;
  onSkip: () => void;
  onSelectPanel?: (panelId: string) => void;
}

const TOTAL_STEPS = 15;

/** CSS selector to highlight, arrow direction, which panel to auto-open */
interface StepGuide {
  title: string;
  desc: string;
  hint: string;
  /** CSS selector for the element to spotlight */
  target?: string;
  /** Which direction the tooltip arrow points from the highlight */
  arrow?: "left" | "right" | "top" | "bottom";
  /** Panel to auto-select when this step is active */
  autoPanel?: string;
  /** If true, pulse the notification log / command area */
  pulseCommand?: boolean;
}

const STEPS: StepGuide[] = [
  // tutorialStep=0: server expects "look" action to advance to step 1
  {
    title: "LOOK AROUND",
    desc: "Click LOOK to survey your current sector and see what's here.",
    hint: "Click LOOK in the Helm panel",
    target: "[data-tutorial='look-btn']",
    arrow: "left",
    autoPanel: "nav",
  },
  // tutorialStep=1: server expects "status" action to advance to step 2
  {
    title: "CHECK YOUR STATUS",
    desc: "Click your PILOT profile to see your ship stats, credits, and energy level.",
    hint: "Click the PILOT icon in the sidebar",
    target: "[data-tutorial='panel-profile']",
    arrow: "right",
    autoPanel: "profile",
  },
  // tutorialStep=2: server expects "move" action to advance to step 3
  {
    title: "FLY TO A NEW SECTOR",
    desc: "See the adjacent sectors in your Helm? Click on sector 90002 to fly there. That's where the Training Depot is.",
    hint: "Click sector 90002 in the Helm panel",
    target: "[data-tutorial='move-btn']",
    arrow: "left",
    autoPanel: "nav",
  },
  // tutorialStep=3: server expects "scan" action to advance to step 4
  {
    title: "SCAN THE AREA",
    desc: "Open the SCANNER panel to detect what's in nearby sectors before you fly there.",
    hint: "Click the SCANNER icon, then click SCAN",
    target: "[data-tutorial='panel-explore']",
    arrow: "right",
    autoPanel: "explore",
  },
  // tutorialStep=4: server expects 2 "move" actions to advance to step 5
  {
    title: "EXPLORE FURTHER",
    desc: "Keep flying! Navigate through sectors 90003 and 90004. Click adjacent sectors in the Helm to move.",
    hint: "Fly to 2 more sectors",
    target: "[data-tutorial='move-btn']",
    arrow: "left",
    autoPanel: "nav",
  },
  // tutorialStep=5: server expects "dock" action to advance to step 6
  {
    title: "DOCK AT THE OUTPOST",
    desc: "Head to sector 90002 where the Training Depot is. Click DOCK to enter the outpost and access trading.",
    hint: "Click DOCK when at an outpost",
    target: "[data-tutorial='dock-btn']",
    arrow: "left",
    autoPanel: "nav",
  },
  // tutorialStep=6: server expects "buy" action to advance to step 7
  {
    title: "BUY COMMODITIES",
    desc: "You're docked! Open the MARKET panel to see what's for sale. Buy some Cyrillium to trade later.",
    hint: "Click MARKET, then buy goods",
    target: "[data-tutorial='panel-trade']",
    arrow: "right",
    autoPanel: "trade",
  },
  // tutorialStep=7: server expects "sell" action to advance to step 8
  {
    title: "SELL FOR PROFIT",
    desc: "Undock and fly to sector 90004 (Frontier Post). Dock there and sell your Cyrillium for a profit!",
    hint: "Fly to 90004, dock, sell cargo",
    target: "[data-tutorial='panel-trade']",
    arrow: "right",
  },
  // tutorialStep=8: server expects "move" action (to 90005) to advance to step 9
  {
    title: "FIND A PLANET",
    desc: "Fly to sector 90005. There's a planet called Nova Prime waiting to be discovered!",
    hint: "Navigate to sector 90005",
    target: "[data-tutorial='move-btn']",
    arrow: "left",
    autoPanel: "nav",
  },
  // tutorialStep=9: server expects "land" action to advance to step 10
  {
    title: "LAND ON THE PLANET",
    desc: "Open the PLANETS panel and click LAND to touch down on Nova Prime.",
    hint: "Click PLANETS, then LAND",
    target: "[data-tutorial='panel-planets']",
    arrow: "right",
    autoPanel: "planets",
  },
  // tutorialStep=10: server expects "claim" action to advance to step 11
  {
    title: "CLAIM YOUR PLANET",
    desc: "Now claim this planet as your own! Click CLAIM in the Planets panel.",
    hint: "Click CLAIM on Nova Prime",
    target: "[data-tutorial='panel-planets']",
    arrow: "right",
    autoPanel: "planets",
  },
  // tutorialStep=11: server expects "liftoff" action to advance to step 12
  {
    title: "RETURN TO SPACE",
    desc: "Liftoff from the planet surface. Click LIFTOFF in the Helm panel to return to orbit.",
    hint: "Click LIFTOFF",
    target: "[data-tutorial='liftoff-btn']",
    arrow: "left",
    autoPanel: "nav",
  },
  // tutorialStep=12: server expects "map" action to advance to step 13
  {
    title: "VIEW THE GALAXY MAP",
    desc: "Look at the 3D galaxy map above. This shows all the sectors you've explored. Click sectors to fly to them!",
    hint: "Check out the galaxy map",
    target: ".game-map-area",
    arrow: "bottom",
  },
  // tutorialStep=13: server expects "help" action to advance to step 14
  {
    title: "OPEN THE DATABANK",
    desc: "The DATABANK has all available commands and game info. Click it in the sidebar — you can always come back here.",
    hint: "Click DATABANK in the sidebar",
    target: "[data-tutorial='panel-actions']",
    arrow: "right",
    autoPanel: "actions",
  },
  // tutorialStep=14: auto-complete
  {
    title: "TRAINING COMPLETE!",
    desc: "You're ready for the frontier, Commander. The real galaxy awaits.",
    hint: "",
  },
];

export default function TutorialOverlay({
  tutorialStep,
  tutorialCompleted,
  onSkip,
  onSelectPanel,
}: TutorialOverlayProps) {
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const animFrame = useRef(0);

  const step = STEPS[Math.min(tutorialStep, STEPS.length - 1)];

  // Auto-select panel when step changes
  useEffect(() => {
    if (tutorialCompleted || !step.autoPanel || !onSelectPanel) return;
    onSelectPanel(step.autoPanel);
  }, [tutorialStep, tutorialCompleted]);

  // Track target element position
  const updateSpotlight = useCallback(() => {
    if (tutorialCompleted || !step.target) {
      setSpotlightRect(null);
      return;
    }

    const el = document.querySelector(step.target);
    if (!el) {
      setSpotlightRect(null);
      animFrame.current = requestAnimationFrame(updateSpotlight);
      return;
    }

    const rect = el.getBoundingClientRect();
    setSpotlightRect(rect);

    // Position tooltip relative to spotlight
    const arrow = step.arrow || "left";
    const style: React.CSSProperties = { position: "fixed" };

    if (arrow === "right") {
      // Tooltip appears to the right of the element
      style.left = rect.right + 16;
      style.top = rect.top + rect.height / 2;
      style.transform = "translateY(-50%)";
    } else if (arrow === "left") {
      // Tooltip appears to the left
      style.right = window.innerWidth - rect.left + 16;
      style.top = rect.top + rect.height / 2;
      style.transform = "translateY(-50%)";
    } else if (arrow === "bottom") {
      // Tooltip below
      style.left = rect.left + rect.width / 2;
      style.top = rect.bottom + 16;
      style.transform = "translateX(-50%)";
    } else {
      // Tooltip above
      style.left = rect.left + rect.width / 2;
      style.bottom = window.innerHeight - rect.top + 16;
      style.transform = "translateX(-50%)";
    }

    setTooltipStyle(style);

    animFrame.current = requestAnimationFrame(updateSpotlight);
  }, [tutorialStep, tutorialCompleted, step]);

  useEffect(() => {
    updateSpotlight();
    return () => cancelAnimationFrame(animFrame.current);
  }, [updateSpotlight]);

  if (tutorialCompleted) return null;

  const progress = Math.min(tutorialStep / TOTAL_STEPS, 1);

  return (
    <>
      {/* Progress bar at top */}
      <div className="tutorial-bar">
        <div className="tutorial-bar__left">
          <span className="tutorial-bar__label">TRAINING</span>
          <div className="tutorial-bar__progress">
            <div
              className="tutorial-bar__progress-fill"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="tutorial-bar__step">
            {tutorialStep}/{TOTAL_STEPS}
          </span>
        </div>
        <div className="tutorial-bar__center">
          <span className="tutorial-bar__title">{step.title}</span>
        </div>
        <div className="tutorial-bar__right">
          <button className="tutorial-bar__skip" onClick={onSkip}>
            SKIP TUTORIAL
          </button>
        </div>
      </div>

      {/* Spotlight ring around target element */}
      {spotlightRect && (
        <div
          className="tutorial-spotlight"
          style={{
            top: spotlightRect.top - 6,
            left: spotlightRect.left - 6,
            width: spotlightRect.width + 12,
            height: spotlightRect.height + 12,
          }}
        />
      )}

      {/* Tooltip near target */}
      {spotlightRect && (
        <div className="tutorial-tooltip" style={tooltipStyle}>
          <div
            className={`tutorial-tooltip__arrow tutorial-tooltip__arrow--${step.arrow || "left"}`}
          />
          <div className="tutorial-tooltip__title">{step.title}</div>
          <div className="tutorial-tooltip__desc">{step.desc}</div>
          {step.hint && (
            <div className="tutorial-tooltip__hint">{step.hint}</div>
          )}
        </div>
      )}

      {/* Fallback: if no target found, show inline instruction */}
      {!spotlightRect && step.desc && (
        <div className="tutorial-inline">
          <div className="tutorial-inline__desc">{step.desc}</div>
          {step.hint && (
            <div className="tutorial-inline__hint">{step.hint}</div>
          )}
        </div>
      )}
    </>
  );
}
