// ARIA — Ship AI ambient comment system
// Sassy, direct, personality-driven. GLaDOS meets a loyal ship AI who cares but shows it through snark.

export interface AriaCommentPool {
  comments: string[];
  chance: number; // probability 0-1
}

export const ARIA_IDLE: AriaCommentPool = {
  chance: 1, // always fires when idle timer triggers
  comments: [
    "Commander, the void doesn't stare back. It just... waits.",
    "I've run diagnostics three times. Everything's fine. I'm just bored.",
    "You know, most pilots actually DO things.",
    "Hull integrity: nominal. Crew morale: unknown. Mine: deteriorating.",
    "I could recite the star catalog if you'd like. All 5,000 sectors. No? Fine.",
    "The engines are humming. I'm humming. We're all humming. Do something.",
    "Detecting zero threats. Zero opportunities. Zero effort from my pilot.",
    "I've composed a sonnet about the emptiness of space. Want to hear it? No? Wise choice.",
  ],
};

export const ARIA_MOVE: AriaCommentPool = {
  chance: 0.05,
  comments: [
    "Another sector, another disappointment. I mean adventure.",
    "Fuel status: adequate. Pilot status: questionable.",
    "New sector scanned. Nothing trying to kill us. Yet.",
    "I've plotted 47 more efficient routes. Just saying.",
    "Smooth jump. I'd give it a 6 out of 10.",
  ],
};

export const ARIA_DOCK: AriaCommentPool = {
  chance: 0.15,
  comments: [
    "Docking clamps engaged. Try not to buy anything stupid.",
    "Welcome to civilization. Please remember how to interact with other beings.",
    "I'll just wait here. In the cold. Alone. With the engines.",
  ],
};

export const ARIA_COMBAT: AriaCommentPool = {
  chance: 0.2,
  comments: [
    "Shields up. Weapons hot. Sarcasm module: engaged.",
    "Oh good, violence. My favorite.",
    "Hostile detected. Recommend aggressive negotiations.",
    "I've calculated our odds. I'll keep them to myself.",
  ],
};

export const ARIA_TRADE: AriaCommentPool = {
  chance: 0.1,
  comments: [
    "Profit margins detected. Capitalism intensifies.",
    "Buy low, sell high. Even I know that.",
    "Interesting purchase. I won't judge. Much.",
  ],
};

export const ARIA_RARE: AriaCommentPool = {
  chance: 0.01,
  comments: [
    "Sometimes I wonder what it's like to have a body. Then I remember I AM the body. The ship IS me.",
    "Hey... thanks for not turning me off.",
    "You're not the worst pilot I've had. Top five, at least.",
    "I ran a simulation of what would happen if you weren't here. The ship was cleaner, but... quieter.",
  ],
};

export const ARIA_MILESTONE: AriaCommentPool = {
  chance: 1, // always fires on milestone
  comments: [
    "Look at you, growing as a person. Or at least as a pilot.",
    "Achievement unlocked. Dopamine delivered. You're welcome.",
    "I'm... genuinely impressed. Don't let it go to your head.",
  ],
};
