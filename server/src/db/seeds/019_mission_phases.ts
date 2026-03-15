import { Knex } from "knex";
import crypto from "crypto";

function storyMissionId(n: number): string {
  return `e0000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}

function phaseId(mission: number, phase: number): string {
  return `p0000000-${String(mission).padStart(4, "0")}-0000-0000-${String(phase).padStart(12, "0")}`;
}

function choiceId(key: string): string {
  // Deterministic ID from key for idempotent seeding
  const hash = key
    .split("")
    .reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0);
  return `c0000000-0000-0000-0000-${String(Math.abs(hash)).padStart(12, "0")}`;
}

export async function seed(knex: Knex): Promise<void> {
  // Clear existing phases and choices (idempotent)
  await knex("player_mission_choices").del();
  await knex("mission_choices").del();
  await knex("mission_phases").del();

  // Mark missions 5-8 as phased (Chapter 1 revamp additions)
  // Missions 1-4 stay single-objective (keep existing Act 1 intro)
  const phasedMissionIds = [
    storyMissionId(5), // Alarion's Mandate
    storyMissionId(6), // Departing Agaricalis
    storyMissionId(7), // The Dying Star
    // Missions 9-16 (Chapter 2)
    storyMissionId(10), // Wormhole Transit
    storyMissionId(12), // The Philosopher's Test
    storyMissionId(13), // Cyrillium Veins
    // Missions 17-24 (Chapter 3)
    storyMissionId(18), // Tar'ri Traders
    storyMissionId(19), // Trade Diplomacy
    storyMissionId(20), // Distress Signal
    storyMissionId(21), // The Kalin Rescue
    storyMissionId(23), // The Ancient Vault
    storyMissionId(24), // Artifact Unearthed
    // Missions 25-31 (Chapter 4)
    storyMissionId(25), // The Debate
    storyMissionId(26), // Tar'ri Leverage
    storyMissionId(27), // Kalin War Games
    storyMissionId(28), // Whispers in the Dark
    storyMissionId(29), // Espionage
    storyMissionId(30), // The Arms Race
    storyMissionId(31), // Drums of War
  ];

  // Update templates with has_phases and chapter info
  for (const id of phasedMissionIds) {
    await knex("mission_templates").where({ id }).update({
      has_phases: true,
      has_choices: false, // Will be set per-mission below
    });
  }

  // Set chapter values (supplements existing act column)
  for (let i = 1; i <= 8; i++) {
    await knex("mission_templates")
      .where({ id: storyMissionId(i) })
      .update({ chapter: 1 });
  }
  for (let i = 9; i <= 16; i++) {
    await knex("mission_templates")
      .where({ id: storyMissionId(i) })
      .update({ chapter: 2 });
  }
  for (let i = 17; i <= 24; i++) {
    await knex("mission_templates")
      .where({ id: storyMissionId(i) })
      .update({ chapter: 3 });
  }
  for (let i = 25; i <= 31; i++) {
    await knex("mission_templates")
      .where({ id: storyMissionId(i) })
      .update({ chapter: 4 });
  }

  // ===================================================================
  // CHAPTER 1 PHASES
  // ===================================================================

  // Mission 5: Alarion's Mandate (2 phases)
  await knex("mission_phases").insert([
    {
      id: phaseId(5, 1),
      template_id: storyMissionId(5),
      phase_order: 1,
      title: "Meet High Sage Alarion",
      description:
        "Travel to High Sage Alarion aboard the Star Seeker and receive your mandate.",
      objective_type: "meet_npc",
      objectives: JSON.stringify({
        npcId: "alarion",
        npcName: "High Sage Alarion",
      }),
      lore_text:
        "The High Sage has summoned you to the bridge of the Star Seeker. The Muscarian elder's bioluminescent tendrils pulse with an urgency you have never seen before.",
      narration_key: "ch1_m05_p1",
    },
    {
      id: phaseId(5, 2),
      template_id: storyMissionId(5),
      phase_order: 2,
      title: "Fuel the Departure",
      description:
        "Deliver 10 cyrillium to power the Star Seeker's departure systems.",
      objective_type: "deliver_cargo",
      objectives: JSON.stringify({ commodity: "cyrillium", quantity: 10 }),
      lore_text:
        "Alarion's words echo in your mind: the dying star gives us no more time. The Star Seeker needs cyrillium to breach the gravity well. Find it, or our people remain trapped.",
      narration_key: "ch1_m05_p2",
    },
  ]);

  // Mission 6: Departing Agaricalis (2 phases)
  await knex("mission_phases").insert([
    {
      id: phaseId(6, 1),
      template_id: storyMissionId(6),
      phase_order: 1,
      title: "Survive the Scavengers",
      description:
        "Desperate scavengers attack departing ships. Survive the ambush.",
      objective_type: "survive_ambush",
      objectives: JSON.stringify({ ambushesToSurvive: 1 }),
      lore_text:
        "Not everyone accepted the exodus. Scavenger bands prowl the departure corridors, preying on loaded ships. Your shields flare as the first volley hits.",
      narration_key: "ch1_m06_p1",
    },
    {
      id: phaseId(6, 2),
      template_id: storyMissionId(6),
      phase_order: 2,
      title: "Clear the Departure Corridor",
      description: "Navigate through 3 sectors along the departure corridor.",
      objective_type: "visit_sector",
      objectives: JSON.stringify({ sectorsToVisit: 3 }),
      narration_key: "ch1_m06_p2",
    },
  ]);

  // Mission 7: The Dying Star (2 phases + choice)
  await knex("mission_templates")
    .where({ id: storyMissionId(7) })
    .update({ has_choices: true });

  await knex("mission_phases").insert([
    {
      id: phaseId(7, 1),
      template_id: storyMissionId(7),
      phase_order: 1,
      title: "Document the Decay",
      description:
        "Scan 3 sectors to record the dying star's radiation patterns for Miraen's ecological archive.",
      objective_type: "scan_sectors",
      objectives: JSON.stringify({ scansRequired: 3 }),
      lore_text:
        "Miraen, the expedition's chief ecologist, needs precise readings of the star's decay. This data will help other civilizations if they face the same fate.",
      narration_key: "ch1_m07_p1",
    },
    {
      id: phaseId(7, 2),
      template_id: storyMissionId(7),
      phase_order: 2,
      title: "The Data Decision",
      description: "Choose what to do with the stellar decay data.",
      objective_type: "choose",
      objectives: JSON.stringify({ choiceId: choiceId("dying_star_data") }),
      narration_key: "ch1_m07_p2",
    },
  ]);

  await knex("mission_choices").insert({
    id: choiceId("dying_star_data"),
    template_id: storyMissionId(7),
    phase_id: phaseId(7, 2),
    choice_key: "dying_star_data",
    prompt_title: "The Dying Star Data",
    prompt_body:
      "Miraen's stellar decay data could save billions of lives if shared. But the Vedic have not yet earned our trust. What do you do with the data?",
    options: JSON.stringify([
      {
        id: "share_vedic",
        label: "Share with the Vedic",
        description:
          "Send the full dataset to Vedic scholars. Knowledge should be free.",
        effects: {
          fame: { cosmic_scholars: 10 },
          npc_rep: { miraen: 5 },
          flags: { shared_data_with_vedic: "true" },
        },
      },
      {
        id: "keep_classified",
        label: "Keep Classified",
        description:
          "This data is a strategic asset. Keep it within Muscarian hands.",
        effects: {
          fame: { frontier_rangers: 10 },
          flags: { kept_data_classified: "true" },
        },
      },
    ]),
    is_permanent: false,
    narration_key: "ch1_m07_choice",
  });

  // ===================================================================
  // CHAPTER 2 PHASES
  // ===================================================================

  // Mission 10: Wormhole Transit (2 phases)
  await knex("mission_phases").insert([
    {
      id: phaseId(10, 1),
      template_id: storyMissionId(10),
      phase_order: 1,
      title: "Reach the Anomaly",
      description: "Navigate to the wormhole sector.",
      objective_type: "visit_sector",
      objectives: JSON.stringify({ sectorsToVisit: 1 }),
      lore_text:
        "The spatial anomaly pulses like a wound in the fabric of space. Caelum has calibrated your shields for transit, but there are no guarantees.",
      narration_key: "ch2_m10_p1",
    },
    {
      id: phaseId(10, 2),
      template_id: storyMissionId(10),
      phase_order: 2,
      title: "Survive the Crossing",
      description:
        "Survive the gravitational shear forces during wormhole transit.",
      objective_type: "survive_ambush",
      objectives: JSON.stringify({ ambushesToSurvive: 1 }),
      lore_text:
        "The wormhole tears at your hull. Energy constructs materialize from the distortion, drawn by your ship's electromagnetic signature. Hold steady.",
      narration_key: "ch2_m10_p2",
    },
  ]);

  // Mission 12: The Philosopher's Test (2 phases + choice)
  await knex("mission_templates")
    .where({ id: storyMissionId(12) })
    .update({ has_choices: true });

  await knex("mission_phases").insert([
    {
      id: phaseId(12, 1),
      template_id: storyMissionId(12),
      phase_order: 1,
      title: "Study the Artifacts",
      description: "Investigate 3 Vedic artifacts at Valandor's request.",
      objective_type: "investigate",
      objectives: JSON.stringify({ eventsToInvestigate: 3 }),
      lore_text:
        "Valandor spreads three ancient artifacts before you, each humming with residual energy. 'Tell me what you see,' he says. 'Not with your instruments — with your understanding.'",
      narration_key: "ch2_m12_p1",
    },
    {
      id: phaseId(12, 2),
      template_id: storyMissionId(12),
      phase_order: 2,
      title: "Interpretation",
      description: "Share your interpretation of the artifacts with Valandor.",
      objective_type: "choose",
      objectives: JSON.stringify({ choiceId: choiceId("philosopher_test") }),
      narration_key: "ch2_m12_p2",
    },
  ]);

  await knex("mission_choices").insert({
    id: choiceId("philosopher_test"),
    template_id: storyMissionId(12),
    phase_id: phaseId(12, 2),
    choice_key: "philosopher_test",
    prompt_title: "The Philosopher's Test",
    prompt_body:
      "Valandor listens intently as you examine the ancient artifacts. Their purpose is ambiguous — tools of creation or instruments of defense?",
    options: JSON.stringify([
      {
        id: "creation",
        label: "Tools of Creation",
        description: "These artifacts were built to nurture life, not end it.",
        effects: {
          npc_rep: { valandor: 15 },
          fame: { cosmic_scholars: 5 },
          flags: { vedic_creation_view: "true" },
        },
      },
      {
        id: "defense",
        label: "Instruments of Defense",
        description:
          "Their design suggests shielding and protection — weapons of last resort.",
        effects: {
          npc_rep: { valandor: 5 },
          fame: { frontier_rangers: 5 },
          flags: { vedic_defense_view: "true" },
        },
      },
    ]),
    is_permanent: false,
    narration_key: "ch2_m12_choice",
  });

  // Mission 13: Cyrillium Veins (2 phases)
  await knex("mission_phases").insert([
    {
      id: phaseId(13, 1),
      template_id: storyMissionId(13),
      phase_order: 1,
      title: "Geological Survey",
      description:
        "Scan 4 sectors with geological survey to locate cyrillium deposits.",
      objective_type: "scan_sectors",
      objectives: JSON.stringify({ scansRequired: 4 }),
      lore_text:
        "Miraen has detected trace cyrillium signatures in the surrounding sectors. A systematic scan will pinpoint the richest veins.",
      narration_key: "ch2_m13_p1",
    },
    {
      id: phaseId(13, 2),
      template_id: storyMissionId(13),
      phase_order: 2,
      title: "Sample Collection",
      description: "Deliver 15 cyrillium samples to Miraen's laboratory.",
      objective_type: "deliver_cargo",
      objectives: JSON.stringify({ commodity: "cyrillium", quantity: 15 }),
      narration_key: "ch2_m13_p2",
    },
  ]);

  // ===================================================================
  // CHAPTER 3 PHASES
  // ===================================================================

  // Mission 18: Tar'ri Traders (2 phases)
  await knex("mission_phases").insert([
    {
      id: phaseId(18, 1),
      template_id: storyMissionId(18),
      phase_order: 1,
      title: "Meet the Delegation",
      description: "Meet the Tar'ri trade delegation led by Kovax Prime.",
      objective_type: "meet_npc",
      objectives: JSON.stringify({
        npcId: "kovax_prime",
        npcName: "Kovax Prime",
      }),
      lore_text:
        "The Tar'ri vessel gleams with burnished alloys. Their lead negotiator, Kovax Prime, extends a four-fingered hand in greeting.",
      narration_key: "ch3_m18_p1",
    },
    {
      id: phaseId(18, 2),
      template_id: storyMissionId(18),
      phase_order: 2,
      title: "Establish Goodwill",
      description:
        "Complete 15 units of trade to demonstrate Muscarian reliability.",
      objective_type: "trade_units",
      objectives: JSON.stringify({ unitsToTrade: 15 }),
      narration_key: "ch3_m18_p2",
    },
  ]);

  // Mission 19: Trade Diplomacy (2 phases)
  await knex("mission_phases").insert([
    {
      id: phaseId(19, 1),
      template_id: storyMissionId(19),
      phase_order: 1,
      title: "Relief Supplies",
      description: "Deliver 20 food to the struggling Tar'ri outpost.",
      objective_type: "deliver_cargo",
      objectives: JSON.stringify({ commodity: "food", quantity: 20 }),
      lore_text:
        "A Tar'ri outpost on the frontier is running low on provisions. Jyn Coppervein, the outpost's quartermaster, is desperate for supplies.",
      narration_key: "ch3_m19_p1",
    },
    {
      id: phaseId(19, 2),
      template_id: storyMissionId(19),
      phase_order: 2,
      title: "Prove Reliability",
      description:
        "Deliver 10 tech components within 30 minutes to prove your dependability.",
      objective_type: "timed_delivery",
      objectives: JSON.stringify({
        commodity: "tech",
        quantity: 10,
        timeMinutes: 30,
      }),
      narration_key: "ch3_m19_p2",
    },
  ]);

  // Mission 20: Distress Signal (2 phases)
  await knex("mission_phases").insert([
    {
      id: phaseId(20, 1),
      template_id: storyMissionId(20),
      phase_order: 1,
      title: "Investigate the Signal",
      description: "Investigate the distress signal coming from unknown space.",
      objective_type: "investigate",
      objectives: JSON.stringify({ eventsToInvestigate: 1 }),
      lore_text:
        "A distress signal bleeds through on an unfamiliar frequency. The pattern is military — precise, repeating, urgent.",
      narration_key: "ch3_m20_p1",
    },
    {
      id: phaseId(20, 2),
      template_id: storyMissionId(20),
      phase_order: 2,
      title: "Follow the Trail",
      description:
        "Navigate to 3 sectors following the debris trail to find the damaged ship.",
      objective_type: "visit_sector",
      objectives: JSON.stringify({ sectorsToVisit: 3 }),
      narration_key: "ch3_m20_p2",
    },
  ]);

  // Mission 21: The Kalin Rescue (2 phases)
  await knex("mission_phases").insert([
    {
      id: phaseId(21, 1),
      template_id: storyMissionId(21),
      phase_order: 1,
      title: "Escort the Warship",
      description:
        "Escort the crippled Kalin vessel through 4 hostile sectors to safety.",
      objective_type: "escort",
      objectives: JSON.stringify({ caravansToEscort: 1 }),
      lore_text:
        "The Kalin warship lists badly, its port engines trailing sparks. Commander Raxus's voice is proud but strained: 'We require... assistance.'",
      narration_key: "ch3_m21_p1",
    },
    {
      id: phaseId(21, 2),
      template_id: storyMissionId(21),
      phase_order: 2,
      title: "Meet Commander Raxus",
      description:
        "Meet Commander Raxus once the Kalin vessel is safely docked.",
      objective_type: "meet_npc",
      objectives: JSON.stringify({
        npcId: "commander_raxus",
        npcName: "Commander Raxus",
      }),
      lore_text:
        "Raxus stands at the airlock, his armor scorched but his bearing unbowed. He offers a Kalin salute — a fist against the chest.",
      narration_key: "ch3_m21_p2",
    },
  ]);

  // Mission 23: The Ancient Vault (2 phases)
  await knex("mission_phases").insert([
    {
      id: phaseId(23, 1),
      template_id: storyMissionId(23),
      phase_order: 1,
      title: "Archaeological Survey",
      description:
        "Scan 5 sectors surrounding Lyra Starwind's archaeological site.",
      objective_type: "scan_sectors",
      objectives: JSON.stringify({ scansRequired: 5 }),
      lore_text:
        "Lyra Starwind has found something extraordinary — energy readings that predate every known civilization. She needs your help mapping the area.",
      narration_key: "ch3_m23_p1",
    },
    {
      id: phaseId(23, 2),
      template_id: storyMissionId(23),
      phase_order: 2,
      title: "Artifact Analysis",
      description:
        "Investigate 3 artifact readings within the Precursor vault.",
      objective_type: "investigate",
      objectives: JSON.stringify({ eventsToInvestigate: 3 }),
      lore_text:
        "The vault's interior pulses with dormant energy. Three distinct signatures call out from the darkness.",
      narration_key: "ch3_m23_p2",
    },
  ]);

  // Mission 24: Artifact Unearthed (2 phases + PERMANENT CHOICE #1)
  await knex("mission_templates")
    .where({ id: storyMissionId(24) })
    .update({ has_choices: true });

  await knex("mission_phases").insert([
    {
      id: phaseId(24, 1),
      template_id: storyMissionId(24),
      phase_order: 1,
      title: "Power the Vault",
      description:
        "Deliver 10 cyrillium to activate the Precursor vault's extraction systems.",
      objective_type: "deliver_cargo",
      objectives: JSON.stringify({ commodity: "cyrillium", quantity: 10 }),
      lore_text:
        "The vault's doors are sealed with an energy lock that responds to cyrillium resonance. Feed the crystal matrix and the secrets within are yours.",
      narration_key: "ch3_m24_p1",
    },
    {
      id: phaseId(24, 2),
      template_id: storyMissionId(24),
      phase_order: 2,
      title: "The Artifact Decision",
      description: "Choose who will study the Precursor artifact.",
      objective_type: "choose",
      objectives: JSON.stringify({ choiceId: choiceId("artifact_decision") }),
      narration_key: "ch3_m24_p2",
    },
  ]);

  await knex("mission_choices").insert({
    id: choiceId("artifact_decision"),
    template_id: storyMissionId(24),
    phase_id: phaseId(24, 2),
    choice_key: "artifact_decision",
    prompt_title: "The Artifact Decision",
    prompt_body:
      "The Precursor artifact hums with ancient power. Alarion, Raxus, and Valandor each make their case. Who receives it first?",
    options: JSON.stringify([
      {
        id: "vedic_scholars",
        label: "Vedic Scholars",
        description:
          "Let Valandor's scholars study it peacefully. Knowledge belongs to all.",
        effects: {
          fame: { cosmic_scholars: 20 },
          npc_rep: { valandor: 20 },
          flags: { artifact_given_to_vedic: "true" },
          rewards: { xp: 500 },
        },
      },
      {
        id: "kalin_military",
        label: "Kalin Military",
        description:
          "Raxus's engineers can unlock its defensive potential. We may need weapons.",
        effects: {
          fame: { frontier_rangers: 20 },
          npc_rep: { commander_raxus: 20 },
          flags: { artifact_given_to_kalin: "true" },
          rewards: { xp: 500 },
        },
      },
      {
        id: "muscarian_custody",
        label: "Muscarian Custody",
        description:
          "Keep it under our own study. Balance between knowledge and security.",
        effects: {
          fame: { cosmic_scholars: 10, frontier_rangers: 10 },
          npc_rep: { alarion: 15 },
          flags: { artifact_kept_by_muscarian: "true" },
          rewards: { xp: 500 },
        },
      },
    ]),
    is_permanent: true,
    narration_key: "ch3_m24_artifact_choice",
  });

  // ===================================================================
  // CHAPTER 4 PHASES
  // ===================================================================

  // Mission 25: The Debate (2 phases)
  await knex("mission_phases").insert([
    {
      id: phaseId(25, 1),
      template_id: storyMissionId(25),
      phase_order: 1,
      title: "Hear Kovax's Argument",
      description:
        "Meet Kovax Prime to hear the Tar'ri case for trade leverage.",
      objective_type: "meet_npc",
      objectives: JSON.stringify({
        npcId: "kovax_prime",
        npcName: "Kovax Prime",
      }),
      lore_text:
        "Kovax Prime leans forward, his trade-scales glinting. 'The artifacts are leverage. With them, we control the market for ancient technology across three galaxies.'",
      narration_key: "ch4_m25_p1",
    },
    {
      id: phaseId(25, 2),
      template_id: storyMissionId(25),
      phase_order: 2,
      title: "Hear Raxus's Argument",
      description:
        "Meet Commander Raxus to hear the Kalin case for weaponization.",
      objective_type: "meet_npc",
      objectives: JSON.stringify({
        npcId: "commander_raxus",
        npcName: "Commander Raxus",
      }),
      lore_text:
        "Raxus's voice is iron. 'Trade leverage? While the galaxy burns? These artifacts are shields and swords. We will need both before this is over.'",
      narration_key: "ch4_m25_p2",
    },
  ]);

  // Mission 26: Tar'ri Leverage (2 phases)
  await knex("mission_phases").insert([
    {
      id: phaseId(26, 1),
      template_id: storyMissionId(26),
      phase_order: 1,
      title: "Supply the Forge",
      description: "Deliver 25 tech to Tar'ri manufacturing facilities.",
      objective_type: "deliver_cargo",
      objectives: JSON.stringify({ commodity: "tech", quantity: 25 }),
      narration_key: "ch4_m26_p1",
    },
    {
      id: phaseId(26, 2),
      template_id: storyMissionId(26),
      phase_order: 2,
      title: "Stop the Smugglers",
      description:
        "Intercept 2 caravans smuggling artifact fragments on the black market.",
      objective_type: "intercept",
      objectives: JSON.stringify({ caravansToIntercept: 2 }),
      narration_key: "ch4_m26_p2",
    },
  ]);

  // Mission 27: Kalin War Games (2 phases)
  await knex("mission_phases").insert([
    {
      id: phaseId(27, 1),
      template_id: storyMissionId(27),
      phase_order: 1,
      title: "Target Practice",
      description: "Destroy 4 target drones in Kalin war exercises.",
      objective_type: "destroy_ship",
      objectives: JSON.stringify({ shipsToDestroy: 4 }),
      lore_text:
        "Raxus observes from the command deck as training drones swarm into position. 'Show me what Muscarian pilots are worth.'",
      narration_key: "ch4_m27_p1",
    },
    {
      id: phaseId(27, 2),
      template_id: storyMissionId(27),
      phase_order: 2,
      title: "The Surprise Round",
      description: "Survive a simulated ambush by Kalin elite fighters.",
      objective_type: "survive_ambush",
      objectives: JSON.stringify({ ambushesToSurvive: 1 }),
      lore_text:
        "The drones are gone, but the exercise is not over. Raxus's elite squadron drops from concealment. 'Survive this.'",
      narration_key: "ch4_m27_p2",
    },
  ]);

  // Mission 28: Whispers in the Dark (2 phases)
  await knex("mission_phases").insert([
    {
      id: phaseId(28, 1),
      template_id: storyMissionId(28),
      phase_order: 1,
      title: "Strange Interference",
      description:
        "Investigate 3 reports of mysterious interference in deep space.",
      objective_type: "investigate",
      objectives: JSON.stringify({ eventsToInvestigate: 3 }),
      lore_text:
        "Something is jamming communications across multiple sectors. The pattern is deliberate — someone, or something, does not want to be found.",
      narration_key: "ch4_m28_p1",
    },
    {
      id: phaseId(28, 2),
      template_id: storyMissionId(28),
      phase_order: 2,
      title: "Trace the Source",
      description: "Scan 4 sectors showing anomalous energy readings.",
      objective_type: "scan_sectors",
      objectives: JSON.stringify({ scansRequired: 4 }),
      narration_key: "ch4_m28_p2",
    },
  ]);

  // Mission 29: Espionage (2 phases + choice)
  await knex("mission_templates")
    .where({ id: storyMissionId(29) })
    .update({ has_choices: true });

  await knex("mission_phases").insert([
    {
      id: phaseId(29, 1),
      template_id: storyMissionId(29),
      phase_order: 1,
      title: "Sabotage the Post",
      description:
        "Sabotage the Syndicate listening post intercepting coalition communications.",
      objective_type: "sabotage",
      objectives: JSON.stringify({
        targetId: "syndicate_listening_post",
        targetType: "outpost",
      }),
      lore_text:
        "The Shadow Syndicate has been eavesdropping on coalition communications through a hidden listening post. Viper Nox provided the coordinates — for a fee.",
      narration_key: "ch4_m29_p1",
    },
    {
      id: phaseId(29, 2),
      template_id: storyMissionId(29),
      phase_order: 2,
      title: "The Data Question",
      description: "Decide what to do with the intercepted data.",
      objective_type: "choose",
      objectives: JSON.stringify({ choiceId: choiceId("espionage_data") }),
      narration_key: "ch4_m29_p2",
    },
  ]);

  await knex("mission_choices").insert({
    id: choiceId("espionage_data"),
    template_id: storyMissionId(29),
    phase_id: phaseId(29, 2),
    choice_key: "espionage_data",
    prompt_title: "The Intercepted Data",
    prompt_body:
      "You've disabled the listening post, but the data banks are intact. Volumes of intercepted coalition communications sit before you.",
    options: JSON.stringify([
      {
        id: "destroy_data",
        label: "Destroy the Data",
        description: "Wipe everything. Clean slate. The Rangers will approve.",
        effects: {
          fame: { frontier_rangers: 10 },
          flags: { destroyed_syndicate_data: "true" },
        },
      },
      {
        id: "copy_data",
        label: "Copy It First",
        description:
          "Knowledge is power. Copy the data before destroying the post. The Syndicate will notice.",
        effects: {
          fame: { shadow_syndicate: 5 },
          flags: { copied_syndicate_data: "true" },
          rewards: { credits: 5000 },
        },
      },
    ]),
    is_permanent: false,
    narration_key: "ch4_m29_choice",
  });

  // Mission 30: The Arms Race (2 phases)
  await knex("mission_phases").insert([
    {
      id: phaseId(30, 1),
      template_id: storyMissionId(30),
      phase_order: 1,
      title: "Component Trade",
      description:
        "Trade 30 units of tech components for Caelum's weapon prototypes.",
      objective_type: "trade_units",
      objectives: JSON.stringify({ unitsToTrade: 30 }),
      lore_text:
        "Caelum needs raw materials for his latest designs. His engineering bay is a whirlwind of sparks and muttered equations.",
      narration_key: "ch4_m30_p1",
    },
    {
      id: phaseId(30, 2),
      template_id: storyMissionId(30),
      phase_order: 2,
      title: "Secure Delivery",
      description:
        "Deliver the weapon prototypes to a secure testing facility.",
      objective_type: "deliver_cargo",
      objectives: JSON.stringify({ commodity: "tech", quantity: 15 }),
      narration_key: "ch4_m30_p2",
    },
  ]);

  // Mission 31: Drums of War (2 phases)
  await knex("mission_phases").insert([
    {
      id: phaseId(31, 1),
      template_id: storyMissionId(31),
      phase_order: 1,
      title: "Escort the Convoy",
      description: "Escort the diplomatic convoy through contested space.",
      objective_type: "escort",
      objectives: JSON.stringify({ caravansToEscort: 1 }),
      lore_text:
        "The diplomatic convoy carries representatives from every faction to the summit. Without escort, they will never make it through contested space.",
      narration_key: "ch4_m31_p1",
    },
    {
      id: phaseId(31, 2),
      template_id: storyMissionId(31),
      phase_order: 2,
      title: "The Summit",
      description: "Meet Elenion at the summit location.",
      objective_type: "meet_npc",
      objectives: JSON.stringify({ npcId: "elenion", npcName: "Elenion" }),
      lore_text:
        "Elenion stands at the podium of the summit chamber, his voice carrying the weight of a civilization's hope. 'We stand at the threshold of war or peace. The choice is ours.'",
      narration_key: "ch4_m31_p2",
      on_complete_effects: JSON.stringify({
        flags: { attended_drums_of_war_summit: "true" },
      }),
    },
  ]);
}
