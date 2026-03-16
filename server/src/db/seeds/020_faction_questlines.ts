import { Knex } from "knex";

// ID generators for deterministic, idempotent seeding
function factionMissionId(faction: string, n: number): string {
  const factionCodes: Record<string, string> = {
    mycorrhizal: "0001",
    iron_dominion: "0002",
    traders_guild: "0003",
    shadow_syndicate: "0004",
    independent: "0005",
  };
  const code = factionCodes[faction] || "0000";
  return `f0000000-${code}-0000-0000-${String(n).padStart(12, "0")}`;
}

function fqPhaseId(faction: string, mission: number, phase: number): string {
  const factionCodes: Record<string, string> = {
    mycorrhizal: "0001",
    iron_dominion: "0002",
    traders_guild: "0003",
    shadow_syndicate: "0004",
    independent: "0005",
  };
  const code = factionCodes[faction] || "0000";
  return `fp000000-${code}-${String(mission).padStart(4, "0")}-0000-${String(phase).padStart(12, "0")}`;
}

function fqChoiceId(key: string): string {
  const hash = key
    .split("")
    .reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0);
  return `fc000000-0000-0000-0000-${String(Math.abs(hash)).padStart(12, "0")}`;
}

// NPC IDs from existing seed 006_npcs
const NPC = {
  lyra: "c0000000-0000-0000-0000-000000000015",
  archivist_thal: "c0000000-0000-0000-0000-000000000017",
  professor_thane: "c0000000-0000-0000-0000-000000000016",
  hermit: "c0000000-0000-0000-0000-000000000025",
  sarge: "c0000000-0000-0000-0000-000000000014",
  elara_voss: "c0000000-0000-0000-0000-000000000012",
  commander_thane: "c0000000-0000-0000-0000-000000000023",
  hawk: "c0000000-0000-0000-0000-000000000013",
  jyn: "c0000000-0000-0000-0000-000000000008",
  kovax: "c0000000-0000-0000-0000-000000000005",
  shade: "c0000000-0000-0000-0000-000000000019",
  viper_nox: "c0000000-0000-0000-0000-000000000020",
  oracle: "c0000000-0000-0000-0000-000000000022",
  doc_helix: "c0000000-0000-0000-0000-000000000024",
  tiktok: "c0000000-0000-0000-0000-000000000010",
  sella: "c0000000-0000-0000-0000-000000000006",
};

