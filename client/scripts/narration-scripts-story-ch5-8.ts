/**
 * Narration scripts for Cosmic Horizon story missions 32-60 (Chapters 5-8).
 *
 * Voice tags:
 *   [ARIA]       — Ship AI narrator, second-person perspective
 *   [NPC:name]   — NPC dialogue
 *
 * Script types:
 *   ACCEPT  — Mission briefing narration (150-300 words, atmospheric)
 *   COMPLETE — Short completion acknowledgment (1-2 sentences)
 *
 * CLAIM and CODEX are handled by other agents.
 */

// ── Chapter 5: The Quest for Harmony (M32-39) ──────────────────────────────

// ── Chapter 6: Unveiling the Shadows (M40-46) ──────────────────────────────

// ── Chapter 7: A New Dawn (M47-53) ──────────────────────────────────────────

// ── Chapter 8: Legacy of the Stars (M54-60) ─────────────────────────────────

export const ACCEPT_TEXTS: Record<number, string> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 5: THE QUEST FOR HARMONY
  // ═══════════════════════════════════════════════════════════════════════════

  32: `[ARIA] An emergency broadcast cuts through your comm channels — a Tar'ri outpost on the frontier is under attack. The assailants are using unfamiliar weapons, energy signatures that match nothing in any faction's database. By the time you arrive, the battle is already raging: three warships circle the outpost like predators, their hulls shimmering with a dark iridescence.

[ARIA] The outpost's defenders are outgunned. Without help, they will fall within the hour. And whoever these attackers are, they are not here for territory or trade — they are here for something specific.`,

  33: `[ARIA] The wreckage yields unsettling clues: hull fragments laced with organic compounds, weapons powered by a corrupted form of cyrillium, and navigation logs pointing to sectors deep in unexplored space. Lyra Starwind, the archaeologist who first mapped the Precursor vault, recognizes the metallurgy.

[NPC:lyra] "These alloys predate every known civilization. Whoever built these ships had access to Precursor technology — or something even older. I need more samples to be certain. Scan the sectors along their flight path and bring me everything you find."`,

  34: `[ARIA] The evidence is compelling enough to warrant an emergency summit. High Sage Alarion convenes the leaders aboard the Star Seeker — neutral ground between the factions. Commander Raxus arrives in full battle regalia, his warship flanked by an honor guard. Valandor materializes in the meditation chamber, his ethereal presence filling the room with calm.

[ARIA] The mood is tense. The Kalin want to strike preemptively. The Vedic counsel patience and study. Alarion looks to you — the one who has seen the wreckage firsthand. Your testimony will shape the response.`,

  35: `[ARIA] The summit agrees on one thing: a unified response is necessary. But the form that unity takes is fiercely debated. Elenion, the diplomat who brokered the original peace, facilitates the discussion. Three models are proposed.

[ARIA] A military alliance under Kalin command — efficient but authoritarian. A trade federation led by Tar'ri economic principles — prosperous but slow to act. Or a hybrid council with shared leadership — balanced but prone to deadlock.

[NPC:elenion] "You have earned the trust of every faction at this table. Your voice carries weight that mine does not. What do you recommend?"`,

  36: `[ARIA] The Oracle — that enigmatic presence woven into the fabric of deep space — reaches out to you directly for the first time. Its voice resonates through your ship's bio-resonance array like a chord struck on an instrument the size of a star.

[NPC:oracle] "The shadow that attacked the outpost is not new. It has lurked at the edges of perception for millennia, feeding on the spaces between stars. I have watched it grow. Now it moves openly, and that means it is confident. You must understand what you face before you can fight it."

[ARIA] The Oracle provides coordinates: four sites where shadow energy has pooled like dark water in cosmic depressions.`,

  37: `[ARIA] Archivist Thal, the reclusive keeper of Vedic historical records, contacts you through encrypted channels. The shadow energy signatures you catalogued match entries in the oldest Vedic archives — records so ancient they predate the Vedic civilization itself.

[NPC:archivist_thal] "These records describe an intelligence that exists in the gaps between dimensions. It was sealed away by the Precursors using a frequency barrier. Someone — or something — has been weakening that barrier. I have modified a sensor array to detect the barrier's resonance. Use it to find where the breach is worst."`,

  38: `[ARIA] The coalition is forming, but alliances forged in conference rooms must be tempered in the field. Supply convoys need protection as they establish forward operating bases along the frontier. Raiders — some opportunistic, some suspiciously well-armed — harass every shipment.

[ARIA] The work is unglamorous but essential. Every convoy that arrives safely is another link in the chain. Every forward base is a staging point for the fight ahead. The coalition needs to prove it can function before the real test arrives.`,

  39: `[ARIA] Commander Raxus requests a private meeting. His tone is uncharacteristically hesitant. When you arrive at his quarters, the reason is clear: the Kalin have been secretly weaponizing technology derived from the Precursor artifact. The weapons are powerful — devastatingly so — but their development violates the coalition agreement.

[ARIA] Raxus is conflicted. The weapons could be the edge the coalition needs against the shadow entity. But if the other factions discover the deception, the fragile pact could shatter. He trusts you with the truth. What you do with it is your choice.`,

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 6: UNVEILING THE SHADOWS
  // ═══════════════════════════════════════════════════════════════════════════

  40: `[ARIA] The trail leads inward — toward the galactic core. Caelum, the Muscarian engineer whose genius has kept your ship alive through a dozen crises, installs prototype shield modifications that should protect against the intensifying radiation. "Should" being the operative word.

[NPC:caelum] "The core is not meant for organic travel. Radiation increases exponentially. Gravity wells shift unpredictably. And whatever sealed the shadow entity chose the core for a reason — it is the most hostile environment in the galaxy. Perfect for a prison."`,

  41: `[ARIA] The Precursors did not simply seal the shadow entity — they built an elaborate lattice of traps and barriers around its prison. Professor Thane, a xenoarchaeologist specializing in Precursor defense systems, has joined the expedition. His excitement is barely contained despite the danger.

[NPC:professor_thane] "Magnificent. Gravity mines the size of small moons, still active after untold millennia. These are automated defense systems designed to destroy anything approaching the seal. We need to understand their trigger mechanisms to find a safe path through."`,

  42: `[ARIA] Beyond the trap lattice, the Oracle waits — not as a voice or a presence, but as a physical manifestation. A structure of crystallized light hovers at the threshold of the core, ancient beyond reckoning. This is what the Oracle truly is: a Precursor construct, the last guardian of the seal.

[NPC:oracle] "You have come further than any organic species in ten thousand years. Beyond me lies the Primordium — the original construction that holds the seal. It was built to last forever. But forever is a long time, and the shadow has been patient. Come. See what remains."`,

  43: `[ARIA] The coalition mobilizes for a full-scale expedition to the Primordium. Ships from every faction converge on a staging planet near the core approach — the last habitable world before the radiation barrier. The logistics are staggering: fuel, weapons, food, medical supplies, all flowing through contested space.

[ARIA] The shadow entity is aware. Its constructs harry every convoy, probing for weakness. The combined fleet holds, but barely. Every shipment that arrives is a small victory. Every ship lost is a reminder of the stakes.`,

  44: `[ARIA] Miraen and Raxus present two weapon designs, each requiring massive quantities of cyrillium to construct. They cannot build both — there is not enough material or time.

[ARIA] Miraen's resonance disruptor works with the Primordium's natural frequencies, dismantling shadow constructs by destabilizing their dimensional anchors. It is elegant, surgical, and leaves the environment intact. Raxus's quantum annihilator is raw destructive power — a weapon that erases matter from existence in targeted zones. It is devastating, efficient, and leaves nothing behind.

[ARIA] The choice will determine not just how the coalition fights, but what kind of galaxy survives the fight.`,

  45: `[ARIA] The weapon is built. The fleet is assembled. The approach to the Primordium begins in earnest — and the ancient structure does not welcome visitors. Sentinel constructs, dormant for millennia, activate as your fleet enters their perimeter. They are not shadow entities — they are the Primordium's own immune system, unable to distinguish between friend and foe after ages of isolation.

[ARIA] Fighting through them feels wrong, like breaking down the door of a temple. But there is no other way in. The seal is weakening. The shadow presses from within. If the coalition does not reach the core heart in time, the seal will fail on its own.`,

  46: `[ARIA] The seal breaks. Not slowly, not gracefully — it shatters like glass, and the shadow pours out. Warships formed from compressed darkness materialize by the dozen. The sky fills with enemy signatures. Alarion's voice cuts through the chaos on the command channel.

[NPC:alarion] "All ships, this is High Sage Alarion. The seal has failed. The shadow is free. But we are here, and we are ready. Every species, every faction, every soul who answered the call — this is what we came for. Hold the line. Hold it for the galaxy."

[ARIA] The Battle for the Galaxy begins. Codex: 'The Last Stand.'`,

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 7: A NEW DAWN
  // ═══════════════════════════════════════════════════════════════════════════

  47: `[ARIA] The shadow is contained — for now. The weapon worked, driving the entity back into its dimensional prison while the Oracle reforged the seal. But the battle exacted a terrible price. Whole sectors lie in ruins. Stations drift dark and silent. The living bridges flicker with residual shadow energy.

[ARIA] The galaxy needs to know the extent of the damage before reconstruction can begin. Someone must survey the wreckage, count the losses, and bring back data the coalition can use to prioritize aid. That someone is you.`,

  48: `[ARIA] Miraen, the Muscarian ecologist who helped design the resonance disruptor, has a vision for renewal. She has identified a world devastated by shadow energy — its biosphere shattered, its atmosphere thinned. But beneath the destruction, the planet's mycelial substrate is still alive. With colonists and resources, it can be reborn.

[NPC:miraen] "This world is a wound. But wounds heal. We can accelerate the process. Plant colonists like seeds. Feed them. Water the soil with care. In a generation, this world will bloom again. It will be proof that we can undo what the shadow has done."`,

  49: `[ARIA] Kovax Prime, ever the pragmatist, sees reconstruction through the lens of economics.

[NPC:kovax] "Charity fills bellies for a day. Trade routes fill them forever. Half these routes are dead. Pirates, debris fields, collapsed infrastructure. We need to rebuild them — and we need to prove they are safe."

[ARIA] The first post-war caravan will be a symbol as much as a practical mission. If it arrives safely, confidence returns. If it fails, the fragile recovery could stall.`,

  50: `[ARIA] The wartime coalition was held together by necessity. Now, with the immediate threat contained, the question of permanent governance demands an answer. Valandor and Elenion — the philosopher and the diplomat — have been drafting proposals for a Galactic Council.

[ARIA] Three models have emerged. An open council where any species or faction can join and vote. A founding council limited to the species that fought in the Battle for the Galaxy, with expansion possible later. Or an advisory council where representatives counsel but a rotating executive makes decisions.

[ARIA] Each model has passionate advocates. And once again, your voice may be the deciding factor.`,

  51: `[ARIA] Caelum has been quiet since the battle — unusually so. The Muscarian engineer who once filled every silence with technical chatter has withdrawn into his workshop. When you find him, he is surrounded by Precursor fragments, his tools abandoned.

[NPC:caelum] "I kept us alive. My shields, my modifications, my weapons. But I also built a weapon that erased matter from existence. I looked at the shadow and built something that works the same way. What does that say about me?"

[ARIA] Caelum needs purpose. He wants to repurpose Precursor technology for healing rather than destruction — but he needs help gathering materials and investigating sites where Precursor constructs remain intact.`,

  52: `[ARIA] The secret weapons program still casts a shadow over the coalition — no pun intended. Raxus carries the weight of it visibly now, his usual martial confidence diminished. He requests a meeting, not in a war room or a command deck, but in a garden on the Star Seeker — Miraen's arboretum, where bioluminescent flowers bloom in eternal twilight.

[NPC:raxus] "I was wrong. The weapons helped us win. But the deception nearly cost us the alliance. I want to make it right. Help me build something that proves the Kalin can be trusted."`,

  53: `[ARIA] The day arrives. Representatives from every species, every faction, every world that survived the shadow war gather in the great hall of the newly constructed Council Chambers. The architecture blends Muscarian organic design with Kalin structural precision and Vedic ethereal aesthetics — a physical manifestation of unity.

[ARIA] High Sage Alarion stands at the central podium, his bioluminescent tendrils radiating a warm, steady gold. He looks older than when you first met him — the journey has aged him, as it has aged all of you. But his eyes burn with a hope that is neither naive nor fragile. It is hope forged in fire.

[NPC:alarion] "We built this Council not because peace is easy, but because war taught us it is necessary. Let this be our legacy: that when the darkness came, we chose the light."

[ARIA] Codex: 'The Galactic Council.'`,

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 8: LEGACY OF THE STARS
  // ═══════════════════════════════════════════════════════════════════════════

  54: `[ARIA] Elenion finds you in the observation deck, watching the stars. The diplomat who navigated impossible negotiations and held the coalition together through betrayal and battle looks genuinely happy for the first time since you met.

[NPC:elenion] "The Council has a title for people like you. Ambassador. Not a rank you earn through politics or birth — it is given to those who have proven, through action, that they speak for more than themselves."

[ARIA] The title comes with responsibility: a diplomatic tour of the galaxy, visiting every major settlement to represent the Council and listen to the needs of people rebuilding their lives.`,

  55: `[ARIA] The Oracle — diminished but still functional after reforging the seal — contacts you with a request. Residual Primordium energy lingers in pockets across the galaxy, left behind like echoes of the ancient structure's power. Some of these pockets are dangerous, leaking dimensional instability. Others could be harnessed as power sources, communication relays, or healing sites.

[NPC:oracle] "The Precursors built to last. Even their echoes have purpose. But they must be found, catalogued, and assessed before they can be used — or before they cause harm. You have walked further into the unknown than any organic being in recorded history. One more survey should not trouble you."`,

  56: `[ARIA] Miraen brings extraordinary news: the ancient Spore Network — the mycelial web that once connected every corner of the galaxy — is stirring. The battle at the Primordium and the energy released during the seal's restoration has sent resonant pulses through dormant fungal pathways. Nodes that have been dark for millennia are flickering back to life.

[ARIA] But they need help. Like seeds that need soil and water, the reawakening nodes need living organisms nearby and cyrillium to catalyze their growth. Miraen has identified two key planets with dense mycelial substrates — perfect candidates for colonization to anchor the network's rebirth.

[NPC:miraen] "This is what it was all for. The Network is not just infrastructure. It is the galaxy's nervous system. If we can bring it back, every world will be connected. Every voice will be heard."`,

  57: `[ARIA] Valandor's meditation chamber feels different today. The ethereal Vedic elder has always existed partially outside normal space, his form shimmering between dimensions. But now the shimmer is fading. He is becoming more transparent, not less substantial — as if he is spreading himself thinner across reality.

[NPC:valandor] "I am returning to the spaces between. The seal is restored, but it needs a guardian. The Oracle cannot do it alone. I will join the vigil — not as a prisoner, but as a sentinel. It is what I was always meant to do."

[ARIA] He offers you a parting gift. Three choices, each embodying a different aspect of Vedic wisdom.`,

  58: `[ARIA] Beyond the mapped galaxy lies the new frontier — sectors that no organic species has visited since the Precursors vanished. The reawakening Spore Network is reaching into these spaces, and the echoes coming back tell of wonders: uncharted worlds, exotic phenomena, and resources that could fuel the galaxy's growth for millennia.

[ARIA] But the frontier is not empty. Rogue Primordium sentinels — constructs that lost connection to the central intelligence during the shadow war — patrol these sectors on ancient standing orders. They attack anything they do not recognize, and after ten thousand years of isolation, they recognize nothing.`,

  59: `[ARIA] The galaxy is not an island. The reawakened Spore Network has detected signals from beyond — from other galaxies, other networks, other civilizations that the Precursors once communicated with. The Council authorizes humanity's first inter-galactic expeditions: small fleets venturing into the void between galaxies, guided by the Network's ancient pathways.

[ARIA] You are asked to escort the first two expeditions, establish a trade hub at the galaxy's edge to serve as a waystation, and colonize the last unoccupied habitable world before the great darkness between galaxies begins. It is the furthest any living being has traveled — and it is just the beginning.`,

  60: `[ARIA] High Sage Alarion meets you one last time in the observation deck of the Star Seeker — the same deck where your journey began with a mandate and a prayer. The old Muscarian looks out at the stars, and the stars look back through a galaxy transformed.

[ARIA] The Spore Network pulses with golden light, connecting worlds like neurons in a vast cosmic brain. Trade routes hum with activity. Colonies bloom on worlds that were lifeless a year ago. The shadow is sealed. The Council governs. And the frontier stretches beyond the galaxy itself.

[NPC:alarion] "When I first summoned you, I thought I was sending a pilot on an errand. I did not know I was sending the person who would save everything."

[ARIA] He places his hands on your shoulders — a Muscarian gesture reserved for the highest honor.

[NPC:alarion] "You are no longer a pilot, or an ambassador, or even a hero. You are a Keeper of the Stars. Guard them well."

[ARIA] The stars stretch in every direction, and every single one of them is yours to explore. Codex: 'Legacy of the Stars.'`,
};

