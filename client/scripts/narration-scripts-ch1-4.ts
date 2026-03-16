// ══════════════════════════════════════════════════════════════
// STORY MISSIONS — Chapters 1-4 (M5-31)
// Accept, Complete, and Codex narration scripts with voice tags
//
// Voice tags:
//   [ARIA]          — narrator (scene-setting, descriptions)
//   [NPC:alarion]   — High Sage Alarion
//   [NPC:valandor]  — Valandor, Vedic elder scholar
//   [NPC:raxus]     — Commander Raxus, Kalin military
//   [NPC:kovax]     — Kovax Prime, Tar'ri trade delegation
//   [NPC:miraen]    — Miraen, Muscarian chief ecologist
//   [NPC:elenion]   — Elenion, Muscarian diplomat
//   [NPC:caelum]    — Caelum, ship engineer
//   [NPC:oracle]    — The Oracle
//   [NPC:lyra]      — Lyra Starwind, archaeologist
//   [NPC:shade]     — Shade, shadowy informant
//   [NPC:viper_nox] — Viper Nox, Syndicate operative
// ══════════════════════════════════════════════════════════════

export const STORY_ACCEPT_TEXTS: Record<number, string> = {
  // ═══════════════════════════════════════════════════════════
  // CHAPTER 1: CALL OF DESTINY (M5-8)
  // ═══════════════════════════════════════════════════════════

  5: `[ARIA] High Sage Alarion's summons arrives on a priority channel, his bioluminescent sigil pulsing with the amber urgency reserved for matters of species survival. You have been chosen — not for your rank, but for what Miraen reported: your ship resonated with the Spore Network in ways no other vessel has.

[ARIA] Aboard the Star Seeker, the bridge is a cathedral of living architecture. Fungal buttresses arc overhead, their surfaces rippling with soft phosphorescence. Alarion stands at the central dais, his ancient tendrils swaying with the slow gravity of deep thought. Behind him, holographic projections show Agaricalis's sun — a seething, collapsing mass that has perhaps months left before it devours the inner worlds.

[NPC:alarion] "The exodus cannot wait. But the Star Seeker's departure drives require cyrillium — refined crystal that channels the energy of living systems. Without it, we remain trapped in the gravity well of a dying star. You have proven yourself resourceful. Now prove yourself essential."`,

  6: `[ARIA] The Star Seeker's engines hum with freshly loaded cyrillium, but not everyone accepted the exodus. Entire communities chose to stay — to die with Agaricalis rather than face the unknown. Some of those who stayed have turned desperate, forming scavenger bands that prey on departing ships, stripping them of supplies and fuel.

[ARIA] The departure corridor is a gauntlet. Agaricalis's swollen sun fills the viewport with angry crimson light, casting long shadows across debris fields left by ships that did not make it. Your sensors scream warnings as scavenger signatures converge on your position.

[NPC:caelum] "Shields are holding, but we cannot fight and run at the same time. Choose quickly."

[ARIA] Behind you, the Star Seeker begins its ponderous acceleration away from the only home the Muscarians have ever known. There is no going back.`,

  7: `[ARIA] As the fleet clears the departure corridor, Miraen requests one final act before Agaricalis is lost forever: a comprehensive scan of the dying star. The radiation patterns contain millennia of stellar evolution data — information that could help other civilizations predict and survive their own stellar collapses.

[NPC:miraen] "This is our gift to the galaxy. We could not save our world, but we can ensure its death teaches others to save theirs."

[ARIA] Three sectors around the star's corona must be scanned, each requiring your ship to endure punishing radiation bursts. Caelum reinforces the hull plating and mutters prayers to engineering gods you are fairly certain he invented. The scans are dangerous, but the data is irreplaceable — once the star collapses, this knowledge dies with it.

[ARIA] But the data is also powerful. The Vedic civilization, whose scouts have been observing from a distance, have expressed interest. Sharing could build bridges with a potential ally. Keeping it classified preserves a strategic advantage. The choice will be yours.`,

  8: `[ARIA] The Star Seeker carves a luminous trail through uncharted space, its mycelial drives leaving a faint bioluminescent wake that your instruments can follow. Five sectors of unknown territory lie between the fleet and its first waypoint — a region of gravitational stability where the convoy can regroup and take stock.

[ARIA] As you travel, the weight of what has happened settles over the fleet like a funeral shroud. Agaricalis is gone. The great fungal forests, the bioluminescent caverns, the singing spore-fields at twilight — all of it consumed by a dying star. An entire world reduced to memory.

[NPC:elenion] "We are not refugees. We are seeds. Carried on the stellar wind to take root in new soil. The Spore Network once connected every corner of this galaxy. We will find it again, and when we do, we will grow."

[ARIA] The fleet answers with a chorus of running lights — every ship flickering its externals in the Muscarian gesture of solidarity. You are no longer alone in the dark.`,

  // ═══════════════════════════════════════════════════════════
  // CHAPTER 2: THE VEDIC ENIGMA (M9-16)
  // ═══════════════════════════════════════════════════════════

  9: `[ARIA] Three weeks into the voyage, the fleet's long-range sensors detect something that should not exist: a stable gravitational anomaly radiating energy in patterns that match no known stellar phenomenon. Miraen's analysis suggests it could be a wormhole — a folded corridor through spacetime that would cut years off the journey.

[ARIA] But wormholes are theoretical. The Muscarians have never encountered one, and the Spore Network's ancient records are fragmentary at best.

[NPC:caelum] "Only one way to find out. Scan it from every angle. If it is stable, we go through. If it is not, we go around — and add six months to the journey."

[ARIA] He taps a wrench against his palm, already running numbers. Five sectors must be scanned to map the anomaly's gravitational profile and determine whether the fleet can survive the crossing.`,

  10: `[ARIA] Your scans confirm the impossible: a stable wormhole, its event horizon shimmering like oil on water. The aperture is wide enough for the Star Seeker, but the gravitational shear at the throat would tear an unprepared vessel to atoms.

[NPC:caelum] "I have recalibrated the shields to compensate. But I make no promises."

[ARIA] The wormhole's interior is a cathedral of warped light. Spacetime folds around your ship like origami, and your instruments go haywire — compass spinning, chronometer stuttering, hull sensors reporting temperatures that range from absolute zero to the surface of a star in the span of a heartbeat.

[ARIA] Something moves in the distortion. Energy constructs — shapes that are almost biological, almost mechanical — materialize from the gravitational turbulence, drawn to your ship's electromagnetic signature like moths to a flame. Whether they are guardians, parasites, or simply echoes of the wormhole's creation, they are hostile. You must survive the crossing.`,

  11: `[ARIA] The wormhole deposits you in a region of space that feels fundamentally different. The stars here are older, their light carrying a warmth that suggests long stability. And you are not alone. A vessel of extraordinary elegance hangs in the void — its hull inscribed with geometric patterns that shift and rearrange as you watch, as if the ship itself is thinking.

[ARIA] A hail arrives, not on any standard frequency but through a harmonic resonance that makes your ship's hull vibrate like a tuning fork. The message resolves into a face: ancient, serene, with eyes that hold the patience of geological time.

[NPC:valandor] "We have been watching the wormhole for centuries. We did not expect fungi to emerge from it."

[ARIA] There is amusement in his voice, but no condescension.

[NPC:valandor] "Come. We have much to discuss about the nature of the web you carry within your ships."`,

  12: `[ARIA] Valandor does not simply offer alliance — the Vedic do not operate that way. Trust must be earned through understanding, and understanding must be demonstrated through interpretation. He invites you aboard his vessel, a floating library where knowledge is stored not in data banks but in crystalline lattices that sing when touched.

[ARIA] Three artifacts rest on a pedestal of woven light. Each is ancient beyond reckoning — predating the Vedic civilization itself, perhaps predating the Spore Network. Their surfaces shift between states: solid, liquid, energy, and something your instruments cannot classify. They hum with residual power.

[NPC:valandor] "Tell me what you see. Not with your instruments — with your understanding. Are these tools of creation, built to nurture life across the cosmos? Or instruments of defense, designed to shield civilizations from existential threats? Your answer will tell me whether your people see the universe as a garden to be tended or a fortress to be defended. Neither answer is wrong — but both have consequences."`,

  13: `[ARIA] The Vedic have revealed that cyrillium — the crystal the Muscarians use to fuel their mycelial drives — exists in abundance in this region of space. But the deposits are deep, woven into the fabric of asteroid fields and planetary crusts in patterns that suggest they were placed deliberately.

[NPC:miraen] "Cyrillium is not a natural mineral. It is a byproduct of the Spore Network's growth — crystallized mycelial energy. Wherever we find cyrillium, we find traces of the old network. And wherever we find the old network, we find clues about who built it and why it fell silent."

[ARIA] Her tendrils quiver with excitement as the data streams across her instruments. The geological survey will require scanning multiple sectors with specialized equipment. Once the richest veins are located, you must extract samples and deliver them to Miraen's laboratory aboard the Star Seeker.`,

  14: `[ARIA] Diplomacy moves on many legs, and commerce is the steadiest. Valandor has arranged for Vedic crystal merchants to open limited trade with the Muscarian fleet — a gesture of goodwill, but also a test. The Vedic want to see how the Muscarians conduct business: fairly, or exploitatively.

[ARIA] Vedic crystals are remarkable. Unlike cyrillium, which channels biological energy, Vedic crystals store information — memories, calculations, even emotions encoded in their lattice structure. A single crystal the size of your fist can hold the collected wisdom of a Vedic scholar's entire lifetime. They are priceless to the Vedic and fascinating to the Muscarians.

[ARIA] Twenty units must change hands to formalize the trade agreement. Elenion has emphasized that the prices you accept and the manner in which you negotiate will shape how the Vedic perceive the entire Muscarian species. No pressure.`,

  15: `[ARIA] Valandor's demeanor has changed. The serene patience is gone, replaced by something you have not seen in the elder scholar before: urgency. He shares intelligence that the Vedic have kept classified for centuries — something is stirring in the outer regions of explored space. Communications have gone dark across multiple Vedic outposts. Ships have vanished without distress signals.

[NPC:valandor] "We do not know what it is. But we know it is not natural. And we know it is getting closer."

[ARIA] A Vedic data caravan — three vessels carrying archived knowledge from the threatened outposts — must be escorted to safety. The caravan's cargo is irreplaceable: the collective memory of Vedic settlements that may already be lost. Valandor trusts you with this because you have proven yourself. Do not make him regret it.`,

  16: `[ARIA] Valandor's warning has set the fleet on edge, but it has also provided a destination. The Vedic charts show a boundary — the edge of their explored space — beyond which lies what they call the Calvatian Expanse. An entire galaxy, unmapped and unknown, connected to Vedic space by a narrow corridor of stable spacetime.

[ARIA] The Vedic have never crossed the boundary. Their philosophy counsels patience, observation, study. But the Muscarians are not Vedic. You are a species without a homeworld, driven by necessity and guided by a network of ancient fungal threads that seems to lead deeper into the unknown.

[ARIA] As your ship reaches the boundary marker — a Vedic beacon that has stood for ten thousand years — you see it: the Calvatian Galaxy, a spiral of silver and gold light stretching across the viewport like a promise. Whatever drove the Vedic outposts dark is behind you. Whatever waits in Calvatia is ahead. The only way is forward.`,

  // ═══════════════════════════════════════════════════════════
  // CHAPTER 3: THE CALVATIAN ODYSSEY (M17-24)
  // ═══════════════════════════════════════════════════════════

  17: `[ARIA] The Calvatian Galaxy is nothing like Agaricalis's home cluster. The stars burn hotter, the nebulae glow with colors your instruments struggle to classify, and the Spore Network's pulse — that constant companion since your first launch — has changed. It is stronger here. Faster. As if the network in Calvatia never went dormant at all.

[NPC:miraen] "These readings suggest an active mycelial web — not just dormant fragments, but living, growing connections between star systems. If the Spore Network is alive in Calvatia, then whatever killed it in our home space never reached here."

[ARIA] Eight sectors must be charted to give the fleet a foundation for navigation. Each jump reveals new wonders: crystalline asteroid fields that sing in radio frequencies, gas giants with atmospheres that form temporary faces, and in every sector, the unmistakable trace of the living Spore Network threading through the void like roots through soil.`,

  18: `[ARIA] First contact in Calvatia comes not with weapons but with a price list. The Tar'ri — a nomadic civilization of traders and merchants who navigate the galaxy in vast caravan-fleets — have been watching the Muscarian convoy since it crossed the boundary. Their lead negotiator hails the fleet with a message that is equal parts greeting and sales pitch.

[NPC:kovax] "New faces, new markets. We are the Tar'ri. We trade in everything: goods, information, favors, futures. If it has value, we move it. If it does not, we find a way to make it valuable."

[ARIA] His four-fingered hands steeple in what you learn is the Tar'ri gesture of commercial intent. The Tar'ri vessel gleams with burnished alloys from a dozen different worlds, its hull a patchwork of traded components that somehow forms a cohesive and formidable ship. Meeting Kovax and proving Muscarian reliability through trade will open doors across the Calvatian Galaxy.`,

  19: `[ARIA] Kovax Prime's commercial facade cracks when word arrives that one of the Tar'ri's frontier outposts is on the verge of starvation. A supply chain disruption — the cause unclear — has left the settlement without provisions for weeks. The Tar'ri trade network is vast but brittle; when one link breaks, the downstream effects cascade.

[NPC:kovax] "We do not ask for charity. This is a contract. Deliver food to our outpost, and the Tar'ri will remember. Then prove you can handle time-sensitive cargo — tech components needed for their atmospheric processors, delivered within thirty minutes or the settlement's air recyclers fail."

[ARIA] Jyn Coppervein, the outpost's quartermaster, is waiting. This is not just a supply run — it is a test of whether the Muscarians can be trusted when lives are on the line.`,

  20: `[ARIA] Between Tar'ri trade runs, your ship picks up something that makes your blood run cold: a distress signal on a military frequency, repeating with the mechanical precision of an automated beacon. The pattern is not Tar'ri, not Vedic, not anything in the Muscarian database. Something new. Something wounded.

[ARIA] The signal leads to a debris field — twisted metal, scorched hull plating, and the unmistakable residue of weapons fire. Whatever happened here was not an accident. It was a battle, and one side lost badly. Fragments of the defeated vessel drift in a trail that leads deeper into uncharted space, like breadcrumbs left by a dying hand.

[NPC:miraen] "The wreckage composition is unlike anything in our database. Heavy alloys, reinforced bulkheads, weapons hardpoints built for sustained combat. This was a warship — and it was taken apart by something powerful enough to overwhelm military-grade defenses."`,

  21: `[ARIA] At the end of the debris trail, you find the source: a Kalin warship, listing badly with its port engines trailing sparks and atmosphere venting from a dozen breaches. The Kalin are a civilization of warrior-engineers — their ships are built for combat the way the Vedic's are built for study — and whatever hit this vessel hit it hard enough to crack military engineering that was built to survive anything.

[NPC:raxus] "Muscarian vessel. We require... assistance."

[ARIA] The word seems to physically pain him. Commander Raxus's face fills your comm — scarred, proud, and radiating the controlled fury of a soldier who has never asked for help and hates that he must now.

[NPC:raxus] "Our attackers may return. Escort us to Tar'ri space, and the Kalin will acknowledge the debt."

[ARIA] Four sectors of hostile territory lie between you and safety. The Kalin warship can barely maintain speed, and its weapons are offline. You are its only defense.`,

  22: `[ARIA] In Kalin culture, an honor debt is a bond stronger than any treaty. Raxus owes you his life, his ship, and the lives of his crew — a debt that burns in his warrior's heart like a brand. He offers you the only thing a Kalin commander can: the chance to fight alongside him.

[ARIA] Pirate raiders have been hitting Kalin supply convoys with increasing boldness. Three raider captains in particular have become notorious, operating from hidden bases in the asteroid fields. Raxus wants them destroyed, and he wants you to do it — not because he cannot, but because fighting together is how the Kalin seal an alliance.

[NPC:raxus] "Among my people, bonds are forged in fire. Let us see if Muscarian fire burns as hot as ours."`,

  23: `[ARIA] Lyra Starwind, the fleet's archaeologist, has been following threads in the Spore Network that led her to something extraordinary — energy readings that predate every known civilization, including the Vedic. Deep within an asteroid field, hidden behind layers of gravitational interference, lies a structure that Lyra calls a Precursor vault.

[NPC:lyra] "Whoever built the Spore Network left this behind. The vault is sealed, but the energy readings suggest it contains artifacts of immense power. We need a full survey of the surrounding sectors to map the vault's defensive perimeter, and then someone brave enough — or foolish enough — to go inside."

[ARIA] The survey reveals that the vault is not just old — it is active. Defensive systems still function after eons, and the three artifact signatures within pulse with an energy that makes your Spore Network resonance instruments sing like a choir.`,

  24: `[ARIA] The Precursor vault's doors respond to cyrillium — the crystallized energy of the Spore Network recognizes its own creation. As you feed refined crystals into the vault's intake matrix, the structure awakens. Dormant lights cascade through corridors that have not seen movement in millions of years. The air inside tastes of ozone and deep time.

[ARIA] At the vault's heart, resting on a pedestal of woven mycelial threads turned to stone, lies the artifact. It is beautiful and terrifying — a device that pulses with the same energy as the Spore Network but concentrated, refined, amplified. Lyra cannot even classify it. Miraen believes it could regenerate entire sections of the dead network. Caelum thinks it could power a fleet for centuries.

[NPC:alarion] "The artifact cannot serve all masters. We must decide who studies it, who guards it, who shapes its power. The Muscarians could keep it — balanced between knowledge and defense. The Vedic scholars could unlock its secrets peacefully. The Kalin military could harness its defensive potential against whatever destroyed those outposts."

[NPC:raxus] "Decisions made in committee get soldiers killed. Give it to those who can use it now — before whatever broke my warship comes back for the rest of us."

[ARIA] This choice will echo through the rest of your journey. Choose wisely.`,

  // ═══════════════════════════════════════════════════════════
  // CHAPTER 4: THE SHADOW OF WAR (M25-31)
  // ═══════════════════════════════════════════════════════════

  25: `[ARIA] The artifact's discovery has fractured the fragile coalition. What began as cooperation between the Muscarians, Vedic, Tar'ri, and Kalin has devolved into a political crisis. The artifact is too powerful to ignore and too dangerous to share freely. Every faction wants it, and every faction has a compelling argument for why they should have it.

[NPC:kovax] "The artifact is leverage. With it, we control the market for ancient technology across three galaxies. We do not need to weaponize it — we need to monetize it. Let the Tar'ri trade network distribute its benefits, and everyone profits."

[ARIA] Raxus is waiting in the corridor outside, as if he knew exactly where Kovax would make his pitch. The Kalin commander's voice is iron and fire.

[NPC:raxus] "Trade leverage? While the galaxy burns? Whatever destroyed those Vedic outposts is still out there. These artifacts are shields and swords. We will need both before this is over."`,

  26: `[ARIA] While the politicians debate, the black market acts. Word of the Precursor artifact has leaked — no one knows how — and fragments of similar technology have begun appearing in underground trade channels. Kovax Prime is furious: someone is smuggling pieces of the coalition's most valuable discovery to the highest bidder.

[ARIA] The Tar'ri manufacturing facilities need tech components to produce countermeasures — devices that can detect and track artifact fragments across the trade network. Without these tools, the smugglers will strip the Calvatian Galaxy of every Precursor remnant before the coalition can act.

[NPC:kovax] "Supply my fabricators with twenty-five units of tech, and I will build the trackers we need. Then intercept those two smuggler caravans my intelligence network has flagged. Whatever is buying Precursor technology in the shadows, it is not doing so for academic interest."`,

  27: `[ARIA] Commander Raxus has extended a rare invitation: participation in Kalin war games. These exercises are how the Kalin test allies — not through words or trade, but through simulated combat that feels disturbingly real. The weapons are dialed down to non-lethal levels, but the tactics are genuine, and the Kalin do not pull punches.

[ARIA] Four target drones swarm into position, their movement patterns drawn from actual engagement data. Raxus observes from the command deck, his arms crossed, his expression unreadable.

[NPC:raxus] "Show me what Muscarian pilots are worth."

[ARIA] But the target drones are only the first phase. The Kalin believe that true readiness is tested not in fair fights but in unfair ones. Once the drones are destroyed, Raxus's elite squadron drops from concealment — the best pilots in the Kalin fleet, flying ships designed to overwhelm. Survive their ambush, and you earn the Kalin's deepest respect: recognition as a warrior.`,

  28: `[ARIA] Something is wrong in the deep sectors. Communications have been dropping across the coalition — not random failures, but deliberate, surgical jamming that targets specific frequencies and protocols. The pattern is too precise to be natural, too widespread to be the work of petty pirates.

[ARIA] Three separate incidents have been reported: a Vedic research station that went silent for six hours before resuming contact with corrupted data in its archives, a Tar'ri trade convoy that received phantom navigation coordinates leading them into an asteroid field, and a Kalin patrol that reported being shadowed by a vessel that did not appear on any sensor sweep.

[NPC:shade] "You are looking in the wrong places, Muscarian. The interference is not coming from outside. It is coming from the spaces between."

[ARIA] The voice arrives on a frequency that should not exist — threaded between your standard comm channels like a whisper hidden in static. Shade. A name with no face, an informant with no allegiance. But the intelligence is real, and it points to something the coalition has been pretending does not exist: the Shadow Syndicate.`,

  29: `[ARIA] The investigation paid off. Deep in the anomalous sectors, hidden behind layers of electronic countermeasures, you found it: a Shadow Syndicate listening post, a bristling array of antennae and processors that has been intercepting coalition communications for months. Every strategic discussion, every trade negotiation, every military deployment — the Syndicate has heard it all.

[NPC:viper_nox] "Surprised? You should not be. Information is the only commodity that appreciates in value the more of it you have. We have been listening to your little coalition since before it was a coalition."

[ARIA] Viper Nox — a Syndicate operative who provided the final coordinates, for a price — watches from the shadows as you approach the controls. The post must be sabotaged, its interception capabilities destroyed. But the data banks are intact, filled with volumes of intercepted communications.

[ARIA] Destroying them is the clean option — a fresh start, no loose ends. But copying the data first could reveal what the Syndicate knows, who they have been selling to, and what their endgame is. The problem is that copying takes time, and the Syndicate will know you were here. They will come for you.`,

  30: `[ARIA] The Syndicate listening post confirmed what the coalition feared: they are not the only ones interested in Precursor technology. Someone — or something — has been systematically collecting artifact fragments across the Calvatian Galaxy, and the Syndicate was helping them do it. The threat is real, and the coalition is not ready.

[ARIA] Caelum has been working around the clock in his engineering bay, a whirlwind of sparks, muttered equations, and empty ration packs. His latest designs combine Muscarian mycelial resonance technology with Kalin weapons engineering and Vedic energy focusing — a hybrid approach that no single civilization could have achieved alone.

[NPC:caelum] "I need raw materials. Thirty units of tech components, the best you can find. And once the prototypes are ready, they need to reach a secure testing facility before the Syndicate figures out what we are building."

[ARIA] The arms race has begun. Whatever is coming, the coalition must be ready.`,

  31: `[ARIA] The time for half-measures is over. Elenion has called a summit — the first gathering of all four civilizations since the Muscarian exodus began. Representatives from the Vedic Concord, the Tar'ri Trade Collective, and the Kalin Defense Coalition will meet aboard a neutral station to decide the coalition's response to the Shadow Syndicate's escalation.

[ARIA] But the diplomatic convoy carrying the delegates must cross contested space to reach the summit location. The Syndicate knows about the meeting — of course they do — and they will do everything in their power to prevent it. Your escort is the only thing standing between the coalition's best chance at unity and a catastrophic ambush.

[ARIA] The convoy is six ships, each carrying delegates who represent centuries of their civilization's accumulated wisdom and authority. Kovax Prime negotiates last-minute trade agreements over the comm. Raxus runs combat drills with his escort fighters. Valandor meditates in silence, his crystal arrays glowing with stored knowledge.

[NPC:elenion] "We stand at the threshold of war or peace. The Spore Network once connected all life in this galaxy. It fell silent because those who built it could not agree on how to use its power. We will not make the same mistake."`,
};

