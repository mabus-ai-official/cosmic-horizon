import { Knex } from "knex";

function storyMissionId(n: number): string {
  return `e0000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}

/**
 * Seed 024: Story Revamp — Chapters 1-4 (Missions 1-31)
 *
 * Updates the mission_templates rows created by 017_story_missions with
 * narrative content matching the Agaricalis Saga plan. Phases and choices
 * are already handled by 019_mission_phases — this seed only touches the
 * template-level fields (title, description, objectives, type, lore_text,
 * recap_text, chapter, source, has_phases, has_choices, rewards).
 *
 * Idempotent: uses UPDATE, never INSERT.
 */
export async function seed(knex: Knex): Promise<void> {
  // Helper — update a single mission template
  async function updateMission(
    n: number,
    data: {
      title: string;
      description: string;
      type: string;
      objectives: Record<string, unknown>;
      chapter: number;
      lore_text: string;
      recap_text: string;
      has_phases: boolean;
      has_choices: boolean;
      reward_credits: number;
      reward_xp: number;
    },
  ): Promise<void> {
    await knex("mission_templates")
      .where({ id: storyMissionId(n) })
      .update({
        title: data.title,
        description: data.description,
        type: data.type,
        objectives: JSON.stringify(data.objectives),
        chapter: data.chapter,
        source: "story",
        lore_text: data.lore_text,
        recap_text: data.recap_text,
        has_phases: data.has_phases,
        has_choices: data.has_choices,
        reward_credits: data.reward_credits,
        reward_xp: data.reward_xp,
      });
  }

  // =====================================================================
  // CHAPTER 1: CALL OF DESTINY (Missions 1-8)
  // The Muscarians flee their dying homeworld aboard the Star Seeker.
  // =====================================================================

  // Mission 1: First Light
  await updateMission(1, {
    title: "First Light",
    description:
      "Pilot, visit 3 nearby sectors to calibrate your navigation systems.",
    type: "visit_sector",
    objectives: { sectorsToVisit: 3 },
    chapter: 1,
    lore_text:
      "You grip the flight stick as your ship lifts away from Docking Platform Seven. The ancient station — carved from the cap of a petrified titan-mushroom — shrinks behind you, and the vast tapestry of stars stretches in every direction. Your comm crackles with static, and beneath it, something else. A rhythmic pulse, almost organic, threading through the background radiation like a heartbeat.\n\nThe Spore Network. You have heard the rumors in cantinas and cargo bays: an ancient mycelial web that once connected every corner of the galaxy. Most pilots dismiss it as spacer folklore. But that pulse is real, and it is calling to you.\n\nHigh Sage Alarion has declared the exodus. Agaricalis, the Muscarian homeworld, is dying — its sun collapsing inward, its mycelial forests withering under the radiation. The Star Seeker awaits, but first you must prove your navigation skills are worthy of the journey ahead.",
    recap_text: "Your journey begins...",
    has_phases: false,
    has_choices: false,
    reward_credits: 1000,
    reward_xp: 100,
  });

  // Mission 2: Supply Run
  await updateMission(2, {
    title: "Supply Run",
    description:
      "Trade 5 units of any commodity at an outpost to stock your ship for the long voyage from Agaricalis.",
    type: "trade_units",
    objectives: { unitsToTrade: 5 },
    chapter: 1,
    lore_text:
      "The exodus fleet cannot survive on hope alone. Every ship departing Agaricalis needs provisions — food synthesized from the last harvests of the great fungal forests, fuel cells charged by the dying star's fading light, and medical supplies for the long journey through uncharted space.\n\nThe frontier outposts are already feeling the strain. Prices fluctuate wildly as merchants hoard essentials and speculators circle like vultures. You will need to be shrewd if you want to keep your cargo hold full and your crew fed.",
    recap_text:
      "You launched from the station and calibrated your navigation systems across three sectors.",
    has_phases: false,
    has_choices: false,
    reward_credits: 1500,
    reward_xp: 150,
  });

  // Mission 3: Echo in the Dark
  await updateMission(3, {
    title: "Echo in the Dark",
    description:
      "Visit 3 distinct sectors to triangulate a mysterious signal emanating from deep within the Spore Network.",
    type: "visit_sector",
    objectives: { sectorsToVisit: 3 },
    chapter: 1,
    lore_text:
      "With your cargo hold stocked, you return to the mystery that has gnawed at you since launch. The rhythmic pulse has grown stronger, resolving into distinct patterns that your ship computer flags as non-random biological origin. Whatever is broadcasting, it is alive — or was, once.\n\nMiraen, the expedition's chief ecologist, has been studying these signals from aboard the Star Seeker. She believes they are echoes of the ancient Spore Network — the mycelial web that once carried information across lightyears in an instant. If she is right, the Network is not dead. It is dreaming.",
    recap_text:
      "You stocked supplies and detected a mysterious biological signal pulsing through local space.",
    has_phases: false,
    has_choices: false,
    reward_credits: 2000,
    reward_xp: 200,
  });

  // Mission 4: The Mycorrhizal Fragment
  await updateMission(4, {
    title: "The Mycorrhizal Fragment",
    description:
      "Follow the signal trail through 5 sectors to locate a dormant fragment of the ancient Spore Network.",
    type: "visit_sector",
    objectives: { sectorsToVisit: 5 },
    chapter: 1,
    lore_text:
      "Your scans reveal a trail — not a physical path, but a gradient of spore density increasing toward a point deep in unexplored space. The ancient network left breadcrumbs, and you are the first pilot in centuries to follow them.\n\nAs you travel, your ship sensors register micro-tremors in subspace. The mycelial threads are vibrating, responding to your presence. Miraen is ecstatic: the Spore Network knows you are coming. It has been waiting.\n\nThe fragment you seek is a crystallized node of the old network, preserved in the vacuum like an insect in amber. If the Muscarians can study it, they may unlock the secrets of instantaneous communication across the stars — a gift from their ancestors who first cultivated the mycelial web millennia ago.",
    recap_text:
      "Sector scans revealed a trail of increasing spore density leading into unexplored space. Miraen believes the Spore Network is responding to your presence.",
    has_phases: false,
    has_choices: false,
    reward_credits: 2500,
    reward_xp: 250,
  });

  // Mission 5: Alarion's Mandate
  await updateMission(5, {
    title: "Alarion's Mandate",
    description:
      "Answer the High Sage's summons aboard the Star Seeker and deliver the cyrillium needed to power the fleet's departure from Agaricalis.",
    type: "meet_npc",
    objectives: { npcId: "alarion", npcName: "High Sage Alarion" },
    chapter: 1,
    lore_text:
      "High Sage Alarion's summons arrives on a priority channel, his bioluminescent sigil pulsing with the amber urgency reserved for matters of species survival. You have been chosen — not for your rank, but for what Miraen reported: your ship resonated with the Spore Network in ways no other vessel has. The Star Seeker's bridge is a cathedral of living architecture, fungal buttresses arcing overhead, their surfaces rippling with soft phosphorescence.\n\n\"You stand in the heart of a dying world's last hope. Agaricalis's sun collapses inward, and our mycelial forests wither beneath its radiation. The exodus cannot wait — but the Star Seeker's departure drives require cyrillium. Refined crystal that channels the energy of living systems. Without it, we remain trapped in the gravity well of a dying star.\"\n\nAlarion's ancient tendrils sway with the slow gravity of deep thought. Behind him, holographic projections show the sun — a seething, collapsing mass with perhaps months left before it devours the inner worlds. He turns his luminous gaze to you.\n\n\"You have proven yourself resourceful. Now prove yourself essential. Bring us the cyrillium, and the exodus begins.\"",
    recap_text:
      "You discovered a dormant fragment of the ancient Spore Network. Your ship's unusual resonance with the mycelial web has drawn the attention of High Sage Alarion himself.",
    has_phases: true,
    has_choices: false,
    reward_credits: 3000,
    reward_xp: 300,
  });

  // Mission 6: Departing Agaricalis
  await updateMission(6, {
    title: "Departing Agaricalis",
    description:
      "Fight through desperate scavengers and navigate the departure corridor as the Muscarian fleet leaves its dying homeworld forever.",
    type: "survive_ambush",
    objectives: { ambushesToSurvive: 1 },
    chapter: 1,
    lore_text:
      "The Star Seeker's engines hum with freshly loaded cyrillium, but not everyone accepted the exodus. Entire communities chose to stay — to die with Agaricalis rather than face the unknown. Some of those who stayed have turned desperate, forming scavenger bands that prey on departing ships, stripping them of supplies and fuel. The departure corridor is a gauntlet. Agaricalis's swollen sun fills the viewport with angry crimson light, casting long shadows across debris fields left by ships that did not make it.\n\nYour sensors scream warnings as scavenger signatures converge on your position. These are not pirates — they are your own people, driven to desperation by a dying world and the terror of what lies beyond it.\n\n\"Shields are holding, but we cannot fight and run at the same time. Choose quickly — engage or evade. Either way, the departure corridor has three sectors of open space between us and the fleet rally point. I suggest we move.\"\n\nBehind you, the Star Seeker begins its ponderous acceleration away from the only home the Muscarians have ever known. There is no going back.",
    recap_text:
      "You delivered cyrillium to High Sage Alarion, fueling the Star Seeker's departure drives. The fleet is ready to leave Agaricalis — but not everyone is willing to let them go.",
    has_phases: true,
    has_choices: false,
    reward_credits: 3500,
    reward_xp: 350,
  });

  // Mission 7: The Dying Star
  await updateMission(7, {
    title: "The Dying Star",
    description:
      "Document the dying star's radiation patterns for Miraen's ecological archive, then decide who receives the data.",
    type: "scan_sectors",
    objectives: { scansRequired: 3 },
    chapter: 1,
    lore_text:
      'As the fleet clears the departure corridor, the weight of loss settles over every ship like a funeral shroud. Agaricalis is behind you — a world reduced to memory. But Miraen requests one final act before it is lost forever: a comprehensive scan of the dying star. Three sectors around the corona must be surveyed, each requiring your ship to endure punishing radiation bursts.\n\n"This is our gift to the galaxy. We could not save our world, but we can ensure its death teaches others to save theirs. The radiation patterns contain millennia of stellar evolution data — irreplaceable once the star collapses."\n\nCaelum reinforces the hull plating and mutters prayers to engineering gods you are fairly certain he invented. The scans are dangerous, but the data is priceless. And the data is also powerful. The Vedic civilization, whose scouts have been observing the exodus from a distance, have expressed interest.\n\n"Sharing this data could build bridges with a potential ally. Or we keep it classified — a strategic advantage for our people alone. The choice will be yours, pilot."',
    recap_text:
      "You fought through scavenger bands and navigated the departure corridor. The Muscarian fleet has left Agaricalis forever, but Miraen wants one last gift from the dying star.",
    has_phases: true,
    has_choices: true,
    reward_credits: 4000,
    reward_xp: 400,
  });

  // Mission 8: Star Seeker's Wake
  await updateMission(8, {
    title: "Star Seeker's Wake",
    description:
      "Follow in the Star Seeker's wake through 5 sectors as the fleet enters the unknown. Witness Elenion's address to the fleet.",
    type: "visit_sector",
    objectives: { sectorsToVisit: 5 },
    chapter: 1,
    lore_text:
      'The Star Seeker carves a luminous trail through uncharted space, its mycelial drives leaving a faint bioluminescent wake that your instruments can follow. Five sectors of unknown territory lie between the fleet and its first waypoint — a region of gravitational stability where the convoy can regroup and take stock. As you travel, the magnitude of what has happened settles into your bones. Agaricalis is gone. The great fungal forests, the bioluminescent caverns, the singing spore-fields at twilight — all consumed.\n\nElenion, the expedition\'s diplomat, broadcasts an address to every ship in the fleet. His voice is steady, measured, carrying the cadence of a leader who understands that hope is more precious than cyrillium.\n\n"We are not refugees. We are seeds. Carried on the stellar wind to take root in new soil. The Spore Network once connected every corner of this galaxy. We will find it again, and when we do, we will grow."\n\nThe fleet answers with a chorus of running lights — every ship flickering its externals in the Muscarian gesture of solidarity. You are no longer alone in the dark.',
    recap_text:
      "Miraen's stellar decay data has been archived. The fleet has left the Agaricalis system for the last time, venturing into the unknown.",
    has_phases: false,
    has_choices: false,
    reward_credits: 4000,
    reward_xp: 400,
  });

  // =====================================================================
  // CHAPTER 2: THE VEDIC ENIGMA (Missions 9-16)
  // The fleet encounters a wormhole anomaly and makes first contact with
  // the ancient Vedic civilization.
  // =====================================================================

  // Mission 9: Anomaly Detected
  await updateMission(9, {
    title: "Anomaly Detected",
    description:
      "Scan 5 sectors to map a spatial anomaly that could be a wormhole — the fleet's first chance at a shortcut through unknown space.",
    type: "scan_sectors",
    objectives: { scansRequired: 5 },
    chapter: 2,
    lore_text:
      "Three weeks into the voyage, the fleet's long-range sensors detect something that should not exist: a stable gravitational anomaly radiating energy in patterns that match no known stellar phenomenon. The readings cascade across your instruments like a language you almost understand — mathematics folded into spacetime itself.\n\nMiraen's analysis suggests it could be a wormhole — a folded corridor through spacetime that would cut years off the journey. But wormholes are theoretical. The Muscarians have never encountered one, and the Spore Network's ancient records are fragmentary at best.\n\n\"Only one way to find out. Scan it from every angle. Five sectors of readings should tell us whether it is a shortcut to salvation or a gravitational meat grinder. If it is stable, we go through. If it is not — we go around, and add six months to the journey.\"\n\nFive sectors must be scanned to map the anomaly's gravitational topology. Each reading brings the picture into sharper focus, and with each scan, the anomaly pulses as if aware it is being watched.",
    recap_text:
      "Elenion rallied the fleet with his address. Now, weeks into the voyage, long-range sensors have detected an impossible anomaly ahead.",
    has_phases: false,
    has_choices: false,
    reward_credits: 2000,
    reward_xp: 200,
  });

  // Mission 10: Wormhole Transit
  await updateMission(10, {
    title: "Wormhole Transit",
    description:
      "Navigate to the wormhole sector and survive the gravitational shear forces during transit.",
    type: "visit_sector",
    objectives: { sectorsToVisit: 1 },
    chapter: 2,
    lore_text:
      "Your scans confirm the impossible: a stable wormhole, its event horizon shimmering like oil on water. The aperture is wide enough for the Star Seeker, but the gravitational shear at the throat would tear an unprepared vessel to atoms.\n\n\"I have recalibrated the shields to compensate for the shear forces. I make no promises. But the numbers say we can survive the crossing — if the pilot is good enough. No pressure.\"\n\nThe wormhole's interior is a cathedral of warped light. Spacetime folds around your ship like origami, and your instruments go haywire — compass spinning, chronometer stuttering, hull sensors reporting temperatures that range from absolute zero to the surface of a star in the span of a heartbeat. Something moves in the distortion. Energy constructs — shapes that are almost biological, almost mechanical — materialize from the gravitational turbulence, drawn to your ship's electromagnetic signature like moths to flame. Whether they are guardians, parasites, or echoes of the wormhole's creation, they are hostile. You must survive the crossing.",
    recap_text:
      "Your scans confirmed the anomaly is a stable wormhole. The fleet has committed to transit — but the crossing will not be gentle.",
    has_phases: true,
    has_choices: false,
    reward_credits: 3000,
    reward_xp: 300,
  });

  // Mission 11: First Contact
  await updateMission(11, {
    title: "First Contact",
    description:
      "Meet Valandor, elder scholar of the Vedic civilization, in the first encounter between Muscarian and Vedic peoples.",
    type: "meet_npc",
    objectives: { npcId: "valandor", npcName: "Valandor" },
    chapter: 2,
    lore_text:
      'The wormhole deposits you in a region of space that feels fundamentally different. The stars here are older, their light carrying a warmth that suggests long stability. And you are not alone. A vessel of extraordinary elegance hangs in the void — its hull inscribed with geometric patterns that shift and rearrange as you watch, as if the ship itself is thinking.\n\nA hail arrives, not on any standard frequency but through a harmonic resonance that makes your ship\'s hull vibrate like a tuning fork. The message resolves into a face: ancient, serene, with eyes that hold the patience of geological time.\n\n"We have been watching the wormhole for centuries. We did not expect fungi to emerge from it."\n\nThere is amusement in his voice, but no condescension. Valandor, Elder Scholar of the Vedic Concord, gestures with crystalline fingers that refract the light of distant stars.\n\n"Come. We have much to discuss about the nature of the web you carry within your ships. The Spore Network whispers your name — or something close to it. I would know why."',
    recap_text:
      "You survived the wormhole transit and emerged in unknown space. An alien vessel is hailing you — elegant, ancient, and waiting.",
    has_phases: false,
    has_choices: false,
    reward_credits: 2500,
    reward_xp: 250,
  });

  // Mission 12: The Philosopher's Test
  await updateMission(12, {
    title: "The Philosopher's Test",
    description:
      "Investigate Vedic artifacts at Valandor's request and share your interpretation of their purpose.",
    type: "scan_sectors",
    objectives: { scansRequired: 3 },
    chapter: 2,
    lore_text:
      'Valandor does not simply offer alliance — the Vedic do not operate that way. Trust must be earned through understanding, and understanding must be demonstrated through interpretation. He invites you aboard his vessel, a floating library where knowledge is stored not in data banks but in crystalline lattices that sing when touched. Three artifacts rest on a pedestal of woven light, each ancient beyond reckoning.\n\n"Tell me what you see. Not with your instruments — with your understanding. Are these tools of creation, built to nurture life across the cosmos? Or instruments of defense, designed to shield civilizations from existential threats?"\n\nThe artifacts shift between states: solid, liquid, energy, and something your instruments cannot classify. They hum with residual power that makes the hair on your arms stand on end. Valandor watches you with the patience of someone who has waited centuries for this conversation.\n\n"Your answer will tell me whether your people see the universe as a garden to be tended or a fortress to be defended. Neither answer is wrong — but both have consequences that will echo long after you and I are dust."',
    recap_text:
      "You made first contact with Valandor and the Vedic civilization. He has invited you to prove your understanding through interpretation of ancient artifacts.",
    has_phases: true,
    has_choices: true,
    reward_credits: 3500,
    reward_xp: 350,
  });

  // Mission 13: Cyrillium Veins
  await updateMission(13, {
    title: "Cyrillium Veins",
    description:
      "Survey surrounding sectors for cyrillium deposits and deliver samples to Miraen's laboratory for analysis.",
    type: "scan_sectors",
    objectives: { scansRequired: 4 },
    chapter: 2,
    lore_text:
      "The Vedic have revealed that cyrillium — the crystal the Muscarians use to fuel their mycelial drives — exists in abundance in this region of space. But the deposits are deep, woven into asteroid fields and planetary crusts in patterns that suggest they were placed deliberately. Four sectors must be surveyed with specialized instruments to locate the richest veins.\n\n\"Cyrillium is not a natural mineral. It is a byproduct of the Spore Network's growth — crystallized mycelial energy. Wherever we find cyrillium, we find traces of the old network. And wherever we find the old network, we find clues about who built it and why it fell silent.\"\n\nMiraen's tendrils quiver with the excitement of a scientist on the edge of a paradigm shift. Once the geological survey is complete and the richest veins are located, you must extract samples and deliver fifteen units to her laboratory aboard the Star Seeker. The crystals pulse faintly in your cargo hold, as if remembering what they once were — threads of a living web that spanned galaxies.",
    recap_text:
      "Valandor's test revealed much about your character. Now Miraen has a new lead — cyrillium deposits in this region may be remnants of the ancient Spore Network itself.",
    has_phases: true,
    has_choices: false,
    reward_credits: 3000,
    reward_xp: 300,
  });

  // Mission 14: Crystal Resonance (Vedic Crystals — new commodity introduction)
  await updateMission(14, {
    title: "Crystal Resonance",
    description:
      "Receive Vedic crystals from a Vedic emissary, sell 20 units to formalize trade, and encounter the Tar'ri's opinion on your new merchandise.",
    type: "visit_sector",
    objectives: { sectorsToVisit: 4 },
    chapter: 2,
    lore_text:
      'Diplomacy moves on many legs, and commerce is the steadiest. Valandor has arranged for Vedic crystal merchants to open limited trade with the Muscarian fleet — a gesture of goodwill, but also a test. The Vedic want to see how the Muscarians conduct business: fairly, or exploitatively.\n\nVedic crystals are remarkable. Unlike cyrillium, which channels biological energy, these crystals store information — memories, calculations, even emotions encoded in their lattice structure. A single crystal the size of your fist can hold the collected wisdom of a Vedic scholar\'s entire lifetime.\n\n"Twenty units must change hands to formalize the trade agreement. I am Sella Brightvane, and I will be your counterpart in these negotiations. Know that I have traded with species older than your recorded history. Impress me."\n\nFly through a few sectors and the Vedic emissary will find you. Once you have crystals, sell 20 units at outposts to complete the trade agreement.',
    recap_text:
      "Miraen's cyrillium analysis confirmed that the crystal is a byproduct of the ancient Spore Network. Meanwhile, the Vedic have opened limited trade channels.",
    has_phases: true,
    has_choices: false,
    reward_credits: 3500,
    reward_xp: 350,
  });

  // Mission 15: Valandor's Warning (escort convoy)
  await updateMission(15, {
    title: "Valandor's Warning",
    description:
      "Escort a Vedic data caravan through 10 sectors. Stay with the caravan — it won't wait for stragglers.",
    type: "escort",
    objectives: { caravansToEscort: 1 },
    chapter: 2,
    lore_text:
      'Valandor\'s demeanor has changed. The serene patience is gone, replaced by something you have not seen in the elder scholar before: urgency. He shares intelligence that the Vedic have kept classified for centuries — something is stirring in the outer regions of explored space. Communications have gone dark across multiple outposts. Ships have vanished without distress signals.\n\n"We do not know what it is. But we know it is not natural. And we know it is getting closer. I tell you this not to frighten you, but because I have learned something unexpected: I trust you."\n\nA Vedic data caravan — three vessels carrying archived knowledge from the threatened outposts — must be escorted through ten sectors to safety. The caravan moves every seven seconds and will not wait. On the sixth waypoint, expect trouble — the jamming zones have been worst in this corridor.\n\n"Protect these vessels. They carry the memory of worlds that may no longer exist. Do not make me regret placing this trust in Muscarian hands."',
    recap_text:
      "Crystal trade has strengthened Muscarian-Vedic ties, but Valandor has grown troubled. Something is threatening Vedic outposts in the outer regions.",
    has_phases: false,
    has_choices: false,
    reward_credits: 4000,
    reward_xp: 400,
  });

  // Mission 16: The Calvatian Gate (eavesdrop mission)
  await updateMission(16, {
    title: "The Calvatian Gate",
    description:
      "Gather intelligence at a star mall cantina before crossing the boundary into Calvatian space.",
    type: "visit_starmall",
    objectives: { sectorsToVisit: 1 },
    chapter: 2,
    lore_text:
      "Before crossing the boundary into the Calvatian Expanse, Elenion has ordered the fleet to make a final supply stop and gather intelligence. The star malls along the frontier are the last outposts of known civilization — waypoints where traders, smugglers, and refugees share rumors about what lies beyond the charts.\n\nValandor's scouts have reported unusual traffic at these outposts: pirates, mercenaries, and unaffiliated captains arriving in numbers that suggest something is drawing them toward the boundary. The Vedic are concerned. Pirates don't gather without cause.\n\n\"Go to the nearest star mall. Buy a drink in the cantina — you'll look out of place otherwise — and listen. The frontier cantinas are where secrets are sold cheapest. If someone knows what's happening at the boundary, you'll hear about it over a glass of void stout.\"",
    recap_text:
      "You escorted the Vedic data caravan to safety. Before crossing into the Calvatian Expanse, intelligence must be gathered at a frontier cantina.",
    has_phases: true,
    has_choices: false,
    reward_credits: 5000,
    reward_xp: 500,
  });

  // =====================================================================
  // CHAPTER 3: THE CALVATIAN ODYSSEY (Missions 17-24)
  // The fleet enters a new galaxy and encounters the Tar'ri traders and
  // the Kalin warrior-engineers. A Precursor artifact forces a choice.
  // =====================================================================

  // Mission 17: New Horizons
  await updateMission(17, {
    title: "New Horizons",
    description:
      "Explore 8 sectors of the Calvatian Galaxy, charting unknown territory for the fleet's navigation archives.",
    type: "visit_sector",
    objectives: { sectorsToVisit: 8 },
    chapter: 3,
    lore_text:
      "The Calvatian Galaxy is nothing like Agaricalis's home cluster. The stars burn hotter, the nebulae glow with colors your instruments struggle to classify, and the Spore Network's pulse — that constant companion since your first launch — has changed. It is stronger here. Faster. As if the network in Calvatia never went dormant at all.\n\nEight sectors must be charted to give the fleet a foundation for navigation. Each jump reveals new wonders: crystalline asteroid fields that sing in radio frequencies, gas giants with atmospheres that form temporary faces, and in every sector, the unmistakable trace of the living Spore Network threading through the void like roots through soil.\n\n\"These readings suggest an active mycelial web — not just dormant fragments, but living, growing connections between star systems. If the Spore Network is alive in Calvatia, then whatever killed it in our home space never reached here. We are walking through the garden our ancestors could only dream of.\"",
    recap_text:
      "The fleet crossed into the Calvatian Galaxy through the boundary. The Spore Network is alive here — stronger than anything recorded in Muscarian history.",
    has_phases: false,
    has_choices: false,
    reward_credits: 3000,
    reward_xp: 300,
  });

  // Mission 18: Tar'ri Traders
  await updateMission(18, {
    title: "Tar'ri Traders",
    description:
      "Meet the Tar'ri trade delegation and establish goodwill through commerce.",
    type: "meet_npc",
    objectives: { npcId: "kovax_prime", npcName: "Kovax Prime" },
    chapter: 3,
    lore_text:
      "First contact in Calvatia comes not with weapons but with a price list. The Tar'ri — a nomadic civilization of traders and merchants who navigate the galaxy in vast caravan-fleets — have been watching the Muscarian convoy since it crossed the boundary. Their lead negotiator hails the fleet with a message that is equal parts greeting and sales pitch.\n\n\"New faces, new markets. I am Kovax Prime, and I speak for the Tar'ri Trade Collective in this sector. We trade in everything: goods, information, favors, futures. If it has value, we move it. If it does not, we find a way to make it valuable.\"\n\nThe Tar'ri vessel gleams with burnished alloys from a dozen different worlds, its hull a patchwork of traded components that somehow forms a cohesive and formidable ship. Kovax's four-fingered hands are steepled in the Tar'ri gesture of commercial intent. Behind him, display screens show real-time commodity prices from markets across the galaxy.\n\n\"Fifteen units of trade goods will establish your people's credit with us. Consider it a down payment on the future. The Tar'ri remember those who deal fairly — and those who do not.\"",
    recap_text:
      "Exploration of Calvatia revealed an active Spore Network and abundant resources. Now a new civilization has made contact — the Tar'ri, nomadic traders who smell opportunity.",
    has_phases: true,
    has_choices: false,
    reward_credits: 3500,
    reward_xp: 350,
  });

  // Mission 19: Trade Diplomacy
  await updateMission(19, {
    title: "Trade Diplomacy",
    description:
      "Deliver relief supplies to a struggling Tar'ri outpost, then prove your reliability with a timed tech delivery.",
    type: "deliver_cargo",
    objectives: { commodity: "food", quantity: 20 },
    chapter: 3,
    lore_text:
      "Kovax Prime's commercial facade cracks when word arrives that one of the Tar'ri's frontier outposts is on the verge of starvation. A supply chain disruption — the cause unclear — has left the settlement without provisions for weeks. The Tar'ri trade network is vast but brittle; when one link breaks, the downstream effects cascade.\n\n\"We do not ask for charity. This is a contract. Deliver twenty units of food to our outpost, and the Tar'ri will remember. Then prove you can handle time-sensitive cargo — tech components for their atmospheric processors, or the settlement's air recyclers fail.\"\n\nJyn Coppervein, the outpost's quartermaster, is waiting at the dock with hollow eyes and a manifest that grows shorter by the hour. The station's corridors echo with the silence of rationing. Children peer out from behind bulkheads, their faces gaunt but curious — they have never seen a Muscarian before. This is not just a supply run. It is the moment that determines whether the Tar'ri see you as traders or as allies.",
    recap_text:
      "You met Kovax Prime and established initial trade relations with the Tar'ri. But their trade network has a weak link — a frontier outpost is starving.",
    has_phases: true,
    has_choices: false,
    reward_credits: 4000,
    reward_xp: 400,
  });

  // Mission 20: Distress Signal
  await updateMission(20, {
    title: "Distress Signal",
    description:
      "Investigate a military distress signal from unknown space and follow the debris trail to its source.",
    type: "scan_sectors",
    objectives: { scansRequired: 2 },
    chapter: 3,
    lore_text:
      "Between Tar'ri trade runs, your ship picks up something that makes your blood run cold: a distress signal on a military frequency, repeating with the mechanical precision of an automated beacon. The pattern is not Tar'ri, not Vedic, not anything in the Muscarian database. Something new. Something wounded.\n\nThe signal leads to a debris field — twisted metal, scorched hull plating, and the unmistakable residue of weapons fire. Whatever happened here was not an accident. It was a battle, and one side lost badly. Fragments of the defeated vessel drift in a trail that leads deeper into uncharted space, like breadcrumbs left by a dying hand.\n\n\"The wreckage composition shows heavy alloys, reinforced bulkheads, weapons hardpoints built for sustained combat. This was a warship — and it was taken apart by something powerful enough to overwhelm military-grade defenses. Follow the debris trail. Whoever sent that signal may still be alive.\"",
    recap_text:
      "You saved the Tar'ri outpost with critical food and tech deliveries. Now a distress signal on an unknown military frequency is drawing you deeper into Calvatia.",
    has_phases: true,
    has_choices: false,
    reward_credits: 4500,
    reward_xp: 450,
  });

  // Mission 21: The Kalin Rescue
  await updateMission(21, {
    title: "The Kalin Rescue",
    description:
      "Escort a crippled Kalin warship through hostile sectors to safety and meet its commander.",
    type: "visit_sector",
    objectives: { sectorsToVisit: 4 },
    chapter: 3,
    lore_text:
      'At the end of the debris trail, you find the source: a warship listing badly with its port engines trailing sparks and atmosphere venting from a dozen breaches. The vessel\'s design is unfamiliar — angular, brutalist, every surface reinforced beyond any reasonable specification. Built by a species that expects the universe to hit back.\n\nA face appears on your comm — scarred, proud, radiating the controlled fury of a soldier who has never asked for help and hates that he must now.\n\n"Muscarian vessel. I am Commander Raxus of the Kalin Defense Coalition. We require... assistance."\n\nThe word seems to physically pain him. His silicon-carbide skin catches the emergency lighting, giving his face the look of carved granite. Four sectors of hostile territory lie between you and safety. The Kalin warship can barely maintain speed, and its weapons are offline. You are its only defense.\n\n"Escort us to Tar\'ri space, and the Kalin will acknowledge the debt. Among my people, debts are bonds stronger than any treaty. Do this, and you will have earned something no outsider has ever held: Kalin trust."',
    recap_text:
      "The debris trail led to a crippled Kalin warship. Commander Raxus has swallowed his pride and asked for help — the first time a Kalin officer has ever done so with a stranger.",
    has_phases: true,
    has_choices: false,
    reward_credits: 5000,
    reward_xp: 500,
  });

  // Mission 22: Raxus's Honor Debt
  await updateMission(22, {
    title: "Raxus's Honor Debt",
    description:
      "Destroy 3 pirate raiders that have been harassing Kalin supply lines, repaying the honor debt Raxus now owes.",
    type: "destroy_ship",
    objectives: { shipsToDestroy: 3 },
    chapter: 3,
    lore_text:
      'In Kalin culture, an honor debt is a bond stronger than any treaty. Raxus owes you his life, his ship, and the lives of his crew — a debt that burns in his warrior\'s heart like a brand. He offers you the only thing a Kalin commander can: the chance to fight alongside him.\n\nPirate raiders have been hitting Kalin supply convoys with increasing boldness. Three raider captains in particular have become notorious, operating from hidden bases in the asteroid fields. Their ships are fast, aggressive, and armed with stolen military hardware.\n\n"Among my people, bonds are forged in fire. I do not ask you to fight for me — I ask you to fight with me. Three raider captains terrorize these lanes. Destroy them, and the Kalin fleet will know your name. Let us see if Muscarian fire burns as hot as ours."\n\nRaxus straps on his combat armor with the practiced efficiency of a soldier who has done this ten thousand times. His eyes burn with something that might be anticipation, or might be the closest thing a Kalin gets to joy.',
    recap_text:
      "You escorted the Kalin warship to safety and met Commander Raxus. He has acknowledged an honor debt — and the Kalin pay their debts in blood and fire.",
    has_phases: false,
    has_choices: false,
    reward_credits: 5000,
    reward_xp: 500,
  });

  // Mission 23: The Ancient Vault
  await updateMission(23, {
    title: "The Ancient Vault",
    description:
      "Survey the area around Lyra Starwind's archaeological discovery and investigate artifact readings within a Precursor vault.",
    type: "scan_sectors",
    objectives: { scansRequired: 5 },
    chapter: 3,
    lore_text:
      'Lyra Starwind, the fleet\'s archaeologist, has been following threads in the Spore Network that led her to something extraordinary — energy readings that predate every known civilization, including the Vedic. Deep within an asteroid field, hidden behind layers of gravitational interference, lies a structure she calls a Precursor vault.\n\n"Whoever built the Spore Network left this behind. The vault is sealed, but the energy readings suggest it contains artifacts of immense power. We need a full survey of the surrounding sectors to map the vault\'s defensive perimeter — five sectors of readings — and then someone brave enough or foolish enough to go inside."\n\nThe survey reveals that the vault is not just old — it is active. Defensive systems still function after eons, and the three artifact signatures within pulse with an energy that makes your Spore Network resonance instruments sing like a choir. Whatever the Precursors locked away in this place, they intended it to be found. But only by someone who earned the right.\n\n"This could be the greatest discovery in recorded history. I need you to help me prove it."',
    recap_text:
      "You proved yourself to Commander Raxus by destroying pirate raiders together. Now Lyra Starwind has found something ancient and powerful hidden in an asteroid field.",
    has_phases: true,
    has_choices: false,
    reward_credits: 5500,
    reward_xp: 550,
  });

  // Mission 24: Artifact Unearthed
  await updateMission(24, {
    title: "Artifact Unearthed",
    description:
      "Power the Precursor vault with cyrillium and make the most consequential decision of the journey so far: who receives the artifact.",
    type: "deliver_cargo",
    objectives: { commodity: "cyrillium", quantity: 10 },
    chapter: 3,
    lore_text:
      'The Precursor vault\'s doors respond to cyrillium — the crystallized energy of the Spore Network recognizes its own creation. As you feed refined crystals into the vault\'s intake matrix, the structure awakens. Dormant lights cascade through corridors that have not seen movement in millions of years. The air inside tastes of ozone and deep time.\n\nAt the vault\'s heart, resting on a pedestal of woven mycelial threads turned to stone, lies the artifact. It is beautiful and terrifying — a device that pulses with the same energy as the Spore Network but concentrated, refined, amplified. Lyra cannot even classify it.\n\n"This artifact represents the legacy of those who came before us. It should remain in Muscarian custody — studied on our own terms, balanced between knowledge and defense. We are the inheritors of the Spore Network. This is our birthright."\n\n"Birthright? While the galaxy burns? Whatever destroyed those Vedic outposts is still out there. Hand this to the Kalin military, and we will forge it into a shield that protects everyone — including your precious Network."\n\nThe artifact hums between them, indifferent to politics, patient as stone. This choice will echo through the rest of your journey. Choose wisely.',
    recap_text:
      "Lyra's vault survey revealed a Precursor structure containing artifacts of immense power. The vault responds to cyrillium — the Spore Network's own crystallized energy.",
    has_phases: true,
    has_choices: true,
    reward_credits: 6000,
    reward_xp: 600,
  });

  // =====================================================================
  // CHAPTER 4: THE SHADOW OF WAR (Missions 25-31)
  // Political tensions rise as the coalition debates how to use the
  // artifact. The Shadow Syndicate emerges as a threat.
  // =====================================================================

  // Mission 25: The Debate
  await updateMission(25, {
    title: "The Debate",
    description:
      "Hear both sides of the growing political divide as Kovax argues for trade leverage and Raxus argues for weaponization.",
    type: "meet_npc",
    objectives: { npcId: "kovax_prime", npcName: "Kovax Prime" },
    chapter: 4,
    lore_text:
      "The artifact's discovery has fractured the fragile coalition. What began as cooperation between the Muscarians, Vedic, Tar'ri, and Kalin has devolved into a political crisis. Every faction wants the Precursor technology, and every faction has a compelling argument for why they should have it.\n\nKovax Prime corners you in a Tar'ri trade hall, his four-fingered hands gesturing with the precision of a merchant who has closed a thousand deals.\n\n\"The artifact is leverage. With it, we control the market for ancient technology across three galaxies. We do not need to weaponize it — we need to monetize it. Let the Tar'ri trade network distribute its benefits, and everyone profits. That is not greed — that is pragmatism.\"\n\nRaxus is waiting in the corridor outside, as if he knew exactly where Kovax would make his pitch. The Kalin commander's voice is iron and fire.\n\n\"Trade leverage? While something hunts us in the dark? Those Vedic outposts did not go silent because of market forces. These artifacts are shields and swords. The Tar'ri can sell trinkets. The Kalin will keep you alive.\"",
    recap_text:
      "The artifact decision has fractured the coalition. Each faction believes they should control the Precursor technology, and the arguments are growing heated.",
    has_phases: true,
    has_choices: false,
    reward_credits: 4000,
    reward_xp: 400,
  });

  // Mission 26: Tar'ri Leverage
  await updateMission(26, {
    title: "Tar'ri Leverage",
    description:
      "Supply Tar'ri manufacturing facilities with tech components and intercept smuggled artifact fragments on the black market.",
    type: "deliver_cargo",
    objectives: { commodity: "tech", quantity: 25 },
    chapter: 4,
    lore_text:
      "While the politicians debate, the black market acts. Word of the Precursor artifact has leaked — no one knows how — and fragments of similar technology have begun appearing in underground trade channels. Someone is smuggling pieces of the coalition's most valuable discovery to the highest bidder.\n\n\"Someone is profiting from our discovery, and it is not us. My intelligence network has identified two smuggler caravans carrying artifact fragments. Intercept them. Whatever is buying Precursor technology in the shadows, it is not doing so for academic interest.\"\n\nThe Tar'ri manufacturing facilities need twenty-five units of tech components to produce countermeasures — devices that can detect and track artifact fragments across the trade network. Without these tools, the smugglers will strip the Calvatian Galaxy of every Precursor remnant before the coalition can act. You load your cargo hold and set course for the first smuggler intercept point, where stolen fragments of something older than stars are changing hands in the darkness between worlds.",
    recap_text:
      "You heard both Kovax and Raxus make their cases. Meanwhile, Precursor artifact fragments have appeared on the black market — someone is profiting from the coalition's discovery.",
    has_phases: true,
    has_choices: false,
    reward_credits: 5000,
    reward_xp: 500,
  });

  // Mission 27: Kalin War Games
  await updateMission(27, {
    title: "Kalin War Games",
    description:
      "Prove your combat readiness in Kalin military exercises — destroy target drones and survive an elite ambush simulation.",
    type: "destroy_ship",
    objectives: { shipsToDestroy: 4 },
    chapter: 4,
    lore_text:
      'Commander Raxus has extended a rare invitation: participation in Kalin war games. These exercises are how the Kalin test allies — not through words or trade, but through simulated combat that feels disturbingly real. The weapons are dialed down to non-lethal levels, but the tactics are genuine, and the Kalin do not pull punches.\n\n"Four target drones will test your aim and reflexes. Patterns drawn from actual engagement data — not simulations, real combat recordings from the frontier. Show me what Muscarian pilots are worth."\n\nFour drones swarm into position, their movement patterns unpredictable and aggressive. Raxus observes from the command deck, his arms crossed, his expression carved from the same silicon-carbide as his skin. But the drones are only the first phase. The Kalin believe that true readiness is tested not in fair fights but in unfair ones.\n\n"You destroyed the targets. Good. Now survive what comes next. My elite squadron is dropping from concealment — the best pilots in the Kalin fleet. They will not go easy on you. Survive their ambush, and you earn a title no outsider has ever held: Kalin-forged."',
    recap_text:
      "You supplied the Tar'ri and intercepted artifact smugglers. Now Commander Raxus wants to test your combat readiness in Kalin military exercises.",
    has_phases: true,
    has_choices: false,
    reward_credits: 5500,
    reward_xp: 550,
  });

  // Mission 28: Whispers in the Dark
  await updateMission(28, {
    title: "Whispers in the Dark",
    description:
      "Investigate reports of deliberate communications jamming in deep space and scan the anomalous sectors for the source.",
    type: "scan_sectors",
    objectives: { scansRequired: 3 },
    chapter: 4,
    lore_text:
      "Something is wrong in the deep sectors. Communications have been dropping across the coalition — not random failures, but deliberate, surgical jamming that targets specific frequencies and protocols. The pattern is too precise to be natural, too widespread to be the work of petty pirates.\n\nThree separate incidents demand investigation: a Vedic research station that went silent for six hours before resuming contact with corrupted data in its archives, a Tar'ri trade convoy that received phantom navigation coordinates leading them into an asteroid field, and a Kalin patrol that reported being shadowed by a vessel that did not appear on any sensor sweep.\n\n\"You are looking in the right places, pilot. But you are looking with the wrong eyes. The Shadow Syndicate does not leave footprints — we leave absences. Holes in the data where information used to be. I can help you see what is missing, but my help comes with conditions. It always does.\"\n\nThe interference reports lead deeper into uncharted space, where the stars grow thin and the Spore Network's pulse takes on an unfamiliar cadence — not the rhythm of growth, but something watchful. Something waiting.",
    recap_text:
      "You earned Kalin respect in their war games. But strange things are happening across the coalition — deliberate jamming, phantom ships, corrupted data. The shadows are moving.",
    has_phases: true,
    has_choices: false,
    reward_credits: 6000,
    reward_xp: 600,
  });

  // Mission 29: Espionage
  await updateMission(29, {
    title: "Espionage",
    description:
      "Sabotage a Shadow Syndicate listening post and decide what to do with the intercepted coalition communications.",
    type: "destroy_ship",
    objectives: { shipsToDestroy: 1 },
    chapter: 4,
    lore_text:
      'The investigation paid off. Deep in the anomalous sectors, hidden behind layers of electronic countermeasures, you found it: a Shadow Syndicate listening post — a bristling array of antennae and processors that has been intercepting coalition communications for months. Every strategic discussion, every trade negotiation, every military deployment — the Syndicate has heard it all.\n\n"I gave you the coordinates. You are welcome. Now listen carefully: the post must be destroyed, but the data banks are intact. Volumes of intercepted communications. Names, dates, coordinates, plans. Everything the Syndicate knows about your precious coalition."\n\nViper Nox\'s holographic image flickers with the interference from the post\'s own jamming field. Her smile is the smile of someone who profits from chaos and sleeps soundly afterward.\n\n"You can destroy the data — clean, simple, no loose ends. Or you can copy it first. Learn what the Syndicate knows, who they have been selling to, what their endgame is. But copying takes time. And the Syndicate will know you were here. They will come for you. Clean or compromised, pilot. Your call."',
    recap_text:
      "Your investigation uncovered a Shadow Syndicate listening post that has been intercepting coalition communications for months. Viper Nox gave you the coordinates — for a price.",
    has_phases: true,
    has_choices: true,
    reward_credits: 7000,
    reward_xp: 700,
  });

  // Mission 30: The Arms Race
  await updateMission(30, {
    title: "The Arms Race",
    description:
      "Trade tech components to supply Caelum's weapon prototypes and deliver the finished weapons to a secure testing facility.",
    type: "trade_units",
    objectives: { unitsToTrade: 30 },
    chapter: 4,
    lore_text:
      'The Syndicate listening post confirmed what the coalition feared: they are not the only ones interested in Precursor technology. Someone — or something — has been systematically collecting artifact fragments across the Calvatian Galaxy, and the Syndicate was helping them do it. The threat is real, and the coalition is not ready.\n\n"I have been working around the clock. My latest designs combine Muscarian mycelial resonance with Kalin weapons engineering and Vedic energy focusing — a hybrid approach that no single civilization could have achieved alone. I need thirty units of tech components, the best you can find. And once the prototypes are ready, they need to reach a secure testing facility before the Syndicate figures out what we are building."\n\nCaelum\'s engineering bay is a whirlwind of sparks, muttered equations, and empty ration packs. Schematics cover every surface — weapon designs that blend organic Muscarian technology with the brutal efficiency of Kalin engineering and the elegant precision of Vedic crystal focusing. The prototypes glow faintly on his workbench, humming with potential. The arms race has begun. Whatever is coming, the coalition must be ready to meet it with fire.',
    recap_text:
      "You dealt with the Syndicate listening post. The intercepted data revealed a coordinated effort to collect Precursor artifacts across the galaxy. The coalition needs weapons.",
    has_phases: true,
    has_choices: false,
    reward_credits: 7000,
    reward_xp: 700,
  });

  // Mission 31: Drums of War
  await updateMission(31, {
    title: "Drums of War",
    description:
      "Escort the diplomatic convoy through contested space to the summit where Elenion will address the full coalition.",
    type: "deliver_cargo",
    objectives: { commodity: "tech", quantity: 10 },
    chapter: 4,
    lore_text:
      "The time for half-measures is over. Elenion has called a summit — the first gathering of all four civilizations since the Muscarian exodus began. Representatives from the Vedic Concord, the Tar'ri Trade Collective, and the Kalin Defense Coalition will meet aboard a neutral station to decide the coalition's response to the Shadow Syndicate's escalation.\n\nBut the diplomatic convoy carrying the delegates must cross contested space to reach the summit. The Syndicate knows about the meeting — of course they do — and they will do everything in their power to prevent it. Six ships carry delegates who represent centuries of their civilization's accumulated wisdom and authority. Your escort is the only thing standing between the coalition's best chance at unity and a catastrophic ambush.\n\nAt the summit, Elenion stands at the podium, his voice carrying the weight of a civilization born from loss.\n\n\"We stand at the threshold of war or peace. The Spore Network once connected all life in this galaxy. It fell silent because those who built it could not agree on how to use its power. We will not make the same mistake. The drums of war are beating — but today, the coalition holds.\"\n\nCodex Entry Unlocked: The Gathering Storm.",
    recap_text:
      "Caelum's weapon prototypes are built and tested. The coalition has teeth now — but it needs a brain. Elenion has called a summit to unite the four civilizations.",
    has_phases: true,
    has_choices: false,
    reward_credits: 8000,
    reward_xp: 800,
  });

  console.log(
    "Seed 024: Updated story missions 1-31 with narrative content (Chapters 1-4)",
  );
}
