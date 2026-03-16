/**
 * narration-scripts-phases.ts
 *
 * Phase transition narration scripts for multi-phase missions.
 * Plays when a player advances from one phase to the next.
 *
 * Voice tags: [ARIA] for narrator, [NPC:name] for NPC dialogue.
 * Keep these SHORT — 1-3 sentences. Atmospheric but punchy.
 *
 * Key format: "m{storyOrder}_phase{phaseOrder}" for story missions
 *             "fq_{faction}_m{num}_phase{phaseOrder}" for faction missions
 */

// ── STORY MISSION PHASE TEXTS ───────────────────────────────────────────────

export const STORY_PHASE_TEXTS: Record<string, string> = {
  // =========================================================================
  // CHAPTER 1 (M5-M8)
  // =========================================================================

  // M5: Alarion's Mandate — Phase 2: Deliver 10 Cyrillium
  m05_phase2: `[ARIA] Alarion's words still echo in the cathedral-bridge. The Star Seeker's departure drives hunger for cyrillium — ten units of refined crystal to power an exodus. The nearest outpost markets carry what you need. Buy it, sell it at the designated drop point, and the fleet lives.`,

  // M6: Departing Agaricalis — Phase 2: Navigate Departure Corridor
  m06_phase2: `[ARIA] The scavengers are dealt with, but the corridor stretches ahead — three sectors of debris-choked space between you and the rally point. The swollen sun paints everything in dying crimson. Move fast. The fleet waits for no one.`,

  // M7: The Dying Star — Phase 2: The Data Decision (choice)
  m07_phase2: `[ARIA] The scan data pulses in your ship's memory banks — a dying star's final autobiography. Miraen and Valandor both await your decision. Share with the Vedic, or keep it classified. This choice will ripple outward.`,

  // =========================================================================
  // CHAPTER 2 (M9-M16)
  // =========================================================================

  // M10: Wormhole Transit — Phase 2: Survive the Crossing
  m10_phase2: `[ARIA] The wormhole tears open ahead of you like a wound in spacetime. Gravitational shear rips at your hull as you cross the threshold. Something stirs in the turbulence — energy constructs, born from the anomaly itself. Survive, or be torn apart with the light.`,

  // M12: The Philosopher's Test — Phase 2: Interpretation (choice)
  m12_phase2: `[NPC:valandor] "You have studied the artifacts. Now tell me — what do they whisper to you? Were they built to create, or to defend? Your interpretation will shape how the Vedic see your people."`,

  // M13: Cyrillium Veins — Phase 2: Sample Collection
  m13_phase2: `[ARIA] The geological survey reveals veins of pure cyrillium threading through nearby asteroid fields. Miraen needs fifteen units delivered to her research station to confirm the resonance patterns she's been tracking.`,

  // M18: Tar'ri Traders — Phase 2: Establish Goodwill
  m18_phase2: `[ARIA] Kovax Prime watches you with those calculating merchant's eyes. His delegation is here, the introductions made. Now comes the real language of diplomacy — trade. Fifteen units of commerce will prove you speak Tar'ri.`,

  // M19: Trade Diplomacy — Phase 2: Prove Reliability (timed)
  m19_phase2: `[NPC:jyn] "Impressive, but any freighter can haul food. The Tar'ri value speed in their partners. Ten tech components, delivered here within thirty minutes. The clock starts now, pilot."`,

  // M20: Distress Signal — Phase 2: Follow the Trail
  m20_phase2: `[ARIA] The signal source is triangulated — wreckage, scattered across three sectors. Something tore a Kalin warship apart, and the debris trail leads deeper into unknown space. Follow it. Find out what did this.`,

  // M21: The Kalin Rescue — Phase 2: Meet Commander Raxus
  m21_phase2: `[ARIA] The crippled Kalin vessel docks safely. Commander Raxus has requested a personal audience — unusual for a Kalin officer. He wants to see the pilot who guided his crew to safety. This meeting will matter.`,

  // M23: The Ancient Vault — Phase 2: Decode the Vault
  m23_phase2: `[ARIA] The perimeter is secure. Lyra Starwind's instruments detect Precursor encryption — layers of it, ancient and deliberate. Three scans should decode the locking mechanism. Each scan peels back another cipher.`,

  // M23: The Ancient Vault — Phase 3: Power the Extraction
  m23_phase3: `[NPC:lyra] "The vault is open, but the artifact inside remains sealed in stasis. The extraction chamber needs cyrillium to power up — five units should be enough. Without it, we leave the greatest discovery in history behind a locked door."`,

  // M24: Artifact Unearthed — Phase 2: The Artifact Decision (choice)
  m24_phase2: `[ARIA] The artifact hums with power older than the stars. Alarion, Raxus, and Valandor each make their case. Vedic scholars, Kalin military, or Muscarian custody — this decision permanently reshapes galactic politics. Choose wisely.`,

  // =========================================================================
  // CHAPTER 4 (M25-M31)
  // =========================================================================

  // M25: The Debate — Phase 2: Hear Raxus's Argument
  m25_phase2: `[NPC:raxus] "Trade leverage? While the galaxy burns? The artifact is a weapon, whether you use it as one or not. At least with the Kalin, it will be wielded by those who understand what's at stake."`,

  // M26: Tar'ri Leverage — Phase 2: Stop the Smugglers
  m26_phase2: `[ARIA] The detection arrays are live. Two smuggler ships carrying stolen artifact fragments have been identified — they're running for Syndicate space. Intercept and destroy them before the fragments disappear into the black market.`,

  // M27: Kalin War Games — Phase 2: The Surprise Round
  m27_phase2: `[NPC:raxus] "The drones were nothing. A warm-up. Now comes the real test."
[ARIA] Sensors scream as a Kalin Elite drops out of warp directly behind you. Raxus never mentioned a second round. Survive.`,

  // M28: Whispers in the Dark — Phase 2: Navigate to the Source
  m28_phase2: `[ARIA] The interference source is pinpointed — a derelict station in a sector heavy with electromagnetic distortion. Two waypoint sectors of interference-heavy space stand between you and the source. Your instruments will fight you every step.`,

  // M28: Whispers in the Dark — Phase 3: Destroy the Guardian
  m28_phase3: `[ARIA] The jamming station looms ahead, a skeleton of ancient technology still broadcasting. A single automated guardian drone circles it — weakened by the interference it generates, but still lethal. Destroy it, and Shade can analyze the station's data.`,

  // M29: Espionage — Phase 2: Secure the Area
  m29_phase2: `[ARIA] The Syndicate sentry is destroyed. The listening post's automated defenses are offline. Now scan the surrounding sectors to confirm the blackout is complete — coalition operations depend on these corridors being clean.`,

  // M29: Espionage — Phase 3: The Data Question (choice)
  m29_phase3: `[NPC:shade] "The listening post's data banks are intact — months of intercepted coalition messages. Destroying it is clean. Copying it first is... profitable. Your call, operative."`,

  // M30: The Arms Race — Phase 2: Store Your Old Ship
  m30_phase2: `[ARIA] Your new vessel's engines thrum with power your scout ship never had. But don't scrap the old girl yet — the starmall garage can store her safely. You may need a fast ship again someday.`,

  // M30: The Arms Race — Phase 3: Check the Salvage Yard
  m30_phase3: `[ARIA] The salvage yard pays fifty percent of base price for ships you'll never fly again. Credits in your pocket for the war effort. Worth a look, at minimum.`,

  // M30: The Arms Race — Phase 4: Install Weapon Upgrade
  m30_phase4: `[NPC:caelum] "Raw firepower isn't enough — upgrades multiply your combat effectiveness. My latest weapon mod is available at the garage. Install it on the new ship, and you'll hit harder than anything in this quadrant."`,

  // M31: Drums of War — Phase 2: The Summit
  m31_phase2: `[ARIA] Supplies delivered. The summit chamber fills with representatives from every faction — Tar'ri merchants, Kalin warriors, Muscarian diplomats. Elenion stands at the podium. His words carry the weight of a civilization's hope.`,

  // =========================================================================
  // CHAPTER 5 (M32-M39)
  // =========================================================================

  // M32: Outpost Under Siege — Phase 2: Scan the Wreckage
  m32_phase2: `[ARIA] The attackers are destroyed, but their wreckage tells a disturbing story. Energy signatures that match no known faction. Scan the debris before it degrades — someone ancient built these weapons.`,

  // M33: Evidence Trail — Phase 2: Deliver Fragments to Lyra
  m33_phase2: `[NPC:lyra] "The trail leads to a shattered Precursor relay. I need the physical fragments to build a decryption matrix. Bring me ten tech components, and I can decode the relay's final transmission."`,

  // M34: The Summit — Phase 2: Meet Commander Raxus
  m34_phase2: `[ARIA] Alarion has spoken. Now the war room beckons. Commander Raxus paces behind fortified walls, his argument already sharpened to a blade's edge.`,

  // M34: The Summit — Phase 3: Meet Valandor
  m34_phase3: `[ARIA] The meditation chamber breathes with crystalline light. Valandor sits in stillness, but his mind spans centuries. He has one final perspective to offer before the coalition decides.`,

  // M36: Shadow Entity — Phase 2: Survive the Shadow Attack
  m36_phase2: `[ARIA] The shadow energy coalesces into form — not a weapon, but a guardian. It doesn't distinguish friend from threat. Survive its test, and the Oracle can establish communication.`,

  // M37: The Hidden Enemy — Phase 2: Navigate to the Source
  m37_phase2: `[ARIA] The warp gate exit is verified safe. Use the coalition's warp gate to reach the Precursor source — a dormant infrastructure complex that has been here for millions of years.`,

  // M38: Forging Alliances — Phase 2: Establish Forward Bases
  m38_phase2: `[ARIA] Supplies delivered. Now the forward bases need trade volume to sustain operations. Twenty-five units of commerce will establish the supply line the coalition depends on.`,

  // M39: The Fragile Pact — Phase 2: The Confrontation (choice)
  m39_phase2: `[NPC:raxus] "I built weapons from the artifact. I won't apologize for protecting my people. The question is what you do with this knowledge."
[ARIA] Confront publicly, or handle it privately. The coalition's fragile trust hangs on your decision.`,

  // =========================================================================
  // CHAPTER 6 (M40-M46)
  // =========================================================================

  // M40: Into the Core — Phase 2: Survive the Sentinel
  m40_phase2: `[ARIA] The core threshold is crossed. Radiation floods your sensors. And something ancient detects your intrusion — a Primordium Sentinel, waiting millennia for intruders. It does not negotiate.`,

  // M41: Ancient Traps — Phase 2: Chart Safe Passage
  m41_phase2: `[ARIA] All four trap mechanisms are mapped. Professor Thane's calculations reveal one safe corridor through the field. Four sectors of precise navigation — any deviation triggers a trap. Follow the route exactly.`,

  // M42: The Primordium — Phase 2: Scan the Primordium
  m42_phase2: `[ARIA] The Oracle's memories point to three Primordium structures that still function. Scanning them reveals the civilization's name, their purpose, and their final warning to whoever came next.`,

  // M43: Gathering Storm — Phase 2: Defend the Staging Planet
  m43_phase2: `[ARIA] Intelligence gathered. The fleet is assembling — but five Primordium warships stand between the staging area and the core. This is what everything has been building toward. Engage.`,

  // M44: The Weapon Question — Phase 2: Choose the Weapon (choice)
  m44_phase2: `[ARIA] Thirty cyrillium units fuel the weapon forges. Now the question that will define the galaxy: resonance disruptor — ecological, disabling without destroying — or quantum annihilator, maximum destructive force. Miraen pleads for mercy. Raxus demands certainty.`,

  // M45: The Final Approach — Phase 2: Reach the Core Heart
  m45_phase2: `[ARIA] Five sentinels lie in ruin behind you. The path to the galaxy's absolute center is clear. What waits at the core heart will determine the fate of every living species. Jump now. There is no retreat from here.`,

  // M46: Battle for the Galaxy — Phase 2: Survive the Counterattack
  m46_phase2: `[ARIA] The first wave is broken, but the Primordium adapts. Reinforcement waves hit your position from two vectors. Hold the line — the fleet is counting on you to absorb the counterattack.`,

  // M46: Battle for the Galaxy — Phase 3: Defend the Command Station
  m46_phase3: `[ARIA] The counterattack is survived, but Alarion's command station is vulnerable. Three Primordium elites — the most powerful enemies in the galaxy — converge on his position. This is the final stand.`,

  // =========================================================================
  // CHAPTER 7 (M47-M53)
  // =========================================================================

  // M47: After the Storm — Phase 2: Catalogue Reconstruction Needs
  m47_phase2: `[ARIA] The devastation is catalogued. Now scan four sectors to determine what each one needs to rebuild. Food, tech, materials — the coalition's reconstruction priorities depend on your data.`,

  // M48: Miraen's Garden — Phase 2: Deliver Food Supplies
  m48_phase2: `[NPC:miraen] "Two hundred colonists on a war-scarred world need food immediately. But this isn't just feeding people — the surplus feeds the soil microbiome my spore cultures need to take root. Without food, the garden dies before it blooms."`,

  // M49: Trade Routes Restored — Phase 2: Establish the Trade Route
  m49_phase2: `[ARIA] The initial trade volume is flowing. Now establish the automated route — a caravan running between outpost and colony, keeping supplies moving without your direct intervention. The galaxy rebuilds on logistics.`,

  // M50: The Council Charter — Phase 2: Meet Elenion
  m50_phase2: `[ARIA] Valandor's philosophy grounds the discussion. Now Elenion presents three possible charter structures — each debated for months, each with permanent consequences for galactic governance.`,

  // M50: The Council Charter — Phase 3: The Council Vote (choice)
  m50_phase3: `[NPC:elenion] "The time for debate is past. Three visions for the council lie before you. Open — all species share equal voice. Founding — original coalition members lead. Advisory — the council advises, factions self-govern. Choose for the generations that follow."`,

  // M51: Caelum's Legacy — Phase 2: Scan Precursor Sites
  m51_phase2: `[NPC:caelum] "I've identified three Precursor sites. Your scans confirm whether guardian systems are truly dormant — a mistake here costs lives. This is what I always wanted to build. Not weapons. Futures."`,

  // M52: Healing the Rift — Phase 2: Fund the Joint Outpost
  m52_phase2: `[ARIA] Raxus spoke his piece. Reconciliation now requires the language everyone understands — trade. Twenty-five units of commerce at the Kalin-Muscarian joint outpost proves the alliance is real, not just words.`,

  // =========================================================================
  // CHAPTER 8 (M54-M60)
  // =========================================================================

  // M54: The Ambassador's Mantle — Phase 2: Diplomatic Tour
  m54_phase2: `[NPC:elenion] "The title is given, but the respect must be earned. Visit every faction's homeworld. Let them see you not as a warrior or a trader, but as a bridge between civilizations."`,

  // M55: Ancient Echoes — Phase 2: Visit Primordium Archives
  m55_phase2: `[ARIA] The echoes point to three physical locations where Primordium data archives survived the ages. You must be physically present to activate the download. Each archive holds a fragment of a dead civilization's memory.`,

  // M56: The Spore Network Reborn — Phase 2: Deliver Cyrillium Catalyst
  m56_phase2: `[NPC:miraen] "The mycelial nodes are planted, but the Network needs cyrillium to amplify the spore signal across light-years. Forty units, fed into the network nodes, and the galaxy begins to breathe again."`,

  // M56: The Spore Network Reborn — Phase 3: Confirm Reactivation
  m56_phase3: `[ARIA] The cyrillium is fed into the Network. Miraen's instruments detect a spreading cascade — the ancient Spore Network is reawakening. Scan six sectors to confirm the spores are reconnecting life across the galaxy.`,

  // M57: Valandor's Farewell — Phase 2: The Legacy Gift (choice)
  m57_phase2: `[NPC:valandor] "I have one gift remaining. The crystal matrix enhances your perception. The star charts extend your reach. Or you may decline both — and earn the respect of all factions equally. Choose as your heart dictates, for this is the last choice I will witness."`,

  // M58: The New Frontier — Phase 2: Eliminate Rogue Sentinels
  m58_phase2: `[ARIA] The frontier sectors are mapped, but not all Primordium guardians received the shutdown signal. Three rogue sentinels patrol the unknown, attacking anything that moves. Clear them before colonists arrive.`,

  // M59: Keeper of the Stars — Phase 2: Establish Trade Hub
  m59_phase2: `[ARIA] Supplies delivered to the staging area. Now the expedition needs an economic foundation — fifty units of trade to establish the largest trade hub ever constructed at the galaxy's edge.`,

  // M59: Keeper of the Stars — Phase 3: Colonize the Edge
  m59_phase3: `[ARIA] The trade hub hums with activity. One final act remains — three hundred souls, willing to live at the very edge of known space. This colony is the galaxy's front door to whatever comes next.`,
};