// ══════════════════════════════════════════════════════════════
// COMPLETE TEXTS — 1-2 sentences acknowledging objectives
// ══════════════════════════════════════════════════════════════

export const STORY_COMPLETE_TEXTS: Record<number, string> = {
  // Chapter 1
  5: `[ARIA] Alarion's mandate is fulfilled. The cyrillium is loaded, and the Star Seeker's departure drives hum with renewed power.`,

  6: `[ARIA] The scavengers are behind you. The departure corridor is clear, and Agaricalis shrinks to a point of crimson light in your wake.`,

  7: `[ARIA] Stellar decay data archived. Miraen's gift to the galaxy is preserved — the dying star's final lesson recorded for civilizations yet unborn.`,

  8: `[ARIA] Five sectors charted in the Star Seeker's wake. The fleet holds together, bound by Elenion's words and the fading light of a lost homeworld.`,

  // Chapter 2
  9: `[ARIA] Anomaly mapped from every angle. Caelum's calculations confirm it — the wormhole is stable. The fleet has a shortcut through the void.`,

  10: `[ARIA] You emerge from the wormhole battered but intact. The gravitational shear has left scorch marks on your hull, but you are through. A new region of space stretches before you.`,

  11: `[ARIA] First contact achieved. Valandor and the Vedic Concord have acknowledged the Muscarian fleet. What happens next depends on how well you listen.`,

  12: `[ARIA] The philosopher's test is complete. Your interpretation of the artifacts has been recorded. Valandor says nothing, but the faintest shift in his expression suggests you have earned something rare: his curiosity.`,

  13: `[ARIA] Cyrillium veins mapped and samples delivered. Miraen's analysis confirms what she suspected — these crystals are the fossilized heartbeat of the ancient Spore Network.`,

  14: `[ARIA] Twenty units of Vedic crystals have changed hands. The trade agreement is formalized. Economic ties between the fleet and the Vedic Concord are established.`,

  15: `[ARIA] The data caravan is safe. Three vessels of irreplaceable Vedic knowledge secured behind friendly lines. Valandor's trust is vindicated — but his warning still echoes.`,

  16: `[ARIA] You have reached the edge of the known. The Vedic beacon fades behind you as the Calvatian Galaxy fills your viewport with silver and gold light. The crossing begins.`,

  // Chapter 3
  17: `[ARIA] Eight sectors charted. The Calvatian Galaxy is mapped in broad strokes — a canvas of wonders, dangers, and a living Spore Network that pulses beneath it all.`,

  18: `[ARIA] First trade completed with the Tar'ri. Kovax Prime has filed the transaction in what he calls the Ledger of Introductions. You are no longer strangers.`,

  19: `[ARIA] Food delivered and tech components rushed to the atmospheric processors in time. Jyn Coppervein confirms the outpost will survive. The Tar'ri do not forget their debts — or their creditors.`,

  20: `[ARIA] The distress signal's source has been found. The debris trail ends at a crippled warship of unknown origin — battered, venting atmosphere, but not dead. Not yet.`,

  21: `[ARIA] The Kalin warship limps into Tar'ri space under your escort. Commander Raxus says nothing as his ship docks for repairs. The silence speaks louder than any thanks.`,

  22: `[ARIA] Three pirate raiders destroyed. The asteroid fields are quiet again, and Kalin supply lines flow unimpeded. Raxus nods once — the highest praise a Kalin commander offers.`,

  23: `[ARIA] The Precursor vault is surveyed. Five sectors mapped, three artifact signatures confirmed. Whatever sleeps inside has been waiting a very long time for someone to open the door.`,

  24: `[ARIA] The artifact is unearthed. Your choice is made, and its consequences will ripple through every alliance, every conflict, and every life in this coalition. There is no undoing what has been decided.`,

  // Chapter 4
  25: `[ARIA] Both arguments heard. Kovax sees commerce, Raxus sees war. The coalition fractures a little more with every word — but at least the words are still being spoken.`,

  26: `[ARIA] Tech components delivered to Tar'ri fabricators, and two smuggler caravans intercepted. The artifact fragments are secured, but the shadow buyer remains unknown.`,

  27: `[ARIA] War games complete. Target drones destroyed, elite ambush survived. Raxus's expression has changed — from evaluation to something that might, in Kalin culture, pass for respect.`,

  28: `[ARIA] Deep-space interference investigated and anomalous sectors scanned. The Shadow Syndicate's footprint is confirmed across the coalition's territory. They have been watching everything.`,

  29: `[ARIA] The listening post is neutralized. Whether you chose a clean destruction or a compromised copy, the Syndicate knows you were there. The clock is ticking.`,

  30: `[ARIA] Thirty tech components traded and weapon prototypes delivered to the secure facility. Caelum's hybrid weapons are real — Muscarian biology, Kalin engineering, Vedic focus. The coalition has teeth now.`,

  31: `[ARIA] The diplomatic convoy arrives safely. Elenion stands at the summit podium as four civilizations hold their breath. The drums of war beat softly — but the coalition holds. For now.`,
};

