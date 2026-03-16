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

  32: `[ARIA] An emergency broadcast cuts through every frequency on your comm array — raw, unencrypted, desperate. A Tar'ri outpost on the fringe of charted space is under attack. Sensor data streams across your console in jagged bursts: three waves of warships bearing down on a station built for commerce, not combat. The defenders are outgunned and they know it.

[ARIA] You drop out of cruise speed and the outpost materializes on your forward display. Weapons fire stitches the void in brilliant lines. The attacking ships are unlike anything in your database — dark iridescent hulls that seem to drink the starlight, weapon signatures that register as electromagnetic impossibilities. They move in perfect synchronization, as if guided by a single mind.

[NPC:alarion] "Pilot, we are receiving the same broadcast. Those weapon signatures do not match any known species. Defend the outpost — and if any of those ships are destroyed, recover what wreckage you can. We need to understand what we are facing."

[ARIA] The first wave is already inside the station's perimeter. You have seconds before they breach the docking ring. Whatever these things are, they fight to annihilate — no demands, no negotiations, no quarter. The outpost's shields flicker and die. It is time to earn your reputation.`,

  33: `[ARIA] The wreckage from the siege floats in a slow, glittering spiral around the outpost — shattered hull fragments trailing wisps of atmosphere and something else. A faint phosphorescence clings to the debris, pulsing in rhythms that remind you uncomfortably of breathing. Your cargo hold carries a dozen sealed containers of salvaged fragments, each one catalogued by material composition. The results are deeply strange.

[ARIA] Organic compounds woven into metallic alloy. Cyrillium, but corrupted — its crystalline lattice twisted into configurations your computer cannot model. Navigation logs encoded in a mathematical language that predates every known cipher. The trail of destruction leads backward through six sectors, each one containing traces of the attackers' passage: scorched sensor buoys, gutted relay stations, the cold husks of ships that simply stopped transmitting.

[ARIA] A scholar named Lyra Starwind has been requesting these fragments through every academic channel she can access. She operates from a research station near the Vedic border — independent, underfunded, brilliant.

[NPC:lyra] "I've studied every alloy database in the coalition archives. These composites don't match. They predate every known civilization by a factor I'm still trying to calculate. Bring me everything you've collected. And pilot — be careful. Whatever built those ships may still be watching the wreckage."`,

  34: `[ARIA] The Star Seeker hangs in neutral space — a point chosen for its emptiness, equidistant from every faction's borders. Three leaders have agreed to meet aboard her, and the tension radiating from the ship is almost palpable on sensors. An emergency summit, called by Alarion himself. You have been summoned as a witness — the pilot who fought at the outpost, who traced the wreckage, who saw the enemy firsthand.

[NPC:alarion] "Thank you for coming, pilot. Your testimony is the only firsthand account we have. The council needs to hear what you saw — not filtered through intelligence reports, but from someone who watched those ships tear through the outpost defenses like they were made of paper. Speak truthfully. What happens next depends on it."

[ARIA] In the war room, Commander Raxus paces like a caged predator. His staff officers have already drawn up strike plans. The Kalin see an enemy and their instinct is to hit first, hit hard, ask questions after the debris cools.

[NPC:raxus] "Every hour we spend talking is an hour they spend preparing. We know where the wreckage trail leads. I say we follow it with a battle fleet and burn whatever we find at the source."

[ARIA] In the meditation chamber, Valandor sits in perfect stillness. The Vedic elder's eyes are closed, but you can feel the weight of his attention like pressure against your temples.

[NPC:valandor] "The river does not defeat the stone by striking it, Commander. It defeats the stone by understanding its shape. We know nothing of this enemy. To strike blindly is to invite the void to swallow us."`,

  35: `[ARIA] The summit has reached its crucible. Three models of coalition governance sit before the assembled delegates, each one a mirror reflecting a different vision of the galaxy's future. Elenion, the Muscarian diplomat whose reputation for neutrality is the only reason all three factions agreed to this meeting, presides over the debate with the calm precision of a surgeon.

[NPC:elenion] "We will hear each proposal once, without interruption. Then the floor opens. I remind everyone present that what we decide here cannot be undone. The structure we choose will outlast every individual in this room."

[ARIA] The first model places the Muscarian Sporarchy at the center — a single governing body with the infrastructure and experience to coordinate the response. Efficient, proven, but requiring every faction to subordinate their military command to Muscarian authority. The second distributes power equally among all races — shared leadership with rotating command, slower to act but accountable to everyone. The third establishes a dedicated military command structure, divorced from any single faction, empowered to make tactical decisions without political approval.

[ARIA] Raxus favors the military command. Valandor argues for shared leadership. The Tar'ri delegates shift nervously, unwilling to surrender autonomy to anyone. And you — you stand at the center of it all, your testimony from the outpost still ringing in the chamber. Your voice carries weight here. The choice you advocate will tip the balance.

[NPC:elenion] "Pilot, the assembly recognizes your standing. You have seen the enemy. You have earned the right to speak. Which model do you support?"`,

  36: `[ARIA] Your sensors pick up the anomalies before you understand them. Four locations across the frontier, each one radiating an energy signature that defies classification — not electromagnetic, not gravitational, not psionic. Something between, something that exists in the gaps between the spectra your instruments were designed to measure. The readings make your navigation computer stutter and recalculate, as if the laws of physics are locally negotiable.

[ARIA] You investigate the first site and find nothing visible. Empty space. But your shield harmonics warble and distort, and the shadows on your console — cast by instrument lights that have not moved — shift. They shift toward something that is not there.

[ARIA] Then a voice fills your cockpit. Not through your comm system. Not through any system you can identify. It simply exists in the air, resonant and ancient, carrying the weight of millennia.

[NPC:oracle] "You are perceptive, small one. Most organics walk through the shadow and never feel its cold. I am the Oracle — the last construct of those who came before. The shadow has lurked for millennia, feeding on the spaces between stars, growing stronger as the barriers weaken. The ones who sealed it are gone. Their prison is failing. And the shadow is aware that you have noticed."

[ARIA] A construct of crystallized light shimmers at the edge of your sensor range — there and not there, visible only when you stop trying to look directly at it. The Oracle. The last guardian of a prison built by a civilization that predates all known life. And it has chosen to speak to you.`,

  37: `[ARIA] Archivist Thal is the oldest Vedic you have ever seen. His skin has the translucent quality of ancient parchment, and his eyes carry the particular weariness of someone who has spent centuries reading records that no one else considers important. He meets you at a research station so deep in Vedic territory that your navigation computer required three manual overrides to plot the course.

[NPC:archivist_thal] "The Oracle spoke to you. That alone tells me more than two hundred years of research. Here — take this sensor array. I modified it myself. Standard instruments cannot detect what we are looking for. The shadow exists in dimensional folds that conventional physics does not acknowledge. My modifications force the sensors to look sideways, as it were."

[ARIA] Thal's modified sensors paint the galaxy in colors you have never seen. Five sectors light up with faint, sickly luminescence — a web of shadow energy threaded through the void like veins of infection in living tissue. The pattern converges on a point deep in unexplored space, where your scanners reveal something massive: dormant Precursor infrastructure, sprawling and silent, older than any star in the sector.

[NPC:archivist_thal] "The Precursors built a seal — a barrier between dimensions. It has held for longer than most species have existed. But barriers erode. The shadow was patient. It had nothing but time. And now, pilot, time has run out. The infrastructure you see is the lock. Something on the other side is picking it."`,

  38: `[ARIA] Not every mission is a battle against ancient cosmic horrors. Some are far less glamorous, and far more essential. The coalition's supply lines stretch across dozens of sectors, and every convoy that fails to arrive means soldiers without ammunition, researchers without equipment, and colonies without food. The shadow's outriders have learned that breaking supply chains is more effective than breaking battle lines.

[ARIA] You are assigned to escort duty — running convoys through contested space, making sure the mundane work of logistics actually reaches its destination. Cargo containers of rations, medical supplies, replacement hull plating, and the thousand small necessities that keep a war effort from collapsing under its own weight.

[NPC:kovax] "Unglamorous work, pilot, but I have seen empires fall not from military defeat but from empty supply depots. Every container you deliver is a brick in the foundation. Every trade you complete funds another forward base. The coalition's strength is not measured in warships — it is measured in whether the soldiers inside those warships have eaten today."

[ARIA] The convoy routes are long and the hazards are real. Shadow constructs prowl the transit corridors, probing for weakness. But the work matters. Each successful run strengthens the network of forward bases that will serve as staging points for whatever comes next. The foundation must be laid before the structure can rise.`,

  39: `[ARIA] Commander Raxus contacts you on a private, encrypted channel — no coalition codes, no official headers. Just a Kalin warrior's voice, stripped of its usual bravado, speaking words that clearly cost him something to say.

[NPC:raxus] "Pilot, I need to speak with you. Not as a commander. As someone who trusts you. The Kalin weapons division has been running a covert program — reverse-engineering the alien technology from the outpost wreckage. Weaponizing it. I found out three days ago. This was not sanctioned by the coalition. It violates every agreement we signed."

[ARIA] The implications crash through your mind like detonation waves. The coalition is held together by trust — fragile, hard-won trust between species that were killing each other a generation ago. If the Kalin have been secretly weaponizing recovered technology, that trust shatters. But Raxus came to you. He could have buried it. He could have looked the other way and let the program continue in the shadows. Instead, he is standing in front of you, a warrior who has just confessed his people's dishonor.

[NPC:raxus] "I see two paths. We confront this publicly — lay it before the full coalition council, accept the consequences, demand accountability. Or we handle it quietly — I shut the program down from inside, no one else knows, the alliance survives intact but the lie festers. I have fought in wars, pilot. I know what betrayal costs. But I also know what public shame costs. I am asking you — which path do we walk?"`,

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 6: UNVEILING THE SHADOWS
  // ═══════════════════════════════════════════════════════════════════════════

  40: `[ARIA] The galactic core. Every pilot hears the stories in cantinas and cargo bays — the crushing radiation, the gravity wells that swallow light, the sectors where navigation is less science than prayer. No one goes to the core willingly. No one goes to the core and talks about it casually afterward.

[ARIA] Your course is plotted through ten sectors of increasingly hostile space. The radiation warnings on your console cycle from yellow to orange to a deep, angry red that you have never seen before. Caelum, the coalition's chief engineer, has fitted your ship with experimental shield modifications — layers of ablative plating interwoven with Vedic crystal resonators that should, in theory, deflect the worst of what the core throws at you.

[NPC:caelum] "Should. In theory. I want to be honest with you, pilot — no one has tested these modifications at core-level radiation intensities because no one has survived long enough to collect data. What I can tell you is that the math is sound and the engineering is the best I have ever done. The core is not meant for organic travel. Radiation increases exponentially with every sector you penetrate. If the shields fail, you will have approximately eleven seconds of consciousness. Make them count."

[ARIA] The first sectors are merely hostile. By the fourth, your hull temperature has doubled. By the seventh, your instruments begin reporting readings that contradict each other. By the ninth, the stars outside your viewport have shifted from white to blue to a color that has no name. The core awaits, indifferent to whether you survive the approach.`,

  41: `[ARIA] The Precursors did not build their infrastructure to be found. They built it to endure — and to punish anything that disturbed it. Four massive structures orbit the core's outer shell, each one bristling with defense mechanisms that have been operational for longer than most galaxies have existed. Gravity mines the size of small moons, dormant but armed. Energy fields that rearrange molecular bonds at the atomic level. Sensor mazes designed to trap ships in recursive navigation loops until their fuel runs dry.

[ARIA] Professor Thane, the coalition's lead xenoarchaeologist, is transmitting from a research vessel parked at what she assures you is a safe distance. Her voice carries the particular excitement of someone who has spent their entire career waiting for this moment and is too intellectually stimulated to be appropriately terrified.

[NPC:professor_thane] "Magnificent — absolutely magnificent! Gravity mines the size of small moons, still active after untold millennia. The engineering required to maintain autonomous systems for this duration is beyond anything in our theoretical models. Each trap is a masterpiece of defensive architecture. I am sending you safe-route calculations based on the energy decay patterns I have mapped. Follow them precisely. The Precursors designed these systems to be lethal to anything with a power signature, which unfortunately includes your ship."

[ARIA] Thane's calculations chart a narrow corridor through the trap field — a path defined not by open space but by the gaps between overlapping kill zones. One deviation, one miscalculation, and the Precursors' ancient guardians will treat you the same way they have treated every intruder for the last ten thousand years.`,

  42: `[ARIA] The core threshold. Beyond this point, the radiation is so intense that your shield modifications are operating at maximum capacity, their crystalline matrices glowing white-hot with the effort of keeping you alive. And then — stillness. A pocket of impossible calm in the heart of the galaxy's fury, as if something carved a sanctuary out of the chaos.

[ARIA] The Oracle is here. Not the flickering apparition from your earlier encounter, but a physical manifestation — a towering structure of crystallized light, intricate as a cathedral, humming with frequencies that resonate in your bones. It is beautiful in a way that makes your chest ache, a beauty that carries the weight of immeasurable age and purpose.

[NPC:oracle] "You have come further than any organic species in ten thousand years. I am impressed, though I confess impression is a sensation I experience only theoretically. What you see around you is the Primordium — the infrastructure of those who built me, who sealed the shadow, who departed when their work was done. They did not die. They chose to leave. The distinction matters."

[ARIA] Three Primordium structures orbit the calm zone — vast, dark, ancient beyond reckoning. Their surfaces are covered in patterns that shift when you look at them, as if the architecture itself is a language being spoken too slowly for organic minds to parse. The Oracle guides your approach, and with each structure you investigate, the story of a vanished civilization unfolds — a people who mastered the fundamental forces of reality and chose, in the end, to step beyond it.`,

  43: `[ARIA] The coalition fleet assembles in stages — a slow, grinding mobilization that strips garrison forces from a dozen sectors and concentrates them into the largest military formation the galaxy has seen since the Tendril Wars. Kalin dreadnoughts fly alongside Muscarian bioships. Tar'ri merchant cruisers, hastily refitted with weapons, slot into escort positions. Vedic meditation frigates project calming fields that keep the fleet's collective anxiety from boiling over.

[ARIA] You are assigned as a forward scout, threading through six sectors ahead of the main body, clearing the path and reporting threats. The shadow knows the fleet is coming. Constructs of dark energy materialize at every transit point — probing attacks designed to bleed the convoy, slow its progress, test its resolve. Each engagement costs ships, lives, and time the coalition cannot spare.

[NPC:alarion] "Every convoy that reaches the staging point is a victory. Every ship we lose is a cost we chose to pay because the alternative is to do nothing and watch the shadow consume everything we have built. Keep the lanes open, pilot. The fleet depends on pathfinders like you."

[ARIA] The staging planet is a barren world orbiting a red dwarf — chosen for its proximity to the core and nothing else. Five waves of shadow constructs descend on the planet as the fleet establishes its perimeter. The battle is brutal and unrelenting, fought in the kind of sustained close-quarters combat that turns hours into eternities. But the fleet holds. The staging point is secured. The final approach can begin.`,

  44: `[ARIA] In a sealed chamber aboard the coalition flagship, two prototypes sit on opposing workbenches, each one representing a fundamentally different philosophy of destruction. Thirty units of refined cyrillium — the coalition's most precious strategic resource — have been allocated to power whichever weapon the council selects. The choice falls to you.

[ARIA] Miraen's resonance disruptor sits on the left bench — elegant, almost organic in its construction, designed to interfere with the shadow entity's dimensional anchoring frequencies. It is surgical, precise, and built to minimize collateral damage to the surrounding space-time fabric. Miraen speaks of it the way a healer speaks of a scalpel.

[NPC:miraen] "The disruptor works with the galaxy, not against it. It targets the shadow's connection to our dimension and severs it cleanly. The ecological impact is minimal. The space around the target remains habitable. We fight the shadow without becoming the shadow."

[ARIA] Raxus's quantum annihilator occupies the right bench — brutal, efficient, and radiating a contained fury that makes the air around it taste of ozone. It is designed to overwhelm the shadow with raw destructive force, collapsing its dimensional pocket through sheer energetic violence.

[NPC:raxus] "Miraen's toy is elegant. I will grant her that. But elegance is a luxury when you are fighting for survival. The annihilator ends the threat. Permanently. Completely. The collateral damage is real, but so is losing this war. The choice will determine what kind of galaxy survives — one that was precise, or one that was thorough."`,

  45: `[ARIA] The Primordium sentinels activate as the fleet approaches the core heart — massive constructs of ancient technology, neither alive nor dead, responding to the intrusion with the methodical precision of an immune system identifying a pathogen. They are not shadow entities. They are the Precursors' own defense network, unable to distinguish between the threat they were built to contain and the organic species trying to reach it.

[ARIA] Five sentinels block the approach corridor, each one the size of a capital ship, their weapons cycling through energy spectra that your defensive systems struggle to classify. Fighting through them feels wrong — like breaking down the door of a temple, like destroying something sacred to reach something necessary. These constructs have guarded the core for longer than your species has existed. They are doing exactly what they were built to do.

[NPC:alarion] "I understand the hesitation, pilot. I feel it too. These are not our enemies — they are the last guardians of a civilization that sacrificed everything to protect the galaxy from the shadow. But they cannot tell us apart from the threat, and we cannot explain our purpose to machines that stopped listening ten thousand years ago. Disable them as gently as you can. Honor what they were."

[ARIA] The core heart pulses beyond the sentinel line — a rhythmic throb of energy that you can feel in the bones of your ship. Whatever waits inside has been waiting for a very long time. The sentinels will not let you pass willingly. But willing or not, you must reach the heart before the shadow breaks free entirely.`,

  46: `[ARIA] The battle begins without preamble. Eight warships — shadow constructs grown to capital-ship scale, their iridescent hulls crackling with dimensional energy — materialize around the coalition fleet in a pattern designed to divide and destroy. The void erupts in weapons fire so intense that your sensors white out for three full seconds before recalibrating.

[ARIA] This is the battle the entire campaign has been building toward. Every alliance forged, every supply convoy escorted, every political compromise endured — all of it narrowing to this point in space, this moment in time, where the galaxy's future is decided by fire and will.

[NPC:alarion] "All ships, all frequencies. This is Alarion aboard the Star Seeker. What we do in the next hour determines whether our children inherit a galaxy or a graveyard. Fight for everything you love. Fight for everyone who cannot fight for themselves. And when this is over, I want to buy every one of you a drink. Star Seeker, engaging."

[ARIA] The first phase is chaos. The second is survival — a counterattack so massive it bends the local fabric of space-time, shadow energy pouring through dimensional rifts in quantities that overload your sensors. The third is the stand. The command station, the fleet's nerve center, comes under direct assault. If it falls, coordination collapses and the fleet dies in pieces. You are the last line. The galaxy watches, though it does not know it. Everything you have done has led to this.`,

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 7: A NEW DAWN
  // ═══════════════════════════════════════════════════════════════════════════

  47: `[ARIA] The silence is the first thing you notice. After weeks of constant combat — the shriek of weapons fire, the thunder of hull impacts, the desperate chatter of tactical channels — the silence feels alien. Wrong, almost. Your hands keep drifting to the weapons console before you remember there is nothing left to shoot.

[ARIA] The coalition command has tasked you with surveying the aftermath. Eight sectors of space that served as the battleground, each one scarred in ways that defy easy description. Debris fields stretch across millions of kilometers — fragments of coalition ships tangled with the dark remnants of shadow constructs, still faintly phosphorescent, still faintly warm. Beacons pulse in the void, marking the locations of escape pods that may or may not still contain survivors.

[ARIA] You fly through the wreckage slowly, your scanners cataloguing damage with clinical precision while your mind tries to process the scale of what happened here. Entire sectors will need to be rebuilt. Trade routes rerouted. Colonies resupplied. The war is won, but the cost is written across five sectors of devastated space in a language anyone can read. Your mission is simple: look at everything. Record everything. Report what the galaxy needs to heal.`,

  48: `[ARIA] The planet below was green once. You can see it in the soil composition readings — rich loam layered with organic compounds that suggest forests, grasslands, a thriving biosphere. The shadow's passage reduced it to ash-gray desolation, a world sterilized by dimensional energies that killed everything larger than a bacterium.

[ARIA] Miraen stands at the airlock of the colony transport, two hundred colonists behind her, looking down at the devastation with an expression that is equal parts heartbreak and fierce determination. In her hands she holds a sealed container of Muscarian spore cultures — the biological foundation for ecological reconstruction.

[NPC:miraen] "Everyone sees destruction. I see possibility. This soil is not dead — it is dormant. The shadow killed the surface, but the substrate remains. With the right cultures, the right nutrients, the right patience, this world will breathe again. It will not be what it was. It will be something new. And that is not tragedy — that is how life works. It falls. It rises. It adapts. Bring me food supplies for the colonists. We will feed the people while we feed the planet."

[ARIA] The colonists file out of the transport in silence, their faces reflecting the gray landscape. But Miraen is already kneeling in the dust, pressing spore cultures into the dead earth with her bare hands, murmuring to the soil in the old Muscarian tongue. Where her hands touch, a faint bioluminescence begins to glow.`,

  49: `[ARIA] The first post-war trade caravan assembles at the coalition's central depot — a ragtag collection of merchant vessels, some still bearing the scars of combat retrofitting, their weapon mounts hastily replaced with cargo racks. Commerce is not glamorous in the aftermath of galactic war. It is essential. Every unit of food, every cylinder of cyrillium, every crate of medical supplies that moves from where it is abundant to where it is needed represents a galaxy choosing to live rather than merely survive.

[NPC:kovax] "Pilot, I have traded through three economic collapses, two currency crises, and a civil war. The aftermath is always the same — everyone needs everything, no one has anything, and the traders who show up first write the rules for the next century. This is not charity. This is the foundation of the new economy. Every route we establish, every trade we complete, becomes a precedent. We are drawing the arteries of a new galaxy. Let us make sure the blood flows where it is needed."

[ARIA] You run escort for the caravan, your weapons systems powered up but your heart lighter than it has been in months. Shadow constructs no longer prowl the transit corridors. The void between stations is just void again — empty, cold, and blessedly safe. Merchants wave to each other across comm channels. Dock workers cheer as the first supplies arrive. Hope, it turns out, travels at the speed of commerce.`,

  50: `[ARIA] The council chambers are newly constructed — built from salvaged hull plating and Vedic crystal, a deliberate fusion of practicality and beauty. Three factions sit around a circular table: Muscarian, Vedic, Kalin, with Tar'ri observers seated along the gallery above. The air hums with the quiet tension of history being written in real time.

[ARIA] Valandor arrives first, his ancient frame moving with the slow deliberation of someone who measures time in centuries rather than minutes. He speaks of governance not as a mechanism but as a living thing — an organism that must be allowed to grow, adapt, and occasionally be pruned.

[NPC:valandor] "A council is not a machine, pilot. It is a garden. Plant it with wisdom, water it with patience, and it will bear fruit that nourishes generations. Plant it with fear, and it will grow thorns that tear at everything it touches. What we build today must be strong enough to endure and flexible enough to bend."

[ARIA] Elenion follows, spreading charter documents across the table with the practiced efficiency of a diplomat who has drafted more treaties than most species have fought wars.

[NPC:elenion] "Three models, pilot. Open council — any faction, any species, one voice, one vote. Founding members — the four races that fought the shadow, governing by earned right. Or an advisory body — recommendations without enforcement, preserving sovereignty. Each model has merits. Each has costs. The galaxy is watching. Choose wisely."`,

  51: `[ARIA] Caelum's workshop is a controlled explosion of half-finished projects, disassembled Precursor components, and engineering diagrams pinned to every available surface. The coalition's chief engineer has not slept in what appears to be several days, but the light in her eyes suggests this is by choice, not necessity. She has found something.

[NPC:caelum] "Pilot, look at this. The Precursors' weapons technology — the systems we fought through at the core — they are not just weapons. The underlying architecture is transformative. The same energy matrices that powered their gravity mines can stabilize tectonic faults. The same resonance frequencies that disrupted our shields can purify contaminated water tables at a planetary scale. I have been converting their designs, stripping out the destructive applications and repurposing the core principles. Bring me twenty units of tech components and I will show you what peace looks like when it is built on the bones of war."

[ARIA] Three Precursor sites have been identified for peaceful repurposing — installations where the ancient technology can be redirected from destruction to creation. Caelum's modifications are elegant, almost poetic in their simplicity: the same forces that once annihilated are now calibrated to heal, to build, to sustain. The irony is not lost on anyone. The Precursors built weapons to protect the galaxy. Now their weapons will rebuild it.`,

  52: `[ARIA] Raxus meets you at a neutral station — not a coalition facility, not a Kalin outpost, but a battered trading post on the edge of contested space. The location is deliberate. He did not want this meeting on anyone's territory. He wanted neutral ground, where rank and faction mean nothing and two people can speak as equals.

[ARIA] The Kalin commander looks different. The rigid posture has softened, not from weakness but from something harder to name. The weapons that were never far from his hands are holstered and clasped. His eyes, always sharp, carry a new quality — not vulnerability exactly, but openness. The willingness to be seen without armor.

[NPC:raxus] "I have spent my entire career preparing for war. I was good at it. I understood enemies. I understood threat assessment. I understood acceptable losses. What I did not understand — what I am only now beginning to understand — is that the hardest battle is the one you fight after the war is over. Building something. Trusting someone. I was wrong about many things, pilot. I was wrong about the coalition, wrong about diplomacy, wrong about what strength looks like. I would like to build something with you now. A joint outpost. Kalin and coalition, working together. Not because we have to — because we choose to."

[ARIA] He extends his hand. It is not a gesture the Kalin make lightly. Among his people, an open hand means more than friendship — it means shared fate.`,

  53: `[ARIA] The council chambers are full for the first time. Every seat occupied, every gallery packed, every comm channel open to every corner of the coalition's territory. The inaugural session of the Galactic Council — the governing body that will shape the post-war galaxy — is about to begin.

[NPC:alarion] "Pilot, before we enter — I want you to know something. When this started, when the first reports of shadow attacks came through, I did not believe we could do this. Unite the factions. Fight an enemy older than our species. Survive. I was wrong, and I have never been happier to be wrong. What happens in that chamber today — the debates, the votes, the compromises — that is the future being born. And you helped build it. Whatever title they give you, whatever role you serve, remember that. You were here at the dawn."

[ARIA] The doors open. Alarion steps to the central podium, and the chamber falls silent with a completeness that seems to bend the air itself. Every delegate, every observer, every translator and aide and attaché — all of them watching, all of them waiting, all of them aware that this moment will be remembered long after everyone in the room has turned to dust. The first words of the Galactic Council echo through the chamber and out across the stars, carried by every relay and every broadcast frequency the coalition commands. A new era begins, not with a battle cry, but with a gavel's fall.`,

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER 8: LEGACY OF THE STARS
  // ═══════════════════════════════════════════════════════════════════════════

  54: `[ARIA] The ceremony is modest by diplomatic standards — no fanfare, no parade, just a quiet room aboard the council station and a title that carries more weight than any weapon you have ever held. Ambassador. The word sits strangely on your shoulders, heavier than you expected, lighter than you feared.

[NPC:elenion] "The title of Ambassador is not given lightly, pilot. In the history of the coalition, fewer than a dozen beings have held it. You will be the voice of the council in sectors where the council has no presence. You will negotiate, mediate, and when necessary, make decisions that cannot wait for committee approval. The galaxy is rebuilding, and it needs someone who has seen both the worst it can offer and the best it can become. I believe you are that person. Do not make me regret this assessment."

[ARIA] Your first assignment takes you across ten sectors — a diplomatic tour of the post-war galaxy. You visit rebuilt stations and new settlements, meet with local leaders and grassroots organizers, listen to grievances and celebrate recoveries. The ambassador's mantle is not about authority. It is about presence. Showing up. Being seen. Reminding every corner of the galaxy that the council exists, that it cares, that the sacrifices made in the war were not forgotten. Every handshake is a promise. Every conversation is a thread in the fabric of the new order.`,

  55: `[ARIA] The Primordium left more than weapons and traps. In the quiet aftermath of the war, as the galaxy's attention turned to rebuilding, faint signatures began appearing on deep-space scanners — energy patterns that match Precursor technology but carry none of its hostile intent. Echoes of a civilization that chose to depart rather than destroy, leaving behind tools that were never meant for war.

[ARIA] The Oracle's voice reaches you across lightyears, thin and fading, like a candle guttering in a draft that has blown for millennia.

[NPC:oracle] "The Primordium built more than prisons and weapons, Ambassador. They built gifts. Seeds of knowledge embedded in the fabric of spacetime, waiting for a civilization wise enough to deserve them. You have proven your worth. The shadow is contained. Now — inherit what we left for those who came after. Scan the sectors I will mark for you. The signatures are faint. The sites are hidden. But they are there, and they are waiting."

[ARIA] Eight sectors glow faintly on your enhanced scanners — traces of Precursor energy signatures woven into the galactic background radiation like watermarks in paper. Four of the sites can be repurposed: research installations, energy generators, communication arrays built on principles that dwarf current technology. The Primordium's true legacy was not the prison they built around the shadow. It was the possibility they seeded across the galaxy for whoever survived to find.`,

  56: `[ARIA] The Mycelial Network — the ancient web of bioluminescent connections that once linked every corner of the galaxy — has been dormant for longer than anyone can measure. But dormant is not dead. The war disturbed something deep in the galactic substrate, and now the network is stirring, sending tendrils of pale light through the void like roots seeking water after a long drought.

[ARIA] Miraen stands aboard her research vessel, her instruments painting a picture of galactic-scale reactivation. Her voice trembles with the particular emotion of a scientist watching a lifetime of theory become reality.

[NPC:miraen] "It is happening, Ambassador. The network is waking up. But it needs anchors — living worlds with active biospheres that can serve as nodes. I have identified two planets with the right substrate for mycelial colonization. We need colonists, we need cyrillium to power the catalytic resonators, and we need you to confirm the reactivation across six sectors. If this works — and I believe with everything I am that it will — the network will span galaxies. Every living world connected. Every ecosystem linked. Life, talking to life, across distances that light takes centuries to cross."

[ARIA] The first colony ship descends through clouds of spore-light, the atmosphere itself glowing as the mycelial network responds to the presence of living beings. Beneath the colonists' feet, bioluminescent tendrils spread through the soil like lightning captured in slow motion. The network remembers what it was. And it is becoming something new.`,

  57: `[ARIA] Valandor meets you for the last time in a garden he has grown aboard the council station — a small enclosure of Vedic crystal trees and luminous moss, tended with the patience of someone who understands that the most important things cannot be hurried. He looks older than when you first met, though with the Vedic, age is measured in wisdom rather than years.

[NPC:valandor] "I am departing, Ambassador. Not dying — the Vedic do not use that word. Transitioning. The crystal matrices of Prisma call to their children when the time comes, and I have heard their song for some time now. I wanted to see the council established before I answered. I wanted to know the galaxy was in good hands. It is."

[ARIA] He gestures to three objects arranged on a crystalline pedestal — his farewell gifts, offered with the quiet gravity of someone distributing the accumulated wealth of centuries.

[NPC:valandor] "A crystal matrix, attuned to your consciousness — it will expand your sensor range beyond anything technology alone can achieve. Star charts, drawn from my own travels across four centuries of exploration — routes and shortcuts that exist in no database. Or — you may decline both, and I will instead speak your name to the leaders of every faction, commending your service and your wisdom. My endorsement carries weight, Ambassador. His gift is not an object — it is understanding. Choose what serves the galaxy, not what serves you."

[ARIA] The garden is silent except for the faint chime of crystal leaves in recycled air. Valandor watches you with eyes that hold four hundred years of starlight. This is his farewell, and he has chosen to spend it with you.`,

  58: `[ARIA] Beyond the edge of the map — past the last charted sector, past the furthest relay beacon, past the point where your navigation computer stops offering suggestions and starts offering prayers — the universe continues. Twelve sectors of unexplored space stretch before you, unmapped and unnamed, carrying the particular electric thrill of genuine terra incognita.

[ARIA] Your sensors paint the unknown in broad, uncertain strokes. Energy signatures that do not match any known classification. Stellar formations that suggest gravitational influences from objects your instruments cannot detect. And amid the wonder, three rogue Primordium sentinels — ancient guardians drifting far from their original posts, their targeting systems degraded by millennia of isolation, firing on anything that enters their proximity with the blind fury of watchdogs that have forgotten what they were guarding.

[ARIA] The new frontier is not safe. It was never going to be safe. But it is vast and beautiful and absolutely, terrifyingly unknown. Every sector you chart is a gift to every pilot who will follow. Every sentinel you disable opens a corridor that future explorers will fly through without knowing the cost. This is what the ambassador's mantle means in practice — not speeches and ceremonies, but flying into the dark so that others can follow in the light.`,

  59: `[ARIA] The inter-galactic expedition launches from the coalition's primary starport — the largest fleet assembled for peaceful purposes in recorded history. Explorers, scientists, traders, diplomats, and colonists from every faction, packed into ships that range from sleek Vedic scouts to massive Tar'ri cargo haulers to Kalin heavy transports armored against threats that may or may not exist beyond the galactic rim.

[ARIA] You fly at the expedition's head, the title of Keeper still new enough to feel like a borrowed coat. Behind you, fifty units of trade goods destined for a hub that does not yet exist, carried by merchants who are betting their livelihoods on the faith that commerce follows exploration the way rivers follow gravity.

[ARIA] The edge planet is a jewel — temperate, water-rich, orbiting a stable yellow dwarf at the precise distance that makes a world kind to carbon-based life. Three hundred colonists descend through its atmosphere in a controlled scatter, their landing craft touching down across a continent that has never known the weight of a footprint.

[NPC:kovax] "This is where the next chapter begins, Keeper. A trade hub at the galaxy's edge, a colony on a world that has never been named. You brought us here. You opened the door. Now — let us build something worth the journey."

[ARIA] The first structures rise against an alien sunset, their foundations sunk into soil that smells of copper and rain. Behind you, the galaxy glitters with the lights of a thousand civilizations. Ahead, the universe stretches into infinity, patient and waiting.`,

  60: `[ARIA] Alarion meets you one last time aboard the Star Seeker — the ship where this journey began, where an emergency summit brought together leaders who could barely stand to be in the same room, where the coalition was born in argument and desperation and stubborn, irrational hope.

[ARIA] The ship is quieter now. The war room has been converted to a memorial hall, its tactical displays replaced with the names of every pilot, soldier, and civilian lost in the shadow war. The meditation chamber where Valandor once sat in crystalline stillness now holds a garden of bioluminescent moss — his final gift to the vessel.

[NPC:alarion] "Keeper of the Stars. That is your title now, and it is not honorary. You kept them, pilot. When the shadow came for the galaxy, you kept the stars burning. When the factions tore at each other, you kept the alliance together. When the war ended and the hard, unglamorous work of rebuilding began, you kept showing up. I have known warriors and diplomats and leaders of every species, and I tell you now — what you did was harder than any battle. You chose, over and over, to believe that this galaxy was worth saving. And you were right."

[ARIA] Through the viewport, the galaxy turns slowly — a spiral of light and life and possibility, scarred by war and already healing, threaded with the pale blue glow of a reborn Mycelial Network. You have crossed it end to end. You have fought for it, bled for it, built upon it. Somewhere out on the frontier, colonies are rising. Trade routes are humming. The council convenes. The network grows. And the stars — your stars — burn on.`,
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