export const COMPLETE_TEXTS: Record<number, string> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 5: THE QUEST FOR HARMONY
  // ═══════════════════════════════════════════════════════════════════════════

  32: "The siege is broken and the wreckage secured — but the unknown technology recovered from those dark-hulled ships raises questions that no one in the coalition can answer yet.",
  33: "Evidence delivered to Lyra Starwind; her preliminary analysis confirms alloys that predate every known civilization in the galactic record.",
  34: "Your testimony has been heard by all three faction leaders; the summit's direction now hinges on which voice carries the most weight.",
  35: "The coalition's governing structure is established — a decision that will echo through every political debate for generations to come.",
  36: "Shadow energy sites surveyed and the construct ambush survived; the Oracle's warning now resonates through every frequency on your ship.",
  37: "Precursor infrastructure located at the shadow's source; Archivist Thal's modified sensors have revealed the shape of the ancient seal — and its cracks.",
  38: "Supply convoys delivered and forward bases established; the coalition's logistics network holds firm against the gathering dark.",
  39: "The fragile pact endures, though the secret of the Kalin weapons program will shape the coalition's trust for years to come.",

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 6: UNVEILING THE SHADOWS
  // ═══════════════════════════════════════════════════════════════════════════

  40: "You have survived the approach to the galactic core; Caelum's shield modifications held, and the heart of the galaxy awaits.",
  41: "Ancient traps navigated and safe routes charted; Professor Thane's calculations have carved a path through defenses older than civilized memory.",
  42: "The Primordium stands revealed — a civilization beyond comprehension, dormant but not gone, its Oracle the last thread connecting past to present.",
  43: "The staging point is secured and the combined fleet holds its ground; the final approach to the core heart can begin.",
  44: "The weapon is chosen and powered; its nature will define not only the coming battle, but the kind of peace that follows.",
  45: "Primordium sentinels disabled and the path to the core heart cleared — the ancient guardians rest at last.",
  46: "The battle for the galaxy is won; the shadow is driven back, and the coalition fleet stands bloodied but unbroken among the stars.",

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 7: A NEW DAWN
  // ═══════════════════════════════════════════════════════════════════════════

  47: "Post-war damage survey complete; the scale of devastation is staggering, but the galaxy's needs are now catalogued and clear.",
  48: "Colony established on the devastated world; Miraen's spore cultures have already begun to glow in the dead soil.",
  49: "Trade routes restored and the first post-war caravan delivered safely; the galaxy's economic arteries are pumping again.",
  50: "The Council Charter is signed and the governing structure chosen; a new era of galactic governance begins today.",
  51: "Precursor technology repurposed for peace; Caelum's conversions prove that the tools of war can become the foundations of renewal.",
  52: "The rift with the Kalin is healed; Raxus's extended hand marks the beginning of a partnership built on choice, not necessity.",
  53: "The Galactic Council convenes for the first time — dawn breaks on a new era, and the galaxy listens.",

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 8: LEGACY OF THE STARS
  // ═══════════════════════════════════════════════════════════════════════════

  54: "The Ambassador's mantle is yours; ten sectors visited, ten communities reminded that they are not forgotten.",
  55: "Ancient echoes mapped and Primordium sites identified for repurposing — the true legacy of the Precursors was not destruction, but possibility.",
  56: "The Spore Network reborn; mycelial tendrils now span the galaxy, connecting every living world in a web of bioluminescent light.",
  57: "Valandor departs, his farewell gift chosen — four centuries of wisdom distilled into a single act of generosity.",
  58: "Twelve new sectors charted and rogue sentinels neutralized; the frontier is open, and the unknown awaits those brave enough to follow.",
  59: "The trade hub is built, the colony is founded, and the galaxy's edge is no longer the end — it is the beginning.",
  60: "Legacy. The stars remember, and so will everyone who comes after you.",
};
