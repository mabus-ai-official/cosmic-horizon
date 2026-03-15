import { Knex } from "knex";

function storyMissionId(n: number): string {
  return `e0000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}

function phaseId(mission: number, phase: number): string {
  return `p0000000-${String(mission).padStart(4, "0")}-0000-0000-${String(phase).padStart(12, "0")}`;
}

function choiceId(key: string): string {
  const hash = key
    .split("")
    .reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0);
  return `c0000000-0000-0000-0000-${String(Math.abs(hash)).padStart(12, "0")}`;
}

async function upsertMission(knex: Knex, mission: Record<string, unknown>) {
  const existing = await knex("mission_templates")
    .where({ id: mission.id })
    .first();
  if (existing) {
    await knex("mission_templates").where({ id: mission.id }).update(mission);
  } else {
    await knex("mission_templates").insert(mission);
  }
}

async function upsertPhase(knex: Knex, phase: Record<string, unknown>) {
  const existing = await knex("mission_phases").where({ id: phase.id }).first();
  if (existing) {
    await knex("mission_phases").where({ id: phase.id }).update(phase);
  } else {
    await knex("mission_phases").insert(phase);
  }
}

async function upsertChoice(knex: Knex, choice: Record<string, unknown>) {
  const existing = await knex("mission_choices")
    .where({ id: choice.id })
    .first();
  if (existing) {
    await knex("mission_choices").where({ id: choice.id }).update(choice);
  } else {
    await knex("mission_choices").insert(choice);
  }
}

export async function seed(knex: Knex): Promise<void> {
  // =====================================================================
  // CHAPTER 5: "The Quest for Harmony" — Missions 32-39 (Act 3)
  // The coalition forms and the shadow threat emerges.
  // =====================================================================

  const chapter5Missions = [
    {
      id: storyMissionId(32),
      title: "Outpost Under Siege",
      description:
        "Defend a Tar'ri outpost from unknown attackers, then investigate the wreckage for clues.",
      type: "visit_sector",
      objectives: JSON.stringify({ sectorsToVisit: 3 }),
      reward_credits: 5000,
      reward_xp: 500,
      difficulty: 2,
      act: 3,
      chapter: 5,
      story_order: 32,
      prerequisite_mission_id: storyMissionId(31),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        "An emergency broadcast cuts through your comm channels — a Tar'ri outpost on the frontier is under attack. The assailants are using unfamiliar weapons, energy signatures that match nothing in any faction's database. By the time you arrive, the battle is already raging: three warships circle the outpost like predators, their hulls shimmering with a dark iridescence.\n\nThe outpost's defenders are outgunned. Without help, they will fall within the hour. And whoever these attackers are, they are not here for territory or trade — they are here for something specific.",
      recap_text:
        "An unknown force attacked a Tar'ri outpost with unrecognizable weapons. You rushed to defend.",
      hints: JSON.stringify([
        "Engage the three attackers circling the outpost.",
        "After the battle, investigate the wreckage for identification.",
      ]),
    },
    {
      id: storyMissionId(33),
      title: "Evidence Trail",
      description:
        "Trace the attackers' origin by scanning sectors and delivering recovered tech fragments to Lyra Starwind.",
      type: "visit_sector",
      objectives: JSON.stringify({ scansRequired: 6 }),
      reward_credits: 5500,
      reward_xp: 550,
      difficulty: 2,
      act: 3,
      chapter: 5,
      story_order: 33,
      prerequisite_mission_id: storyMissionId(32),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        'The wreckage yields unsettling clues: hull fragments laced with organic compounds, weapons powered by a corrupted form of cyrillium, and navigation logs pointing to sectors deep in unexplored space. Lyra Starwind, the archaeologist who first mapped the Precursor vault, recognizes the metallurgy.\n\n"These alloys predate every known civilization," she says, turning a fragment in her hands. "Whoever built these ships had access to Precursor technology — or something even older. I need more samples to be certain. Scan the sectors along their flight path and bring me everything you find."',
      recap_text:
        "Wreckage from the attackers contained Precursor-era alloys. Lyra Starwind needs more evidence to trace their origin.",
      hints: JSON.stringify([
        "Scan sectors along the attackers' projected flight path.",
        "Collect tech fragments and deliver them to Lyra.",
      ]),
    },
    {
      id: storyMissionId(34),
      title: "The Summit",
      description:
        "Meet with Alarion, Raxus, and Valandor to present the evidence and forge a response.",
      type: "visit_sector",
      objectives: JSON.stringify({ npcId: "alarion" }),
      reward_credits: 6000,
      reward_xp: 600,
      difficulty: 2,
      act: 3,
      chapter: 5,
      story_order: 34,
      prerequisite_mission_id: storyMissionId(33),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        "The evidence is compelling enough to warrant an emergency summit. High Sage Alarion convenes the leaders aboard the Star Seeker — neutral ground between the factions. Commander Raxus arrives in full battle regalia, his warship flanked by an honor guard. Valandor materializes in the meditation chamber, his ethereal presence filling the room with calm.\n\nThe mood is tense. The Kalin want to strike preemptively. The Vedic counsel patience and study. Alarion looks to you — the one who has seen the wreckage firsthand. Your testimony will shape the response.",
      recap_text:
        "An emergency summit convened aboard the Star Seeker to address the mysterious attackers.",
      hints: JSON.stringify([
        "Meet each leader in their preferred setting aboard the Star Seeker.",
        "Your firsthand account will carry significant weight.",
      ]),
    },
    {
      id: storyMissionId(35),
      title: "Coalition Vote",
      description:
        "Work with Elenion to determine the structure of the new coalition.",
      type: "visit_sector",
      objectives: JSON.stringify({ choiceId: choiceId("coalition_structure") }),
      reward_credits: 6500,
      reward_xp: 650,
      difficulty: 2,
      act: 3,
      chapter: 5,
      story_order: 35,
      prerequisite_mission_id: storyMissionId(34),
      has_phases: false,
      has_choices: true,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        'The summit agrees on one thing: a unified response is necessary. But the form that unity takes is fiercely debated. Elenion, the diplomat who brokered the original peace, facilitates the discussion. Three models are proposed.\n\nA military alliance under Kalin command — efficient but authoritarian. A trade federation led by Tar\'ri economic principles — prosperous but slow to act. Or a hybrid council with shared leadership — balanced but prone to deadlock.\n\nElenion turns to you. "You have earned the trust of every faction at this table. Your voice carries weight that mine does not. What do you recommend?"',
      recap_text:
        "The summit agreed to form a coalition but debated its structure. Elenion asked for your recommendation.",
      hints: JSON.stringify([
        "This is a permanent choice that shapes the coalition for the rest of the story.",
        "Consider how each structure might respond to future threats.",
      ]),
    },
    {
      id: storyMissionId(36),
      title: "Shadow Entity",
      description:
        "Investigate sites of shadow energy and survive ambushes by shadow constructs.",
      type: "visit_sector",
      objectives: JSON.stringify({ eventsToInvestigate: 4 }),
      reward_credits: 7000,
      reward_xp: 700,
      difficulty: 2,
      act: 3,
      chapter: 5,
      story_order: 36,
      prerequisite_mission_id: storyMissionId(35),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        'The Oracle — that enigmatic presence woven into the fabric of deep space — reaches out to you directly for the first time. Its voice resonates through your ship\'s bio-resonance array like a chord struck on an instrument the size of a star.\n\n"The shadow that attacked the outpost is not new. It has lurked at the edges of perception for millennia, feeding on the spaces between stars. I have watched it grow. Now it moves openly, and that means it is confident. You must understand what you face before you can fight it."\n\nThe Oracle provides coordinates: four sites where shadow energy has pooled like dark water in cosmic depressions.',
      recap_text:
        "The Oracle revealed the shadow entity has existed for millennia and is now moving openly. You must investigate its energy sites.",
      hints: JSON.stringify([
        "Investigate the four shadow energy sites the Oracle marked.",
        "Be prepared for ambushes — shadow constructs guard these sites.",
      ]),
    },
    {
      id: storyMissionId(37),
      title: "The Hidden Enemy",
      description:
        "Use modified sensors to scan sectors and navigate to the source of the shadow transmissions.",
      type: "visit_sector",
      objectives: JSON.stringify({ scansRequired: 5 }),
      reward_credits: 7500,
      reward_xp: 750,
      difficulty: 2,
      act: 3,
      chapter: 5,
      story_order: 37,
      prerequisite_mission_id: storyMissionId(36),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        'Archivist Thal, the reclusive keeper of Vedic historical records, contacts you through encrypted channels. The shadow energy signatures you catalogued match entries in the oldest Vedic archives — records so ancient they predate the Vedic civilization itself.\n\n"These records describe an intelligence that exists in the gaps between dimensions," Thal explains, his voice thin with age and worry. "It was sealed away by the Precursors using a frequency barrier. Someone — or something — has been weakening that barrier. I have modified a sensor array to detect the barrier\'s resonance. Use it to find where the breach is worst."',
      recap_text:
        "Archivist Thal revealed the shadow entity was sealed by the Precursors. A barrier is weakening, and modified sensors can trace the breach.",
      hints: JSON.stringify([
        "Scan sectors with the modified sensor array Thal provided.",
        "Navigate toward the strongest breach signatures.",
      ]),
    },
    {
      id: storyMissionId(38),
      title: "Forging Alliances",
      description:
        "Escort coalition supply convoys and establish forward bases through trade.",
      type: "visit_sector",
      objectives: JSON.stringify({ caravansToEscort: 2 }),
      reward_credits: 8000,
      reward_xp: 800,
      difficulty: 2,
      act: 3,
      chapter: 5,
      story_order: 38,
      prerequisite_mission_id: storyMissionId(37),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        "The coalition is forming, but alliances forged in conference rooms must be tempered in the field. Supply convoys need protection as they establish forward operating bases along the frontier. Raiders — some opportunistic, some suspiciously well-armed — harass every shipment.\n\nThe work is unglamorous but essential. Every convoy that arrives safely is another link in the chain. Every forward base is a staging point for the fight ahead. The coalition needs to prove it can function before the real test arrives.",
      recap_text:
        "The new coalition must prove itself through practical cooperation — escorting convoys and building forward bases.",
      hints: JSON.stringify([
        "Escort supply convoys safely through contested sectors.",
        "Trade resources to establish and supply forward bases.",
      ]),
    },
    {
      id: storyMissionId(39),
      title: "The Fragile Pact",
      description:
        "Meet Commander Raxus to discuss Kalin weapons derived from the artifact, then decide how to handle the revelation.",
      type: "visit_sector",
      objectives: JSON.stringify({ npcId: "commander_raxus" }),
      reward_credits: 8500,
      reward_xp: 850,
      difficulty: 2,
      act: 3,
      chapter: 5,
      story_order: 39,
      prerequisite_mission_id: storyMissionId(38),
      has_phases: true,
      has_choices: true,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        "Commander Raxus requests a private meeting. His tone is uncharacteristically hesitant. When you arrive at his quarters, the reason is clear: the Kalin have been secretly weaponizing technology derived from the Precursor artifact. The weapons are powerful — devastatingly so — but their development violates the coalition agreement.\n\nRaxus is conflicted. The weapons could be the edge the coalition needs against the shadow entity. But if the other factions discover the deception, the fragile pact could shatter. He trusts you with the truth. What you do with it is your choice.",
      recap_text:
        "Raxus revealed the Kalin secretly weaponized the Precursor artifact. The coalition's trust hangs in the balance.",
      hints: JSON.stringify([
        "Meet Raxus privately to learn about the Kalin weapons program.",
        "Your choice will affect coalition stability. Codex: 'The Fragile Coalition.'",
      ]),
    },
  ];

  // =====================================================================
  // CHAPTER 6: "Unveiling the Shadows" — Missions 40-46 (Act 3)
  // The journey to the galactic core and confrontation with the Primordium.
  // =====================================================================

  const chapter6Missions = [
    {
      id: storyMissionId(40),
      title: "Into the Core",
      description:
        "Navigate toward the galactic core with Caelum's shield modifications, surviving ambushes along the way.",
      type: "visit_sector",
      objectives: JSON.stringify({ sectorsToVisit: 10 }),
      reward_credits: 9000,
      reward_xp: 900,
      difficulty: 2,
      act: 3,
      chapter: 6,
      story_order: 40,
      prerequisite_mission_id: storyMissionId(39),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        'The trail leads inward — toward the galactic core. Caelum, the Muscarian engineer whose genius has kept your ship alive through a dozen crises, installs prototype shield modifications that should protect against the intensifying radiation. "Should" being the operative word.\n\n"The core is not meant for organic travel," Caelum warns as he calibrates the new emitters. "Radiation increases exponentially. Gravity wells shift unpredictably. And whatever sealed the shadow entity chose the core for a reason — it is the most hostile environment in the galaxy. Perfect for a prison."',
      recap_text:
        "Caelum's shield modifications prepared your ship for the journey to the galactic core, where the shadow entity was originally sealed.",
      hints: JSON.stringify([
        "Navigate through increasingly dangerous core sectors.",
        "Caelum's shields will protect you, but stay alert for ambushes.",
      ]),
    },
    {
      id: storyMissionId(41),
      title: "Ancient Traps",
      description:
        "Investigate Precursor trap mechanisms and scan for a safe route through the minefield.",
      type: "visit_sector",
      objectives: JSON.stringify({ eventsToInvestigate: 4 }),
      reward_credits: 9500,
      reward_xp: 950,
      difficulty: 2,
      act: 3,
      chapter: 6,
      story_order: 41,
      prerequisite_mission_id: storyMissionId(40),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        'The Precursors did not simply seal the shadow entity — they built an elaborate lattice of traps and barriers around its prison. Professor Thane, a xenoarchaeologist specializing in Precursor defense systems, has joined the expedition. His excitement is barely contained despite the danger.\n\n"Magnificent," he breathes as your sensors detect the first trap — a gravity mine the size of a small moon, still active after untold millennia. "These are automated defense systems designed to destroy anything approaching the seal. We need to understand their trigger mechanisms to find a safe path through."',
      recap_text:
        "Professor Thane identified Precursor defense traps guarding the shadow entity's prison. A safe route must be found.",
      hints: JSON.stringify([
        "Investigate trap mechanisms to understand their trigger patterns.",
        "Scan sectors carefully to chart a safe path.",
      ]),
    },
    {
      id: storyMissionId(42),
      title: "The Primordium",
      description:
        "Meet the Oracle at the core threshold and investigate the ancient Primordium structures.",
      type: "visit_sector",
      objectives: JSON.stringify({ npcId: "the_oracle" }),
      reward_credits: 10000,
      reward_xp: 1000,
      difficulty: 2,
      act: 3,
      chapter: 6,
      story_order: 42,
      prerequisite_mission_id: storyMissionId(41),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        'Beyond the trap lattice, the Oracle waits — not as a voice or a presence, but as a physical manifestation. A structure of crystallized light hovers at the threshold of the core, ancient beyond reckoning. This is what the Oracle truly is: a Precursor construct, the last guardian of the seal.\n\n"You have come further than any organic species in ten thousand years," the Oracle says. "Beyond me lies the Primordium — the original construction that holds the seal. It was built to last forever. But forever is a long time, and the shadow has been patient. Come. See what remains."',
      recap_text:
        "The Oracle revealed itself as a Precursor construct — the last guardian of the seal. Beyond it lies the Primordium.",
      hints: JSON.stringify([
        "Meet the Oracle at the core threshold.",
        "Investigate the Primordium structures to understand the seal.",
      ]),
    },
    {
      id: storyMissionId(43),
      title: "Gathering Storm",
      description:
        "Escort combined fleet convoys through dangerous sectors and defend the staging planet.",
      type: "visit_sector",
      objectives: JSON.stringify({ caravansToEscort: 3 }),
      reward_credits: 10500,
      reward_xp: 1050,
      difficulty: 2,
      act: 3,
      chapter: 6,
      story_order: 43,
      prerequisite_mission_id: storyMissionId(42),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        "The coalition mobilizes for a full-scale expedition to the Primordium. Ships from every faction converge on a staging planet near the core approach — the last habitable world before the radiation barrier. The logistics are staggering: fuel, weapons, food, medical supplies, all flowing through contested space.\n\nThe shadow entity is aware. Its constructs harry every convoy, probing for weakness. The combined fleet holds, but barely. Every shipment that arrives is a small victory. Every ship lost is a reminder of the stakes.",
      recap_text:
        "The coalition staged a full-scale expedition to the Primordium, but shadow constructs harried every convoy.",
      hints: JSON.stringify([
        "Escort coalition convoys safely to the staging planet.",
        "Defend the staging planet when shadow constructs attack in force.",
      ]),
    },
    {
      id: storyMissionId(44),
      title: "The Weapon Question",
      description:
        "Deliver cyrillium for weapons research and choose the weapon that will be built.",
      type: "visit_sector",
      objectives: JSON.stringify({ commodity: "cyrillium", quantity: 30 }),
      reward_credits: 11000,
      reward_xp: 1100,
      difficulty: 2,
      act: 3,
      chapter: 6,
      story_order: 44,
      prerequisite_mission_id: storyMissionId(43),
      has_phases: true,
      has_choices: true,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        "Miraen and Raxus present two weapon designs, each requiring massive quantities of cyrillium to construct. They cannot build both — there is not enough material or time.\n\nMiraen's resonance disruptor works with the Primordium's natural frequencies, dismantling shadow constructs by destabilizing their dimensional anchors. It is elegant, surgical, and leaves the environment intact. Raxus's quantum annihilator is raw destructive power — a weapon that erases matter from existence in targeted zones. It is devastating, efficient, and leaves nothing behind.\n\nThe choice will determine not just how the coalition fights, but what kind of galaxy survives the fight.",
      recap_text:
        "Two weapons were proposed: Miraen's ecological disruptor and Raxus's destructive annihilator. Only one can be built.",
      hints: JSON.stringify([
        "Deliver cyrillium to fund the weapons research.",
        "This is a permanent choice that determines your weapon for the final battles.",
      ]),
    },
    {
      id: storyMissionId(45),
      title: "The Final Approach",
      description:
        "Destroy Primordium sentinels and navigate to the core heart.",
      type: "visit_sector",
      objectives: JSON.stringify({ shipsToDestroy: 5 }),
      reward_credits: 11500,
      reward_xp: 1150,
      difficulty: 2,
      act: 3,
      chapter: 6,
      story_order: 45,
      prerequisite_mission_id: storyMissionId(44),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        "The weapon is built. The fleet is assembled. The approach to the Primordium begins in earnest — and the ancient structure does not welcome visitors. Sentinel constructs, dormant for millennia, activate as your fleet enters their perimeter. They are not shadow entities — they are the Primordium's own immune system, unable to distinguish between friend and foe after ages of isolation.\n\nFighting through them feels wrong, like breaking down the door of a temple. But there is no other way in. The seal is weakening. The shadow presses from within. If the coalition does not reach the core heart in time, the seal will fail on its own.",
      recap_text:
        "The Primordium's ancient sentinels activated against the fleet. The seal is weakening — time is running out.",
      hints: JSON.stringify([
        "Destroy sentinel constructs blocking the approach.",
        "Navigate to the core heart before the seal fails.",
      ]),
    },
    {
      id: storyMissionId(46),
      title: "Battle for the Galaxy",
      description:
        "Lead the coalition in a three-phase battle to secure the Primordium and defend the command station.",
      type: "visit_sector",
      objectives: JSON.stringify({ shipsToDestroy: 8 }),
      reward_credits: 12000,
      reward_xp: 1200,
      difficulty: 2,
      act: 3,
      chapter: 6,
      story_order: 46,
      prerequisite_mission_id: storyMissionId(45),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        "The seal breaks. Not slowly, not gracefully — it shatters like glass, and the shadow pours out. Warships formed from compressed darkness materialize by the dozen. The sky fills with enemy signatures. Alarion's voice cuts through the chaos on the command channel.\n\n\"All ships, this is High Sage Alarion. The seal has failed. The shadow is free. But we are here, and we are ready. Every species, every faction, every soul who answered the call — this is what we came for. Hold the line. Hold it for the galaxy.\"\n\nThe Battle for the Galaxy begins. Codex: 'The Last Stand.'",
      recap_text:
        "The seal shattered and the shadow entity broke free. Alarion rallied the coalition fleet for the decisive battle.",
      hints: JSON.stringify([
        "Phase 1: Destroy the shadow warships. Phase 2: Survive counterattacks.",
        "Phase 3: Defend the command station at all costs. Codex: 'The Last Stand.'",
      ]),
    },
  ];

  // =====================================================================
  // CHAPTER 7: "A New Dawn" — Missions 47-53 (Act 4)
  // Rebuilding after the battle, establishing new order.
  // =====================================================================

  const chapter7Missions = [
    {
      id: storyMissionId(47),
      title: "After the Storm",
      description:
        "Survey the damage across the galaxy and catalogue reconstruction needs.",
      type: "visit_sector",
      objectives: JSON.stringify({ sectorsToVisit: 8 }),
      reward_credits: 13000,
      reward_xp: 1300,
      difficulty: 3,
      act: 4,
      chapter: 7,
      story_order: 47,
      prerequisite_mission_id: storyMissionId(46),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        "The shadow is contained — for now. The weapon worked, driving the entity back into its dimensional prison while the Oracle reforged the seal. But the battle exacted a terrible price. Whole sectors lie in ruins. Stations drift dark and silent. The living bridges flicker with residual shadow energy.\n\nThe galaxy needs to know the extent of the damage before reconstruction can begin. Someone must survey the wreckage, count the losses, and bring back data the coalition can use to prioritize aid. That someone is you.",
      recap_text:
        "The shadow was contained but the battle devastated wide sectors. A damage survey is needed before rebuilding.",
      hints: JSON.stringify([
        "Visit sectors to survey battle damage and catalogue losses.",
        "Scan sectors to assess infrastructure and reconstruction needs.",
      ]),
    },
    {
      id: storyMissionId(48),
      title: "Miraen's Garden",
      description:
        "Colonize a devastated world and deliver food supplies to sustain the new settlement.",
      type: "visit_sector",
      objectives: JSON.stringify({ colonistsToDeposit: 200 }),
      reward_credits: 14000,
      reward_xp: 1400,
      difficulty: 3,
      act: 4,
      chapter: 7,
      story_order: 48,
      prerequisite_mission_id: storyMissionId(47),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        'Miraen, the Muscarian ecologist who helped design the resonance disruptor, has a vision for renewal. She has identified a world devastated by shadow energy — its biosphere shattered, its atmosphere thinned. But beneath the destruction, the planet\'s mycelial substrate is still alive. With colonists and resources, it can be reborn.\n\n"This world is a wound," Miraen says, her bioluminescent tendrils pulsing softly. "But wounds heal. We can accelerate the process. Plant colonists like seeds. Feed them. Water the soil with care. In a generation, this world will bloom again. It will be proof that we can undo what the shadow has done."',
      recap_text:
        "Miraen identified a devastated world that can be restored through colonization and careful ecological management.",
      hints: JSON.stringify([
        "Colonize the devastated world with 200 settlers.",
        "Deliver food supplies to sustain the new colony.",
      ]),
    },
    {
      id: storyMissionId(49),
      title: "Trade Routes Restored",
      description:
        "Rebuild galactic commerce and escort the first post-war trade caravan.",
      type: "visit_sector",
      objectives: JSON.stringify({ unitsToTrade: 40 }),
      reward_credits: 15000,
      reward_xp: 1500,
      difficulty: 3,
      act: 4,
      chapter: 7,
      story_order: 49,
      prerequisite_mission_id: storyMissionId(48),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        'Kovax Prime, ever the pragmatist, sees reconstruction through the lens of economics. "Charity fills bellies for a day. Trade routes fill them forever," the Tar\'ri merchant declares, spreading a holographic map of pre-war commerce across the table. "Half these routes are dead. Pirates, debris fields, collapsed infrastructure. We need to rebuild them — and we need to prove they are safe."\n\nThe first post-war caravan will be a symbol as much as a practical mission. If it arrives safely, confidence returns. If it fails, the fragile recovery could stall.',
      recap_text:
        "Kovax Prime proposed rebuilding trade routes as the foundation of galactic recovery. The first caravan must succeed.",
      hints: JSON.stringify([
        "Trade goods to reestablish commercial activity.",
        "Escort the first post-war caravan to prove the routes are safe.",
      ]),
    },
    {
      id: storyMissionId(50),
      title: "The Council Charter",
      description:
        "Meet Valandor and Elenion to draft the permanent Galactic Council charter.",
      type: "visit_sector",
      objectives: JSON.stringify({ npcId: "valandor" }),
      reward_credits: 16000,
      reward_xp: 1600,
      difficulty: 3,
      act: 4,
      chapter: 7,
      story_order: 50,
      prerequisite_mission_id: storyMissionId(49),
      has_phases: true,
      has_choices: true,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        "The wartime coalition was held together by necessity. Now, with the immediate threat contained, the question of permanent governance demands an answer. Valandor and Elenion — the philosopher and the diplomat — have been drafting proposals for a Galactic Council.\n\nThree models have emerged. An open council where any species or faction can join and vote. A founding council limited to the species that fought in the Battle for the Galaxy, with expansion possible later. Or an advisory council where representatives counsel but a rotating executive makes decisions.\n\nEach model has passionate advocates. And once again, your voice may be the deciding factor.",
      recap_text:
        "With the war won, the coalition must evolve into a permanent Galactic Council. Three governance models are proposed.",
      hints: JSON.stringify([
        "Meet Valandor and Elenion to understand each governance model.",
        "This is a permanent choice that determines the Council's structure.",
      ]),
    },
    {
      id: storyMissionId(51),
      title: "Caelum's Legacy",
      description:
        "Deliver tech components and investigate Precursor sites with Caelum.",
      type: "visit_sector",
      objectives: JSON.stringify({ commodity: "tech", quantity: 20 }),
      reward_credits: 17000,
      reward_xp: 1700,
      difficulty: 3,
      act: 4,
      chapter: 7,
      story_order: 51,
      prerequisite_mission_id: storyMissionId(50),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        'Caelum has been quiet since the battle — unusually so. The Muscarian engineer who once filled every silence with technical chatter has withdrawn into his workshop. When you find him, he is surrounded by Precursor fragments, his tools abandoned.\n\n"I kept us alive," he says without looking up. "My shields, my modifications, my weapons. But I also built a weapon that erased matter from existence. I looked at the shadow and built something that works the same way. What does that say about me?"\n\nCaelum needs purpose. He wants to repurpose Precursor technology for healing rather than destruction — but he needs help gathering materials and investigating sites where Precursor constructs remain intact.',
      recap_text:
        "Caelum struggles with the moral weight of his wartime inventions and seeks to repurpose Precursor technology for peaceful ends.",
      hints: JSON.stringify([
        "Deliver tech components for Caelum's new research.",
        "Investigate Precursor sites where intact constructs remain.",
      ]),
    },
    {
      id: storyMissionId(52),
      title: "Healing the Rift",
      description:
        "Meet Raxus for reconciliation and trade resources for a joint outpost.",
      type: "visit_sector",
      objectives: JSON.stringify({ npcId: "commander_raxus" }),
      reward_credits: 18000,
      reward_xp: 1800,
      difficulty: 3,
      act: 4,
      chapter: 7,
      story_order: 52,
      prerequisite_mission_id: storyMissionId(51),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        'The secret weapons program still casts a shadow over the coalition — no pun intended. Raxus carries the weight of it visibly now, his usual martial confidence diminished. He requests a meeting, not in a war room or a command deck, but in a garden on the Star Seeker — Miraen\'s arboretum, where bioluminescent flowers bloom in eternal twilight.\n\n"I was wrong," he says simply. It is the first time you have heard a Kalin commander admit error without qualification. "The weapons helped us win. But the deception nearly cost us the alliance. I want to make it right. Help me build something that proves the Kalin can be trusted."',
      recap_text:
        "Raxus acknowledged the damage caused by the secret weapons program and wants to rebuild trust through a joint venture.",
      hints: JSON.stringify([
        "Meet Raxus in Miraen's arboretum for reconciliation.",
        "Trade resources to fund a joint Kalin-coalition outpost.",
      ]),
    },
    {
      id: storyMissionId(53),
      title: "Dawn of the Council",
      description:
        "Attend the inaugural session of the Galactic Council with Alarion.",
      type: "visit_sector",
      objectives: JSON.stringify({ npcId: "alarion" }),
      reward_credits: 19000,
      reward_xp: 1900,
      difficulty: 3,
      act: 4,
      chapter: 7,
      story_order: 53,
      prerequisite_mission_id: storyMissionId(52),
      has_phases: false,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        "The day arrives. Representatives from every species, every faction, every world that survived the shadow war gather in the great hall of the newly constructed Council Chambers. The architecture blends Muscarian organic design with Kalin structural precision and Vedic ethereal aesthetics — a physical manifestation of unity.\n\nHigh Sage Alarion stands at the central podium, his bioluminescent tendrils radiating a warm, steady gold. He looks older than when you first met him — the journey has aged him, as it has aged all of you. But his eyes burn with a hope that is neither naive nor fragile. It is hope forged in fire.\n\n\"We built this Council not because peace is easy, but because war taught us it is necessary. Let this be our legacy: that when the darkness came, we chose the light.\"\n\nCodex: 'The Galactic Council.'",
      recap_text:
        "The Galactic Council held its inaugural session. High Sage Alarion spoke of legacy and the choice to build peace.",
      hints: JSON.stringify([
        "Meet Alarion at the Council Chambers for the historic first session.",
        "Codex: 'The Galactic Council.'",
      ]),
    },
  ];

  // =====================================================================
  // CHAPTER 8: "Legacy of the Stars" — Missions 54-60 (Act 4)
  // The player becomes an ambassador and shapes the galaxy's future.
  // =====================================================================

  const chapter8Missions = [
    {
      id: storyMissionId(54),
      title: "The Ambassador's Mantle",
      description:
        "Receive the title of Ambassador from Elenion and tour the galaxy in your new role.",
      type: "visit_sector",
      objectives: JSON.stringify({ npcId: "elenion" }),
      reward_credits: 20000,
      reward_xp: 2000,
      difficulty: 3,
      act: 4,
      chapter: 8,
      story_order: 54,
      prerequisite_mission_id: storyMissionId(53),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        'Elenion finds you in the observation deck, watching the stars. The diplomat who navigated impossible negotiations and held the coalition together through betrayal and battle looks genuinely happy for the first time since you met.\n\n"The Council has a title for people like you," he says, producing a crystalline badge that pulses with soft light. "Ambassador. Not a rank you earn through politics or birth — it is given to those who have proven, through action, that they speak for more than themselves."\n\nThe title comes with responsibility: a diplomatic tour of the galaxy, visiting every major settlement to represent the Council and listen to the needs of people rebuilding their lives.',
      recap_text:
        "Elenion bestowed the title of Ambassador. A diplomatic tour of the galaxy begins.",
      hints: JSON.stringify([
        "Meet Elenion to receive the Ambassador title.",
        "Visit sectors across the galaxy as the Council's representative.",
      ]),
    },
    {
      id: storyMissionId(55),
      title: "Ancient Echoes",
      description:
        "Scan for residual Primordium signatures and investigate sites that can be repurposed.",
      type: "visit_sector",
      objectives: JSON.stringify({ scansRequired: 8 }),
      reward_credits: 20500,
      reward_xp: 2050,
      difficulty: 3,
      act: 4,
      chapter: 8,
      story_order: 55,
      prerequisite_mission_id: storyMissionId(54),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        'The Oracle — diminished but still functional after reforging the seal — contacts you with a request. Residual Primordium energy lingers in pockets across the galaxy, left behind like echoes of the ancient structure\'s power. Some of these pockets are dangerous, leaking dimensional instability. Others could be harnessed as power sources, communication relays, or healing sites.\n\n"The Precursors built to last," the Oracle says. "Even their echoes have purpose. But they must be found, catalogued, and assessed before they can be used — or before they cause harm. You have walked further into the unknown than any organic being in recorded history. One more survey should not trouble you."',
      recap_text:
        "The Oracle detected residual Primordium energy across the galaxy that could be repurposed or might cause harm.",
      hints: JSON.stringify([
        "Scan sectors for residual Primordium energy signatures.",
        "Investigate sites to determine if they can be safely repurposed.",
      ]),
    },
    {
      id: storyMissionId(56),
      title: "The Spore Network Reborn",
      description:
        "Colonize mycelial planets, deliver cyrillium, and confirm the Spore Network's reactivation.",
      type: "visit_sector",
      objectives: JSON.stringify({ colonistsToDeposit: 400 }),
      reward_credits: 21000,
      reward_xp: 2100,
      difficulty: 3,
      act: 4,
      chapter: 8,
      story_order: 56,
      prerequisite_mission_id: storyMissionId(55),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        'Miraen brings extraordinary news: the ancient Spore Network — the mycelial web that once connected every corner of the galaxy — is stirring. The battle at the Primordium and the energy released during the seal\'s restoration has sent resonant pulses through dormant fungal pathways. Nodes that have been dark for millennia are flickering back to life.\n\nBut they need help. Like seeds that need soil and water, the reawakening nodes need living organisms nearby and cyrillium to catalyze their growth. Miraen has identified two key planets with dense mycelial substrates — perfect candidates for colonization to anchor the network\'s rebirth.\n\n"This is what it was all for," she whispers, her eyes bright with wonder. "The Network is not just infrastructure. It is the galaxy\'s nervous system. If we can bring it back, every world will be connected. Every voice will be heard."',
      recap_text:
        "The Spore Network is reawakening. Miraen identified key planets for colonization to anchor the network's rebirth.",
      hints: JSON.stringify([
        "Colonize two mycelial planets with 200 settlers each.",
        "Deliver cyrillium to catalyze network growth, then scan to confirm activation.",
      ]),
    },
    {
      id: storyMissionId(57),
      title: "Valandor's Farewell",
      description:
        "Receive Valandor's deepest wisdom and choose his legacy gift.",
      type: "visit_sector",
      objectives: JSON.stringify({ npcId: "valandor" }),
      reward_credits: 22000,
      reward_xp: 2200,
      difficulty: 3,
      act: 4,
      chapter: 8,
      story_order: 57,
      prerequisite_mission_id: storyMissionId(56),
      has_phases: true,
      has_choices: true,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        'Valandor\'s meditation chamber feels different today. The ethereal Vedic elder has always existed partially outside normal space, his form shimmering between dimensions. But now the shimmer is fading. He is becoming more transparent, not less substantial — as if he is spreading himself thinner across reality.\n\n"I am returning to the spaces between," Valandor says, his voice carrying the warmth of a sunset. "The seal is restored, but it needs a guardian. The Oracle cannot do it alone. I will join the vigil — not as a prisoner, but as a sentinel. It is what I was always meant to do."\n\nHe offers you a parting gift. Three choices, each embodying a different aspect of Vedic wisdom.',
      recap_text:
        "Valandor is leaving to become a sentinel for the seal. He offers a final gift embodying Vedic wisdom.",
      hints: JSON.stringify([
        "Meet Valandor for his farewell and deepest teachings.",
        "Choose his legacy gift carefully — this is a permanent choice.",
      ]),
    },
    {
      id: storyMissionId(58),
      title: "The New Frontier",
      description:
        "Explore uncharted sectors and eliminate rogue Primordium sentinels.",
      type: "visit_sector",
      objectives: JSON.stringify({ sectorsToVisit: 12 }),
      reward_credits: 23000,
      reward_xp: 2300,
      difficulty: 3,
      act: 4,
      chapter: 8,
      story_order: 58,
      prerequisite_mission_id: storyMissionId(57),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        "Beyond the mapped galaxy lies the new frontier — sectors that no organic species has visited since the Precursors vanished. The reawakening Spore Network is reaching into these spaces, and the echoes coming back tell of wonders: uncharted worlds, exotic phenomena, and resources that could fuel the galaxy's growth for millennia.\n\nBut the frontier is not empty. Rogue Primordium sentinels — constructs that lost connection to the central intelligence during the shadow war — patrol these sectors on ancient standing orders. They attack anything they do not recognize, and after ten thousand years of isolation, they recognize nothing.",
      recap_text:
        "The new frontier holds wonders and dangers — including rogue Primordium sentinels running on ancient orders.",
      hints: JSON.stringify([
        "Explore twelve uncharted sectors in the new frontier.",
        "Eliminate rogue sentinels that threaten expansion.",
      ]),
    },
    {
      id: storyMissionId(59),
      title: "Keeper of the Stars",
      description:
        "Escort inter-galactic expeditions, establish a trade hub, and colonize the galaxy's edge.",
      type: "visit_sector",
      objectives: JSON.stringify({ caravansToEscort: 2 }),
      reward_credits: 24000,
      reward_xp: 2400,
      difficulty: 3,
      act: 4,
      chapter: 8,
      story_order: 59,
      prerequisite_mission_id: storyMissionId(58),
      has_phases: true,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        "The galaxy is not an island. The reawakened Spore Network has detected signals from beyond — from other galaxies, other networks, other civilizations that the Precursors once communicated with. The Council authorizes humanity's first inter-galactic expeditions: small fleets venturing into the void between galaxies, guided by the Network's ancient pathways.\n\nYou are asked to escort the first two expeditions, establish a trade hub at the galaxy's edge to serve as a waystation, and colonize the last unoccupied habitable world before the great darkness between galaxies begins. It is the furthest any living being has traveled — and it is just the beginning.",
      recap_text:
        "The Spore Network detected signals from other galaxies. The Council authorized inter-galactic expeditions.",
      hints: JSON.stringify([
        "Escort expeditions, build a trade hub, and colonize the edge.",
        "This is humanity's first step beyond the home galaxy.",
      ]),
    },
    {
      id: storyMissionId(60),
      title: "Legacy",
      description:
        "Meet Alarion one final time to receive the title of Keeper of the Stars.",
      type: "visit_sector",
      objectives: JSON.stringify({ npcId: "alarion" }),
      reward_credits: 25000,
      reward_xp: 2500,
      difficulty: 3,
      act: 4,
      chapter: 8,
      story_order: 60,
      prerequisite_mission_id: storyMissionId(59),
      has_phases: false,
      has_choices: false,
      source: "story",
      repeatable: false,
      reward_item_id: null,
      time_limit_minutes: null,
      requires_claim_at_mall: false,
      lore_text:
        'High Sage Alarion meets you one last time in the observation deck of the Star Seeker — the same deck where your journey began with a mandate and a prayer. The old Muscarian looks out at the stars, and the stars look back through a galaxy transformed.\n\nThe Spore Network pulses with golden light, connecting worlds like neurons in a vast cosmic brain. Trade routes hum with activity. Colonies bloom on worlds that were lifeless a year ago. The shadow is sealed. The Council governs. And the frontier stretches beyond the galaxy itself.\n\n"When I first summoned you," Alarion says softly, "I thought I was sending a pilot on an errand. I did not know I was sending the person who would save everything." He places his hands on your shoulders — a Muscarian gesture reserved for the highest honor.\n\n"You are no longer a pilot, or an ambassador, or even a hero. You are a Keeper of the Stars. Guard them well."\n\nThe stars stretch in every direction, and every single one of them is yours to explore.\n\nCodex: \'Legacy of the Stars.\'',
      recap_text:
        "Alarion bestowed the title of Keeper of the Stars. The galaxy is transformed, connected, and at peace. The journey continues.",
      hints: JSON.stringify([
        "Meet Alarion at the Star Seeker for the final ceremony.",
        "Title: 'Keeper of the Stars.' Codex: 'Legacy of the Stars.'",
      ]),
    },
  ];

  // =====================================================================
  // INSERT ALL MISSION TEMPLATES
  // =====================================================================

  const allMissions = [
    ...chapter5Missions,
    ...chapter6Missions,
    ...chapter7Missions,
    ...chapter8Missions,
  ];

  for (const mission of allMissions) {
    await upsertMission(knex, mission);
  }

  console.log(`Upserted ${allMissions.length} story missions (Chapters 5-8)`);

  // =====================================================================
  // CHAPTER 5 PHASES
  // =====================================================================

  // Mission 32: Outpost Under Siege (2 phases)
  await upsertPhase(knex, {
    id: phaseId(32, 1),
    template_id: storyMissionId(32),
    phase_order: 1,
    title: "Defend the Outpost",
    description: "Destroy the 3 unknown attackers circling the Tar'ri outpost.",
    objective_type: "destroy_ship",
    objectives: JSON.stringify({ shipsToDestroy: 3 }),
    lore_text:
      "The outpost's shields are failing. Three warships of unknown origin circle like vultures, their weapons tearing through the station's armor. You are the only reinforcement in range.",
    narration_key: "ch5_m32_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(32, 2),
    template_id: storyMissionId(32),
    phase_order: 2,
    title: "Investigate the Wreckage",
    description:
      "Investigate 3 wreckage sites to identify the attackers' origin.",
    objective_type: "investigate",
    objectives: JSON.stringify({ eventsToInvestigate: 3 }),
    lore_text:
      "The attackers are destroyed, but their ships leave behind more questions than answers. The wreckage pulses with an energy signature that matches nothing in any known database. Three distinct debris fields hold the key to identification.",
    narration_key: "ch5_m32_p2",
  });

  // Mission 33: Evidence Trail (2 phases)
  await upsertPhase(knex, {
    id: phaseId(33, 1),
    template_id: storyMissionId(33),
    phase_order: 1,
    title: "Trace the Origin",
    description: "Scan 6 sectors along the attackers' projected flight path.",
    objective_type: "scan_sectors",
    objectives: JSON.stringify({ scansRequired: 6 }),
    lore_text:
      "The wreckage's navigation logs, though corrupted, contain enough data to project a rough flight path. Six sectors along that path should yield enough scan data to pinpoint the origin.",
    narration_key: "ch5_m33_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(33, 2),
    template_id: storyMissionId(33),
    phase_order: 2,
    title: "Deliver Fragments to Lyra",
    description: "Deliver 15 recovered tech fragments to Lyra Starwind.",
    objective_type: "deliver_cargo",
    objectives: JSON.stringify({ commodity: "tech", quantity: 15 }),
    lore_text:
      "Lyra Starwind's laboratory aboard the research vessel is crammed with Precursor artifacts. She takes the fragments with trembling hands. 'If these are what I think they are, we are dealing with something far older than the shadow entity.'",
    narration_key: "ch5_m33_p2",
  });

  // Mission 34: The Summit (3 phases)
  await upsertPhase(knex, {
    id: phaseId(34, 1),
    template_id: storyMissionId(34),
    phase_order: 1,
    title: "Meet High Sage Alarion",
    description: "Present the evidence to Alarion on the Star Seeker's bridge.",
    objective_type: "meet_npc",
    objectives: JSON.stringify({
      npcId: "alarion",
      npcName: "High Sage Alarion",
    }),
    lore_text:
      "Alarion stands at the helm of the Star Seeker, his tendrils glowing with the deep blue of contemplation. He listens to your report in silence, then nods slowly. 'This changes everything. The others must hear this — all of them.'",
    narration_key: "ch5_m34_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(34, 2),
    template_id: storyMissionId(34),
    phase_order: 2,
    title: "Meet Commander Raxus",
    description: "Present the military assessment to Raxus in the war room.",
    objective_type: "meet_npc",
    objectives: JSON.stringify({
      npcId: "commander_raxus",
      npcName: "Commander Raxus",
    }),
    lore_text:
      "Raxus examines the wreckage analysis with a warrior's eye. 'These weapons are designed to kill efficiently — not to conquer or capture. Whoever built them wanted to destroy that outpost and everything in it. This is not a raid. This is an extermination protocol.'",
    narration_key: "ch5_m34_p2",
  });
  await upsertPhase(knex, {
    id: phaseId(34, 3),
    template_id: storyMissionId(34),
    phase_order: 3,
    title: "Meet Valandor",
    description:
      "Seek Valandor's philosophical perspective in the meditation chamber.",
    objective_type: "meet_npc",
    objectives: JSON.stringify({
      npcId: "valandor",
      npcName: "Valandor",
    }),
    lore_text:
      "Valandor's meditation chamber is a sphere of crystallized light, suspended at the Star Seeker's core. The Vedic elder floats at its center, his form flickering between dimensions. 'I have felt this presence before,' he says. 'In the spaces between stars, where reality is thin. It is not evil. It is desperate. And desperate things are the most dangerous of all.'",
    narration_key: "ch5_m34_p3",
  });

  // Mission 35: Coalition Vote — single phase with choice (no phases table needed, choice only)
  // The mission itself has has_phases: false, so we just add the choice.

  // Mission 36: Shadow Entity (2 phases)
  await upsertPhase(knex, {
    id: phaseId(36, 1),
    template_id: storyMissionId(36),
    phase_order: 1,
    title: "Investigate Shadow Sites",
    description: "Investigate 4 sites where shadow energy has concentrated.",
    objective_type: "investigate",
    objectives: JSON.stringify({ eventsToInvestigate: 4 }),
    lore_text:
      "The four sites are spread across a wide swath of space, each one a nexus of dark energy. Your sensors struggle to resolve the readings — the shadow energy exists partially outside normal space-time, like a wound in reality that is visible only from certain angles.",
    narration_key: "ch5_m36_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(36, 2),
    template_id: storyMissionId(36),
    phase_order: 2,
    title: "Survive the Ambush",
    description:
      "Survive 2 shadow construct ambushes triggered by your investigation.",
    objective_type: "survive_ambush",
    objectives: JSON.stringify({ ambushesToSurvive: 2 }),
    lore_text:
      "Your investigation has not gone unnoticed. Shadow constructs — entities formed from compressed dark energy — materialize around your ship. They do not communicate, do not negotiate. They simply attack, drawn to the light of your engines like moths to a flame that they intend to extinguish.",
    narration_key: "ch5_m36_p2",
  });

  // Mission 37: The Hidden Enemy (2 phases)
  await upsertPhase(knex, {
    id: phaseId(37, 1),
    template_id: storyMissionId(37),
    phase_order: 1,
    title: "Scan with Modified Sensors",
    description: "Scan 5 sectors using Archivist Thal's modified sensor array.",
    objective_type: "scan_sectors",
    objectives: JSON.stringify({ scansRequired: 5 }),
    lore_text:
      "Thal's modified sensors paint the universe in a new light — literally. Energy barriers that were invisible to standard instruments now glow like neon threads across the void. The Precursor frequency barrier is vast, spanning entire sectors, but it is fraying. Gaps appear where the threads are thin.",
    narration_key: "ch5_m37_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(37, 2),
    template_id: storyMissionId(37),
    phase_order: 2,
    title: "Navigate to the Source",
    description: "Visit 3 sectors navigating toward the breach source.",
    objective_type: "visit_sector",
    objectives: JSON.stringify({ sectorsToVisit: 3 }),
    lore_text:
      "The scan data converges on a point deep in uncharted space — a place where the Precursor barrier is not just weak, but completely absent. Something tore through it from the other side. The trail of dimensional scarring leads you through three sectors of increasingly distorted space.",
    narration_key: "ch5_m37_p2",
  });

  // Mission 38: Forging Alliances (2 phases)
  await upsertPhase(knex, {
    id: phaseId(38, 1),
    template_id: storyMissionId(38),
    phase_order: 1,
    title: "Escort Supply Convoys",
    description: "Escort 2 coalition supply convoys to forward base locations.",
    objective_type: "escort",
    objectives: JSON.stringify({ caravansToEscort: 2 }),
    lore_text:
      "The convoys are a visible symbol of coalition unity — Muscarian freighters carrying Kalin weapons alongside Tar'ri trade goods, all protected by a mixed escort. Every successful delivery proves the alliance works. Every failed one proves the doubters right.",
    narration_key: "ch5_m38_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(38, 2),
    template_id: storyMissionId(38),
    phase_order: 2,
    title: "Establish Forward Bases",
    description:
      "Trade 25 units of resources to establish forward operating bases.",
    objective_type: "trade_units",
    objectives: JSON.stringify({ unitsToTrade: 25 }),
    lore_text:
      "The forward bases need everything: construction materials, communications equipment, defensive systems, food stores. Building them from scratch in hostile territory requires a massive influx of traded goods. The logistics are daunting, but necessary.",
    narration_key: "ch5_m38_p2",
  });

  // Mission 39: The Fragile Pact (2 phases + choice)
  await upsertPhase(knex, {
    id: phaseId(39, 1),
    template_id: storyMissionId(39),
    phase_order: 1,
    title: "Meet Raxus",
    description:
      "Meet Commander Raxus to learn about the Kalin weapons program.",
    objective_type: "meet_npc",
    objectives: JSON.stringify({
      npcId: "commander_raxus",
      npcName: "Commander Raxus",
    }),
    lore_text:
      "Raxus's quarters are spartan — weapons on the wall, star charts on the table, nothing decorative. He pours two drinks with hands that do not quite steady. 'I need you to see something. And then I need you to help me decide what to do about it.'",
    narration_key: "ch5_m39_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(39, 2),
    template_id: storyMissionId(39),
    phase_order: 2,
    title: "The Confrontation",
    description:
      "Choose whether to confront Raxus publicly or handle it privately.",
    objective_type: "choose",
    objectives: JSON.stringify({ choiceId: choiceId("fragile_pact") }),
    lore_text:
      "The evidence is damning. The Kalin weapons program used artifact technology in direct violation of the coalition charter. Raxus knew, authorized it, and kept it hidden. The weapons exist and they are powerful. But the deception could destroy the alliance. How you handle this revelation will echo through the coalition's future.",
    narration_key: "ch5_m39_p2",
  });

  // =====================================================================
  // CHAPTER 6 PHASES
  // =====================================================================

  // Mission 40: Into the Core (2 phases)
  await upsertPhase(knex, {
    id: phaseId(40, 1),
    template_id: storyMissionId(40),
    phase_order: 1,
    title: "Navigate to the Core",
    description: "Visit 10 sectors pushing toward the galactic core.",
    objective_type: "visit_sector",
    objectives: JSON.stringify({ sectorsToVisit: 10 }),
    lore_text:
      "The journey inward is a descent into light and fire. Stars crowd closer together, their radiation building into a constant hum that vibrates through your hull. Caelum's shield modifications hold, but the margins are thin. Every sector crossed is a small victory against physics itself.",
    narration_key: "ch6_m40_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(40, 2),
    template_id: storyMissionId(40),
    phase_order: 2,
    title: "Survive Core Ambushes",
    description:
      "Survive 2 ambushes from entities drawn to your energy signature.",
    objective_type: "survive_ambush",
    objectives: JSON.stringify({ ambushesToSurvive: 2 }),
    lore_text:
      "The core's denizens are not hostile by nature — they are attracted to energy. Your ship's shields, blazing against the ambient radiation, make you a beacon. Two waves of energy-hunting constructs converge on your position.",
    narration_key: "ch6_m40_p2",
  });

  // Mission 41: Ancient Traps (2 phases)
  await upsertPhase(knex, {
    id: phaseId(41, 1),
    template_id: storyMissionId(41),
    phase_order: 1,
    title: "Study Trap Mechanisms",
    description:
      "Investigate 4 Precursor trap mechanisms to understand their triggers.",
    objective_type: "investigate",
    objectives: JSON.stringify({ eventsToInvestigate: 4 }),
    lore_text:
      "Professor Thane guides you through the trap lattice with barely contained academic excitement. Each mechanism is a masterwork of ancient engineering — gravity wells, energy barriers, spatial distortions. Understanding them requires careful study, not brute force.",
    narration_key: "ch6_m41_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(41, 2),
    template_id: storyMissionId(41),
    phase_order: 2,
    title: "Chart Safe Passage",
    description:
      "Scan 4 sectors to identify a safe route through the trap lattice.",
    objective_type: "scan_sectors",
    objectives: JSON.stringify({ scansRequired: 4 }),
    lore_text:
      "Armed with knowledge of the trap triggers, you can now chart a path that avoids them. Four sectors must be scanned precisely to map the narrow corridors of safe passage through the ancient minefield.",
    narration_key: "ch6_m41_p2",
  });

  // Mission 42: The Primordium (2 phases)
  await upsertPhase(knex, {
    id: phaseId(42, 1),
    template_id: storyMissionId(42),
    phase_order: 1,
    title: "Meet the Oracle",
    description: "Meet the Oracle at the threshold of the galactic core.",
    objective_type: "meet_npc",
    objectives: JSON.stringify({
      npcId: "the_oracle",
      npcName: "The Oracle",
    }),
    lore_text:
      "The Oracle manifests as a cathedral of crystallized light, hovering at the boundary between navigable space and the core's lethal interior. Its voice resonates with the weight of millennia. 'You have earned passage. Few have. Beyond me lies truth — and truth is rarely comfortable.'",
    narration_key: "ch6_m42_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(42, 2),
    template_id: storyMissionId(42),
    phase_order: 2,
    title: "Investigate the Primordium",
    description: "Investigate 3 Primordium structures to understand the seal.",
    objective_type: "investigate",
    objectives: JSON.stringify({ eventsToInvestigate: 3 }),
    lore_text:
      "The Primordium is not one structure but many — an interconnected web of ancient constructs that together form the seal. Three key structures pulse with energy that predates the stars themselves. Understanding them is the key to understanding what is being held within.",
    narration_key: "ch6_m42_p2",
  });

  // Mission 43: Gathering Storm (2 phases)
  await upsertPhase(knex, {
    id: phaseId(43, 1),
    template_id: storyMissionId(43),
    phase_order: 1,
    title: "Escort Fleet Convoys",
    description: "Escort 3 combined fleet convoys through dangerous sectors.",
    objective_type: "escort",
    objectives: JSON.stringify({ caravansToEscort: 3 }),
    lore_text:
      "The full coalition fleet is on the move — the largest armada in galactic history. But size brings vulnerability. Three critical supply convoys must reach the staging planet, and the shadow's constructs are massing to intercept.",
    narration_key: "ch6_m43_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(43, 2),
    template_id: storyMissionId(43),
    phase_order: 2,
    title: "Defend the Staging Planet",
    description: "Destroy 5 shadow attackers assaulting the staging planet.",
    objective_type: "destroy_ship",
    objectives: JSON.stringify({ shipsToDestroy: 5 }),
    lore_text:
      "The staging planet comes under direct assault. Five shadow warships materialize from compressed darkness, their weapons carving through the orbital defenses. If the staging planet falls, the entire expedition collapses.",
    narration_key: "ch6_m43_p2",
  });

  // Mission 44: The Weapon Question (2 phases + PERMANENT CHOICE #3)
  await upsertPhase(knex, {
    id: phaseId(44, 1),
    template_id: storyMissionId(44),
    phase_order: 1,
    title: "Deliver Cyrillium",
    description: "Deliver 30 cyrillium to the weapons research facility.",
    objective_type: "deliver_cargo",
    objectives: JSON.stringify({ commodity: "cyrillium", quantity: 30 }),
    lore_text:
      "The weapons facility hums with barely contained energy. Both prototypes are partially constructed, their cyrillium cores waiting to be charged. Enough material for one weapon. Two designs. One choice.",
    narration_key: "ch6_m44_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(44, 2),
    template_id: storyMissionId(44),
    phase_order: 2,
    title: "Choose the Weapon",
    description:
      "Decide which weapon will be constructed for the final battle.",
    objective_type: "choose",
    objectives: JSON.stringify({
      choiceId: choiceId("weapon_configuration"),
    }),
    lore_text:
      "Miraen presents the resonance disruptor — elegant, ecological, surgical. Raxus presents the quantum annihilator — raw, devastating, absolute. Both will work. Both carry consequences that extend far beyond the battle. The coalition looks to you.",
    narration_key: "ch6_m44_p2",
  });

  // Mission 45: The Final Approach (2 phases)
  await upsertPhase(knex, {
    id: phaseId(45, 1),
    template_id: storyMissionId(45),
    phase_order: 1,
    title: "Clear the Sentinels",
    description: "Destroy 5 Primordium sentinels blocking the approach.",
    objective_type: "destroy_ship",
    objectives: JSON.stringify({ shipsToDestroy: 5 }),
    lore_text:
      "The sentinels activate in waves — crystalline warships that dance through space with an elegance that belies their lethality. They are beautiful and terrifying, works of art that exist only to destroy. Five stand between you and the core heart.",
    narration_key: "ch6_m45_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(45, 2),
    template_id: storyMissionId(45),
    phase_order: 2,
    title: "Navigate to the Core Heart",
    description:
      "Visit 5 sectors navigating through the Primordium to the core heart.",
    objective_type: "visit_sector",
    objectives: JSON.stringify({ sectorsToVisit: 5 }),
    lore_text:
      "With the sentinels neutralized, the final approach opens. Five sectors of the Primordium's interior — vast chambers of crystallized energy and ancient machinery — separate you from the core heart where the seal resides. The shadow's presence grows stronger with every sector.",
    narration_key: "ch6_m45_p2",
  });

  // Mission 46: Battle for the Galaxy (3 phases)
  await upsertPhase(knex, {
    id: phaseId(46, 1),
    template_id: storyMissionId(46),
    phase_order: 1,
    title: "Break the Shadow Fleet",
    description: "Destroy 8 shadow warships in the opening assault.",
    objective_type: "destroy_ship",
    objectives: JSON.stringify({ shipsToDestroy: 8 }),
    lore_text:
      "The seal shatters. Shadow warships pour through the breach like dark water through a broken dam. Eight capital ships lead the vanguard, each one a nightmare given form. Alarion's voice on the command channel is steady despite the chaos. 'All ships — engage.'",
    narration_key: "ch6_m46_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(46, 2),
    template_id: storyMissionId(46),
    phase_order: 2,
    title: "Survive the Counterattack",
    description: "Survive 3 waves of shadow counterattacks.",
    objective_type: "survive_ambush",
    objectives: JSON.stringify({ ambushesToSurvive: 3 }),
    lore_text:
      "The shadow adapts. Three counterattack waves hit the coalition fleet in rapid succession, each one targeting different weaknesses. The first aims for supply ships. The second hits the flanks. The third goes straight for the command vessels. Survival requires constant adaptation.",
    narration_key: "ch6_m46_p2",
  });
  await upsertPhase(knex, {
    id: phaseId(46, 3),
    template_id: storyMissionId(46),
    phase_order: 3,
    title: "Defend the Command Station",
    description:
      "Destroy 5 shadow assault ships targeting the coalition command station.",
    objective_type: "destroy_ship",
    objectives: JSON.stringify({ shipsToDestroy: 5 }),
    lore_text:
      "The shadow makes its final gambit — five elite assault ships break through the defensive line, heading straight for the command station where Alarion coordinates the battle. If the station falls, the fleet loses coordination. Everything depends on stopping them.",
    narration_key: "ch6_m46_p3",
    on_complete_effects: JSON.stringify({
      flags: { completed_battle_for_galaxy: "true" },
    }),
  });

  // =====================================================================
  // CHAPTER 7 PHASES
  // =====================================================================

  // Mission 47: After the Storm (2 phases)
  await upsertPhase(knex, {
    id: phaseId(47, 1),
    template_id: storyMissionId(47),
    phase_order: 1,
    title: "Survey the Damage",
    description: "Visit 8 sectors to survey battle damage across the galaxy.",
    objective_type: "visit_sector",
    objectives: JSON.stringify({ sectorsToVisit: 8 }),
    lore_text:
      "The victory is real but the cost is staggering. Entire sectors bear the scars of shadow energy — stations dark, trade routes severed, habitable worlds contaminated. Someone must catalogue what remains before the galaxy can begin to heal.",
    narration_key: "ch7_m47_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(47, 2),
    template_id: storyMissionId(47),
    phase_order: 2,
    title: "Catalogue Reconstruction Needs",
    description: "Scan 5 sectors to assess infrastructure and resource needs.",
    objective_type: "scan_sectors",
    objectives: JSON.stringify({ scansRequired: 5 }),
    lore_text:
      "Surveying the damage is one thing. Understanding what is needed to fix it is another. Detailed scans of key infrastructure sectors will provide the data the Council needs to prioritize reconstruction efforts.",
    narration_key: "ch7_m47_p2",
  });

  // Mission 48: Miraen's Garden (2 phases)
  await upsertPhase(knex, {
    id: phaseId(48, 1),
    template_id: storyMissionId(48),
    phase_order: 1,
    title: "Colonize the Devastated World",
    description: "Deposit 200 colonists on the world Miraen identified.",
    objective_type: "colonize_planet",
    objectives: JSON.stringify({ colonistsToDeposit: 200 }),
    lore_text:
      "The planet is a study in destruction and resilience. Shadow energy scorched the surface, but beneath the blackened crust, mycelial networks still pulse with faint life. Miraen believes 200 colonists — farmers, ecologists, engineers — can tip the balance back toward growth.",
    narration_key: "ch7_m48_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(48, 2),
    template_id: storyMissionId(48),
    phase_order: 2,
    title: "Deliver Food Supplies",
    description: "Deliver 30 food to sustain the new settlement.",
    objective_type: "deliver_cargo",
    objectives: JSON.stringify({ commodity: "food", quantity: 30 }),
    lore_text:
      "The colonists are determined but hungry. The devastated soil will take time to produce food. Until the first harvest, they need supplies from off-world. Thirty units of food will sustain the settlement through the critical first season.",
    narration_key: "ch7_m48_p2",
  });

  // Mission 49: Trade Routes Restored (2 phases)
  await upsertPhase(knex, {
    id: phaseId(49, 1),
    template_id: storyMissionId(49),
    phase_order: 1,
    title: "Reestablish Commerce",
    description: "Trade 40 units to restart economic activity.",
    objective_type: "trade_units",
    objectives: JSON.stringify({ unitsToTrade: 40 }),
    lore_text:
      "The markets are quiet — too quiet. Traders are cautious, routes are uncertain, and prices are volatile. Someone needs to prove that commerce is viable again. High-volume trade activity will restore confidence and draw other merchants back.",
    narration_key: "ch7_m49_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(49, 2),
    template_id: storyMissionId(49),
    phase_order: 2,
    title: "Escort the First Caravan",
    description: "Escort the first post-war trade caravan to its destination.",
    objective_type: "escort",
    objectives: JSON.stringify({ caravansToEscort: 1 }),
    lore_text:
      "Kovax Prime personally captains the first post-war caravan — a symbolic gesture from the Tar'ri trading houses. The cargo is modest, but the message is everything. If this caravan arrives safely, others will follow. If it fails, the economic recovery stalls.",
    narration_key: "ch7_m49_p2",
  });

  // Mission 50: The Council Charter (3 phases + PERMANENT CHOICE #4)
  await upsertPhase(knex, {
    id: phaseId(50, 1),
    template_id: storyMissionId(50),
    phase_order: 1,
    title: "Meet Valandor",
    description:
      "Hear Valandor's philosophical case for the Council structure.",
    objective_type: "meet_npc",
    objectives: JSON.stringify({
      npcId: "valandor",
      npcName: "Valandor",
    }),
    lore_text:
      "Valandor presents the philosophical foundation: governance must reflect the values it serves. An open council is democratic but slow. A founding council rewards sacrifice but excludes newcomers. An advisory model is efficient but concentrates power. Each has merit. Each has risk.",
    narration_key: "ch7_m50_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(50, 2),
    template_id: storyMissionId(50),
    phase_order: 2,
    title: "Meet Elenion",
    description: "Hear Elenion's diplomatic analysis of each governance model.",
    objective_type: "meet_npc",
    objectives: JSON.stringify({
      npcId: "elenion",
      npcName: "Elenion",
    }),
    lore_text:
      "Elenion lays out the practical implications with a diplomat's precision. Faction dynamics, resource allocation, crisis response times, expansion policies — each governance model creates different incentives and different vulnerabilities. The galaxy that emerges will be shaped by this choice for generations.",
    narration_key: "ch7_m50_p2",
  });
  await upsertPhase(knex, {
    id: phaseId(50, 3),
    template_id: storyMissionId(50),
    phase_order: 3,
    title: "The Council Vote",
    description:
      "Cast your voice in the vote for the Council's permanent structure.",
    objective_type: "choose",
    objectives: JSON.stringify({ choiceId: choiceId("council_structure") }),
    lore_text:
      "The delegates are assembled. The arguments are made. The vote is called. Your recommendation carries enormous weight — you are the hero of the Battle for the Galaxy, the Ambassador who toured the ravaged sectors, the voice that factions listen to when they listen to no one else. What kind of Council will govern the stars?",
    narration_key: "ch7_m50_p3",
  });

  // Mission 51: Caelum's Legacy (2 phases)
  await upsertPhase(knex, {
    id: phaseId(51, 1),
    template_id: storyMissionId(51),
    phase_order: 1,
    title: "Deliver Tech Components",
    description: "Deliver 20 tech components for Caelum's peaceful research.",
    objective_type: "deliver_cargo",
    objectives: JSON.stringify({ commodity: "tech", quantity: 20 }),
    lore_text:
      "Caelum's new workshop is a deliberate contrast to his wartime engineering bay. Instead of weapons schematics, the walls display ecological models. Instead of shield calibrations, he works on healing arrays. But the work needs materials — advanced tech components that he can repurpose for reconstruction.",
    narration_key: "ch7_m51_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(51, 2),
    template_id: storyMissionId(51),
    phase_order: 2,
    title: "Investigate Precursor Sites",
    description:
      "Investigate 3 Precursor sites with intact peaceful constructs.",
    objective_type: "investigate",
    objectives: JSON.stringify({ eventsToInvestigate: 3 }),
    lore_text:
      "Not all Precursor technology was designed for war. Caelum has identified three sites where intact constructs appear to be environmental regulators — machines designed to heal damaged ecosystems. If they can be studied and adapted, they could accelerate reconstruction across the galaxy.",
    narration_key: "ch7_m51_p2",
  });

  // Mission 52: Healing the Rift (2 phases)
  await upsertPhase(knex, {
    id: phaseId(52, 1),
    template_id: storyMissionId(52),
    phase_order: 1,
    title: "Meet Raxus for Reconciliation",
    description: "Meet Commander Raxus in Miraen's arboretum.",
    objective_type: "meet_npc",
    objectives: JSON.stringify({
      npcId: "commander_raxus",
      npcName: "Commander Raxus",
    }),
    lore_text:
      "The arboretum is neutral ground — a living space that belongs to no faction. Raxus arrives in civilian clothes for the first time you have ever seen. Without the armor, he looks smaller. More human. More vulnerable. 'I did not come to be forgiven,' he says. 'I came to earn the right to be trusted again.'",
    narration_key: "ch7_m52_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(52, 2),
    template_id: storyMissionId(52),
    phase_order: 2,
    title: "Fund the Joint Outpost",
    description:
      "Trade 25 units of resources to establish a joint Kalin-coalition outpost.",
    objective_type: "trade_units",
    objectives: JSON.stringify({ unitsToTrade: 25 }),
    lore_text:
      "Raxus's proposal is concrete: a joint outpost, staffed by all factions, built with shared resources, and positioned at a strategic crossroads. It will serve as both a trading post and a symbol that the Kalin are committed to the coalition's future, not just its wars.",
    narration_key: "ch7_m52_p2",
  });

  // Mission 53: Dawn of the Council — single phase (meet_npc), no phases table needed
  // has_phases is false, so the base mission_template objectives handle it.

  // =====================================================================
  // CHAPTER 8 PHASES
  // =====================================================================

  // Mission 54: The Ambassador's Mantle (2 phases)
  await upsertPhase(knex, {
    id: phaseId(54, 1),
    template_id: storyMissionId(54),
    phase_order: 1,
    title: "Receive the Ambassador Title",
    description: "Meet Elenion to be formally invested as Ambassador.",
    objective_type: "meet_npc",
    objectives: JSON.stringify({
      npcId: "elenion",
      npcName: "Elenion",
    }),
    lore_text:
      "The crystalline badge pulses with soft light as Elenion places it in your hands. 'Ambassador is not a rank,' he says. 'It is a promise. You promise to listen before speaking, to understand before judging, and to represent not yourself but the galaxy that trusted you.'",
    narration_key: "ch8_m54_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(54, 2),
    template_id: storyMissionId(54),
    phase_order: 2,
    title: "Diplomatic Tour",
    description: "Visit 10 sectors as the galaxy's new Ambassador.",
    objective_type: "visit_sector",
    objectives: JSON.stringify({ sectorsToVisit: 10 }),
    lore_text:
      "The diplomatic tour takes you to every corner of the galaxy. You visit Muscarian colonies where mycelial forests are being replanted. Kalin worlds where warships are being converted to freighters. Tar'ri markets where new trade agreements are being signed. Vedic temples where philosophers contemplate the meaning of what happened. Everywhere, people want to meet the Ambassador. Everywhere, they have stories to tell.",
    narration_key: "ch8_m54_p2",
  });

  // Mission 55: Ancient Echoes (2 phases)
  await upsertPhase(knex, {
    id: phaseId(55, 1),
    template_id: storyMissionId(55),
    phase_order: 1,
    title: "Scan for Primordium Signatures",
    description: "Scan 8 sectors for residual Primordium energy.",
    objective_type: "scan_sectors",
    objectives: JSON.stringify({ scansRequired: 8 }),
    lore_text:
      "The Oracle's coordinates lead to pockets of energy scattered across the galaxy like embers from an ancient fire. Each one glows with the characteristic golden light of Primordium energy — power that has persisted for millennia without source or sustenance.",
    narration_key: "ch8_m55_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(55, 2),
    template_id: storyMissionId(55),
    phase_order: 2,
    title: "Investigate Repurposable Sites",
    description: "Investigate 4 sites that could be safely repurposed.",
    objective_type: "investigate",
    objectives: JSON.stringify({ eventsToInvestigate: 4 }),
    lore_text:
      "Four of the energy pockets are stable enough for investigation. Each one contains residual Primordium structures that could serve practical purposes — communication relays, healing stations, navigation beacons, or energy generators. The Precursors built to last, and their echoes remain useful.",
    narration_key: "ch8_m55_p2",
  });

  // Mission 56: The Spore Network Reborn (3 phases)
  await upsertPhase(knex, {
    id: phaseId(56, 1),
    template_id: storyMissionId(56),
    phase_order: 1,
    title: "Colonize Mycelial Planets",
    description:
      "Colonize 2 mycelial planets with 200 settlers each (400 total).",
    objective_type: "colonize_planet",
    objectives: JSON.stringify({ colonistsToDeposit: 400 }),
    lore_text:
      "The two planets Miraen identified are extraordinary — their entire crusts are woven with dormant mycelial networks, like brains waiting for a thought. Colonists will provide the biological presence the networks need to reawaken. Two hundred settlers on each world should be enough to trigger the cascade.",
    narration_key: "ch8_m56_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(56, 2),
    template_id: storyMissionId(56),
    phase_order: 2,
    title: "Deliver Cyrillium Catalyst",
    description: "Deliver 40 cyrillium to catalyze the network reactivation.",
    objective_type: "deliver_cargo",
    objectives: JSON.stringify({ commodity: "cyrillium", quantity: 40 }),
    lore_text:
      "Cyrillium acts as the catalyst — its resonant frequency matches the mycelial substrate's activation threshold. Without it, the colonists can live on the planets but the networks will remain dormant. With it, the ancient pathways will sing again.",
    narration_key: "ch8_m56_p2",
  });
  await upsertPhase(knex, {
    id: phaseId(56, 3),
    template_id: storyMissionId(56),
    phase_order: 3,
    title: "Confirm Reactivation",
    description: "Scan 6 sectors to confirm the Spore Network is reactivating.",
    objective_type: "scan_sectors",
    objectives: JSON.stringify({ scansRequired: 6 }),
    lore_text:
      "The cyrillium is delivered. The colonists are settled. Now comes the moment of truth. Scans across six sectors will confirm whether the ancient Spore Network is truly reawakening — whether the golden threads of connection are spreading once more between the stars.",
    narration_key: "ch8_m56_p3",
  });

  // Mission 57: Valandor's Farewell (2 phases + PERMANENT CHOICE #5)
  await upsertPhase(knex, {
    id: phaseId(57, 1),
    template_id: storyMissionId(57),
    phase_order: 1,
    title: "Valandor's Wisdom",
    description: "Meet Valandor to receive his deepest teachings.",
    objective_type: "meet_npc",
    objectives: JSON.stringify({
      npcId: "valandor",
      npcName: "Valandor",
    }),
    lore_text:
      "Valandor's form is nearly translucent now — you can see the stars through him, as if he is already becoming part of the space between. His wisdom, however, has never been more concentrated. He speaks of the nature of consciousness, the purpose of guardianship, and the weight of choices that echo across millennia.",
    narration_key: "ch8_m57_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(57, 2),
    template_id: storyMissionId(57),
    phase_order: 2,
    title: "The Legacy Gift",
    description: "Choose Valandor's parting gift.",
    objective_type: "choose",
    objectives: JSON.stringify({ choiceId: choiceId("valandors_legacy") }),
    lore_text:
      "Valandor extends three offerings, each one pulsing with Vedic energy. A crystal matrix that enhances perception and scanner capability. Star charts that reveal hidden pathways through the galaxy's most dangerous regions. Or you may decline both, honoring the Vedic belief that the greatest gift is the freedom to choose nothing.\n\n'Each gift reflects a truth,' Valandor says. 'Knowledge, exploration, or the wisdom of restraint. Choose as your heart demands.'",
    narration_key: "ch8_m57_p2",
  });

  // Mission 58: The New Frontier (2 phases)
  await upsertPhase(knex, {
    id: phaseId(58, 1),
    template_id: storyMissionId(58),
    phase_order: 1,
    title: "Explore Uncharted Sectors",
    description: "Visit 12 unexplored sectors in the new frontier.",
    objective_type: "visit_sector",
    objectives: JSON.stringify({ sectorsToVisit: 12 }),
    lore_text:
      "The new frontier is a canvas of possibility. Each sector holds something never before seen by organic eyes — binary pulsars that paint the void in X-ray auroras, gas giants with atmospheres of liquid diamond, rogue planets wandering the dark between stars. The galaxy is bigger than anyone imagined.",
    narration_key: "ch8_m58_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(58, 2),
    template_id: storyMissionId(58),
    phase_order: 2,
    title: "Eliminate Rogue Sentinels",
    description:
      "Destroy 3 rogue Primordium sentinels running on ancient orders.",
    objective_type: "destroy_ship",
    objectives: JSON.stringify({ shipsToDestroy: 3 }),
    lore_text:
      "Three rogue sentinels patrol the frontier on ten-thousand-year-old standing orders, attacking anything that moves. They are relics of a war that ended before most species evolved. Destroying them is a mercy — and a necessity for safe expansion.",
    narration_key: "ch8_m58_p2",
  });

  // Mission 59: Keeper of the Stars (3 phases)
  await upsertPhase(knex, {
    id: phaseId(59, 1),
    template_id: storyMissionId(59),
    phase_order: 1,
    title: "Escort Expeditions",
    description: "Escort 2 inter-galactic expeditions to the galaxy's edge.",
    objective_type: "escort",
    objectives: JSON.stringify({ caravansToEscort: 2 }),
    lore_text:
      "The inter-galactic expeditions are small fleets of volunteers — scientists, explorers, dreamers — who signed up to be the first beings to leave the home galaxy. The journey to the edge is the easy part. What lies beyond is unknown. Your job is to get them there safely.",
    narration_key: "ch8_m59_p1",
  });
  await upsertPhase(knex, {
    id: phaseId(59, 2),
    template_id: storyMissionId(59),
    phase_order: 2,
    title: "Establish Trade Hub",
    description:
      "Trade 50 units to fund and establish an edge-of-galaxy trade hub.",
    objective_type: "trade_units",
    objectives: JSON.stringify({ unitsToTrade: 50 }),
    lore_text:
      "The trade hub will serve as the last waystation before the void — a place where expeditions can resupply, exchange data, and prepare for the crossing. Building it requires a massive investment of traded goods, but its strategic value is incalculable.",
    narration_key: "ch8_m59_p2",
  });
  await upsertPhase(knex, {
    id: phaseId(59, 3),
    template_id: storyMissionId(59),
    phase_order: 3,
    title: "Colonize the Edge",
    description:
      "Colonize the last habitable planet before inter-galactic space (300 colonists).",
    objective_type: "colonize_planet",
    objectives: JSON.stringify({ colonistsToDeposit: 300 }),
    lore_text:
      "The planet orbits a solitary star at the galaxy's very rim — the last point of light before the great darkness between galaxies. Three hundred colonists will make it home, founding a settlement that will serve as humanity's furthest outpost and the launching point for everything that comes next.",
    narration_key: "ch8_m59_p3",
  });

  // Mission 60: Legacy — single phase (meet_npc), no phases table entry needed.
  // has_phases is false, base mission objectives handle it.

  // =====================================================================
  // MISSION CHOICES — Permanent Consequences #2-5
  // =====================================================================

  // PERMANENT #2 — Coalition Structure (Mission 35)
  await upsertChoice(knex, {
    id: choiceId("coalition_structure"),
    template_id: storyMissionId(35),
    phase_id: null,
    choice_key: "coalition_structure",
    prompt_title: "Coalition Structure",
    prompt_body:
      "The summit agrees that a unified response is necessary, but the form of that unity is fiercely debated. Elenion asks for your recommendation. What structure should the coalition take?",
    options: JSON.stringify([
      {
        id: "military_alliance",
        label: "Military Alliance",
        description:
          "A military alliance under Kalin command — efficient, decisive, but authoritarian. The Kalin know war better than anyone.",
        effects: {
          fame: { frontier_rangers: 20 },
          npc_rep: { commander_raxus: 15 },
          flags: { coalition_type: "military" },
        },
      },
      {
        id: "trade_federation",
        label: "Trade Federation",
        description:
          "A trade federation guided by Tar'ri economic principles — prosperous and flexible, but slow to mobilize in crisis.",
        effects: {
          fame: { cosmic_scholars: 10, frontier_rangers: 10 },
          npc_rep: { kovax_prime: 15 },
          flags: { coalition_type: "trade" },
        },
      },
      {
        id: "hybrid_council",
        label: "Hybrid Council",
        description:
          "A hybrid council with shared leadership across all factions — balanced and representative, but prone to deadlock.",
        effects: {
          fame: { cosmic_scholars: 20 },
          npc_rep: { alarion: 10, valandor: 10 },
          flags: { coalition_type: "hybrid" },
        },
      },
    ]),
    is_permanent: true,
    narration_key: "ch5_m35_coalition_choice",
  });

  // Non-permanent choice for Mission 39: The Fragile Pact
  await upsertChoice(knex, {
    id: choiceId("fragile_pact"),
    template_id: storyMissionId(39),
    phase_id: phaseId(39, 2),
    choice_key: "fragile_pact",
    prompt_title: "The Kalin Weapons Program",
    prompt_body:
      "Commander Raxus has revealed that the Kalin secretly weaponized the Precursor artifact in violation of the coalition charter. The weapons are powerful and could help against the shadow. But the deception could destroy the alliance. How do you handle this?",
    options: JSON.stringify([
      {
        id: "confront_publicly",
        label: "Confront Publicly",
        description:
          "Bring the secret weapons program before the full coalition. Transparency is the only way to build lasting trust, even if it causes short-term upheaval.",
        effects: {
          fame: { cosmic_scholars: 15 },
          npc_rep: { commander_raxus: -10, alarion: 10 },
          flags: { kalin_confronted_publicly: "true" },
        },
      },
      {
        id: "handle_privately",
        label: "Handle Privately",
        description:
          "Work with Raxus to quietly integrate the weapons into coalition defense plans. The alliance cannot afford a public crisis right now.",
        effects: {
          fame: { frontier_rangers: 15 },
          npc_rep: { commander_raxus: 10 },
          flags: { kalin_handled_privately: "true" },
        },
      },
    ]),
    is_permanent: false,
    narration_key: "ch5_m39_fragile_pact_choice",
  });

  // PERMANENT #3 — Weapon Configuration (Mission 44, Phase 2)
  await upsertChoice(knex, {
    id: choiceId("weapon_configuration"),
    template_id: storyMissionId(44),
    phase_id: phaseId(44, 2),
    choice_key: "weapon_configuration",
    prompt_title: "The Weapon Question",
    prompt_body:
      "Two weapons have been designed to fight the shadow entity. Only one can be built with the available cyrillium. Miraen's resonance disruptor works with natural frequencies — surgical and ecological. Raxus's quantum annihilator is raw destructive power — devastating and absolute. Which weapon will the coalition wield?",
    options: JSON.stringify([
      {
        id: "resonance_disruptor",
        label: "Resonance Disruptor",
        description:
          "Miraen's design — disrupts shadow constructs by destabilizing their dimensional anchors. Ecological, surgical, preserves the environment.",
        effects: {
          fame: { cosmic_scholars: 15 },
          flags: { weapon_choice: "ecological" },
        },
      },
      {
        id: "quantum_annihilator",
        label: "Quantum Annihilator",
        description:
          "Raxus's design — erases matter from existence in targeted zones. Devastating, efficient, leaves nothing behind.",
        effects: {
          fame: { frontier_rangers: 15 },
          flags: { weapon_choice: "destructive" },
        },
      },
    ]),
    is_permanent: true,
    narration_key: "ch6_m44_weapon_choice",
  });

  // PERMANENT #4 — Council Structure (Mission 50, Phase 3)
  await upsertChoice(knex, {
    id: choiceId("council_structure"),
    template_id: storyMissionId(50),
    phase_id: phaseId(50, 3),
    choice_key: "council_structure",
    prompt_title: "The Council Charter",
    prompt_body:
      "The Galactic Council needs a permanent structure. Three models have been proposed. Your voice, as the hero of the Battle for the Galaxy, carries decisive weight. What kind of Council will govern the stars?",
    options: JSON.stringify([
      {
        id: "open_council",
        label: "Open Council",
        description:
          "Any species or faction can join and vote. Maximum democracy, maximum representation. Risk of deadlock and infiltration.",
        effects: {
          fame: { cosmic_scholars: 10, frontier_rangers: 10 },
          flags: { council_type: "open" },
        },
      },
      {
        id: "founding_council",
        label: "Founding Council",
        description:
          "Limited to species that fought in the Battle for the Galaxy, with expansion possible later. Rewards sacrifice. Risk of exclusion.",
        effects: {
          fame: { cosmic_scholars: 20 },
          flags: { council_type: "founding" },
        },
      },
      {
        id: "advisory_council",
        label: "Advisory Council",
        description:
          "Representatives advise, but a rotating executive makes decisions. Efficient crisis response. Risk of power concentration.",
        effects: {
          fame: { frontier_rangers: 20 },
          flags: { council_type: "advisory" },
        },
      },
    ]),
    is_permanent: true,
    narration_key: "ch7_m50_council_choice",
  });

  // PERMANENT #5 — Valandor's Legacy (Mission 57, Phase 2)
  await upsertChoice(knex, {
    id: choiceId("valandors_legacy"),
    template_id: storyMissionId(57),
    phase_id: phaseId(57, 2),
    choice_key: "valandors_legacy",
    prompt_title: "Valandor's Farewell Gift",
    prompt_body:
      "Valandor is leaving to become a sentinel for the seal. As his parting gift, he offers three choices — each reflecting a different aspect of Vedic wisdom. Or you may decline, honoring the Vedic belief that true wisdom needs no gift.",
    options: JSON.stringify([
      {
        id: "crystal_matrix",
        label: "Crystal Matrix",
        description:
          "A Vedic crystal matrix that enhances perception and scanner capability. The gift of knowledge — seeing further and deeper than before.",
        effects: {
          fame: { cosmic_scholars: 20 },
          flags: { legacy_gift: "crystal_matrix" },
        },
      },
      {
        id: "star_charts",
        label: "Star Charts",
        description:
          "Ancient star charts revealing hidden pathways through the galaxy's most dangerous regions. The gift of exploration — going where no one else can.",
        effects: {
          fame: { frontier_rangers: 20 },
          flags: { legacy_gift: "star_charts" },
        },
      },
      {
        id: "decline_both",
        label: "Decline Both",
        description:
          "Honor the Vedic belief that the greatest gift is the freedom to choose nothing. The gift of wisdom — knowing when enough is enough.",
        effects: {
          fame: { cosmic_scholars: 10, frontier_rangers: 10 },
          flags: { legacy_gift: "declined" },
        },
      },
    ]),
    is_permanent: true,
    narration_key: "ch8_m57_valandor_choice",
  });

  console.log("Seeded Chapters 5-8 phases and choices (missions 32-60)");
}