export async function seed(knex: Knex): Promise<void> {
  // ═══════════════════════════════════════════════════════════════
  // MYCORRHIZAL NETWORK — 12 missions (cosmic_scholars questline)
  // Prereq: Chapter 2 complete + Accepted rep with Cosmic Scholars
  // ═══════════════════════════════════════════════════════════════
  const mycorrhizalMissions = [
    {
      id: factionMissionId("mycorrhizal", 1),
      title: "Initiation of the Mycelium",
      description:
        "Seek out Lead Researcher Lyra Starwind and prove your knowledge of the ancient Spore Network.",
      type: "meet_npc",
      objectives: JSON.stringify({ npcId: NPC.lyra, npcName: "Lyra Starwind" }),
      reward_credits: 2000,
      reward_xp: 250,
      difficulty: 2,
      source: "faction",
      faction_questline: "mycorrhizal_network",
      questline_order: 1,
      has_phases: false,
      has_choices: false,
      required_faction_tier: "accepted",
      npc_id: NPC.lyra,
      reward_faction_id: "cosmic_scholars",
      reward_fame: 10,
      lore_text:
        "The Mycorrhizal Network seeks those who understand the deeper connections binding all life. Lyra Starwind, the network's gatekeeper, awaits your arrival.",
    },
    {
      id: factionMissionId("mycorrhizal", 2),
      title: "Spore Cartography",
      description:
        "Map the ancient spore nodes scattered across deep space by scanning 6 sectors with heightened mycelial activity.",
      type: "scan_sectors",
      objectives: JSON.stringify({ scansRequired: 6 }),
      reward_credits: 3000,
      reward_xp: 350,
      difficulty: 3,
      source: "faction",
      faction_questline: "mycorrhizal_network",
      questline_order: 2,
      has_phases: false,
      has_choices: false,
      npc_id: NPC.lyra,
      reward_faction_id: "cosmic_scholars",
      reward_fame: 10,
      lore_text:
        "Lyra believes the ancient spore nodes hold the key to understanding the Muscarian exodus. Their positions must be charted before they can be studied.",
    },
    {
      id: factionMissionId("mycorrhizal", 3),
      title: "The Living Archive",
      description:
        "Scan three ancient data node sectors and deliver your findings to Archivist Thal.",
      type: "scan_sectors",
      objectives: JSON.stringify({
        scansRequired: 3,
      }),
      reward_credits: 3500,
      reward_xp: 400,
      difficulty: 3,
      source: "faction",
      faction_questline: "mycorrhizal_network",
      questline_order: 3,
      has_phases: true,
      has_choices: false,
      npc_id: NPC.archivist_thal,
      reward_faction_id: "cosmic_scholars",
      reward_fame: 15,
      lore_text:
        "The Living Archive is not a place but a state of being — data encoded in mycelial strands that predate the Star Seeker's journey.",
    },
    {
      id: factionMissionId("mycorrhizal", 4),
      title: "Fungal Communion",
      description:
        "Meet the Hermit in deep space and establish a mycelium-rich colony on a suitable world.",
      type: "colonize_planet",
      objectives: JSON.stringify({ colonistsToDeposit: 100 }),
      reward_credits: 4000,
      reward_xp: 450,
      difficulty: 4,
      source: "faction",
      faction_questline: "mycorrhizal_network",
      questline_order: 4,
      has_phases: true,
      has_choices: false,
      npc_id: NPC.hermit,
      reward_faction_id: "cosmic_scholars",
      reward_fame: 15,
      lore_text:
        "The Hermit has wandered the void for decades, seeking the perfect world for the next great communion. He believes he has found it.",
    },
    {
      id: factionMissionId("mycorrhizal", 5),
      title: "Network Resonance",
      description:
        "Scan 5 sectors and make a critical decision about the network's signal.",
      type: "scan_sectors",
      objectives: JSON.stringify({ scansRequired: 5 }),
      reward_credits: 4500,
      reward_xp: 500,
      difficulty: 4,
      source: "faction",
      faction_questline: "mycorrhizal_network",
      questline_order: 5,
      has_phases: true,
      has_choices: true,
      npc_id: NPC.lyra,
      reward_faction_id: "cosmic_scholars",
      reward_fame: 15,
      lore_text:
        "The network pulses with an ancient resonance. Lyra has detected a frequency that could either amplify or filter the signal — each with profound consequences.",
    },
    {
      id: factionMissionId("mycorrhizal", 6),
      title: "The Deep Root",
      description:
        "Scan 4 deep-space mycelial anchor sectors that hold the network together across the void.",
      type: "scan_sectors",
      objectives: JSON.stringify({
        scansRequired: 4,
      }),
      reward_credits: 5000,
      reward_xp: 550,
      difficulty: 5,
      source: "faction",
      faction_questline: "mycorrhizal_network",
      questline_order: 6,
      has_phases: false,
      has_choices: false,
      npc_id: NPC.professor_thane,
      reward_faction_id: "cosmic_scholars",
      reward_fame: 15,
      lore_text:
        "Professor Thane's archaeological surveys have located four structures older than any known civilization. They anchor the mycelial network to the fabric of space itself.",
    },
    {
      id: factionMissionId("mycorrhizal", 7),
      title: "Contested Knowledge",
      description:
        "Deliver 20 cyrillium to power the network's analysis engines and intercept 2 Syndicate data thieves.",
      type: "deliver_cargo",
      objectives: JSON.stringify({ commodity: "cyrillium", quantity: 20 }),
      reward_credits: 5500,
      reward_xp: 600,
      difficulty: 5,
      source: "faction",
      faction_questline: "mycorrhizal_network",
      questline_order: 7,
      has_phases: true,
      has_choices: false,
      reward_faction_id: "cosmic_scholars",
      reward_fame: 15,
      lore_text:
        "The Shadow Syndicate has taken interest in the network's secrets. The knowledge must be protected at any cost.",
    },
    {
      id: factionMissionId("mycorrhizal", 8),
      title: "Ancient Growth",
      description:
        "Establish a 200-colonist ecological preserve on a world rich with ancient mycelial growth.",
      type: "colonize_planet",
      objectives: JSON.stringify({ colonistsToDeposit: 200 }),
      reward_credits: 6000,
      reward_xp: 650,
      difficulty: 5,
      source: "faction",
      faction_questline: "mycorrhizal_network",
      questline_order: 8,
      has_phases: false,
      has_choices: false,
      reward_faction_id: "cosmic_scholars",
      reward_fame: 20,
      lore_text:
        "Ancient mycelial growth, dormant for millennia, stirs beneath the surface. A thriving colony could awaken it — and with it, knowledge lost since the First Bloom.",
    },
    {
      id: factionMissionId("mycorrhizal", 9),
      title: "The Scholar's Dilemma",
      description:
        "A crucial decision about Precursor knowledge — share it openly or restrict access to protect it.",
      type: "meet_npc",
      objectives: JSON.stringify({
        npcId: NPC.archivist_thal,
        npcName: "Archivist Thal",
      }),
      reward_credits: 5000,
      reward_xp: 600,
      difficulty: 5,
      source: "faction",
      faction_questline: "mycorrhizal_network",
      questline_order: 9,
      has_phases: false,
      has_choices: true,
      npc_id: NPC.archivist_thal,
      reward_faction_id: "cosmic_scholars",
      reward_fame: 20,
      lore_text:
        "Archivist Thal has decoded Precursor knowledge of terrible power. The question is no longer what it says, but who should read it.",
    },
    {
      id: factionMissionId("mycorrhizal", 10),
      title: "Primordium Ecology",
      description:
        "Scan 5 bio-site sectors and 4 additional sectors to understand the Primordium's ecological impact.",
      type: "scan_sectors",
      objectives: JSON.stringify({
        scansRequired: 5,
      }),
      reward_credits: 6500,
      reward_xp: 700,
      difficulty: 6,
      source: "faction",
      faction_questline: "mycorrhizal_network",
      questline_order: 10,
      has_phases: true,
      has_choices: false,
      reward_faction_id: "cosmic_scholars",
      reward_fame: 20,
      lore_text:
        "The Primordium left ecological scars across the galaxy. Understanding their impact is critical to preventing it from happening again.",
    },
    {
      id: factionMissionId("mycorrhizal", 11),
      title: "The Network Awakens",
      description:
        "Deliver activation supplies to the primary node and defend it from hostile interference.",
      type: "deliver_cargo",
      objectives: JSON.stringify({
        commodity: "activation_supplies",
        quantity: 3,
      }),
      reward_credits: 7000,
      reward_xp: 750,
      difficulty: 7,
      source: "faction",
      faction_questline: "mycorrhizal_network",
      questline_order: 11,
      has_phases: true,
      has_choices: false,
      reward_faction_id: "cosmic_scholars",
      reward_fame: 25,
      lore_text:
        "The moment has come. The Mycorrhizal Network can be reactivated — but doing so will draw every hostile eye in the galaxy.",
    },
    {
      id: factionMissionId("mycorrhizal", 12),
      title: "Voice of the Mycelium",
      description:
        "Return to Lyra Starwind to receive the title of Voice of the Mycelium and a unique reward.",
      type: "meet_npc",
      objectives: JSON.stringify({ npcId: NPC.lyra, npcName: "Lyra Starwind" }),
      reward_credits: 10000,
      reward_xp: 1000,
      difficulty: 7,
      source: "faction",
      faction_questline: "mycorrhizal_network",
      questline_order: 12,
      has_phases: false,
      has_choices: false,
      npc_id: NPC.lyra,
      reward_faction_id: "cosmic_scholars",
      reward_fame: 30,
      reward_items: JSON.stringify([
        { itemId: "mycelial_scanner", name: "Mycelial Scanner" },
      ]),
      lore_text:
        "You have walked the path of the mycelium from initiate to master. Lyra Starwind awaits to bestow the network's highest honor.",
    },
  ];

  // ═══════════════════════════════════════════════════════════════
  // IRON DOMINION — 12 missions (frontier_rangers questline)
  // Prereq: Chapter 3 complete + Accepted rep with Frontier Rangers
  // ═══════════════════════════════════════════════════════════════
  const ironDominionMissions = [
    {
      id: factionMissionId("iron_dominion", 1),
      title: "Enlistment",
      description:
        "Meet Sarge at the Ranger outpost and prove your combat readiness by destroying 2 hostile targets.",
      type: "destroy_ship",
      objectives: JSON.stringify({ shipsToDestroy: 2 }),
      reward_credits: 2000,
      reward_xp: 250,
      difficulty: 2,
      source: "faction",
      faction_questline: "iron_dominion",
      questline_order: 1,
      has_phases: true,
      has_choices: false,
      required_faction_tier: "accepted",
      npc_id: NPC.sarge,
      reward_faction_id: "frontier_rangers",
      reward_fame: 10,
      lore_text:
        "The Iron Dominion doesn't recruit — it conscripts those worthy. Sarge will determine if you qualify.",
    },
    {
      id: factionMissionId("iron_dominion", 2),
      title: "Patrol Duty",
      description:
        "Run a 10-sector patrol route along the frontier, scanning for threats.",
      type: "visit_sector",
      objectives: JSON.stringify({ sectorsToVisit: 10 }),
      reward_credits: 3000,
      reward_xp: 350,
      difficulty: 3,
      source: "faction",
      faction_questline: "iron_dominion",
      questline_order: 2,
      has_phases: false,
      has_choices: false,
      npc_id: NPC.elara_voss,
      reward_faction_id: "frontier_rangers",
      reward_fame: 10,
      lore_text:
        "Captain Elara Voss assigns you patrol duty — the backbone of the Dominion's vigilance. Every sector scanned is a threat neutralized before it emerges.",
    },
    {
      id: factionMissionId("iron_dominion", 3),
      title: "Proving Ground",
      description:
        "Destroy 4 training targets and survive a surprise attack in the Dominion's proving ground.",
      type: "destroy_ship",
      objectives: JSON.stringify({ shipsToDestroy: 4 }),
      reward_credits: 4000,
      reward_xp: 450,
      difficulty: 4,
      source: "faction",
      faction_questline: "iron_dominion",
      questline_order: 3,
      has_phases: true,
      has_choices: false,
      npc_id: NPC.commander_thane,
      reward_faction_id: "frontier_rangers",
      reward_fame: 15,
      lore_text:
        "Commander Thane's proving ground has broken more recruits than the enemy ever could. Those who survive earn the Dominion's respect.",
    },
    {
      id: factionMissionId("iron_dominion", 4),
      title: "Intelligence Run",
      description:
        "Scan 5 contested sectors and escort an intelligence convoy to safety.",
      type: "scan_sectors",
      objectives: JSON.stringify({ scansRequired: 5 }),
      reward_credits: 4500,
      reward_xp: 500,
      difficulty: 4,
      source: "faction",
      faction_questline: "iron_dominion",
      questline_order: 4,
      has_phases: true,
      has_choices: false,
      npc_id: NPC.hawk,
      reward_faction_id: "frontier_rangers",
      reward_fame: 15,
      lore_text:
        "Hawk's intelligence network has detected movement in contested space. The data must reach command before the enemy moves.",
    },
    {
      id: factionMissionId("iron_dominion", 5),
      title: "Dominion Tactics",
      description:
        "Destroy 3 pirate raiders and make a tactical decision about survivors.",
      type: "destroy_ship",
      objectives: JSON.stringify({ shipsToDestroy: 3 }),
      reward_credits: 5000,
      reward_xp: 550,
      difficulty: 5,
      source: "faction",
      faction_questline: "iron_dominion",
      questline_order: 5,
      has_phases: true,
      has_choices: true,
      npc_id: NPC.commander_thane,
      reward_faction_id: "frontier_rangers",
      reward_fame: 15,
      lore_text:
        "Three pirate raiders have been terrorizing supply lines. Commander Thane wants them eliminated — but what happens to survivors is your call.",
    },
    {
      id: factionMissionId("iron_dominion", 6),
      title: "Deep Patrol",
      description:
        "Run a 15-sector deep patrol and investigate 3 distress signals along the frontier.",
      type: "visit_sector",
      objectives: JSON.stringify({ sectorsToVisit: 15 }),
      reward_credits: 5500,
      reward_xp: 600,
      difficulty: 5,
      source: "faction",
      faction_questline: "iron_dominion",
      questline_order: 6,
      has_phases: true,
      has_choices: false,
      npc_id: NPC.hawk,
      reward_faction_id: "frontier_rangers",
      reward_fame: 15,
      lore_text:
        "The frontier stretches further than maps show. Hawk needs someone reliable for the deep patrol — where help is hours away.",
    },
    {
      id: factionMissionId("iron_dominion", 7),
      title: "Supply Lines",
      description:
        "Deliver supplies to the forward base and defend it from hostile incursion.",
      type: "deliver_cargo",
      objectives: JSON.stringify({
        commodity: "military_supplies",
        quantity: 3,
      }),
      reward_credits: 6000,
      reward_xp: 650,
      difficulty: 5,
      source: "faction",
      faction_questline: "iron_dominion",
      questline_order: 7,
      has_phases: true,
      has_choices: false,
      npc_id: NPC.jyn,
      reward_faction_id: "frontier_rangers",
      reward_fame: 20,
      lore_text:
        "Supply Officer Jyn Coppervein has assembled the largest convoy this quarter. Without an escort, it won't survive the contested corridor.",
    },
    {
      id: factionMissionId("iron_dominion", 8),
      title: "The Blockade",
      description:
        "Break a 6-vessel pirate blockade threatening a critical trade route.",
      type: "destroy_ship",
      objectives: JSON.stringify({ shipsToDestroy: 6 }),
      reward_credits: 7000,
      reward_xp: 700,
      difficulty: 6,
      source: "faction",
      faction_questline: "iron_dominion",
      questline_order: 8,
      has_phases: false,
      has_choices: false,
      reward_faction_id: "frontier_rangers",
      reward_fame: 20,
      lore_text:
        "Six pirate vessels have established a blockade. No trade, no supplies, no mercy. The Dominion wants the route opened by force.",
    },
    {
      id: factionMissionId("iron_dominion", 9),
      title: "Honor and Duty",
      description:
        "A Kalin commander offers military secrets. Your decision will define your honor.",
      type: "meet_npc",
      objectives: JSON.stringify({
        npcId: NPC.commander_thane,
        npcName: "Commander Thane",
      }),
      reward_credits: 6000,
      reward_xp: 650,
      difficulty: 6,
      source: "faction",
      faction_questline: "iron_dominion",
      questline_order: 9,
      has_phases: false,
      has_choices: true,
      npc_id: NPC.commander_thane,
      reward_faction_id: "frontier_rangers",
      reward_fame: 20,
      lore_text:
        "Commander Thane has intercepted Kalin military intelligence. Accepting it could shift the balance of power — but at what cost to honor?",
    },
    {
      id: factionMissionId("iron_dominion", 10),
      title: "War Council",
      description:
        "Attend the Dominion's war council and deliver 30 units of technology for the campaign.",
      type: "trade_units",
      objectives: JSON.stringify({ unitsToTrade: 30 }),
      reward_credits: 7500,
      reward_xp: 750,
      difficulty: 6,
      source: "faction",
      faction_questline: "iron_dominion",
      questline_order: 10,
      has_phases: true,
      has_choices: false,
      npc_id: NPC.commander_thane,
      reward_faction_id: "frontier_rangers",
      reward_fame: 25,
      lore_text:
        "The war council convenes. Commander Thane needs technology for the final campaign. Your contribution will determine the Dominion's readiness.",
    },
    {
      id: factionMissionId("iron_dominion", 11),
      title: "The Last Stand",
      description:
        "Destroy 8 hostile warships, defend the forward planet, and survive the counterattack.",
      type: "destroy_ship",
      objectives: JSON.stringify({ shipsToDestroy: 8 }),
      reward_credits: 8500,
      reward_xp: 850,
      difficulty: 7,
      source: "faction",
      faction_questline: "iron_dominion",
      questline_order: 11,
      has_phases: true,
      has_choices: false,
      reward_faction_id: "frontier_rangers",
      reward_fame: 25,
      lore_text:
        "The enemy has massed for a final assault. The Dominion stands firm. This is the battle that will be remembered for generations.",
    },
    {
      id: factionMissionId("iron_dominion", 12),
      title: "Iron Commander",
      description:
        "Return to Commander Thane to receive the title of Iron Commander and a unique tactical module.",
      type: "meet_npc",
      objectives: JSON.stringify({
        npcId: NPC.commander_thane,
        npcName: "Commander Thane",
      }),
      reward_credits: 10000,
      reward_xp: 1000,
      difficulty: 7,
      source: "faction",
      faction_questline: "iron_dominion",
      questline_order: 12,
      has_phases: false,
      has_choices: false,
      npc_id: NPC.commander_thane,
      reward_faction_id: "frontier_rangers",
      reward_fame: 30,
      reward_items: JSON.stringify([
        {
          itemId: "tactical_override_module",
          name: "Tactical Override Module",
        },
      ]),
      lore_text:
        "You have proven yourself the finest warrior the Dominion has ever trained. Commander Thane awaits to bestow the highest honor.",
    },
  ];

  // ═══════════════════════════════════════════════════════════════
  // TRADERS GUILD — 6 missions
  // Prereq: 10 trades completed + Accepted rep with Traders Guild
  // ═══════════════════════════════════════════════════════════════
  const tradersGuildMissions = [
    {
      id: factionMissionId("traders_guild", 1),
      title: "Guild Initiation",
      description:
        "Meet Trade Master Kovax Prime and prove your worth by completing 10 units of trade.",
      type: "trade_units",
      objectives: JSON.stringify({ unitsToTrade: 10 }),
      reward_credits: 3000,
      reward_xp: 300,
      difficulty: 2,
      source: "faction",
      faction_questline: "traders_guild",
      questline_order: 1,
      has_phases: true,
      has_choices: false,
      required_faction_tier: "accepted",
      npc_id: NPC.kovax,
      reward_faction_id: "traders_guild",
      reward_fame: 10,
      lore_text:
        "The Traders Guild controls the flow of goods across three galaxies. Kovax Prime evaluates every aspiring member personally.",
    },
    {
      id: factionMissionId("traders_guild", 2),
      title: "Price Wars",
      description:
        "Deliver 20 cyrillium and complete a timed delivery of 15 food units within 20 minutes.",
      type: "deliver_cargo",
      objectives: JSON.stringify({ commodity: "cyrillium", quantity: 20 }),
      reward_credits: 5000,
      reward_xp: 500,
      difficulty: 4,
      source: "faction",
      faction_questline: "traders_guild",
      questline_order: 2,
      has_phases: true,
      has_choices: false,
      reward_faction_id: "traders_guild",
      reward_fame: 15,
      lore_text:
        "The Guild's competitors are undercutting prices. To maintain dominance, you must prove that Guild logistics are faster and more reliable.",
    },
    {
      id: factionMissionId("traders_guild", 3),
      title: "Trade Route Pioneer",
      description:
        "Escort a caravan through dangerous space and complete 20 trades to establish a new route.",
      type: "trade_units",
      objectives: JSON.stringify({ unitsToTrade: 20 }),
      reward_credits: 6000,
      reward_xp: 600,
      difficulty: 5,
      source: "faction",
      faction_questline: "traders_guild",
      questline_order: 3,
      has_phases: true,
      has_choices: false,
      reward_faction_id: "traders_guild",
      reward_fame: 15,
      lore_text:
        "New trade routes are the lifeblood of the Guild. Pioneering one through contested space requires equal parts courage and commerce.",
    },
    {
      id: factionMissionId("traders_guild", 4),
      title: "The Smuggler Problem",
      description:
        "Destroy 2 smuggling vessels and investigate their supply chain.",
      type: "destroy_ship",
      objectives: JSON.stringify({ shipsToDestroy: 2 }),
      reward_credits: 6500,
      reward_xp: 650,
      difficulty: 5,
      source: "faction",
      faction_questline: "traders_guild",
      questline_order: 4,
      has_phases: true,
      has_choices: false,
      reward_faction_id: "traders_guild",
      reward_fame: 20,
      lore_text:
        "Smugglers are siphoning profits and destabilizing prices. The Guild wants them stopped — and their network exposed.",
    },
    {
      id: factionMissionId("traders_guild", 5),
      title: "Market Mastery",
      description:
        "Complete 50 trades and make a defining decision about the Guild's future economic policy.",
      type: "trade_units",
      objectives: JSON.stringify({ unitsToTrade: 50 }),
      reward_credits: 8000,
      reward_xp: 800,
      difficulty: 6,
      source: "faction",
      faction_questline: "traders_guild",
      questline_order: 5,
      has_phases: true,
      has_choices: true,
      reward_faction_id: "traders_guild",
      reward_fame: 25,
      lore_text:
        "You have risen to the Guild's inner circle. The question of free trade versus regulated markets will define the economy for generations.",
    },
    {
      id: factionMissionId("traders_guild", 6),
      title: "Trade Prince",
      description:
        "Return to Kovax Prime to receive the title of Trade Prince and the Merchant's Ledger.",
      type: "meet_npc",
      objectives: JSON.stringify({ npcId: NPC.kovax, npcName: "Kovax Prime" }),
      reward_credits: 12000,
      reward_xp: 1000,
      difficulty: 6,
      source: "faction",
      faction_questline: "traders_guild",
      questline_order: 6,
      has_phases: false,
      has_choices: false,
      npc_id: NPC.kovax,
      reward_faction_id: "traders_guild",
      reward_fame: 30,
      reward_items: JSON.stringify([
        { itemId: "merchants_ledger", name: "Merchant's Ledger" },
      ]),
      lore_text:
        "The Guild's highest title is bestowed upon those who have mastered the art of commerce. Kovax Prime awaits your arrival with ceremony and respect.",
    },
  ];

  // ═══════════════════════════════════════════════════════════════
  // SHADOW SYNDICATE — 6 missions
  // Prereq: Chapter 3 complete + Accepted rep with Shadow Syndicate
  // ═══════════════════════════════════════════════════════════════
  const shadowSyndicateMissions = [
    {
      id: factionMissionId("shadow_syndicate", 1),
      title: "Into the Shadows",
      description:
        "Find the operative known only as Shade and prove you can keep a secret.",
      type: "meet_npc",
      objectives: JSON.stringify({ npcId: NPC.shade, npcName: "Shade" }),
      reward_credits: 2500,
      reward_xp: 300,
      difficulty: 3,
      source: "faction",
      faction_questline: "shadow_syndicate",
      questline_order: 1,
      has_phases: false,
      has_choices: false,
      required_faction_tier: "accepted",
      npc_id: NPC.shade,
      reward_faction_id: "shadow_syndicate",
      reward_fame: 10,
      lore_text:
        "The Shadow Syndicate doesn't advertise. If you've found Shade, you were meant to. If you survive the meeting, you're in.",
    },
    {
      id: factionMissionId("shadow_syndicate", 2),
      title: "Dead Drop",
      description:
        "Deliver an intelligence package to a remote sector and complete a timed dead drop.",
      type: "deliver_cargo",
      objectives: JSON.stringify({ commodity: "tech", quantity: 10 }),
      reward_credits: 4000,
      reward_xp: 450,
      difficulty: 4,
      source: "faction",
      faction_questline: "shadow_syndicate",
      questline_order: 2,
      has_phases: true,
      has_choices: false,
      reward_faction_id: "shadow_syndicate",
      reward_fame: 15,
      lore_text:
        "The Syndicate's intelligence network runs on dead drops. No names, no records, no traces. Miss the window and the package is worthless.",
    },
    {
      id: factionMissionId("shadow_syndicate", 3),
      title: "The Fence's Favor",
      description:
        "Trade 15 units of special merchandise and intercept a rival's shipment.",
      type: "trade_units",
      objectives: JSON.stringify({ unitsToTrade: 15 }),
      reward_credits: 5000,
      reward_xp: 500,
      difficulty: 4,
      source: "faction",
      faction_questline: "shadow_syndicate",
      questline_order: 3,
      has_phases: true,
      has_choices: false,
      reward_faction_id: "shadow_syndicate",
      reward_fame: 15,
      lore_text:
        "Every syndicate needs a fence. Trading through unofficial channels keeps the credits flowing and the authorities guessing.",
    },
    {
      id: factionMissionId("shadow_syndicate", 4),
      title: "Blackout",
      description:
        "Infiltrate the Ranger sensor array sector and scan 3 sectors under the cover of darkness.",
      type: "visit_sector",
      objectives: JSON.stringify({ sectorsToVisit: 4 }),
      reward_credits: 6000,
      reward_xp: 600,
      difficulty: 5,
      source: "faction",
      faction_questline: "shadow_syndicate",
      questline_order: 4,
      has_phases: true,
      has_choices: false,
      npc_id: NPC.viper_nox,
      reward_faction_id: "shadow_syndicate",
      reward_fame: 20,
      lore_text:
        "Viper Nox has identified a Ranger sensor array that's been tracking Syndicate operations. It needs to go dark — permanently.",
    },
    {
      id: factionMissionId("shadow_syndicate", 5),
      title: "Double Agent",
      description:
        "A moment of truth — report to the Rangers and betray the Syndicate, or feed them false intel.",
      type: "meet_npc",
      objectives: JSON.stringify({ npcId: NPC.shade, npcName: "Shade" }),
      reward_credits: 7000,
      reward_xp: 700,
      difficulty: 6,
      source: "faction",
      faction_questline: "shadow_syndicate",
      questline_order: 5,
      has_phases: false,
      has_choices: true,
      npc_id: NPC.shade,
      reward_faction_id: "shadow_syndicate",
      reward_fame: 25,
      lore_text:
        "The Rangers have approached you. They want inside information on the Syndicate. Shade expects loyalty — but which loyalty is true?",
    },
    {
      id: factionMissionId("shadow_syndicate", 6),
      title: "Shadow Master",
      description:
        "Return to Shade to receive the title of Shadow Master and the Cloaking Resonator.",
      type: "meet_npc",
      objectives: JSON.stringify({ npcId: NPC.shade, npcName: "Shade" }),
      reward_credits: 10000,
      reward_xp: 1000,
      difficulty: 6,
      source: "faction",
      faction_questline: "shadow_syndicate",
      questline_order: 6,
      has_phases: false,
      has_choices: false,
      npc_id: NPC.shade,
      reward_faction_id: "shadow_syndicate",
      reward_fame: 30,
      reward_items: JSON.stringify([
        { itemId: "cloaking_resonator", name: "Cloaking Resonator" },
      ]),
      lore_text:
        "You have become the Syndicate's most trusted operative. Shade reveals his true face — and bestows the tools of a master.",
    },
  ];

  // ═══════════════════════════════════════════════════════════════
  // INDEPENDENT — 4 missions
  // Prereq: Meet 10 NPCs. No faction rep required.
  // ═══════════════════════════════════════════════════════════════
  const independentMissions = [
    {
      id: factionMissionId("independent", 1),
      title: "The Wanderer's Path",
      description:
        "Meet the Hermit in deep space and visit 10 sectors following his philosophical trail.",
      type: "visit_sector",
      objectives: JSON.stringify({ sectorsToVisit: 10 }),
      reward_credits: 3000,
      reward_xp: 350,
      difficulty: 3,
      source: "faction",
      faction_questline: "independent",
      questline_order: 1,
      has_phases: true,
      has_choices: false,
      npc_id: NPC.hermit,
      reward_fame: 10,
      lore_text:
        "The Hermit walks a path between factions, beholden to none. To follow his trail is to learn the galaxy's deepest truths.",
    },
    {
      id: factionMissionId("independent", 2),
      title: "Doc's Rounds",
      description:
        "Visit 3 outposts with Doc Helix's medical ship to deliver aid.",
      type: "visit_sector",
      objectives: JSON.stringify({ sectorsToVisit: 3 }),
      reward_credits: 4000,
      reward_xp: 400,
      difficulty: 4,
      source: "faction",
      faction_questline: "independent",
      questline_order: 2,
      has_phases: false,
      has_choices: false,
      npc_id: NPC.doc_helix,
      reward_fame: 15,
      lore_text:
        "Doc Helix treats anyone who needs healing, regardless of faction. But the roads between outposts are dangerous, and the Doc needs protection.",
    },
    {
      id: factionMissionId("independent", 3),
      title: "Tik-Tok's Dream",
      description:
        "Scan 3 derelict ship sectors and deliver personality modules to the eccentric mechanic.",
      type: "scan_sectors",
      objectives: JSON.stringify({
        scansRequired: 3,
      }),
      reward_credits: 4500,
      reward_xp: 450,
      difficulty: 4,
      source: "faction",
      faction_questline: "independent",
      questline_order: 3,
      has_phases: true,
      has_choices: false,
      npc_id: NPC.tiktok,
      reward_fame: 15,
      lore_text:
        "Tik-Tok has a dream — to build a consciousness from salvaged personality cores. Whether it's genius or madness, only the parts will tell.",
    },
    {
      id: factionMissionId("independent", 4),
      title: "Galaxy Citizen",
      description:
        "Meet the Oracle and make a philosophical choice that defines your stance in the galaxy.",
      type: "meet_npc",
      objectives: JSON.stringify({ npcId: NPC.oracle, npcName: "The Oracle" }),
      reward_credits: 6000,
      reward_xp: 600,
      difficulty: 5,
      source: "faction",
      faction_questline: "independent",
      questline_order: 4,
      has_phases: false,
      has_choices: true,
      npc_id: NPC.oracle,
      reward_fame: 20,
      lore_text:
        "The Oracle speaks in riddles and truths. Your answer to her final question will echo through the stars — a declaration of who you truly are.",
    },
  ];

  // ═══════════════════════════════════════════════════════════════
  // INSERT ALL MISSION TEMPLATES
  // ═══════════════════════════════════════════════════════════════
  const allMissions = [
    ...mycorrhizalMissions,
    ...ironDominionMissions,
    ...tradersGuildMissions,
    ...shadowSyndicateMissions,
    ...independentMissions,
  ];

  for (const m of allMissions) {
    const existing = await knex("mission_templates")
      .where({ id: m.id })
      .first();
    if (!existing) {
      // Strip fields that aren't columns on mission_templates
      // npc_id is stored in objectives JSON; reward_items handled separately
      const { npc_id, reward_items, ...insertData } = m as Record<
        string,
        unknown
      >;
      await knex("mission_templates").insert(insertData);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MISSION PHASES
  // ═══════════════════════════════════════════════════════════════
  const phases = [
    // --- Mycorrhizal Network ---
    // M3: The Living Archive (investigate → deliver)
    {
      id: fqPhaseId("mycorrhizal", 3, 1),
      template_id: factionMissionId("mycorrhizal", 3),
      phase_order: 1,
      title: "Scan Data Node Sectors",
      description:
        "Scan 3 ancient data node sectors scattered across mycelial space.",
      objective_type: "scan_sectors",
      objectives: JSON.stringify({
        scansRequired: 3,
      }),
      narration_key: "fq_mycorrhizal_m03_p1",
    },
    {
      id: fqPhaseId("mycorrhizal", 3, 2),
      template_id: factionMissionId("mycorrhizal", 3),
      phase_order: 2,
      title: "Deliver Findings",
      description: "Bring your data to Archivist Thal for analysis.",
      objective_type: "meet_npc",
      objectives: JSON.stringify({
        npcId: NPC.archivist_thal,
        npcName: "Archivist Thal",
      }),
      narration_key: "fq_mycorrhizal_m03_p2",
    },
    // M4: Fungal Communion (meet_npc → colonize)
    {
      id: fqPhaseId("mycorrhizal", 4, 1),
      template_id: factionMissionId("mycorrhizal", 4),
      phase_order: 1,
      title: "Find the Hermit",
      description: "Locate the Hermit in deep space.",
      objective_type: "meet_npc",
      objectives: JSON.stringify({ npcId: NPC.hermit, npcName: "The Hermit" }),
      narration_key: "fq_mycorrhizal_m04_p1",
    },
    {
      id: fqPhaseId("mycorrhizal", 4, 2),
      template_id: factionMissionId("mycorrhizal", 4),
      phase_order: 2,
      title: "Establish Colony",
      description: "Colonize a mycelium-rich world with 100 colonists.",
      objective_type: "colonize_planet",
      objectives: JSON.stringify({ colonistsToDeposit: 100 }),
      narration_key: "fq_mycorrhizal_m04_p2",
    },
    // M5: Network Resonance (scan → choose)
    {
      id: fqPhaseId("mycorrhizal", 5, 1),
      template_id: factionMissionId("mycorrhizal", 5),
      phase_order: 1,
      title: "Scan Resonance Nodes",
      description: "Scan 5 sectors with heightened mycelial resonance.",
      objective_type: "scan_sectors",
      objectives: JSON.stringify({ scansRequired: 5 }),
      narration_key: "fq_mycorrhizal_m05_p1",
    },
    {
      id: fqPhaseId("mycorrhizal", 5, 2),
      template_id: factionMissionId("mycorrhizal", 5),
      phase_order: 2,
      title: "The Signal Decision",
      description: "Choose whether to amplify or filter the network's signal.",
      objective_type: "choose",
      objectives: JSON.stringify({ choiceId: fqChoiceId("network_resonance") }),
      narration_key: "fq_mycorrhizal_m05_p2",
    },
    // M7: Contested Knowledge (deliver → intercept)
    {
      id: fqPhaseId("mycorrhizal", 7, 1),
      template_id: factionMissionId("mycorrhizal", 7),
      phase_order: 1,
      title: "Power the Engines",
      description: "Deliver 20 cyrillium to the network's analysis facility.",
      objective_type: "deliver_cargo",
      objectives: JSON.stringify({ commodity: "cyrillium", quantity: 20 }),
      narration_key: "fq_mycorrhizal_m07_p1",
    },
    {
      id: fqPhaseId("mycorrhizal", 7, 2),
      template_id: factionMissionId("mycorrhizal", 7),
      phase_order: 2,
      title: "Stop the Thieves",
      description:
        "Destroy 2 Syndicate data thief ships before they escape with stolen research.",
      objective_type: "destroy_ship",
      objectives: JSON.stringify({ shipsToDestroy: 2 }),
      narration_key: "fq_mycorrhizal_m07_p2",
    },
    // M10: Primordium Ecology (investigate → scan)
    {
      id: fqPhaseId("mycorrhizal", 10, 1),
      template_id: factionMissionId("mycorrhizal", 10),
      phase_order: 1,
      title: "Survey Bio-Sites",
      description: "Scan 5 bio-site sectors left by the Primordium.",
      objective_type: "scan_sectors",
      objectives: JSON.stringify({
        scansRequired: 5,
      }),
      narration_key: "fq_mycorrhizal_m10_p1",
    },
    {
      id: fqPhaseId("mycorrhizal", 10, 2),
      template_id: factionMissionId("mycorrhizal", 10),
      phase_order: 2,
      title: "Ecological Impact Survey",
      description:
        "Scan 4 sectors to map the Primordium's ecological footprint.",
      objective_type: "scan_sectors",
      objectives: JSON.stringify({ scansRequired: 4 }),
      narration_key: "fq_mycorrhizal_m10_p2",
    },
    // M11: The Network Awakens (escort → defend)
    {
      id: fqPhaseId("mycorrhizal", 11, 1),
      template_id: factionMissionId("mycorrhizal", 11),
      phase_order: 1,
      title: "Deliver Activation Components",
      description: "Deliver 3 activation components to the primary node.",
      objective_type: "deliver_cargo",
      objectives: JSON.stringify({
        commodity: "activation_components",
        quantity: 3,
      }),
      narration_key: "fq_mycorrhizal_m11_p1",
    },
    {
      id: fqPhaseId("mycorrhizal", 11, 2),
      template_id: factionMissionId("mycorrhizal", 11),
      phase_order: 2,
      title: "Defend the Primary Node",
      description:
        "Destroy 3 hostile ships attempting to stop the node activation.",
      objective_type: "destroy_ship",
      objectives: JSON.stringify({ shipsToDestroy: 3 }),
      narration_key: "fq_mycorrhizal_m11_p2",
    },

    // --- Iron Dominion ---
    // M1: Enlistment (meet_npc → destroy)
    {
      id: fqPhaseId("iron_dominion", 1, 1),
      template_id: factionMissionId("iron_dominion", 1),
      phase_order: 1,
      title: "Report to Sarge",
      description:
        "Meet Sarge at the Ranger outpost for your combat assessment.",
      objective_type: "meet_npc",
      objectives: JSON.stringify({ npcId: NPC.sarge, npcName: "Sarge" }),
      narration_key: "fq_iron_m01_p1",
    },
    {
      id: fqPhaseId("iron_dominion", 1, 2),
      template_id: factionMissionId("iron_dominion", 1),
      phase_order: 2,
      title: "Combat Assessment",
      description: "Destroy 2 hostile targets to prove your combat readiness.",
      objective_type: "destroy_ship",
      objectives: JSON.stringify({ shipsToDestroy: 2 }),
      narration_key: "fq_iron_m01_p2",
    },
    // M3: Proving Ground (destroy → survive)
    {
      id: fqPhaseId("iron_dominion", 3, 1),
      template_id: factionMissionId("iron_dominion", 3),
      phase_order: 1,
      title: "Target Practice",
      description: "Destroy 4 training targets in the proving ground.",
      objective_type: "destroy_ship",
      objectives: JSON.stringify({ shipsToDestroy: 4 }),
      narration_key: "fq_iron_m03_p1",
    },
    {
      id: fqPhaseId("iron_dominion", 3, 2),
      template_id: factionMissionId("iron_dominion", 3),
      phase_order: 2,
      title: "Surprise Attack",
      description: "Survive the surprise ambush — the real test.",
      objective_type: "survive_ambush",
      objectives: JSON.stringify({ ambushesToSurvive: 1 }),
      narration_key: "fq_iron_m03_p2",
    },
    // M4: Intelligence Run (scan → escort)
    {
      id: fqPhaseId("iron_dominion", 4, 1),
      template_id: factionMissionId("iron_dominion", 4),
      phase_order: 1,
      title: "Reconnaissance",
      description: "Scan 5 contested sectors for intelligence.",
      objective_type: "scan_sectors",
      objectives: JSON.stringify({ scansRequired: 5 }),
      narration_key: "fq_iron_m04_p1",
    },
    {
      id: fqPhaseId("iron_dominion", 4, 2),
      template_id: factionMissionId("iron_dominion", 4),
      phase_order: 2,
      title: "Deliver Intel Package",
      description: "Deliver the intelligence package safely back to command.",
      objective_type: "deliver_cargo",
      objectives: JSON.stringify({ commodity: "intelligence", quantity: 2 }),
      narration_key: "fq_iron_m04_p2",
    },
    // M5: Dominion Tactics (destroy → choose)
    {
      id: fqPhaseId("iron_dominion", 5, 1),
      template_id: factionMissionId("iron_dominion", 5),
      phase_order: 1,
      title: "Eliminate Raiders",
      description: "Destroy 3 pirate raiders harassing supply lines.",
      objective_type: "destroy_ship",
      objectives: JSON.stringify({ shipsToDestroy: 3 }),
      narration_key: "fq_iron_m05_p1",
    },
    {
      id: fqPhaseId("iron_dominion", 5, 2),
      template_id: factionMissionId("iron_dominion", 5),
      phase_order: 2,
      title: "The Prisoner Question",
      description: "Decide the fate of the surviving pirates.",
      objective_type: "choose",
      objectives: JSON.stringify({
        choiceId: fqChoiceId("dominion_prisoners"),
      }),
      narration_key: "fq_iron_m05_p2",
    },
    // M6: Deep Patrol (visit → investigate)
    {
      id: fqPhaseId("iron_dominion", 6, 1),
      template_id: factionMissionId("iron_dominion", 6),
      phase_order: 1,
      title: "Deep Patrol",
      description: "Run a 15-sector patrol along the deep frontier.",
      objective_type: "visit_sector",
      objectives: JSON.stringify({ sectorsToVisit: 15 }),
      narration_key: "fq_iron_m06_p1",
    },
    {
      id: fqPhaseId("iron_dominion", 6, 2),
      template_id: factionMissionId("iron_dominion", 6),
      phase_order: 2,
      title: "Distress Signal Sweep",
      description:
        "Scan 3 sectors with distress signals encountered during patrol.",
      objective_type: "scan_sectors",
      objectives: JSON.stringify({
        scansRequired: 3,
      }),
      narration_key: "fq_iron_m06_p2",
    },
    // M7: Supply Lines (escort → defend)
    {
      id: fqPhaseId("iron_dominion", 7, 1),
      template_id: factionMissionId("iron_dominion", 7),
      phase_order: 1,
      title: "Run the Supply Line",
      description:
        "Deliver supplies through the contested corridor to the forward base.",
      objective_type: "deliver_cargo",
      objectives: JSON.stringify({
        commodity: "military_supplies",
        quantity: 3,
      }),
      narration_key: "fq_iron_m07_p1",
    },
    {
      id: fqPhaseId("iron_dominion", 7, 2),
      template_id: factionMissionId("iron_dominion", 7),
      phase_order: 2,
      title: "Defend Forward Base",
      description: "Destroy 2 hostile ships attacking the forward base.",
      objective_type: "destroy_ship",
      objectives: JSON.stringify({ shipsToDestroy: 2 }),
      narration_key: "fq_iron_m07_p2",
    },
    // M10: War Council (meet_npc → trade)
    {
      id: fqPhaseId("iron_dominion", 10, 1),
      template_id: factionMissionId("iron_dominion", 10),
      phase_order: 1,
      title: "War Council",
      description: "Attend the war council with Commander Thane.",
      objective_type: "meet_npc",
      objectives: JSON.stringify({
        npcId: NPC.commander_thane,
        npcName: "Commander Thane",
      }),
      narration_key: "fq_iron_m10_p1",
    },
    {
      id: fqPhaseId("iron_dominion", 10, 2),
      template_id: factionMissionId("iron_dominion", 10),
      phase_order: 2,
      title: "Arm the Campaign",
      description: "Deliver 30 units of technology for the final campaign.",
      objective_type: "trade_units",
      objectives: JSON.stringify({ unitsToTrade: 30 }),
      narration_key: "fq_iron_m10_p2",
    },
    // M11: The Last Stand (destroy → defend → survive)
    {
      id: fqPhaseId("iron_dominion", 11, 1),
      template_id: factionMissionId("iron_dominion", 11),
      phase_order: 1,
      title: "Break the Line",
      description: "Destroy 8 hostile warships in the enemy vanguard.",
      objective_type: "destroy_ship",
      objectives: JSON.stringify({ shipsToDestroy: 8 }),
      narration_key: "fq_iron_m11_p1",
    },
    {
      id: fqPhaseId("iron_dominion", 11, 2),
      template_id: factionMissionId("iron_dominion", 11),
      phase_order: 2,
      title: "Hold the Line",
      description: "Destroy 3 enemy ships in the counterattack.",
      objective_type: "destroy_ship",
      objectives: JSON.stringify({ shipsToDestroy: 3 }),
      narration_key: "fq_iron_m11_p2",
    },
    {
      id: fqPhaseId("iron_dominion", 11, 3),
      template_id: factionMissionId("iron_dominion", 11),
      phase_order: 3,
      title: "Survive the Storm",
      description: "Survive the final enemy counterattack.",
      objective_type: "survive_ambush",
      objectives: JSON.stringify({ ambushesToSurvive: 1 }),
      narration_key: "fq_iron_m11_p3",
    },

    // --- Traders Guild ---
    // M1: Guild Initiation (meet_npc → trade)
    {
      id: fqPhaseId("traders_guild", 1, 1),
      template_id: factionMissionId("traders_guild", 1),
      phase_order: 1,
      title: "Meet Kovax Prime",
      description: "Find and meet Trade Master Kovax Prime.",
      objective_type: "meet_npc",
      objectives: JSON.stringify({ npcId: NPC.kovax, npcName: "Kovax Prime" }),
      narration_key: "fq_traders_m01_p1",
    },
    {
      id: fqPhaseId("traders_guild", 1, 2),
      template_id: factionMissionId("traders_guild", 1),
      phase_order: 2,
      title: "Prove Your Worth",
      description: "Complete 10 units of trade to demonstrate competence.",
      objective_type: "trade_units",
      objectives: JSON.stringify({ unitsToTrade: 10 }),
      narration_key: "fq_traders_m01_p2",
    },
    // M2: Price Wars (deliver → timed_delivery)
    {
      id: fqPhaseId("traders_guild", 2, 1),
      template_id: factionMissionId("traders_guild", 2),
      phase_order: 1,
      title: "Cyrillium Shipment",
      description: "Deliver 20 cyrillium to the Guild warehouse.",
      objective_type: "deliver_cargo",
      objectives: JSON.stringify({ commodity: "cyrillium", quantity: 20 }),
      narration_key: "fq_traders_m02_p1",
    },
    {
      id: fqPhaseId("traders_guild", 2, 2),
      template_id: factionMissionId("traders_guild", 2),
      phase_order: 2,
      title: "Speed Delivery",
      description:
        "Complete a timed delivery of 15 food units within 20 minutes.",
      objective_type: "timed_delivery",
      objectives: JSON.stringify({
        commodity: "food",
        quantity: 15,
        timeMinutes: 20,
      }),
      narration_key: "fq_traders_m02_p2",
    },
    // M3: Trade Route Pioneer (escort → trade)
    {
      id: fqPhaseId("traders_guild", 3, 1),
      template_id: factionMissionId("traders_guild", 3),
      phase_order: 1,
      title: "Navigate Dangerous Space",
      description:
        "Visit 2 sectors along the trade route through dangerous space.",
      objective_type: "visit_sector",
      objectives: JSON.stringify({ sectorsToVisit: 2 }),
      narration_key: "fq_traders_m03_p1",
    },
    {
      id: fqPhaseId("traders_guild", 3, 2),
      template_id: factionMissionId("traders_guild", 3),
      phase_order: 2,
      title: "Establish the Route",
      description: "Complete 20 trades to establish the new route.",
      objective_type: "trade_units",
      objectives: JSON.stringify({ unitsToTrade: 20 }),
      narration_key: "fq_traders_m03_p2",
    },
    // M4: The Smuggler Problem (intercept → investigate)
    {
      id: fqPhaseId("traders_guild", 4, 1),
      template_id: factionMissionId("traders_guild", 4),
      phase_order: 1,
      title: "Intercept Smugglers",
      description: "Destroy 2 smuggler vessels.",
      objective_type: "destroy_ship",
      objectives: JSON.stringify({ shipsToDestroy: 2 }),
      narration_key: "fq_traders_m04_p1",
    },
    {
      id: fqPhaseId("traders_guild", 4, 2),
      template_id: factionMissionId("traders_guild", 4),
      phase_order: 2,
      title: "Expose the Network",
      description: "Scan 2 sectors to trace the smuggling supply chain.",
      objective_type: "scan_sectors",
      objectives: JSON.stringify({
        scansRequired: 2,
      }),
      narration_key: "fq_traders_m04_p2",
    },
    // M5: Market Mastery (trade → choose)
    {
      id: fqPhaseId("traders_guild", 5, 1),
      template_id: factionMissionId("traders_guild", 5),
      phase_order: 1,
      title: "Master the Market",
      description: "Complete 50 trades to demonstrate absolute mastery.",
      objective_type: "trade_units",
      objectives: JSON.stringify({ unitsToTrade: 50 }),
      narration_key: "fq_traders_m05_p1",
    },
    {
      id: fqPhaseId("traders_guild", 5, 2),
      template_id: factionMissionId("traders_guild", 5),
      phase_order: 2,
      title: "Economic Policy",
      description:
        "Decide the Guild's future: free trade or regulated markets.",
      objective_type: "choose",
      objectives: JSON.stringify({ choiceId: fqChoiceId("market_policy") }),
      narration_key: "fq_traders_m05_p2",
    },

    // --- Shadow Syndicate ---
    // M2: Dead Drop (deliver → timed_delivery)
    {
      id: fqPhaseId("shadow_syndicate", 2, 1),
      template_id: factionMissionId("shadow_syndicate", 2),
      phase_order: 1,
      title: "Deliver the Package",
      description: "Transport the intelligence package to a remote sector.",
      objective_type: "deliver_cargo",
      objectives: JSON.stringify({ commodity: "tech", quantity: 10 }),
      narration_key: "fq_shadow_m02_p1",
    },
    {
      id: fqPhaseId("shadow_syndicate", 2, 2),
      template_id: factionMissionId("shadow_syndicate", 2),
      phase_order: 2,
      title: "Timed Dead Drop",
      description: "Complete the dead drop before the window closes.",
      objective_type: "timed_delivery",
      objectives: JSON.stringify({
        commodity: "tech",
        quantity: 5,
        timeMinutes: 15,
      }),
      narration_key: "fq_shadow_m02_p2",
    },
    // M3: The Fence's Favor (trade → intercept)
    {
      id: fqPhaseId("shadow_syndicate", 3, 1),
      template_id: factionMissionId("shadow_syndicate", 3),
      phase_order: 1,
      title: "Move the Merchandise",
      description: "Trade 15 units through unofficial channels.",
      objective_type: "trade_units",
      objectives: JSON.stringify({ unitsToTrade: 15 }),
      narration_key: "fq_shadow_m03_p1",
    },
    {
      id: fqPhaseId("shadow_syndicate", 3, 2),
      template_id: factionMissionId("shadow_syndicate", 3),
      phase_order: 2,
      title: "Intercept the Rival",
      description:
        "Destroy a rival's shipping vessel before it reaches market.",
      objective_type: "destroy_ship",
      objectives: JSON.stringify({ shipsToDestroy: 1 }),
      narration_key: "fq_shadow_m03_p2",
    },
    // M4: Blackout (sabotage → scan)
    {
      id: fqPhaseId("shadow_syndicate", 4, 1),
      template_id: factionMissionId("shadow_syndicate", 4),
      phase_order: 1,
      title: "Infiltrate the Array Sector",
      description: "Visit the Ranger sensor array sector to disable it.",
      objective_type: "visit_sector",
      objectives: JSON.stringify({
        sectorsToVisit: 1,
      }),
      narration_key: "fq_shadow_m04_p1",
    },
    {
      id: fqPhaseId("shadow_syndicate", 4, 2),
      template_id: factionMissionId("shadow_syndicate", 4),
      phase_order: 2,
      title: "Shadow Scan",
      description: "Scan 3 sectors while the sensors are down.",
      objective_type: "scan_sectors",
      objectives: JSON.stringify({ scansRequired: 3 }),
      narration_key: "fq_shadow_m04_p2",
    },

    // --- Independent ---
    // M1: The Wanderer's Path (meet_npc → visit)
    {
      id: fqPhaseId("independent", 1, 1),
      template_id: factionMissionId("independent", 1),
      phase_order: 1,
      title: "Find the Hermit",
      description: "Locate the Hermit wandering deep space.",
      objective_type: "meet_npc",
      objectives: JSON.stringify({ npcId: NPC.hermit, npcName: "The Hermit" }),
      narration_key: "fq_indep_m01_p1",
    },
    {
      id: fqPhaseId("independent", 1, 2),
      template_id: factionMissionId("independent", 1),
      phase_order: 2,
      title: "Walk the Path",
      description:
        "Visit 10 sectors following the Hermit's philosophical trail.",
      objective_type: "visit_sector",
      objectives: JSON.stringify({ sectorsToVisit: 10 }),
      narration_key: "fq_indep_m01_p2",
    },
    // M3: Tik-Tok's Dream (investigate → deliver)
    {
      id: fqPhaseId("independent", 3, 1),
      template_id: factionMissionId("independent", 3),
      phase_order: 1,
      title: "Salvage Hunt",
      description: "Scan 3 derelict ship sectors for personality modules.",
      objective_type: "scan_sectors",
      objectives: JSON.stringify({
        scansRequired: 3,
      }),
      narration_key: "fq_indep_m03_p1",
    },
    {
      id: fqPhaseId("independent", 3, 2),
      template_id: factionMissionId("independent", 3),
      phase_order: 2,
      title: "Deliver the Modules",
      description: "Bring the personality modules to Tik-Tok.",
      objective_type: "meet_npc",
      objectives: JSON.stringify({ npcId: NPC.tiktok, npcName: "Tik-Tok" }),
      narration_key: "fq_indep_m03_p2",
    },
  ];

  for (const p of phases) {
    const existing = await knex("mission_phases").where({ id: p.id }).first();
    if (!existing) {
      await knex("mission_phases").insert(p);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MISSION CHOICES
  // ═══════════════════════════════════════════════════════════════
  const choices = [
    // Mycorrhizal Network M5: Network Resonance
    {
      id: fqChoiceId("network_resonance"),
      template_id: factionMissionId("mycorrhizal", 5),
      phase_id: fqPhaseId("mycorrhizal", 5, 2),
      choice_key: "network_resonance",
      prompt_title: "The Network Signal",
      prompt_body:
        "The ancient mycelial resonance can be amplified to reach across the galaxy, potentially waking dormant nodes — or filtered to protect the existing network from interference. Lyra defers to your judgment.",
      options: JSON.stringify([
        {
          id: "amplify",
          label: "Amplify the Signal",
          description:
            "Boost the resonance to reach dormant nodes across the galaxy. Greater power, greater risk.",
          effects: {
            fame: { cosmic_scholars: 15 },
            flags: { network_amplified: "true" },
            rewards: { xp: 300 },
          },
        },
        {
          id: "filter",
          label: "Filter the Signal",
          description:
            "Stabilize the existing network. Slower growth, but guaranteed safety.",
          effects: {
            fame: { cosmic_scholars: 10 },
            flags: { network_filtered: "true" },
            rewards: { credits: 3000 },
          },
        },
      ]),
      is_permanent: false,
      narration_key: "fq_mycorrhizal_m05_choice",
    },
    // Mycorrhizal Network M9: The Scholar's Dilemma
    {
      id: fqChoiceId("scholars_dilemma"),
      template_id: factionMissionId("mycorrhizal", 9),
      phase_id: null,
      choice_key: "scholars_dilemma",
      prompt_title: "Precursor Knowledge",
      prompt_body:
        "Archivist Thal has decoded Precursor knowledge of extraordinary power — weapons, energy sources, terraforming. Sharing it freely could accelerate galactic progress but also enable its misuse. Restricting it protects against abuse but slows advancement.",
      options: JSON.stringify([
        {
          id: "share_openly",
          label: "Share Openly",
          description:
            "Release the knowledge to all factions. Trust in collective wisdom.",
          effects: {
            fame: { cosmic_scholars: 20, frontier_rangers: -5 },
            flags: { precursor_knowledge_shared: "true" },
            rewards: { xp: 500 },
          },
        },
        {
          id: "restrict_access",
          label: "Restrict Access",
          description:
            "Keep it within the Mycorrhizal Network. Protect against misuse.",
          effects: {
            fame: { cosmic_scholars: 10, frontier_rangers: 5 },
            flags: { precursor_knowledge_restricted: "true" },
            rewards: { credits: 5000 },
          },
        },
      ]),
      is_permanent: false,
      narration_key: "fq_mycorrhizal_m09_choice",
    },
    // Iron Dominion M5: Dominion Tactics
    {
      id: fqChoiceId("dominion_prisoners"),
      template_id: factionMissionId("iron_dominion", 5),
      phase_id: fqPhaseId("iron_dominion", 5, 2),
      choice_key: "dominion_prisoners",
      prompt_title: "The Prisoner Question",
      prompt_body:
        "The pirate survivors kneel before you. Commander Thane awaits your decision. Taking prisoners means intelligence, but resources. Leaving none sends a message that will echo across the frontier.",
      options: JSON.stringify([
        {
          id: "take_prisoners",
          label: "Take Prisoners",
          description: "Capture survivors for interrogation. Honor and intel.",
          effects: {
            fame: { frontier_rangers: 15 },
            flags: { dominion_merciful: "true" },
            rewards: { xp: 400 },
          },
        },
        {
          id: "leave_none",
          label: "Leave None",
          description: "No survivors. The frontier will remember.",
          effects: {
            fame: { frontier_rangers: 10, shadow_syndicate: 5 },
            flags: { dominion_ruthless: "true" },
            rewards: { credits: 3000 },
          },
        },
      ]),
      is_permanent: false,
      narration_key: "fq_iron_m05_choice",
    },
    // Iron Dominion M9: Honor and Duty
    {
      id: fqChoiceId("kalin_secrets"),
      template_id: factionMissionId("iron_dominion", 9),
      phase_id: null,
      choice_key: "kalin_secrets",
      prompt_title: "Kalin Military Secrets",
      prompt_body:
        "Commander Thane has intercepted classified Kalin military intelligence. The data could give the Dominion a significant tactical advantage — but accepting stolen intelligence from an ally crosses a line.",
      options: JSON.stringify([
        {
          id: "accept_secrets",
          label: "Accept the Intelligence",
          description:
            "Use every advantage available. The galaxy is too dangerous for honor alone.",
          effects: {
            fame: { frontier_rangers: 15, cosmic_scholars: -5 },
            flags: { accepted_kalin_secrets: "true" },
            rewards: { xp: 500 },
          },
        },
        {
          id: "refuse_secrets",
          label: "Refuse on Principle",
          description: "Honor above advantage. Return the data to the Kalin.",
          effects: {
            fame: { frontier_rangers: 10, cosmic_scholars: 10 },
            flags: { refused_kalin_secrets: "true" },
            rewards: { credits: 5000 },
          },
        },
      ]),
      is_permanent: false,
      narration_key: "fq_iron_m09_choice",
    },
    // Traders Guild M5: Market Mastery
    {
      id: fqChoiceId("market_policy"),
      template_id: factionMissionId("traders_guild", 5),
      phase_id: fqPhaseId("traders_guild", 5, 2),
      choice_key: "market_policy",
      prompt_title: "Economic Policy",
      prompt_body:
        "The Guild stands at a crossroads. Free trade means open markets, competition, and innovation — but also exploitation. Regulated trade means stability, fairness, and control — but also stagnation. Your voice carries the weight of a Trade Prince.",
      options: JSON.stringify([
        {
          id: "free_trade",
          label: "Free Trade",
          description:
            "Open markets, unrestricted commerce. Let the market decide.",
          effects: {
            fame: { traders_guild: 20, shadow_syndicate: 5 },
            flags: { guild_free_trade: "true" },
            rewards: { credits: 10000 },
          },
        },
        {
          id: "regulated_trade",
          label: "Regulated Trade",
          description: "Fair prices, controlled supply. Stability over profit.",
          effects: {
            fame: { traders_guild: 15, frontier_rangers: 10 },
            flags: { guild_regulated: "true" },
            rewards: { xp: 500 },
          },
        },
      ]),
      is_permanent: false,
      narration_key: "fq_traders_m05_choice",
    },
    // Shadow Syndicate M5: Double Agent
    {
      id: fqChoiceId("double_agent"),
      template_id: factionMissionId("shadow_syndicate", 5),
      phase_id: null,
      choice_key: "double_agent",
      prompt_title: "Divided Loyalty",
      prompt_body:
        "The Frontier Rangers have approached you to betray the Shadow Syndicate. Shade suspects nothing — yet. Report to the Rangers, and the Syndicate burns. Feed them false intel, and your position in the shadows is cemented forever.",
      options: JSON.stringify([
        {
          id: "betray_syndicate",
          label: "Report to Rangers",
          description:
            "Betray the Syndicate. Turn over Shade's network to the Rangers.",
          effects: {
            fame: { frontier_rangers: 25, shadow_syndicate: -30 },
            flags: { betrayed_syndicate: "true" },
            rewards: { xp: 700 },
          },
        },
        {
          id: "feed_false_intel",
          label: "Feed False Intel",
          description:
            "Give the Rangers fabricated information. Protect the Syndicate.",
          effects: {
            fame: { shadow_syndicate: 20, frontier_rangers: -10 },
            flags: { loyal_to_syndicate: "true" },
            rewards: { credits: 8000 },
          },
        },
      ]),
      is_permanent: false,
      narration_key: "fq_shadow_m05_choice",
    },
    // Independent M4: Galaxy Citizen
    {
      id: fqChoiceId("galaxy_citizen"),
      template_id: factionMissionId("independent", 4),
      phase_id: null,
      choice_key: "galaxy_citizen",
      prompt_title: "The Oracle's Question",
      prompt_body:
        "The Oracle asks one final question: 'What is the purpose of a star?' Your answer will define a passive blessing — a permanent philosophical stance that shapes how the galaxy sees you.",
      options: JSON.stringify([
        {
          id: "to_illuminate",
          label: "To Illuminate",
          description:
            "Stars exist to light the way for others. Knowledge is the highest calling.",
          effects: {
            fame: { cosmic_scholars: 15 },
            flags: { oracle_illumination: "true" },
            rewards: { xp: 500 },
          },
        },
        {
          id: "to_burn",
          label: "To Burn",
          description:
            "Stars exist through their own fire. Strength defines all things.",
          effects: {
            fame: { frontier_rangers: 15 },
            flags: { oracle_strength: "true" },
            rewards: { xp: 500 },
          },
        },
        {
          id: "to_nurture",
          label: "To Nurture",
          description:
            "Stars exist to warm the worlds around them. Community is everything.",
          effects: {
            fame: { traders_guild: 10, cosmic_scholars: 5 },
            flags: { oracle_community: "true" },
            rewards: { credits: 5000 },
          },
        },
      ]),
      is_permanent: false,
      narration_key: "fq_indep_m04_choice",
    },
  ];

  for (const c of choices) {
    const existing = await knex("mission_choices").where({ id: c.id }).first();
    if (!existing) {
      await knex("mission_choices").insert(c);
    }
  }
}
