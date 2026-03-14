export interface TutorialStep {
  step: number;
  title: string;
  description: string;
  hint: string;
  triggerAction: string;
  triggerCount: number;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    step: 1,
    title: "Orient Yourself",
    description:
      "Get your bearings. Your ship automatically surveys the current sector.",
    hint: "Your Helm panel shows navigation controls and sector info.",
    triggerAction: "look",
    triggerCount: 1,
  },
  {
    step: 2,
    title: "Check Your Status",
    description: "Review your pilot profile, ship stats, and cargo.",
    hint: "Click the PILOT group in the activity bar to see your stats.",
    triggerAction: "status",
    triggerCount: 1,
  },
  {
    step: 3,
    title: "Move to a New Sector",
    description: "Navigate to an adjacent sector to begin exploring.",
    hint: "Click sector 90002 in the Helm panel to head toward the Training Depot.",
    triggerAction: "move",
    triggerCount: 1,
  },
  {
    step: 4,
    title: "Scan Your Surroundings",
    description:
      "Use your scanner to reveal what lies in adjacent sectors before moving.",
    hint: "Click the SCAN button in the Helm panel.",
    triggerAction: "scan",
    triggerCount: 1,
  },
  {
    step: 5,
    title: "Explore Further",
    description: "Keep moving through the galaxy. Visit two more sectors.",
    hint: "Move through sectors 90003 and 90004 to complete this step.",
    triggerAction: "move",
    triggerCount: 2,
  },
  {
    step: 6,
    title: "Dock at an Outpost",
    description: "Find a sector with an outpost and dock to view trade prices.",
    hint: "Head back to sector 90002 and click DOCK to enter the Training Depot.",
    triggerAction: "dock",
    triggerCount: 1,
  },
  {
    step: 7,
    title: "Buy Commodities",
    description: "Purchase goods from an outpost to fill your cargo hold.",
    hint: "Open the STARMALL group and buy some Cyrillium to trade later.",
    triggerAction: "buy",
    triggerCount: 1,
  },
  {
    step: 8,
    title: "Sell for Profit",
    description: "Sell commodities at the Frontier Post to earn credits.",
    hint: "Fly to sector 90004, dock, and sell your Cyrillium at the Frontier Post.",
    triggerAction: "sell",
    triggerCount: 1,
  },
  {
    step: 9,
    title: "Discover a Planet",
    description:
      "Navigate to sector 90005 where a habitable planet awaits discovery.",
    hint: "Click sector 90005 in the Helm panel.",
    triggerAction: "move",
    triggerCount: 1,
  },
  {
    step: 10,
    title: "Land on a Planet",
    description: "Land on the unclaimed planet to inspect it up close.",
    hint: "Open the SHIP group, click Planets, then click LAND.",
    triggerAction: "land",
    triggerCount: 1,
  },
  {
    step: 11,
    title: "Claim Your Planet",
    description:
      "Claim this planet as your own. Owned planets produce resources over time.",
    hint: "Click CLAIM on the planet, then LIFTOFF to return to space.",
    triggerAction: "claim",
    triggerCount: 1,
  },
  {
    step: 12,
    title: "Return to Space",
    description: "Liftoff from the planet surface to continue your journey.",
    hint: "Click LIFTOFF in the Helm panel to return to orbit.",
    triggerAction: "liftoff",
    triggerCount: 1,
  },
  {
    step: 13,
    title: "Use the Map",
    description:
      "Open your explored map to see all the sectors you've visited.",
    hint: "Check out the 3D galaxy map above.",
    triggerAction: "map",
    triggerCount: 1,
  },
  {
    step: 14,
    title: "Open the Databank",
    description:
      "There's much more to discover. Review available commands to plan your next move.",
    hint: "Click the DATABASE group in the activity bar.",
    triggerAction: "help",
    triggerCount: 1,
  },
  {
    step: 15,
    title: "Tutorial Complete!",
    description: "You've learned the basics. The galaxy awaits, pilot.",
    hint: "",
    triggerAction: "auto",
    triggerCount: 0,
  },
];

export const TUTORIAL_REWARD_CREDITS = 5000;
export const TOTAL_TUTORIAL_STEPS = TUTORIAL_STEPS.length;

export function getTutorialStep(step: number): TutorialStep | undefined {
  return TUTORIAL_STEPS.find((s) => s.step === step);
}
