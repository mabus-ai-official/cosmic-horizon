/**
 * narration-scripts-story-ch1-4.ts
 *
 * Narration scripts for story missions 5-31 (Chapters 1-4).
 * Voice tags: [ARIA] for narrator, [NPC:name] for NPC dialogue.
 * The generation pipeline splits on these tags and routes to different
 * ElevenLabs voices.
 *
 * Script types:
 *   ACCEPT — 2-3 paragraphs, atmospheric, second-person. Scene-setting with NPC dialogue.
 *   COMPLETE — 1-2 sentences. Short acknowledgment of objectives fulfilled.
 *
 * CLAIM and CODEX texts are handled separately (already exist / other agent).
 */

// ── ACCEPT TEXTS ────────────────────────────────────────────────────────────

export const ACCEPT_TEXTS: Record<number, string> = {
  // =========================================================================
  // CHAPTER 1: CALL OF DESTINY (M5-M8)
  // =========================================================================

  5: `[ARIA] High Sage Alarion's summons arrives on a priority channel, his bioluminescent sigil pulsing with the amber urgency reserved for matters of species survival. You have been chosen — not for your rank, but for what Miraen reported: your ship resonated with the Spore Network in ways no other vessel has. The Star Seeker's bridge is a cathedral of living architecture, fungal buttresses arcing overhead, their surfaces rippling with soft phosphorescence.

[NPC:alarion] "You stand in the heart of a dying world's last hope. Agaricalis's sun collapses inward, and our mycelial forests wither beneath its radiation. The exodus cannot wait — but the Star Seeker's departure drives require cyrillium. Refined crystal that channels the energy of living systems. Without it, we remain trapped in the gravity well of a dying star."

[ARIA] Alarion's ancient tendrils sway with the slow gravity of deep thought. Behind him, holographic projections show the sun — a seething, collapsing mass with perhaps months left before it devours the inner worlds. He turns his luminous gaze to you.

[NPC:alarion] "You have proven yourself resourceful. Now prove yourself essential. Bring us the cyrillium, and the exodus begins."`,

  6: `[ARIA] The Star Seeker's engines hum with freshly loaded cyrillium, but not everyone accepted the exodus. Entire communities chose to stay — to die with Agaricalis rather than face the unknown. Some of those who stayed have turned desperate, forming scavenger bands that prey on departing ships, stripping them of supplies and fuel. The departure corridor is a gauntlet. Agaricalis's swollen sun fills the viewport with angry crimson light, casting long shadows across debris fields left by ships that did not make it.

[ARIA] Your sensors scream warnings as scavenger signatures converge on your position. These are not pirates — they are your own people, driven to desperation by a dying world and the terror of what lies beyond it.

[NPC:caelum] "Shields are holding, but we cannot fight and run at the same time. Choose quickly — engage or evade. Either way, the departure corridor has three sectors of open space between us and the fleet rally point. I suggest we move."

[ARIA] Behind you, the Star Seeker begins its ponderous acceleration away from the only home the Muscarians have ever known. There is no going back.`,

  7: `[ARIA] As the fleet clears the departure corridor, the weight of loss settles over every ship like a funeral shroud. Agaricalis is behind you — a world reduced to memory. But Miraen requests one final act before it is lost forever: a comprehensive scan of the dying star. Three sectors around the corona must be surveyed, each requiring your ship to endure punishing radiation bursts.

[NPC:miraen] "This is our gift to the galaxy. We could not save our world, but we can ensure its death teaches others to save theirs. The radiation patterns contain millennia of stellar evolution data — irreplaceable once the star collapses."

[ARIA] Caelum reinforces the hull plating and mutters prayers to engineering gods you are fairly certain he invented. The scans are dangerous, but the data is priceless. And the data is also powerful. The Vedic civilization, whose scouts have been observing the exodus from a distance, have expressed interest.

[NPC:miraen] "Sharing this data could build bridges with a potential ally. Or we keep it classified — a strategic advantage for our people alone. The choice will be yours, pilot."`,

  8: `[ARIA] The Star Seeker carves a luminous trail through uncharted space, its mycelial drives leaving a faint bioluminescent wake that your instruments can follow. Five sectors of unknown territory lie between the fleet and its first waypoint — a region of gravitational stability where the convoy can regroup and take stock. As you travel, the magnitude of what has happened settles into your bones. Agaricalis is gone. The great fungal forests, the bioluminescent caverns, the singing spore-fields at twilight — all consumed.

[ARIA] Elenion, the expedition's diplomat, broadcasts an address to every ship in the fleet. His voice is steady, measured, carrying the cadence of a leader who understands that hope is more precious than cyrillium.

[NPC:elenion] "We are not refugees. We are seeds. Carried on the stellar wind to take root in new soil. The Spore Network once connected every corner of this galaxy. We will find it again, and when we do, we will grow."

[ARIA] The fleet answers with a chorus of running lights — every ship flickering its externals in the Muscarian gesture of solidarity. You are no longer alone in the dark.`,

  // =========================================================================
  // CHAPTER 2: THE VEDIC ENIGMA (M9-M16)
  // =========================================================================

  9: `[ARIA] Three weeks into the voyage, the fleet's long-range sensors detect something that should not exist: a stable gravitational anomaly radiating energy in patterns that match no known stellar phenomenon. The readings cascade across your instruments like a language you almost understand — mathematics folded into spacetime itself.

[ARIA] Miraen's analysis suggests it could be a wormhole — a folded corridor through spacetime that would cut years off the journey. But wormholes are theoretical. The Muscarians have never encountered one, and the Spore Network's ancient records are fragmentary at best.

[NPC:caelum] "Only one way to find out. Scan it from every angle. Five sectors of readings should tell us whether it is a shortcut to salvation or a gravitational meat grinder. If it is stable, we go through. If it is not — we go around, and add six months to the journey."

[ARIA] Five sectors must be scanned to map the anomaly's gravitational topology. Each reading brings the picture into sharper focus, and with each scan, the anomaly pulses as if aware it is being watched.`,

  10: `[ARIA] Your scans confirm the impossible: a stable wormhole, its event horizon shimmering like oil on water. The aperture is wide enough for the Star Seeker, but the gravitational shear at the throat would tear an unprepared vessel to atoms.

[NPC:caelum] "I have recalibrated the shields to compensate for the shear forces. I make no promises. But the numbers say we can survive the crossing — if the pilot is good enough. No pressure."

[ARIA] The wormhole's interior is a cathedral of warped light. Spacetime folds around your ship like origami, and your instruments go haywire — compass spinning, chronometer stuttering, hull sensors reporting temperatures that range from absolute zero to the surface of a star in the span of a heartbeat. Something moves in the distortion. Energy constructs — shapes that are almost biological, almost mechanical — materialize from the gravitational turbulence, drawn to your ship's electromagnetic signature like moths to flame. Whether they are guardians, parasites, or echoes of the wormhole's creation, they are hostile. You must survive the crossing.`,

  11: `[ARIA] The wormhole deposits you in a region of space that feels fundamentally different. The stars here are older, their light carrying a warmth that suggests long stability. And you are not alone. A vessel of extraordinary elegance hangs in the void — its hull inscribed with geometric patterns that shift and rearrange as you watch, as if the ship itself is thinking.

[ARIA] A hail arrives, not on any standard frequency but through a harmonic resonance that makes your ship's hull vibrate like a tuning fork. The message resolves into a face: ancient, serene, with eyes that hold the patience of geological time.

[NPC:valandor] "We have been watching the wormhole for centuries. We did not expect fungi to emerge from it."

[ARIA] There is amusement in his voice, but no condescension. Valandor, Elder Scholar of the Vedic Concord, gestures with crystalline fingers that refract the light of distant stars.

[NPC:valandor] "Come. We have much to discuss about the nature of the web you carry within your ships. The Spore Network whispers your name — or something close to it. I would know why."`,

  12: `[ARIA] Valandor does not simply offer alliance — the Vedic do not operate that way. Trust must be earned through understanding, and understanding must be demonstrated through interpretation. He invites you aboard his vessel, a floating library where knowledge is stored not in data banks but in crystalline lattices that sing when touched. Three artifacts rest on a pedestal of woven light, each ancient beyond reckoning.

[NPC:valandor] "Tell me what you see. Not with your instruments — with your understanding. Are these tools of creation, built to nurture life across the cosmos? Or instruments of defense, designed to shield civilizations from existential threats?"

[ARIA] The artifacts shift between states: solid, liquid, energy, and something your instruments cannot classify. They hum with residual power that makes the hair on your arms stand on end. Valandor watches you with the patience of someone who has waited centuries for this conversation.

[NPC:valandor] "Your answer will tell me whether your people see the universe as a garden to be tended or a fortress to be defended. Neither answer is wrong — but both have consequences that will echo long after you and I are dust."`,

  13: `[ARIA] The Vedic have revealed that cyrillium — the crystal the Muscarians use to fuel their mycelial drives — exists in abundance in this region of space. But the deposits are deep, woven into asteroid fields and planetary crusts in patterns that suggest they were placed deliberately. Four sectors must be surveyed with specialized instruments to locate the richest veins.

[NPC:miraen] "Cyrillium is not a natural mineral. It is a byproduct of the Spore Network's growth — crystallized mycelial energy. Wherever we find cyrillium, we find traces of the old network. And wherever we find the old network, we find clues about who built it and why it fell silent."

[ARIA] Miraen's tendrils quiver with the excitement of a scientist on the edge of a paradigm shift. Once the geological survey is complete and the richest veins are located, you must extract samples and deliver fifteen units to her laboratory aboard the Star Seeker. The crystals pulse faintly in your cargo hold, as if remembering what they once were — threads of a living web that spanned galaxies.`,

  14: `[ARIA] Diplomacy moves on many legs, and commerce is the steadiest. Valandor has arranged for Vedic crystal merchants to open limited trade with the Muscarian fleet — a gesture of goodwill, but also a test. The Vedic want to see how the Muscarians conduct business: fairly, or exploitatively.

[ARIA] Vedic crystals are remarkable. Unlike cyrillium, which channels biological energy, these crystals store information — memories, calculations, even emotions encoded in their lattice structure. A single crystal the size of your fist can hold the collected wisdom of a Vedic scholar's entire lifetime.

[NPC:sella] "Twenty units must change hands to formalize the trade agreement. I am Sella Brightvane, and I will be your counterpart in these negotiations. Know that I have traded with species older than your recorded history. Impress me."

[ARIA] Elenion has emphasized that the prices you accept and the manner in which you negotiate will shape how the Vedic perceive the entire Muscarian species. Every transaction is a sentence in a story the Vedic will tell about your people for generations.`,

  15: `[ARIA] Valandor's demeanor has changed. The serene patience is gone, replaced by something you have not seen in the elder scholar before: urgency. He shares intelligence that the Vedic have kept classified for centuries — something is stirring in the outer regions of explored space. Communications have gone dark across multiple outposts. Ships have vanished without distress signals.

[NPC:valandor] "We do not know what it is. But we know it is not natural. And we know it is getting closer. I tell you this not to frighten you, but because I have learned something unexpected: I trust you."

[ARIA] A Vedic data caravan — three vessels carrying archived knowledge from the threatened outposts — must be escorted through three sectors to safety. The caravan's cargo is irreplaceable: the collective memory of Vedic settlements that may already be lost. The escort route passes through sectors where the jamming has been worst, and your sensors flicker with ghost signatures that vanish when you try to lock on.

[NPC:valandor] "Protect these vessels. They carry the memory of worlds that may no longer exist. Do not make me regret placing this trust in Muscarian hands."`,

  16: `[ARIA] The Vedic charts show a boundary — the edge of their explored space — beyond which lies what they call the Calvatian Expanse. An entire galaxy, unmapped and unknown, connected to Vedic space by a narrow corridor of stable spacetime. The Vedic have never crossed the boundary. Their philosophy counsels patience, observation, study. But the Muscarians are not Vedic.

[ARIA] As your ship reaches the boundary marker — a Vedic beacon that has stood for ten thousand years — you see it: the Calvatian Galaxy, a spiral of silver and gold light stretching across the viewport like a promise. Whatever drove the Vedic outposts dark is behind you. Whatever waits in Calvatia is ahead.

[NPC:alarion] "I have studied the old charts. The Spore Network's threads grow denser toward the Calvatian core. Whatever the ancient builders intended, the answer lies beyond this gate. We are a people without a home — standing still is not an option."

[ARIA] The beacon's light plays across your hull as you cross the threshold. The only way is forward. Codex Entry Unlocked: Gateway to Calvatia.`,

  // =========================================================================
  // CHAPTER 3: THE CALVATIAN ODYSSEY (M17-M24)
  // =========================================================================

  17: `[ARIA] The Calvatian Galaxy is nothing like Agaricalis's home cluster. The stars burn hotter, the nebulae glow with colors your instruments struggle to classify, and the Spore Network's pulse — that constant companion since your first launch — has changed. It is stronger here. Faster. As if the network in Calvatia never went dormant at all.

[ARIA] Eight sectors must be charted to give the fleet a foundation for navigation. Each jump reveals new wonders: crystalline asteroid fields that sing in radio frequencies, gas giants with atmospheres that form temporary faces, and in every sector, the unmistakable trace of the living Spore Network threading through the void like roots through soil.

[NPC:miraen] "These readings suggest an active mycelial web — not just dormant fragments, but living, growing connections between star systems. If the Spore Network is alive in Calvatia, then whatever killed it in our home space never reached here. We are walking through the garden our ancestors could only dream of."`,

  18: `[ARIA] First contact in Calvatia comes not with weapons but with a price list. The Tar'ri — a nomadic civilization of traders and merchants who navigate the galaxy in vast caravan-fleets — have been watching the Muscarian convoy since it crossed the boundary. Their lead negotiator hails the fleet with a message that is equal parts greeting and sales pitch.

[NPC:kovax] "New faces, new markets. I am Kovax Prime, and I speak for the Tar'ri Trade Collective in this sector. We trade in everything: goods, information, favors, futures. If it has value, we move it. If it does not, we find a way to make it valuable."

[ARIA] The Tar'ri vessel gleams with burnished alloys from a dozen different worlds, its hull a patchwork of traded components that somehow forms a cohesive and formidable ship. Kovax's four-fingered hands are steepled in the Tar'ri gesture of commercial intent. Behind him, display screens show real-time commodity prices from markets across the galaxy.

[NPC:kovax] "Fifteen units of trade goods will establish your people's credit with us. Consider it a down payment on the future. The Tar'ri remember those who deal fairly — and those who do not."`,

  19: `[ARIA] Kovax Prime's commercial facade cracks when word arrives that one of the Tar'ri's frontier outposts is on the verge of starvation. A supply chain disruption — the cause unclear — has left the settlement without provisions for weeks. The Tar'ri trade network is vast but brittle; when one link breaks, the downstream effects cascade.

[NPC:kovax] "We do not ask for charity. This is a contract. Deliver twenty units of food to our outpost, and the Tar'ri will remember. Then prove you can handle time-sensitive cargo — tech components for their atmospheric processors, or the settlement's air recyclers fail."

[ARIA] Jyn Coppervein, the outpost's quartermaster, is waiting at the dock with hollow eyes and a manifest that grows shorter by the hour. The station's corridors echo with the silence of rationing. Children peer out from behind bulkheads, their faces gaunt but curious — they have never seen a Muscarian before. This is not just a supply run. It is the moment that determines whether the Tar'ri see you as traders or as allies.`,

  20: `[ARIA] Between Tar'ri trade runs, your ship picks up something that makes your blood run cold: a distress signal on a military frequency, repeating with the mechanical precision of an automated beacon. The pattern is not Tar'ri, not Vedic, not anything in the Muscarian database. Something new. Something wounded.

[ARIA] The signal leads to a debris field — twisted metal, scorched hull plating, and the unmistakable residue of weapons fire. Whatever happened here was not an accident. It was a battle, and one side lost badly. Fragments of the defeated vessel drift in a trail that leads deeper into uncharted space, like breadcrumbs left by a dying hand.

[NPC:miraen] "The wreckage composition shows heavy alloys, reinforced bulkheads, weapons hardpoints built for sustained combat. This was a warship — and it was taken apart by something powerful enough to overwhelm military-grade defenses. Follow the debris trail. Whoever sent that signal may still be alive."`,

  21: `[ARIA] At the end of the debris trail, you find the source: a warship listing badly with its port engines trailing sparks and atmosphere venting from a dozen breaches. The vessel's design is unfamiliar — angular, brutalist, every surface reinforced beyond any reasonable specification. Built by a species that expects the universe to hit back.

[ARIA] A face appears on your comm — scarred, proud, radiating the controlled fury of a soldier who has never asked for help and hates that he must now.

[NPC:raxus] "Muscarian vessel. I am Commander Raxus of the Kalin Defense Coalition. We require... assistance."

[ARIA] The word seems to physically pain him. His silicon-carbide skin catches the emergency lighting, giving his face the look of carved granite. Four sectors of hostile territory lie between you and safety. The Kalin warship can barely maintain speed, and its weapons are offline. You are its only defense.

[NPC:raxus] "Escort us to Tar'ri space, and the Kalin will acknowledge the debt. Among my people, debts are bonds stronger than any treaty. Do this, and you will have earned something no outsider has ever held: Kalin trust."`,

  22: `[ARIA] In Kalin culture, an honor debt is a bond stronger than any treaty. Raxus owes you his life, his ship, and the lives of his crew — a debt that burns in his warrior's heart like a brand. He offers you the only thing a Kalin commander can: the chance to fight alongside him.

[ARIA] Pirate raiders have been hitting Kalin supply convoys with increasing boldness. Three raider captains in particular have become notorious, operating from hidden bases in the asteroid fields. Their ships are fast, aggressive, and armed with stolen military hardware.

[NPC:raxus] "Among my people, bonds are forged in fire. I do not ask you to fight for me — I ask you to fight with me. Three raider captains terrorize these lanes. Destroy them, and the Kalin fleet will know your name. Let us see if Muscarian fire burns as hot as ours."

[ARIA] Raxus straps on his combat armor with the practiced efficiency of a soldier who has done this ten thousand times. His eyes burn with something that might be anticipation, or might be the closest thing a Kalin gets to joy.`,

  23: `[ARIA] Lyra Starwind, the fleet's archaeologist, has been following threads in the Spore Network that led her to something extraordinary — energy readings that predate every known civilization, including the Vedic. Deep within an asteroid field, hidden behind layers of gravitational interference, lies a structure she calls a Precursor vault.

[NPC:lyra] "Whoever built the Spore Network left this behind. The vault is sealed, but the energy readings suggest it contains artifacts of immense power. We need a full survey of the surrounding sectors to map the vault's defensive perimeter — five sectors of readings — and then someone brave enough or foolish enough to go inside."

[ARIA] The survey reveals that the vault is not just old — it is active. Defensive systems still function after eons, and the three artifact signatures within pulse with an energy that makes your Spore Network resonance instruments sing like a choir. Whatever the Precursors locked away in this place, they intended it to be found. But only by someone who earned the right.

[NPC:lyra] "This could be the greatest discovery in recorded history. I need you to help me prove it."`,

  24: `[ARIA] The Precursor vault's doors respond to cyrillium — the crystallized energy of the Spore Network recognizes its own creation. As you feed refined crystals into the vault's intake matrix, the structure awakens. Dormant lights cascade through corridors that have not seen movement in millions of years. The air inside tastes of ozone and deep time.

[ARIA] At the vault's heart, resting on a pedestal of woven mycelial threads turned to stone, lies the artifact. It is beautiful and terrifying — a device that pulses with the same energy as the Spore Network but concentrated, refined, amplified. Lyra cannot even classify it.

[NPC:alarion] "This artifact represents the legacy of those who came before us. It should remain in Muscarian custody — studied on our own terms, balanced between knowledge and defense. We are the inheritors of the Spore Network. This is our birthright."

[NPC:raxus] "Birthright? While the galaxy burns? Whatever destroyed those Vedic outposts is still out there. Hand this to the Kalin military, and we will forge it into a shield that protects everyone — including your precious Network."

[ARIA] The artifact hums between them, indifferent to politics, patient as stone. This choice will echo through the rest of your journey. Choose wisely.`,

  // =========================================================================
  // CHAPTER 4: THE SHADOW OF WAR (M25-M31)
  // =========================================================================

  25: `[ARIA] The artifact's discovery has fractured the fragile coalition. What began as cooperation between the Muscarians, Vedic, Tar'ri, and Kalin has devolved into a political crisis. Every faction wants the Precursor technology, and every faction has a compelling argument for why they should have it.

[ARIA] Kovax Prime corners you in a Tar'ri trade hall, his four-fingered hands gesturing with the precision of a merchant who has closed a thousand deals.

[NPC:kovax] "The artifact is leverage. With it, we control the market for ancient technology across three galaxies. We do not need to weaponize it — we need to monetize it. Let the Tar'ri trade network distribute its benefits, and everyone profits. That is not greed — that is pragmatism."

[ARIA] Raxus is waiting in the corridor outside, as if he knew exactly where Kovax would make his pitch. The Kalin commander's voice is iron and fire.

[NPC:raxus] "Trade leverage? While something hunts us in the dark? Those Vedic outposts did not go silent because of market forces. These artifacts are shields and swords. The Tar'ri can sell trinkets. The Kalin will keep you alive."`,

  26: `[ARIA] While the politicians debate, the black market acts. Word of the Precursor artifact has leaked — no one knows how — and fragments of similar technology have begun appearing in underground trade channels. Someone is smuggling pieces of the coalition's most valuable discovery to the highest bidder.

[NPC:kovax] "Someone is profiting from our discovery, and it is not us. My intelligence network has identified two smuggler caravans carrying artifact fragments. Intercept them. Whatever is buying Precursor technology in the shadows, it is not doing so for academic interest."

[ARIA] The Tar'ri manufacturing facilities need twenty-five units of tech components to produce countermeasures — devices that can detect and track artifact fragments across the trade network. Without these tools, the smugglers will strip the Calvatian Galaxy of every Precursor remnant before the coalition can act. You load your cargo hold and set course for the first smuggler intercept point, where stolen fragments of something older than stars are changing hands in the darkness between worlds.`,

  27: `[ARIA] Commander Raxus has extended a rare invitation: participation in Kalin war games. These exercises are how the Kalin test allies — not through words or trade, but through simulated combat that feels disturbingly real. The weapons are dialed down to non-lethal levels, but the tactics are genuine, and the Kalin do not pull punches.

[NPC:raxus] "Four target drones will test your aim and reflexes. Patterns drawn from actual engagement data — not simulations, real combat recordings from the frontier. Show me what Muscarian pilots are worth."

[ARIA] Four drones swarm into position, their movement patterns unpredictable and aggressive. Raxus observes from the command deck, his arms crossed, his expression carved from the same silicon-carbide as his skin. But the drones are only the first phase. The Kalin believe that true readiness is tested not in fair fights but in unfair ones.

[NPC:raxus] "You destroyed the targets. Good. Now survive what comes next. My elite squadron is dropping from concealment — the best pilots in the Kalin fleet. They will not go easy on you. Survive their ambush, and you earn a title no outsider has ever held: Kalin-forged."`,

  28: `[ARIA] Something is wrong in the deep sectors. Communications have been dropping across the coalition — not random failures, but deliberate, surgical jamming that targets specific frequencies and protocols. The pattern is too precise to be natural, too widespread to be the work of petty pirates.

[ARIA] Three separate incidents demand investigation: a Vedic research station that went silent for six hours before resuming contact with corrupted data in its archives, a Tar'ri trade convoy that received phantom navigation coordinates leading them into an asteroid field, and a Kalin patrol that reported being shadowed by a vessel that did not appear on any sensor sweep.

[NPC:shade] "You are looking in the right places, pilot. But you are looking with the wrong eyes. The Shadow Syndicate does not leave footprints — we leave absences. Holes in the data where information used to be. I can help you see what is missing, but my help comes with conditions. It always does."

[ARIA] The interference reports lead deeper into uncharted space, where the stars grow thin and the Spore Network's pulse takes on an unfamiliar cadence — not the rhythm of growth, but something watchful. Something waiting.`,

  29: `[ARIA] The investigation paid off. Deep in the anomalous sectors, hidden behind layers of electronic countermeasures, you found it: a Shadow Syndicate listening post — a bristling array of antennae and processors that has been intercepting coalition communications for months. Every strategic discussion, every trade negotiation, every military deployment — the Syndicate has heard it all.

[NPC:viper_nox] "I gave you the coordinates. You are welcome. Now listen carefully: the post must be destroyed, but the data banks are intact. Volumes of intercepted communications. Names, dates, coordinates, plans. Everything the Syndicate knows about your precious coalition."

[ARIA] Viper Nox's holographic image flickers with the interference from the post's own jamming field. Her smile is the smile of someone who profits from chaos and sleeps soundly afterward.

[NPC:viper_nox] "You can destroy the data — clean, simple, no loose ends. Or you can copy it first. Learn what the Syndicate knows, who they have been selling to, what their endgame is. But copying takes time. And the Syndicate will know you were here. They will come for you. Clean or compromised, pilot. Your call."`,

  30: `[ARIA] The Syndicate listening post confirmed what the coalition feared: they are not the only ones interested in Precursor technology. Someone — or something — has been systematically collecting artifact fragments across the Calvatian Galaxy, and the Syndicate was helping them do it. The threat is real, and the coalition is not ready.

[NPC:caelum] "I have been working around the clock. My latest designs combine Muscarian mycelial resonance with Kalin weapons engineering and Vedic energy focusing — a hybrid approach that no single civilization could have achieved alone. I need thirty units of tech components, the best you can find. And once the prototypes are ready, they need to reach a secure testing facility before the Syndicate figures out what we are building."

[ARIA] Caelum's engineering bay is a whirlwind of sparks, muttered equations, and empty ration packs. Schematics cover every surface — weapon designs that blend organic Muscarian technology with the brutal efficiency of Kalin engineering and the elegant precision of Vedic crystal focusing. The prototypes glow faintly on his workbench, humming with potential. The arms race has begun. Whatever is coming, the coalition must be ready to meet it with fire.`,

  31: `[ARIA] The time for half-measures is over. Elenion has called a summit — the first gathering of all four civilizations since the Muscarian exodus began. Representatives from the Vedic Concord, the Tar'ri Trade Collective, and the Kalin Defense Coalition will meet aboard a neutral station to decide the coalition's response to the Shadow Syndicate's escalation.

[ARIA] But the diplomatic convoy carrying the delegates must cross contested space to reach the summit. The Syndicate knows about the meeting — of course they do — and they will do everything in their power to prevent it. Six ships carry delegates who represent centuries of their civilization's accumulated wisdom and authority. Your escort is the only thing standing between the coalition's best chance at unity and a catastrophic ambush.

[ARIA] At the summit, Elenion stands at the podium, his voice carrying the weight of a civilization born from loss.

[NPC:elenion] "We stand at the threshold of war or peace. The Spore Network once connected all life in this galaxy. It fell silent because those who built it could not agree on how to use its power. We will not make the same mistake. The drums of war are beating — but today, the coalition holds."

[ARIA] Codex Entry Unlocked: The Gathering Storm.`,
};

