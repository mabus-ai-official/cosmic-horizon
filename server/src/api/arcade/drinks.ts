import type { DrinkEffect, DrinkEffectType } from "./constants";

interface DrinkDef {
  id: string;
  name: string;
  flavorText: string;
  effects: DrinkEffect[];
}

const DRINKS: DrinkDef[] = [
  {
    id: "nebula_fizz",
    name: "Nebula Fizz",
    flavorText:
      "A sparkling concoction of ionized gas and citrus. Tickles the reflexes.",
    effects: [{ type: "speed_boost", targetSelf: true, magnitude: 0.8 }],
  },
  {
    id: "void_stout",
    name: "Void Stout",
    flavorText: "Dense, dark, and heavy. Like drinking a collapsed star.",
    effects: [{ type: "slow_down", targetSelf: false, magnitude: 1.4 }],
  },
  {
    id: "plasma_shot",
    name: "Plasma Shot",
    flavorText: "Burns on the way down. Everything looks sharper after.",
    effects: [{ type: "accuracy_up", targetSelf: true, magnitude: 1.3 }],
  },
  {
    id: "asteroid_ale",
    name: "Asteroid Ale",
    flavorText:
      "Brewed from fermented space wheat. A classic belt-miner drink.",
    effects: [{ type: "accuracy_down", targetSelf: false, magnitude: 0.7 }],
  },
  {
    id: "quantum_cocktail",
    name: "Quantum Cocktail",
    flavorText:
      "Is it good? Is it bad? You won't know until you observe the results.",
    effects: [{ type: "double_or_nothing", targetSelf: true, magnitude: 2.0 }],
  },
  {
    id: "pirate_grog",
    name: "Pirate Grog",
    flavorText:
      "The bartender says it's 'an acquired taste'. It tastes like engine coolant.",
    effects: [{ type: "sabotage", targetSelf: false, magnitude: 0.5 }],
  },
];

interface ComboResult {
  name: string;
  bonusEffect: DrinkEffect;
}

const COMBO_TABLE: Record<string, ComboResult> = {
  "nebula_fizz+plasma_shot": {
    name: "Hyperdrive",
    bonusEffect: { type: "speed_boost", targetSelf: true, magnitude: 0.6 },
  },
  "void_stout+pirate_grog": {
    name: "Black Hole Bomb",
    bonusEffect: { type: "sabotage", targetSelf: false, magnitude: 0.3 },
  },
  "plasma_shot+quantum_cocktail": {
    name: "Schrödinger's Aim",
    bonusEffect: { type: "accuracy_up", targetSelf: true, magnitude: 1.5 },
  },
  "nebula_fizz+void_stout": {
    name: "Event Horizon",
    bonusEffect: { type: "phantom_zone", targetSelf: false, magnitude: 3 },
  },
  "asteroid_ale+pirate_grog": {
    name: "Belt Buster",
    bonusEffect: { type: "accuracy_down", targetSelf: false, magnitude: 0.5 },
  },
  "nebula_fizz+asteroid_ale": {
    name: "Cosmic Mule",
    bonusEffect: { type: "speed_boost", targetSelf: true, magnitude: 0.7 },
  },
  "plasma_shot+pirate_grog": {
    name: "Saboteur's Delight",
    bonusEffect: { type: "sabotage", targetSelf: false, magnitude: 0.4 },
  },
  "void_stout+quantum_cocktail": {
    name: "Gravity Well",
    bonusEffect: { type: "slow_down", targetSelf: false, magnitude: 1.6 },
  },
  "asteroid_ale+quantum_cocktail": {
    name: "Miner's Gambit",
    bonusEffect: {
      type: "double_or_nothing",
      targetSelf: true,
      magnitude: 2.5,
    },
  },
  "void_stout+plasma_shot": {
    name: "Dark Matter Shot",
    bonusEffect: { type: "accuracy_up", targetSelf: true, magnitude: 1.2 },
  },
};

function comboKey(a: string, b: string): string {
  return [a, b].sort().join("+");
}

export function getDrinkMenu(): {
  id: string;
  name: string;
  flavorText: string;
}[] {
  return DRINKS.map((d) => ({
    id: d.id,
    name: d.name,
    flavorText: d.flavorText,
  }));
}

export function resolveDrinkEffects(
  playerDrinks: string[],
  opponentDrinks: string[],
): { selfEffects: DrinkEffect[]; opponentEffects: DrinkEffect[] } {
  const selfEffects: DrinkEffect[] = [];
  const opponentEffects: DrinkEffect[] = [];

  // Resolve player's own drinks
  for (const drinkId of playerDrinks) {
    const drink = DRINKS.find((d) => d.id === drinkId);
    if (!drink) continue;

    for (const effect of drink.effects) {
      if (effect.type === "mirror") {
        // Copy opponent's last drink effect
        if (opponentDrinks.length > 0) {
          const lastOppDrink = DRINKS.find(
            (d) => d.id === opponentDrinks[opponentDrinks.length - 1],
          );
          if (lastOppDrink) {
            for (const e of lastOppDrink.effects) {
              selfEffects.push({ ...e, targetSelf: true });
            }
          }
        }
      } else if (effect.targetSelf) {
        selfEffects.push(effect);
      } else {
        opponentEffects.push(effect);
      }
    }
  }

  // Check for combos in player's drink history
  for (let i = 0; i < playerDrinks.length - 1; i++) {
    const key = comboKey(playerDrinks[i], playerDrinks[i + 1]);
    const combo = COMBO_TABLE[key];
    if (combo) {
      if (combo.bonusEffect.targetSelf) {
        selfEffects.push(combo.bonusEffect);
      } else {
        opponentEffects.push(combo.bonusEffect);
      }
    }
  }

  return { selfEffects, opponentEffects };
}

export function getRandomDrinkId(): string {
  return DRINKS[Math.floor(Math.random() * DRINKS.length)].id;
}
