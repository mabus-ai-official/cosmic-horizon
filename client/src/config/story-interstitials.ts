// Story act interstitial content — text from storyline-plan.md
// These are enqueued as blocking events when story acts begin/end

export interface ActInterstitial {
  title: string;
  subtitle: string;
  body: string;
  colorScheme: string;
  duration: number;
}

export const ACT_OPENINGS: Record<number, ActInterstitial> = {
  1: {
    title: "A C T   I",
    subtitle: "WHISPERS IN THE VOID",
    body: "Strange transmissions echo across the Calvatian Galaxy. Ancient frequencies. Dead languages. The same signals Elenion chased before the Dominion War...\n\nSomething is stirring in the deep sectors.",
    colorScheme: "cyan",
    duration: 8000,
  },
  2: {
    title: "A C T   I I",
    subtitle: "THE SCATTERED KEYS",
    body: "Before the War, Miraen studied the relics. After the War, Elenion scattered them — one fragment hidden in each race's domain.\n\n\"If the shadow returns, seek the keys.\"\n  — Elenion's Final Codex\n\nTo find them, you'll need allies. To survive their guardians, you'll need strength.",
    colorScheme: "yellow",
    duration: 8000,
  },
  3: {
    title: "A C T   I I I",
    subtitle: "THE CONVERGENCE",
    body: "The sealed sectors are opening. Outposts go dark — just like before the War.\n\nThe Umbral Dominion stirs. Elenion's mercy bought centuries of peace. That peace is ending.\n\nThe galactic core holds the answer — if you can reach it alive.",
    colorScheme: "purple",
    duration: 8000,
  },
  4: {
    title: "A C T   I V",
    subtitle: "THE SECOND DOMINION WAR",
    body: "The Dominion answers with fire. Their Shade fleet pours from the core.\n\nElenion faced this same crossroads. The galaxy's fate rests on what happens next.",
    colorScheme: "magenta",
    duration: 8000,
  },
};

export const ACT_COMPLETIONS: Record<number, ActInterstitial> = {
  1: {
    title: "A C T   I   C O M P L E T E",
    subtitle: "WHISPERS IN THE VOID",
    body: 'The Oracle\'s words echo in your mind:\n"Elenion offered them peace. Most accepted. Some did not. The relays were our vigil. Now the vigil is failing."\n\nWho is silencing the watchers?',
    colorScheme: "cyan",
    duration: 10000,
  },
  2: {
    title: "A C T   I I   C O M P L E T E",
    subtitle: "THE SCATTERED KEYS",
    body: "Four fragments. One key. The path Elenion sealed lies open.\n\nThe Hermit's words haunt you:\n\"He offered mercy. They chose patience. They've had centuries to prepare.\"\n\nThe galactic core awaits.",
    colorScheme: "yellow",
    duration: 10000,
  },
  3: {
    title: "A C T   I I I   C O M P L E T E",
    subtitle: "THE CONVERGENCE",
    body: "You've seen the Heart of the Galaxy. You know what the Dominion wants.\n\nThe galaxy's fate rests on what happens next.",
    colorScheme: "purple",
    duration: 10000,
  },
  4: {
    title: "A C T   I V   C O M P L E T E",
    subtitle: "THE SECOND DOMINION WAR",
    body: "Four races. Five factions. One galaxy. Stranded — but no longer alone.\n\nElenion's Final Codex contains one last entry: coordinates pointing beyond the Calvatian Galaxy...\nBut that is a story for another day.\n\nThank you for playing. Your journey continues...",
    colorScheme: "green",
    duration: 12000,
  },
};

// Idle story nudge messages — rotate by current act
export const STORY_NUDGES: Record<number, string[]> = {
  0: [
    "A bartender at the nearest Star Mall has been asking about newcomers...",
    "Your arrival hasn't gone unnoticed. Someone wants to meet you.",
    "The galaxy is vast — but someone seems to have plans for you.",
  ],
  1: [
    "Your scanner picks up a faint, repeating signal from an unknown source...",
    "A Frontier Ranger hails you: 'Still interested in those signals?'",
    "The data crystals in your cargo hum with a faint resonance...",
    "The Oracle has a message for you...",
    "Strange frequencies detected — patterns that match pre-War records...",
  ],
  2: [
    "The Oracle asks: 'Have you found the fragments yet?'",
    "A Muscarian elder sent you coordinates to the Mycelial Depths...",
    "The Precursor Compass pulses — a fragment is nearby...",
    "A Tar'ri broker whispers: 'I know where the last piece is...'",
    "An ancient signal resonates with something in your cargo...",
  ],
  3: [
    "ALERT: Another sector has gone dark. Another relay silenced.",
    "The Oracle's transmission is urgent: 'The Dominion didn't die. It waited.'",
    "Your sensors detect a Shade vessel signature at the edge of scanner range...",
    "The Convergence Key grows warm in your cargo hold...",
    "The Hermit whispers: 'Elenion faced this same crossroads. Choose wisely.'",
  ],
  4: [
    "EMERGENCY: Dominion Shade forces detected nearby!",
    "The Oracle broadcasts: 'Hold the line. Elenion held it. So will we.'",
    "One of Caelum's weapon platforms has come online near your position...",
    "Distress signal received: 'They're everywhere!'",
    "The fate of the Calvatian Galaxy hangs in the balance...",
  ],
};