// ── COMPLETE TEXTS ──────────────────────────────────────────────────────────

export const COMPLETE_TEXTS: Record<number, string> = {
  // Chapter 1: Call of Destiny
  5: "Cyrillium delivered to the Star Seeker. Alarion's departure systems are powered and ready.",
  6: "Scavenger ambush survived and departure corridor cleared. The fleet is free of Agaricalis's gravity well.",
  7: "Stellar decay data recorded and archived. Miraen's gift to the galaxy is preserved.",
  8: "Five sectors charted in the Star Seeker's wake. The fleet has found its bearing in the unknown.",

  // Chapter 2: The Vedic Enigma
  9: "Anomaly mapped across five sectors. The gravitational topology confirms a stable wormhole.",
  10: "Wormhole transit survived. The fleet has crossed into Vedic space.",
  11: "First contact with Valandor established. The Vedic Concord acknowledges the Muscarian fleet.",
  12: "Vedic artifacts investigated and interpreted. Valandor has measured the content of your character.",
  13: "Cyrillium veins surveyed and samples delivered to Miraen's laboratory.",
  14: "Twenty units of Vedic crystals traded. Economic ties between Muscarian and Vedic are formalized.",
  15: "Vedic data caravan escorted safely through all three sectors. The archived knowledge is preserved.",
  16: "The Calvatian Gate has been reached. The boundary marker is behind you now.",

  // Chapter 3: The Calvatian Odyssey
  17: "Eight sectors of the Calvatian Galaxy charted. The fleet's navigation archives are updated.",
  18: "Kovax Prime met and initial trade established. The Tar'ri Trade Collective recognizes the Muscarians.",
  19: "Relief supplies delivered and timed tech shipment completed. The Tar'ri outpost will survive.",
  20: "Distress signal investigated and debris trail followed to its source.",
  21: "Kalin warship escorted to safety. Commander Raxus has acknowledged the honor debt.",
  22: "Three pirate raiders destroyed. Raxus considers the debt sealed in fire.",
  23: "Precursor vault surveyed and artifact readings investigated. Lyra's discovery is confirmed.",
  24: "Cyrillium delivered and the artifact unearthed. The most consequential decision of the journey awaits.",

  // Chapter 4: The Shadow of War
  25: "Both sides of the debate heard. The political divide is clear.",
  26: "Tech components delivered and smuggled artifact fragments intercepted.",
  27: "Target drones destroyed and elite ambush survived. Kalin combat readiness confirmed.",
  28: "Deep-space interference investigated and anomalous sectors scanned. The Shadow Syndicate is real.",
  29: "Syndicate listening post sabotaged. The coalition's communications are secure again.",
  30: "Tech components traded and weapon prototypes delivered to the testing facility.",
  31: "Diplomatic convoy escorted safely to the summit. Elenion's address unites the coalition.",
};