// ── FACTION MISSION PHASE TEXTS ────────────────────────────────────────────

export const FACTION_PHASE_TEXTS: Record<string, string> = {
  // =========================================================================
  // MYCORRHIZAL NETWORK
  // =========================================================================

  fq_mycorrhizal_network_m03_phase2: `[NPC:archivist_thal] "The data nodes are scanned and intact. Now I need the physical fragments — cyrillium to power the extraction process. Deliver ten units to my relay station."`,

  fq_mycorrhizal_network_m04_phase2: `[NPC:hermit] "You have heard me. Now act. The Network points to a planet with ideal mycelial soil. One hundred colonists to anchor the node. Plant life where the Network asks for it."`,

  fq_mycorrhizal_network_m05_phase2: `[NPC:lyra] "The resonance data is complete. Now the choice: amplify the signal — stronger, but it attracts attention — or filter it for purity at the cost of range. The Network's future hangs on this."`,

  fq_mycorrhizal_network_m07_phase2: `[ARIA] Defenses powered. But the Syndicate extraction ships are inbound — two vessels converging on the data nodes. If they reach them, millennia of knowledge ends up on the black market. Intercept and destroy.`,

  fq_mycorrhizal_network_m10_phase2: `[NPC:miraen] "The bio-signatures are confirmed! Two sites have developed ecosystems I've never seen. Visit them — I need visual confirmation and soil samples from each garden."`,

  fq_mycorrhizal_network_m11_phase2: `[ARIA] The activation cascade has attracted hostiles. Three ships converge on the primary node — if they reach it during the cascade sequence, the entire reactivation fails. Defend the node.`,

  // =========================================================================
  // IRON DOMINION
  // =========================================================================

  fq_iron_dominion_m01_phase2: `[NPC:sarge] "Still alive? Good. See those two hostiles on the scanner? Kill them. Come back alive. That's your interview."`,

  fq_iron_dominion_m03_phase2: `[NPC:commander_thane] "The drones were nothing. Now comes the real evaluation."
[ARIA] Sensors flare as an unknown contact drops from warp directly behind you. Thane always has one more test.`,

  fq_iron_dominion_m04_phase2: `[NPC:hawk] "Scan data is useless if it doesn't reach command. Digital channels are compromised. Deliver the intel package physically — ten tech components, sealed and tamper-proof."`,

  fq_iron_dominion_m05_phase2: `[NPC:commander_thane] "Raiders are dead. But the survivors are floating in escape pods. Take them prisoner — costs resources, builds civilian trust. Or leave none — efficient, sends a message. Your decision, Ranger."`,

  fq_iron_dominion_m06_phase2: `[NPC:hawk] "Your patrol logged three distress signals. Scan each one — determine which are genuine and which are pirate traps. A good ranger doesn't walk into ambushes, they detect them."`,

  fq_iron_dominion_m07_phase2: `[ARIA] Supply line established. But three pirate raiders are camped along the route. Clear them out permanently — the forward base can't afford another disrupted convoy.`,

  fq_iron_dominion_m10_phase2: `[NPC:commander_thane] "The council's decision requires resources. Thirty tech components fund the next generation of Dominion defense systems. This is how policy becomes power."`,

  fq_iron_dominion_m11_phase2: `[ARIA] The first wave was a feint. Two counterattack waves hit your position simultaneously. Hold the line — reinforcements are inbound, but they need time.`,

  fq_iron_dominion_m11_phase3: `[ARIA] The counterattack is repelled, but the area needs clearing. Scan three sectors to confirm no hostiles remain hiding in debris fields. Leave nothing behind that could regroup.`,

  // =========================================================================
  // TRADERS GUILD
  // =========================================================================

  fq_traders_guild_m01_phase2: `[NPC:kovax] "Introductions are done. Now let us see if you can trade. Ten transactions at Guild-approved outposts. Any fool buys low and sells high once — I want consistency."`,

  fq_traders_guild_m02_phase2: `[NPC:kovax] "The cyrillium play worked. But while speculators scrambled, a food crisis hit the frontier. Fifteen food units, delivered within twenty minutes. Timer starts now, pilot."`,

  fq_traders_guild_m03_phase2: `[ARIA] The route is charted through dangerous space. Now it needs trade volume — twenty units of commerce at both endpoints to prove the route is economically viable.`,

  fq_traders_guild_m04_phase2: `[ARIA] Smugglers identified and destroyed. Now scan the aftermath — two sectors of wreckage may reveal the larger network they were feeding into.`,

  fq_traders_guild_m05_phase2: `[NPC:kovax] "Fifty trades, and you've earned the right to shape policy. Free trade — open markets, volatile prices, high risk and reward. Or regulated — stable, controlled, the Guild sets supply. This vote shapes galactic economics."`,

  // =========================================================================
  // SHADOW SYNDICATE
  // =========================================================================

  fq_shadow_syndicate_m02_phase2: `[NPC:shade] "First drop was easy. Second one's tighter. Five tech components, fifteen minutes. If you're late, the contact vanishes and we both have a problem."`,

  fq_shadow_syndicate_m03_phase2: `[NPC:shade] "The merchandise moved. Good. But there's a rival fence undercutting our prices. One ship, one problem solved. You know where to find them."`,

  fq_shadow_syndicate_m04_phase2: `[ARIA] The sensor array's guardian is destroyed. The blackout zone expands. Scan three surrounding sectors to confirm Syndicate operations can move through these corridors undetected.`,

  // =========================================================================
  // INDEPENDENT
  // =========================================================================

  fq_independent_m01_phase2: `[NPC:hermit] "You found me. Most don't bother. Now walk the path I walked — three contemplation points, each one showing you something about the galaxy you've been too busy to notice."`,

  fq_independent_m03_phase2: `[ARIA] The personality modules are recovered — Curiosity, Empathy, Purpose. Tik-Tok's workshop needs five tech components to interface the modules with his core processor. Deliver them, and see what he becomes.`,
};
