import { useState, useEffect, useRef, useCallback } from "react";

interface TutorialOverlayProps {
  tutorialStep: number;
  tutorialCompleted: boolean;
  onSkip: () => void;
  onSelectPanel?: (panelId: string) => void;
  onAdvanceTutorial?: (action: string) => void;
  activePanel?: string;
}

const TOTAL_STEPS = 14;

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
  /** If set, auto-advance tutorial with this action when the target panel is opened */
  advanceOnPanel?: { panel: string; action: string };
  /** If set, auto-advance tutorial with this action after a delay (for "look at this" steps) */
  autoAdvanceAction?: string;
}

const STEPS: StepGuide[] = [
  // tutorialStep=0: server expects "look" action to advance to step 1
  // Look fires automatically on sector load via scanning.ts, so auto-advance
  {
    title: "ORIENT YOURSELF",
    desc: "Welcome, Commander. Your Helm shows navigation controls — adjacent sectors, docking, and more. The look command is running now...",
    hint: "Your ship is scanning the sector automatically",
    target: "[data-tutorial='group-helm']",
    arrow: "right",
    autoPanel: "nav",
    autoAdvanceAction: "look",
  },
  // tutorialStep=1: server expects "status" action to advance to step 2
  {
    title: "CHECK YOUR STATUS",
    desc: "Click the PILOT group to see your profile, ship stats, credits, and energy level.",
    hint: "Click PILOT in the activity bar",
    target: "[data-tutorial='group-pilot']",
    arrow: "right",
    advanceOnPanel: { panel: "profile", action: "status" },
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
    desc: "Click the SCAN button in the Helm to detect what's in nearby sectors before you fly there.",
    hint: "Click SCAN in the Helm panel",
    target: "[data-tutorial='scan-btn']",
    arrow: "left",
    autoPanel: "nav",
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
    desc: "You're docked! Click the COMMERCE group and open the market. Buy some Cyrillium to trade later.",
    hint: "Click COMMERCE, then buy goods",
    target: "[data-tutorial='group-commerce']",
    arrow: "right",
    autoPanel: "trade",
  },
  // tutorialStep=7: server expects "sell" action to advance to step 8
  {
    title: "SELL FOR PROFIT",
    desc: "Undock and fly to sector 90004 (Frontier Post) via 90003. Dock there and sell your Cyrillium for a profit!",
    hint: "Undock \u2192 fly 90003 \u2192 90004 \u2192 dock \u2192 sell",
    autoPanel: "nav",
  },
  // tutorialStep=8: server expects "move" action (to 90005) to advance to step 9
  {
    title: "FIND A PLANET",
    desc: "Fly to sector 90005 \u2014 click it in the adjacent sectors list below. That's where Nova Prime is!",
    hint: "Click sector 90005 in the Helm panel",
    autoPanel: "nav",
  },
  // tutorialStep=9: server expects "land" action to advance to step 10
  {
    title: "LAND ON THE PLANET",
    desc: "Click the PILOT group and open the Planets tab, then click LAND to touch down on Nova Prime.",
    hint: "Click PILOT \u2192 Planets \u2192 LAND",
    target: "[data-tutorial='group-pilot']",
    arrow: "right",
    autoPanel: "planets",
  },
  // tutorialStep=10: server expects "claim" action to advance to step 11
  {
    title: "CLAIM YOUR PLANET",
    desc: "Now claim this planet as your own! Click CLAIM in the Planets panel.",
    hint: "Click CLAIM on Nova Prime",
    target: "[data-tutorial='group-pilot']",
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
    autoAdvanceAction: "map",
  },
  // tutorialStep=13: server expects "help" action to advance to step 14
  {
    title: "OPEN THE DATABANK",
    desc: "The DATABASE group has all available commands and game info. Click it in the activity bar \u2014 you can always come back here.",
    hint: "Click DATABASE in the activity bar",
    target: "[data-tutorial='group-database']",
    arrow: "right",
    advanceOnPanel: { panel: "actions", action: "help" },
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
  onAdvanceTutorial,
  activePanel,
}: TutorialOverlayProps) {
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const animFrame = useRef(0);
  const advancedRef = useRef<number>(-1);
  const panelAtStepStart = useRef<string | undefined>(activePanel);

  const step = STEPS[Math.min(tutorialStep, STEPS.length - 1)];

  // Auto-select panel when step changes
  useEffect(() => {
    if (tutorialCompleted || !step.autoPanel || !onSelectPanel) return;
    onSelectPanel(step.autoPanel);
  }, [tutorialStep, tutorialCompleted]);

  // Record which panel was active when the step started
  useEffect(() => {
    panelAtStepStart.current = activePanel;
  }, [tutorialStep]);

  // Auto-advance when the correct panel is opened for panel-based steps
  // Only fires when the panel CHANGES to the target (not if already active)
  useEffect(() => {
    if (tutorialCompleted || !step.advanceOnPanel || !onAdvanceTutorial) return;
    if (!activePanel) return;
    if (advancedRef.current === tutorialStep) return;
    // Don't fire if the panel was already the target when the step started
    if (activePanel === panelAtStepStart.current) return;
    if (activePanel === step.advanceOnPanel.panel) {
      advancedRef.current = tutorialStep;
      setTimeout(() => {
        onAdvanceTutorial(step.advanceOnPanel!.action);
      }, 500);
    }
  }, [activePanel, tutorialStep, tutorialCompleted]);

  // Auto-advance after a delay for "look at this" steps (e.g. galaxy map)
  useEffect(() => {
    if (tutorialCompleted || !step.autoAdvanceAction || !onAdvanceTutorial)
      return;
    if (advancedRef.current === tutorialStep) return;
    const timer = setTimeout(() => {
      if (advancedRef.current === tutorialStep) return;
      advancedRef.current = tutorialStep;
      onAdvanceTutorial(step.autoAdvanceAction!);
    }, 3000);
    return () => clearTimeout(timer);
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

    // Position tooltip relative to spotlight, clamped to viewport
    const arrow = step.arrow || "left";
    const style: React.CSSProperties = { position: "fixed" };
    const pad = 12; // min distance from viewport edge
    const tooltipW = 280;
    const tooltipH = 120;

    if (arrow === "right") {
      style.left = Math.min(
        rect.right + 16,
        window.innerWidth - tooltipW - pad,
      );
      style.top = Math.max(
        pad,
        Math.min(
          rect.top + rect.height / 2,
          window.innerHeight - tooltipH - pad,
        ),
      );
      style.transform = "translateY(-50%)";
    } else if (arrow === "left") {
      const leftPos = rect.left - 16 - tooltipW;
      if (leftPos < pad) {
        // Not enough room on left, flip to right
        style.left = rect.right + 16;
      } else {
        style.left = leftPos;
      }
      style.top = Math.max(
        pad,
        Math.min(
          rect.top + rect.height / 2,
          window.innerHeight - tooltipH - pad,
        ),
      );
      style.transform = "translateY(-50%)";
    } else if (arrow === "bottom") {
      style.left = Math.max(
        pad,
        Math.min(
          rect.left + rect.width / 2 - tooltipW / 2,
          window.innerWidth - tooltipW - pad,
        ),
      );
      style.top = Math.min(
        rect.bottom + 16,
        window.innerHeight - tooltipH - pad,
      );
    } else {
      style.left = Math.max(
        pad,
        Math.min(
          rect.left + rect.width / 2 - tooltipW / 2,
          window.innerWidth - tooltipW - pad,
        ),
      );
      style.bottom = Math.max(pad, window.innerHeight - rect.top + 16);
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
