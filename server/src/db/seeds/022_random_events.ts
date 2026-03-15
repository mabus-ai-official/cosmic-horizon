import { Knex } from "knex";

function eventId(n: number): string {
  return `re000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}

export async function seed(knex: Knex): Promise<void> {
  const events = [
    // ═══════════════════════════════════════════════
    // ACTION-TRIGGERED EVENTS (1-10)
    // ═══════════════════════════════════════════════

    // 1. Distress Signal — triggered by moving to a sector
    {
      id: eventId(1),
      event_key: "distress_signal",
      title: "Distress Signal Detected",
      description:
        "Your sensors have picked up a faint distress signal from a nearby sector. Someone is in trouble — will you investigate?",
      trigger_type: "action",
      trigger_conditions: JSON.stringify({ action: "explore", minLevel: 5 }),
      spawn_chance: 0.03,
      cooldown_hours: 24,
      max_occurrences: 0,
      rewards: JSON.stringify({ credits: 2000, xp: 200 }),
      min_chapter: 1,
    },
    // 2. Pirate Ambush — triggered by moving to an unprotected sector
    {
      id: eventId(2),
      event_key: "pirate_ambush",
      title: "Pirate Ambush!",
      description:
        "A pirate raider drops out of warp directly ahead! Weapons are hot — prepare for combat or attempt to flee.",
      trigger_type: "action",
      trigger_conditions: JSON.stringify({ action: "explore", minLevel: 8 }),
      spawn_chance: 0.05,
      cooldown_hours: 12,
      max_occurrences: 0,
      rewards: JSON.stringify({ credits: 3000, xp: 300 }),
      min_chapter: 1,
    },
    // 3. Trade Opportunity — triggered by completing a trade
    {
      id: eventId(3),
      event_key: "trade_opportunity",
      title: "Rare Trade Opportunity",
      description:
        "A merchant hails you with an urgent request — deliver a rare commodity within the hour for double the usual payment.",
      trigger_type: "action",
      trigger_conditions: JSON.stringify({ action: "trade", minLevel: 3 }),
      spawn_chance: 0.04,
      cooldown_hours: 18,
      max_occurrences: 0,
      rewards: JSON.stringify({ credits: 5000, xp: 250 }),
      min_chapter: 1,
    },
    // 4. Derelict Discovery — triggered by scanning
    {
      id: eventId(4),
      event_key: "derelict_discovery",
      title: "Derelict Vessel Detected",
      description:
        "Your scanners have revealed a derelict vessel drifting in the void. Its cargo hold may contain salvage — or something more dangerous.",
      trigger_type: "action",
      trigger_conditions: JSON.stringify({ action: "scan", minLevel: 10 }),
      spawn_chance: 0.08,
      cooldown_hours: 24,
      max_occurrences: 0,
      rewards: JSON.stringify({ credits: 4000, xp: 350 }),
      min_chapter: 1,
    },
    // 5. Fungal Bloom — triggered by colonizing
    {
      id: eventId(5),
      event_key: "fungal_bloom",
      title: "Mycelial Bloom",
      description:
        "A rare fungal bloom has erupted on a nearby world! The spores could yield valuable resources if harvested quickly.",
      trigger_type: "action",
      trigger_conditions: JSON.stringify({ action: "colonize", minLevel: 10 }),
      spawn_chance: 0.05,
      cooldown_hours: 48,
      max_occurrences: 0,
      rewards: JSON.stringify({ credits: 3000, xp: 400 }),
      min_chapter: 2,
    },
    // 6. Smuggler's Offer — triggered by trading at Syndicate outpost
    {
      id: eventId(6),
      event_key: "smugglers_offer",
      title: "A Whisper in the Shadows",
      description:
        "A cloaked figure approaches with a proposition — deliver contraband to a remote outpost for a generous payment. No questions asked.",
      trigger_type: "action",
      trigger_conditions: JSON.stringify({ action: "trade", minLevel: 12 }),
      spawn_chance: 0.1,
      cooldown_hours: 24,
      max_occurrences: 0,
      rewards: JSON.stringify({ credits: 8000, xp: 200 }),
      min_chapter: 2,
    },
    // 7. Ranger Emergency — triggered by visiting Ranger sectors
    {
      id: eventId(7),
      event_key: "ranger_emergency",
      title: "Frontier Rangers: Emergency",
      description:
        "The Frontier Rangers are requesting immediate backup! Hostile forces have been detected near a patrol route.",
      trigger_type: "action",
      trigger_conditions: JSON.stringify({ action: "explore", minLevel: 15 }),
      spawn_chance: 0.06,
      cooldown_hours: 24,
      max_occurrences: 0,
      rewards: JSON.stringify({ credits: 4000, xp: 400 }),
      min_chapter: 2,
    },
    // 8. Scholar's Request — triggered by scanning
    {
      id: eventId(8),
      event_key: "scholars_request",
      title: "A Scholar's Urgent Request",
      description:
        "A Cosmic Scholar contacts you via secure channel — they need scan data from your current region for critical research. The compensation is generous.",
      trigger_type: "action",
      trigger_conditions: JSON.stringify({ action: "scan", minLevel: 12 }),
      spawn_chance: 0.04,
      cooldown_hours: 36,
      max_occurrences: 0,
      rewards: JSON.stringify({ credits: 3000, xp: 500 }),
      min_chapter: 3,
    },
    // 9. Combat Challenge — triggered by combat victory
    {
      id: eventId(9),
      event_key: "combat_challenge",
      title: "A Warrior's Challenge",
      description:
        "A Kalin warrior hails you — impressed by your combat prowess. They challenge you to a formal duel for honor and a unique reward.",
      trigger_type: "action",
      trigger_conditions: JSON.stringify({
        action: "combat_destroy",
        minLevel: 15,
      }),
      spawn_chance: 0.03,
      cooldown_hours: 48,
      max_occurrences: 0,
      rewards: JSON.stringify({ credits: 5000, xp: 500 }),
      min_chapter: 3,
    },
    // 10. Mycelial Surge — triggered by visiting spore nodes
    {
      id: eventId(10),
      event_key: "mycelial_surge",
      title: "Mycelial Energy Surge",
      description:
        "The Spore Network pulses with unprecedented energy! A nearby node is broadcasting an invitation — follow the signal to discover its source.",
      trigger_type: "action",
      trigger_conditions: JSON.stringify({ action: "explore", minLevel: 20 }),
      spawn_chance: 0.08,
      cooldown_hours: 72,
      max_occurrences: 0,
      rewards: JSON.stringify({ credits: 6000, xp: 600 }),
      min_chapter: 4,
    },

    // ═══════════════════════════════════════════════
    // GAME-STATE SPAWNED EVENTS (11-20)
    // ═══════════════════════════════════════════════

    // 11. Colony Crisis — planet happiness drops below 30
    {
      id: eventId(11),
      event_key: "colony_crisis",
      title: "Colony in Crisis",
      description:
        "One of your colonies is facing a food shortage! Deliver supplies urgently to prevent unrest and population decline.",
      trigger_type: "game_state",
      trigger_conditions: JSON.stringify({ maxPlanetHappiness: 30 }),
      spawn_chance: 0.15,
      cooldown_hours: 12,
      max_occurrences: 0,
      rewards: JSON.stringify({ credits: 2000, xp: 300 }),
      min_chapter: 1,
    },
    // 12. Trade Route Disruption — caravan lost
    {
      id: eventId(12),
      event_key: "trade_disruption",
      title: "Trade Route Disrupted",
      description:
        "Pirates have raided one of the major trade routes. Escort a replacement caravan to restore the flow of goods.",
      trigger_type: "game_state",
      trigger_conditions: JSON.stringify({ minLevel: 10 }),
      spawn_chance: 0.05,
      cooldown_hours: 48,
      max_occurrences: 0,
      rewards: JSON.stringify({ credits: 4000, xp: 350 }),
      min_chapter: 2,
    },
    // 13. Faction Tension — high fame with one faction
    {
      id: eventId(13),
      event_key: "faction_tension",
      title: "Faction Tensions Rising",
      description:
        "Your growing influence has drawn attention. A rival faction requests a diplomatic meeting to discuss the balance of power.",
      trigger_type: "game_state",
      trigger_conditions: JSON.stringify({
        minFame: 60,
        factionId: "frontier_rangers",
      }),
      spawn_chance: 0.05,
      cooldown_hours: 72,
      max_occurrences: 3,
      rewards: JSON.stringify({ credits: 3000, xp: 400 }),
      min_chapter: 3,
    },
    // 14. New Frontier — explored 500+ sectors
    {
      id: eventId(14),
      event_key: "new_frontier",
      title: "The New Frontier",
      description:
        "Your extensive exploration has revealed a previously unmapped region of space. Ancient signals emanate from its center.",
      trigger_type: "game_state",
      trigger_conditions: JSON.stringify({ minExploredSectors: 500 }),
      spawn_chance: 1.0,
      cooldown_hours: 0,
      max_occurrences: 1,
      rewards: JSON.stringify({ credits: 10000, xp: 1000 }),
      min_chapter: 3,
    },
    // 15. Mentor's Call — player reaches level 25
    {
      id: eventId(15),
      event_key: "mentors_call",
      title: "The Mentor's Call",
      description:
        "High Sage Alarion has sent a personal invitation. He wishes to share wisdom earned through decades of leadership.",
      trigger_type: "game_state",
      trigger_conditions: JSON.stringify({ minLevel: 25 }),
      spawn_chance: 1.0,
      cooldown_hours: 0,
      max_occurrences: 1,
      rewards: JSON.stringify({ credits: 5000, xp: 750 }),
      min_chapter: 2,
    },
    // 16. Economic Boom — credits above 500k
    {
      id: eventId(16),
      event_key: "economic_boom",
      title: "Economic Boom",
      description:
        "Your wealth has attracted investment opportunities. A consortium offers a lucrative deal — fund an expedition and share the profits.",
      trigger_type: "game_state",
      trigger_conditions: JSON.stringify({ minCredits: 500000 }),
      spawn_chance: 0.1,
      cooldown_hours: 168,
      max_occurrences: 3,
      rewards: JSON.stringify({ credits: 25000, xp: 500 }),
      min_chapter: 2,
    },
    // 17. Alliance Test — syndicate with 3+ members
    {
      id: eventId(17),
      event_key: "alliance_test",
      title: "Alliance Under Fire",
      description:
        "Your syndicate's strength is being tested. A coordinated threat demands a cooperative response from all members.",
      trigger_type: "game_state",
      trigger_conditions: JSON.stringify({
        requiresSyndicate: true,
        minSyndicateMembers: 3,
      }),
      spawn_chance: 0.08,
      cooldown_hours: 96,
      max_occurrences: 0,
      rewards: JSON.stringify({ credits: 8000, xp: 600 }),
      min_chapter: 3,
    },
    // 18. Ancient Signal — Chapter 5+
    {
      id: eventId(18),
      event_key: "ancient_signal",
      title: "Primordium Echo",
      description:
        "A faint signal, impossibly old, pulses from the galactic core. The Primordium may not be as dormant as believed.",
      trigger_type: "game_state",
      trigger_conditions: JSON.stringify({ minLevel: 30 }),
      spawn_chance: 0.05,
      cooldown_hours: 168,
      max_occurrences: 3,
      rewards: JSON.stringify({ credits: 7000, xp: 700 }),
      min_chapter: 5,
    },
    // 19. The Wanderer — 100+ NPC encounters
    {
      id: eventId(19),
      event_key: "the_wanderer",
      title: "The Wanderer Returns",
      description:
        "The Hermit has appeared again — this time with a philosophical quest that only the most connected traveler can complete.",
      trigger_type: "game_state",
      trigger_conditions: JSON.stringify({ minNpcEncounters: 100 }),
      spawn_chance: 1.0,
      cooldown_hours: 0,
      max_occurrences: 1,
      rewards: JSON.stringify({ credits: 8000, xp: 800 }),
      min_chapter: 4,
    },
    // 20. Galactic Crisis — Chapter 6+, weekly event
    {
      id: eventId(20),
      event_key: "galactic_crisis",
      title: "Galactic Crisis",
      description:
        "A galaxy-wide emergency demands immediate action. Multiple sectors are under threat — coordinate the response.",
      trigger_type: "game_state",
      trigger_conditions: JSON.stringify({ minLevel: 35 }),
      spawn_chance: 0.15,
      cooldown_hours: 168,
      max_occurrences: 0,
      rewards: JSON.stringify({ credits: 15000, xp: 1000 }),
      min_chapter: 6,
    },
  ];

  for (const e of events) {
    const existing = await knex("random_event_definitions")
      .where({ id: e.id })
      .first();
    if (!existing) {
      await knex("random_event_definitions").insert(e);
    }
  }
}