// ══════════════════════════════════════════════════════════════
// CODEX TEXTS — Deep lore / world-building entries (third-person)
// ══════════════════════════════════════════════════════════════

export const STORY_CODEX_TEXTS: Record<number, string> = {
  // M8 — "The Departure"
  8: `[ARIA] The Muscarian Exodus — known in their records as the Great Uprooting — was not the first time a civilization fled a dying star. The Vedic archives contain references to at least seventeen such evacuations across galactic history, each one a species ripped from the soil of its origin and cast into the void. Most did not survive. The ones that did were changed beyond recognition.

[ARIA] What made the Muscarian departure unique was the Spore Network. Other species fled with ships full of genetic samples, cultural archives, and frozen embryos — insurance policies against extinction. The Muscarians carried something stranger and more profound: a living connection to the mycelial web that had shaped their evolution. Their ships were not merely vessels; they were extensions of the planetary organism they were leaving behind. The chitin hulls contained mycelial tissue from Agaricalis's oldest forests. The navigation systems were guided by spore-pulse readings from the ancient network. Even the air recyclers used fungal filtration, meaning every breath the crew took was flavored with the memory of home.

[ARIA] High Sage Alarion understood this better than anyone. Before giving the order to depart, he spent three days in communion with the last surviving tendril of the Agaricalis root network — a gnarled mass of mycelium in the deepest cavern of the capital, pulsing with the fading consciousness of an entire world. What passed between them was never recorded. But when Alarion emerged, his tendrils had turned silver at the tips — a change that, in Muscarian biology, signifies the absorption of ancestral memory. He carried within him the final thoughts of a dying world, and he would carry them to whatever new soil the fleet could find.`,

  // M11 — "First Contact: The Vedic"
  11: `[ARIA] The Vedic concept of time is fundamentally different from that of any other known civilization. Where the Muscarians measure time in growth cycles and the Kalin measure it in stress-tests, the Vedic experience time as a crystalline lattice — every moment a facet of an infinite structure that can be observed from any angle but never changed.

[ARIA] This temporal philosophy shaped their approach to first contact. When Valandor's vessel detected the Muscarian fleet emerging from the wormhole, the Vedic had already spent centuries modeling the encounter. Psionic scholars on Prisma had sensed disturbances in the Network — faint echoes of a mycelial species approaching through the wormhole corridor — and had prepared detailed protocols for every conceivable outcome. The greeting Valandor delivered was not improvised; it was the product of generations of contemplation.

[ARIA] What the Vedic did not anticipate was the emotional texture of the Muscarians. Their models accounted for a rational species — analytical, cautious, driven by survival logic. What arrived was a people in grief. The Muscarians carried the weight of a lost world in their bioluminescent patterns, their spore-signatures clouded with sorrow that the Vedic could feel across the vacuum of space. Valandor later described the experience as like pressing his hand against a window behind which an entire ocean of loss churned in silence.

[ARIA] It was this grief, more than any diplomatic protocol, that convinced the Vedic Concord to open relations. The Luminari Codex teaches that suffering is a form of knowledge — that a species which has lost everything understands the value of what remains better than one that has never been tested. The Muscarians had been tested. Valandor decided they were worth knowing.`,

  // M16 — "Gateway to Calvatia"
  16: `[ARIA] The boundary between Vedic-charted space and the Calvatian Expanse is not merely a cartographic line on a star map. It is a physical phenomenon — a region where the density of the Spore Network changes so dramatically that ships passing through it report sensory distortions, temporal anomalies, and in some cases, a profound sense of being watched.

[ARIA] The Vedic placed their boundary beacon ten thousand years ago, when their first deep-range expeditions reached the edge of the anomaly and decided to go no further. The official reason was philosophical: the Vedic believe that knowledge must be approached with patience, and the Calvatian Expanse represented a volume of unknowing so vast that rushing into it would be an act of intellectual violence. The unofficial reason, recorded only in classified Vedic archives, was fear. The psionic scholars who approached the boundary reported contact — brief, overwhelming, and entirely inhuman — with something on the other side. Something that was aware of them, interested in them, and utterly alien in its cognition.

[ARIA] What the Vedic sensed across the boundary was the Calvatian Spore Network — a branch of the mycelial web that had evolved independently for billions of years, developing a complexity and quasi-intelligence that dwarfed anything in the home galaxy. The Network in Calvatia was not dormant. It was awake, active, and growing with a purpose that the Vedic could sense but not comprehend. Their boundary beacon was not just a marker. It was a warning: here there be dragons, written in crystal and light, intended for any civilization wise enough to heed it.

[ARIA] The Muscarians were not wise enough to heed it. They were desperate enough to ignore it. And in that desperation lay either the salvation or the destruction of every civilization that would follow them through the gate.`,

  // M21 — "The Kalin: Forged in Gravity"
  21: `[ARIA] The Kalin warship that Commander Raxus commanded — the Ironbound Resolve — was typical of its class: overbuilt, over-armed, and over-engineered to a degree that other species found baffling. A Kalin cruiser carries enough armor plating to construct a small space station, enough weapons to pacify a star system, and enough redundant systems that the ship could lose half its hull and still fight at seventy percent capacity. This is not excess. This is the Forge Doctrine made manifest.

[ARIA] Lithara, the Kalin homeworld, is a world that actively tries to kill everything on it. Gravity three times the galactic standard crushes the weak. Atmospheric pressure that would flatten a standard-issue EVA suit is simply air to the Kalin. Tectonic activity reshapes the surface every few centuries, destroying anything that is not built to endure geological timescales. The Kalin did not choose to be warriors. They were forged into warriors by a planet that considered their existence an affront.

[ARIA] The honor debt that Raxus acknowledged when you rescued the Ironbound Resolve is not a social courtesy. It is a load-bearing pillar of Kalin civilization. On Lithara, where survival depends on collective effort against environmental hostility, a debt owed is a debt that weakens the entire structure if left unpaid. When a Kalin says they owe you, they mean it the way an architect means it when they say a wall is load-bearing. Remove it, and things collapse.

[ARIA] Raxus's discomfort at requiring rescue was not mere pride. It was the physical sensation of a structural imbalance in his worldview — a Kalin warrior, built to endure anything, reduced to asking a stranger for help. The debt he carries is not gratitude. It is the compulsion to restore equilibrium to a universe that, for one terrible moment, proved that even Kalin engineering has its limits.`,

  // M24 — "The Artifact Decision"
  24: `[ARIA] The Precursor vault beneath the Calvatian asteroid field is one of seventeen such structures identified across both galaxies — though only three have ever been successfully opened. The civilization that built them left no name, no records, and no biological trace. What they left was infrastructure: the Spore Network, the vaults, and scattered throughout both galaxies, crystallized energy matrices that would come to be known as cyrillium.

[ARIA] Academic debate about the Precursors — sometimes called the Progenitors in Vedic texts — has consumed scholars from every known civilization for as long as those civilizations have had scholars. The Vedic believe the Precursors were a species that transcended physical existence, uploading their consciousness into the Spore Network itself. The Kalin believe they were engineers who built the Network as infrastructure and then moved on to larger projects in other galaxies. The Tar'ri, characteristically, believe the Precursors were merchants who built the Network as a trade route and went bankrupt. The Muscarians do not theorize about the Precursors. They feel them — in the resonance of their mycelial-laced ships, in the pulse of cyrillium, in the dreams that come to pilots who spend too long in the deep void.

[ARIA] The artifact recovered from the Calvatian vault defies easy classification. Its energy signature is identical to the Spore Network's, but concentrated to a degree that suggests it is not merely a piece of the Network — it is a seed. A compressed blueprint for an entirely new branch of the mycelial web, waiting to be planted. In the right hands, it could regenerate the dead sections of the Network, reconnecting galaxies that have been isolated for billions of years. In the wrong hands, it could be weaponized — its energy turned inward, collapsing the existing Network and everything connected to it.

[ARIA] The decision of who controls the artifact is, therefore, not merely political. It is existential. The wrong choice does not just shift power between factions. It determines whether the Spore Network — and everything it sustains — survives the coming storm.`,

  // M31 — "The Gathering Storm"
  31: `[ARIA] The Shadow Syndicate is not a criminal organization in any conventional sense. It has no territory, no public leadership, no stated ideology. It is, in the most precise terms available, a distributed intelligence — a network of operatives, informants, and automated systems that spans both known galaxies and operates according to principles that no outside analyst has ever fully decoded.

[ARIA] The Syndicate's origins are disputed. Vedic intelligence traces its earliest activities to a period roughly two thousand years before the Muscarian exodus, when a series of coordinated data thefts across Vedic research stations suggested the existence of a technologically sophisticated actor operating outside known civilizational boundaries. Kalin military intelligence dates the Syndicate's emergence to a series of supply chain disruptions that plagued Lithara's orbital construction yards — disruptions too precise to be accidental and too widespread to be the work of a single actor. The Tar'ri, whose trade networks overlap with the Syndicate's operational footprint more than anyone else's, simply call them "the other current" — a parallel flow of commerce and information that runs alongside legitimate trade but never quite intersects with it.

[ARIA] What is known is this: the Syndicate collects. Not wealth, not territory, not political power — though it uses all of these as tools. It collects information, and specifically, it collects information about the Spore Network. Every listening post, every data theft, every carefully orchestrated disruption traces back to one purpose: understanding the Network's architecture, mapping its dormant nodes, and — most troublingly — identifying its vulnerabilities.

[ARIA] The summit that Elenion convened aboard the neutral station was the coalition's first coordinated response to this threat. For the first time, representatives of four civilizations sat in the same room and acknowledged that their individual security was insufficient — that the Syndicate, or whatever directed it, operated at a scale that required collective action. The Gathering Storm was not a battle or a crisis. It was the moment the coalition stopped being an alliance of convenience and started becoming something that might, if it survived, reshape the galaxy.

[ARIA] Elenion's speech at the summit was recorded and distributed to every ship in the fleet. It ends with a line that has since become the coalition's unofficial motto: "The Network fell silent because those who built it could not agree. We will not make the same mistake." Whether that promise holds remains to be seen. The drums of war grow louder with each passing cycle, and the shadows grow deeper. But for now, the coalition holds. And holding, in the face of what is coming, may be enough.`,
};
