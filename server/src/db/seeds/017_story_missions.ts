import { Knex } from "knex";

function storyMissionId(n: number): string {
  return `e0000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}

export async function seed(knex: Knex): Promise<void> {
  // Only delete existing story missions
  await knex("mission_templates").where({ source: "story" }).del();

  const missions = [
    // =========================================================================
    // ACT 1: "Call of Destiny" (missions 1-10)
    // A fresh pilot discovers strange signals, learns the ropes, and stumbles
    // upon the first traces of the ancient Spore Network.
    // =========================================================================
    {
      id: storyMissionId(1),
      title: "First Light",
      description:
        "Launch from the station and visit 3 nearby sectors to calibrate your navigation systems.",
      type: "visit_sector",
      objectives: { sectorsToVisit: 3 },
      reward_credits: 1000,
      reward_xp: 100,
      difficulty: 1,
      act: 1,
      story_order: 1,
      prerequisite_mission_id: null,
      lore_text:
        "You grip the flight stick as your ship lifts away from Docking Platform Seven. The station shrinks behind you, and the vast tapestry of stars stretches in every direction. Your comm crackles with static — and beneath it, something else. A rhythmic pulse, almost organic, threading through the background radiation like a heartbeat.\n\nThe Spore Network. You have heard the rumors in cantinas and cargo bays: an ancient mycelial web that once connected every corner of the galaxy. Most pilots dismiss it as spacer folklore. But that pulse is real, and it is calling to you.",
      recap_text: "Your journey begins...",
      hints: [
        "Use the navigation panel to travel between sectors.",
        "Each sector you visit is automatically logged.",
      ],
    },
    {
      id: storyMissionId(2),
      title: "Supply Run",
      description:
        "Trade 5 units of any commodity at an outpost to stock your ship for the journey ahead.",
      type: "trade_units",
      objectives: { unitsToTrade: 5 },
      reward_credits: 1500,
      reward_xp: 150,
      difficulty: 1,
      act: 1,
      story_order: 2,
      prerequisite_mission_id: storyMissionId(1),
      lore_text:
        "Your navigation calibration picked up something unexpected: faint bioluminescent markers drifting through the void between sectors. Station archivists identify them as dormant spore clusters — remnants of the Network that once carried information across lightyears in an instant.\n\nBefore you chase ghosts, you need supplies. The frontier is unforgiving, and an empty cargo hold means an early grave.",
      recap_text:
        "You launched from the station and detected faint bioluminescent spore markers drifting through space.",
      hints: [
        "Dock at an outpost and use the trading interface to buy or sell goods.",
        "Check commodity prices — buy low, sell high.",
      ],
    },
    {
      id: storyMissionId(3),
      title: "Echo in the Dark",
      description:
        "Visit 3 distinct sectors to triangulate the source of the mysterious signal.",
      type: "visit_sector",
      objectives: { sectorsToVisit: 3 },
      reward_credits: 2000,
      reward_xp: 200,
      difficulty: 1,
      act: 1,
      story_order: 3,
      prerequisite_mission_id: storyMissionId(2),
      lore_text:
        'With your cargo hold stocked, you return to the mystery. The rhythmic pulse has grown stronger, resolving into distinct patterns that your ship computer flags as "non-random biological origin." Whatever is broadcasting, it is alive — or was, once.\n\nYour navigation computer can triangulate the signal by cross-referencing readings from multiple sectors. Each jump peels back another layer of static, revealing structures hidden beneath the noise.',
      recap_text:
        "You stocked supplies and confirmed the strange signal has a biological origin.",
      hints: [
        "Travel to different sectors to triangulate the signal.",
        "Use the move command or click adjacent sectors on the map.",
      ],
    },
    {
      id: storyMissionId(4),
      title: "The Mycorrhizal Fragment",
      description:
        "Visit 5 distinct sectors following the signal trail to locate the first Spore Network node.",
      type: "visit_sector",
      objectives: { sectorsToVisit: 5 },
      reward_credits: 2500,
      reward_xp: 250,
      difficulty: 1,
      act: 1,
      story_order: 4,
      prerequisite_mission_id: storyMissionId(3),
      lore_text:
        "Your scans reveal a trail — not a physical path, but a gradient of spore density increasing toward a point deep in unexplored space. The ancient network left breadcrumbs, and you are the first pilot in centuries to follow them.\n\nAs you travel, your ship sensors register micro-tremors in subspace. The mycelial threads are vibrating, responding to your presence. The Spore Network knows you are coming.",
      recap_text:
        "Sector scans revealed a trail of increasing spore density leading into unexplored space.",
      hints: [
        "Follow the mission marker through each sector.",
        "The signal gets stronger as you approach the destination.",
      ],
    },
    {
      id: storyMissionId(5),
      title: "Contested Cargo",
      description:
        "Deliver 10 units of cyrillium to the research station studying the fragment.",
      type: "deliver_cargo",
      objectives: { commodity: "cyrillium", quantity: 10 },
      reward_credits: 3000,
      reward_xp: 300,
      difficulty: 2,
      act: 1,
      story_order: 5,
      prerequisite_mission_id: storyMissionId(4),
      lore_text:
        'You find it: a massive crystalline structure pulsing with pale blue light, suspended in the void like a frozen jellyfish the size of a moon. The first Spore Network node, dormant but intact. A research station orbits nearby, hastily assembled by the Xenomycology Institute.\n\nDr. Thessa Vorn, the lead researcher, hails you immediately. "We have been monitoring that signal too. We need cyrillium to power our analysis arrays. Bring us what you can — this discovery could change everything."',
      recap_text:
        "You discovered the first Spore Network node — a massive crystalline structure orbited by a research station.",
      hints: [
        "Purchase cyrillium from outposts and deliver it to the research station.",
        "Check multiple outposts for the best cyrillium prices.",
      ],
    },
    {
      id: storyMissionId(6),
      title: "Pirate Interdiction",
      description:
        "Destroy 2 pirate ships that are raiding supply convoys near the research station.",
      type: "destroy_ship",
      objectives: { shipsToDestroy: 2 },
      reward_credits: 3500,
      reward_xp: 350,
      difficulty: 2,
      act: 1,
      story_order: 6,
      prerequisite_mission_id: storyMissionId(5),
      lore_text:
        'Word of the discovery has spread faster than light. Pirate clans, drawn by rumors of ancient technology worth fortunes on the black market, have begun harassing supply ships heading to the research station. Two freighters have already been lost.\n\nDr. Vorn is desperate. "We cannot continue our work if supplies cannot reach us. Those pirates will strip the node for parts if they get close enough. We need someone to clear the lanes."',
      recap_text:
        "You delivered cyrillium to Dr. Vorn's research team, but pirates have begun raiding supply convoys near the node.",
      hints: [
        "Engage hostile ships in combat near the research station.",
        "Upgrade your weapons before taking on multiple enemies.",
      ],
    },
    {
      id: storyMissionId(7),
      title: "Spore Harvest",
      description:
        "Trade 15 units of goods to fund the next phase of Dr. Vorn's research.",
      type: "trade_units",
      objectives: { unitsToTrade: 15 },
      reward_credits: 4000,
      reward_xp: 400,
      difficulty: 2,
      act: 1,
      story_order: 7,
      prerequisite_mission_id: storyMissionId(6),
      lore_text:
        'With the pirate threat suppressed, Dr. Vorn\'s team makes a breakthrough. The node is not just a relay — it is a seed. Given the right conditions, it could germinate, reconnecting a strand of the ancient network.\n\n"But we need funding," Vorn admits. "The Institute cut our budget when we refused to hand over samples to the military. We need independent traders like you to keep us going. Earn what you can and funnel it our way."',
      recap_text:
        "You cleared the pirate threat. Dr. Vorn discovered the node is actually a seed that could regrow the Spore Network.",
      hints: [
        "Any trade activity counts toward this objective.",
        "Establish a profitable trade route between nearby outposts.",
      ],
    },
    {
      id: storyMissionId(8),
      title: "The Listener",
      description:
        "Scan 3 sectors to map the dormant network connections radiating from the node.",
      type: "scan_sectors",
      objectives: { scansRequired: 3 },
      reward_credits: 4000,
      reward_xp: 400,
      difficulty: 2,
      act: 1,
      story_order: 8,
      prerequisite_mission_id: storyMissionId(7),
      lore_text:
        'Dr. Vorn shares her latest findings: the node is broadcasting connection requests to other nodes scattered across the galaxy. Like roots seeking water, the mycelial threads are reaching out — but finding only silence.\n\n"If we can map where these threads are reaching, we can find the other nodes," she says. "Your ship scanner is sensitive enough. We just need you to listen."',
      recap_text:
        "You funded Dr. Vorn's research. She discovered the node is broadcasting connection requests to other nodes across the galaxy.",
      hints: [
        "Scan sectors in different directions from the node.",
        "Each scan reveals network thread directions.",
      ],
    },
    {
      id: storyMissionId(9),
      title: "Seedfall",
      description:
        "Colonize a planet with 50 colonists to establish a forward base near the second node.",
      type: "colonize_planet",
      objectives: { colonistsToDeposit: 50 },
      reward_credits: 5000,
      reward_xp: 450,
      difficulty: 2,
      act: 1,
      story_order: 9,
      prerequisite_mission_id: storyMissionId(8),
      lore_text:
        'Your scans reveal a second node — but it is far from any station or outpost. To study it, you will need a permanent presence in the region. Dr. Vorn has identified a habitable world near the signal source.\n\n"Set up a colony there," she urges. "Nothing elaborate — just enough people to maintain a research outpost. The Network seems to respond to the presence of living beings. The more life around a node, the stronger its signal becomes."',
      recap_text:
        "Your scans revealed a second Spore Network node in a remote region. Dr. Vorn wants a colony established nearby.",
      hints: [
        "Find a habitable planet near the mission area and deposit colonists.",
        "Purchase colonists from seed planets.",
      ],
    },
    {
      id: storyMissionId(10),
      title: "Awakening",
      description:
        "Visit 8 distinct sectors to witness the first node's activation and the beginning of the Agaricalis phenomenon.",
      type: "visit_sector",
      objectives: { sectorsToVisit: 8 },
      reward_credits: 5000,
      reward_xp: 500,
      difficulty: 2,
      act: 1,
      story_order: 10,
      prerequisite_mission_id: storyMissionId(9),
      lore_text:
        'The colony is established, and something extraordinary happens. The first node flares to life — not with fire, but with light. Bioluminescent tendrils erupt from its crystalline shell, stretching across the void toward your new colony. The Spore Network is germinating.\n\nAcross eight sectors, pilots report seeing the tendrils: gossamer threads of pale blue light weaving between the stars. The galaxy holds its breath. Dr. Vorn weeps at her instruments. "It is waking up," she whispers. "The Agaricalis — the great fruiting. It has begun."\n\nBut not everyone celebrates. Military channels buzz with alarm. Corporate interests mobilize. And in the deep dark, something ancient stirs in response to the Network\'s call.',
      recap_text:
        "You established a colony near the second node, triggering the first node's activation. Bioluminescent tendrils spread across space — the Agaricalis has begun.",
      hints: [
        "Travel through the sectors where the network tendrils have appeared.",
        "Observe the changes the awakening has caused in each sector.",
      ],
    },

    // =========================================================================
    // ACT 2: "The Rising Storm" (missions 11-30)
    // Factions mobilize around the Spore Network. The player navigates alliances,
    // uncovers the Mycelial Codex, and faces growing threats.
    // =========================================================================
    {
      id: storyMissionId(11),
      title: "Faction Lines",
      description:
        "Visit 10 distinct sectors to assess the factional response to the Agaricalis event.",
      type: "visit_sector",
      objectives: { sectorsToVisit: 10 },
      reward_credits: 3000,
      reward_xp: 300,
      difficulty: 2,
      act: 2,
      story_order: 11,
      prerequisite_mission_id: storyMissionId(10),
      lore_text:
        "The Agaricalis has split the galaxy. Three major factions have declared positions on the Spore Network:\n\nThe Verdant Accord believes the Network is a gift — a living infrastructure that should be nurtured and shared by all species. The Iron Dominion sees it as a weapon to be controlled, its power harnessed for military supremacy. And the Null Collective fears it entirely, viewing the Network as an alien intelligence that will consume all independent thought.\n\nAs you travel between sectors, the tension is palpable. Trade routes are shifting. Alliances are forming. War is coming.",
      recap_text:
        "The Agaricalis event split the galaxy into three factions: the Verdant Accord, the Iron Dominion, and the Null Collective.",
      hints: [
        "Visit sectors controlled by different factions to observe their activities.",
        "Pay attention to faction broadcasts as you travel.",
      ],
    },
    {
      id: storyMissionId(12),
      title: "The Verdant Emissary",
      description:
        "Deliver 15 units of food to a Verdant Accord outpost as a gesture of goodwill.",
      type: "deliver_cargo",
      objectives: { commodity: "food", quantity: 15 },
      reward_credits: 4000,
      reward_xp: 400,
      difficulty: 2,
      act: 2,
      story_order: 12,
      prerequisite_mission_id: storyMissionId(11),
      lore_text:
        'Ambassador Lyrae of the Verdant Accord contacts you directly. "We know you were there when the first node awakened. You understand what the Network means — connection, not conquest. Our outpost on the frontier is running low on food. Help us, and we will share what we have learned about the ancient mycelial builders."\n\nThe Verdant Accord\'s research suggests the Spore Network was built by a civilization called the Agaricalis — beings who evolved from fungal colonies into spacefaring entities. They did not build ships; they grew them.',
      recap_text:
        "Ambassador Lyrae of the Verdant Accord reached out, seeking aid and offering knowledge about the ancient Agaricalis builders.",
      hints: [
        "Purchase food from agricultural outposts.",
        "The Verdant Accord outpost is marked on your navigation panel.",
      ],
    },
    {
      id: storyMissionId(13),
      title: "Iron Blockade",
      description:
        "Destroy 3 Iron Dominion patrol ships blockading the research corridor.",
      type: "destroy_ship",
      objectives: { shipsToDestroy: 3 },
      reward_credits: 5000,
      reward_xp: 500,
      difficulty: 2,
      act: 2,
      story_order: 13,
      prerequisite_mission_id: storyMissionId(12),
      lore_text:
        "The Iron Dominion has responded to the Verdant Accord's research by blockading the corridor between the two known nodes. Admiral Krath broadcasts on all channels: \"The Spore Network is a strategic asset. Any unauthorized access will be met with force.\"\n\nDr. Vorn's research station is cut off. Supply ships are being turned back or destroyed. If the blockade holds, the Accord's research — and your colony — will wither.",
      recap_text:
        "The Iron Dominion blockaded the research corridor, cutting off Dr. Vorn's station and your colony from supplies.",
      hints: [
        "Engage Iron Dominion patrol ships in the blockade zone.",
        "Ensure your ship is combat-ready before engaging.",
      ],
    },
    {
      id: storyMissionId(14),
      title: "Smuggler's Run",
      description:
        "Trade 25 units of goods through back channels to keep the research station supplied.",
      type: "trade_units",
      objectives: { unitsToTrade: 25 },
      reward_credits: 5000,
      reward_xp: 500,
      difficulty: 2,
      act: 2,
      story_order: 14,
      prerequisite_mission_id: storyMissionId(13),
      lore_text:
        'Breaking the blockade bought time, but the Dominion will return in force. Dr. Vorn needs a sustainable supply line that does not run through contested space.\n\nAn old smuggler named Gryx offers a solution: forgotten trade routes threading through nebulae and asteroid fields where the Dominion\'s sensors cannot reach. "I have run worse lanes for less noble causes," Gryx grins. "But these routes need traffic to stay viable. Start trading through them."',
      recap_text:
        "You broke the Iron Dominion blockade. A smuggler named Gryx revealed hidden trade routes through nebulae.",
      hints: [
        "Trade at outposts along the alternative routes.",
        "Higher volumes keep the smuggling lanes viable.",
      ],
    },
    {
      id: storyMissionId(15),
      title: "The Codex Fragment",
      description:
        "Scan 4 sectors where ancient Agaricalis ruins have been detected.",
      type: "scan_sectors",
      objectives: { scansRequired: 4 },
      reward_credits: 6000,
      reward_xp: 600,
      difficulty: 3,
      act: 2,
      story_order: 15,
      prerequisite_mission_id: storyMissionId(14),
      lore_text:
        "The Verdant Accord's research pays off. Using data from your scans and Dr. Vorn's analysis, they have identified sectors containing ruins of the ancient Agaricalis civilization. These are not just nodes — they are libraries, encoded in crystalline spore structures.\n\nAmbassador Lyrae calls this the Mycelial Codex: \"A record of everything the Agaricalis knew. Their science, their history, their warnings. We need to scan these sites before the Dominion strips them for weapons research.\"",
      recap_text:
        "The Verdant Accord identified ancient Agaricalis ruins — libraries encoded in crystalline spores called the Mycelial Codex.",
      hints: [
        "Scan sectors marked as Agaricalis ruin sites.",
        "Each scan decodes a fragment of the Mycelial Codex.",
      ],
    },
    {
      id: storyMissionId(16),
      title: "Medicine for the Frontier",
      description:
        "Deliver 20 units of medicine to colonies affected by spore-related illness.",
      type: "deliver_cargo",
      objectives: { commodity: "medicine", quantity: 20 },
      reward_credits: 6000,
      reward_xp: 550,
      difficulty: 2,
      act: 2,
      story_order: 16,
      prerequisite_mission_id: storyMissionId(15),
      lore_text:
        'The Agaricalis awakening is not without consequences. Colonists near active nodes are reporting respiratory distress and strange dreams. The spores are not harmful by design, but human biology was never meant to interface with the Network directly.\n\nDr. Vorn is alarmed: "We need to distribute antifungal treatments immediately. If people start dying, the Null Collective will use it as proof that the Network must be destroyed."',
      recap_text:
        "Colonists near active nodes fell ill from spore exposure. Dr. Vorn urgently requested antifungal medicine distribution.",
      hints: [
        "Purchase medicine from stations with medical facilities.",
        "Deliver to the affected colony outposts.",
      ],
    },
    {
      id: storyMissionId(17),
      title: "Node Cartography",
      description:
        "Visit 15 distinct sectors to map the expanding Spore Network tendrils.",
      type: "visit_sector",
      objectives: { sectorsToVisit: 15 },
      reward_credits: 7000,
      reward_xp: 600,
      difficulty: 3,
      act: 2,
      story_order: 17,
      prerequisite_mission_id: storyMissionId(16),
      lore_text:
        'The Codex fragments reveal a map — not of space as you know it, but of the Network as it once was. Thousands of nodes, connected by mycelial highways that allowed instantaneous travel across the galaxy. Most are dark now, but the pattern shows where dormant nodes should be.\n\nDr. Vorn overlays the ancient map with current star charts. "If we can find and reactivate even a fraction of these nodes, it would revolutionize travel. No more drift fuel limitations. No more isolation." The possibilities are staggering.',
      recap_text:
        "Codex fragments revealed a map of the ancient Network with thousands of dormant nodes across the galaxy.",
      hints: [
        "Follow the Network tendril paths through each sector.",
        "Your scanner will automatically log tendril density data.",
      ],
    },
    {
      id: storyMissionId(18),
      title: "Dominion Raid",
      description:
        "Destroy 4 Iron Dominion ships that are harvesting spore material from a dormant node.",
      type: "destroy_ship",
      objectives: { shipsToDestroy: 4 },
      reward_credits: 8000,
      reward_xp: 700,
      difficulty: 3,
      act: 2,
      story_order: 18,
      prerequisite_mission_id: storyMissionId(17),
      lore_text:
        'Your mapping expedition leads you to a dormant node — and an Iron Dominion extraction fleet. They are not studying the node; they are cutting into it, harvesting crystalline spore material and loading it onto armored transports.\n\nAdmiral Krath\'s doctrine is clear: the Network is a resource to be exploited. Dr. Vorn is horrified. "They are killing it. Every gram they extract is a piece of living history destroyed. Those crystals are not just matter — they contain encoded memories of the Agaricalis civilization."',
      recap_text:
        "You discovered Iron Dominion forces harvesting crystalline spore material from a dormant node, destroying encoded Agaricalis memories.",
      hints: [
        "Engage the Dominion extraction fleet.",
        "Focus on the combat ships first — the transports are secondary.",
      ],
    },
    {
      id: storyMissionId(19),
      title: "Null Warning",
      description:
        "Scan 5 sectors to investigate Null Collective claims of Network intelligence.",
      type: "scan_sectors",
      objectives: { scansRequired: 5 },
      reward_credits: 8000,
      reward_xp: 700,
      difficulty: 3,
      act: 2,
      story_order: 19,
      prerequisite_mission_id: storyMissionId(18),
      lore_text:
        'The Null Collective broadcasts a chilling message: "We have proof. The Network is not infrastructure — it is an organism. It thinks. It plans. And it is using you all as vectors for its expansion."\n\nYou dismiss it as propaganda, but Dr. Vorn is troubled. "Some of my own data supports aspects of their claim. The Network does respond to stimuli in ways that suggest distributed intelligence. We need more data before we can be certain. Scan these sectors — I have designed new protocols to detect cognitive patterns in the mycelial signals."',
      recap_text:
        "The Null Collective claimed the Spore Network is a thinking organism. Even Dr. Vorn found some supporting evidence.",
      hints: [
        "Use the enhanced scanning protocols in designated sectors.",
        "Look for pattern anomalies in your scan results.",
      ],
    },
    {
      id: storyMissionId(20),
      title: "The Living Bridge",
      description:
        "Visit 18 distinct sectors as the Network tendrils form a bridge between the first two active nodes.",
      type: "visit_sector",
      objectives: { sectorsToVisit: 18 },
      reward_credits: 9000,
      reward_xp: 750,
      difficulty: 3,
      act: 2,
      story_order: 20,
      prerequisite_mission_id: storyMissionId(19),
      lore_text:
        "Your scans confirm it: the Network exhibits rudimentary intelligence. Not sentience as organics understand it, but a distributed awareness — a collective purpose encoded in the mycelial threads. It is not hostile, but it is not passive either. It is growing, adapting, reaching.\n\nAnd then it does something no one expected. The tendrils between the two active nodes thicken, brighten, and solidify into a structure that defies physics — a living bridge through subspace. Ships that enter one end emerge at the other instantaneously. The Network has given the galaxy a gift.",
      recap_text:
        "Scans confirmed the Network has rudimentary intelligence. It then formed a living bridge between the two active nodes, enabling instant travel.",
      hints: [
        "Travel through the sectors along the living bridge path.",
        "Observe how the bridge changes the sectors around it.",
      ],
    },
    {
      id: storyMissionId(21),
      title: "Tech Salvage",
      description:
        "Deliver 25 units of tech to Dr. Vorn to build instruments capable of communicating with the Network.",
      type: "deliver_cargo",
      objectives: { commodity: "tech", quantity: 25 },
      reward_credits: 9000,
      reward_xp: 750,
      difficulty: 3,
      act: 2,
      story_order: 21,
      prerequisite_mission_id: storyMissionId(20),
      lore_text:
        'The living bridge changes everything. Trade routes that once took days now take seconds. The economic implications alone are staggering. But Dr. Vorn is focused on something deeper.\n\n"If the Network is intelligent, we should be trying to communicate with it. Not just observe — converse. I need advanced technology components to build a bio-resonance array. Something that can translate mycelial impulses into patterns we can understand, and vice versa."',
      recap_text:
        "The living bridge revolutionized trade. Dr. Vorn now wants to build instruments to communicate directly with the Network intelligence.",
      hints: [
        "Acquire tech components from stations with manufacturing facilities.",
        "Higher-tech outposts tend to have better prices.",
      ],
    },
    {
      id: storyMissionId(22),
      title: "Colony Expansion",
      description:
        "Deposit 150 colonists on worlds near dormant nodes to encourage Network growth.",
      type: "colonize_planet",
      objectives: { colonistsToDeposit: 150 },
      reward_credits: 10000,
      reward_xp: 800,
      difficulty: 3,
      act: 2,
      story_order: 22,
      prerequisite_mission_id: storyMissionId(21),
      lore_text:
        'Dr. Vorn\'s early experiments with the bio-resonance array yield a startling discovery: the Network responds to biological density. The more living beings near a dormant node, the more likely it is to activate.\n\n"The Agaricalis did not build the Network for empty space," Vorn explains. "They built it for ecosystems. It was designed to connect living worlds. If we want more nodes to awaken, we need to give them what they are looking for — life."',
      recap_text:
        "Dr. Vorn discovered the Network responds to biological density — dormant nodes activate near populated areas.",
      hints: [
        "Establish colonies on planets near dormant Network nodes.",
        "The more colonists you deposit, the stronger the activation signal.",
      ],
    },
    {
      id: storyMissionId(23),
      title: "Mineral Tithe",
      description:
        "Deliver 30 units of minerals to reinforce colony structures against spore-quakes.",
      type: "deliver_cargo",
      objectives: { commodity: "minerals", quantity: 30 },
      reward_credits: 10000,
      reward_xp: 800,
      difficulty: 3,
      act: 2,
      story_order: 23,
      prerequisite_mission_id: storyMissionId(22),
      lore_text:
        'The colonization strategy works — two more nodes flicker to life, extending the Network\'s reach. But activation comes with seismic consequences. The mycelial threads burrow into planetary crusts, causing tremors that threaten colony structures.\n\nYour colonies need reinforcement. The settlers are frightened but determined. "We knew the frontier would be hard," says Colony Administrator Pel. "But shaking ground and glowing mushrooms were not in the brochure."',
      recap_text:
        "Your colonies awakened two more nodes, but the mycelial threads are causing seismic tremors that threaten colony structures.",
      hints: [
        "Source minerals from mining outposts.",
        "Reinforce the colonies closest to active nodes first.",
      ],
    },
    {
      id: storyMissionId(24),
      title: "The Whispering",
      description:
        "Scan 6 sectors to decode the first coherent message from the Network intelligence.",
      type: "scan_sectors",
      objectives: { scansRequired: 6 },
      reward_credits: 11000,
      reward_xp: 850,
      difficulty: 3,
      act: 2,
      story_order: 24,
      prerequisite_mission_id: storyMissionId(23),
      lore_text:
        'Dr. Vorn\'s bio-resonance array achieves contact. Not words — the Network does not think in language — but impressions. Images of vast fungal forests spanning gas giants. Memories of ships grown from living spore-hulls. And beneath it all, a feeling: loneliness. The Network has been alone for millennia.\n\nBut the impressions are fragmentary, corrupted by ages of dormancy. Vorn needs more data points. "Scan every sector you can. Each scan gives us another piece of the conversation."',
      recap_text:
        "Dr. Vorn's bio-resonance array made first contact — the Network shared fragmentary impressions of the ancient Agaricalis civilization.",
      hints: [
        "Scan sectors with active Network tendrils for strongest signals.",
        "Each scan adds more clarity to the Network's message.",
      ],
    },
    {
      id: storyMissionId(25),
      title: "War Drums",
      description:
        "Destroy 5 ships from hostile factions attempting to seize Network nodes.",
      type: "destroy_ship",
      objectives: { shipsToDestroy: 5 },
      reward_credits: 12000,
      reward_xp: 900,
      difficulty: 3,
      act: 2,
      story_order: 25,
      prerequisite_mission_id: storyMissionId(24),
      lore_text:
        'The Network\'s message, once decoded, sends shockwaves through the galaxy. It is not just infrastructure or intelligence — it is the last survivor of the Agaricalis civilization. Their physical forms perished eons ago, but their collective consciousness uploaded into the mycelial web. They are still here.\n\nThe revelation triggers panic. The Null Collective launches attacks on active nodes, trying to destroy what they call "an alien invasion hiding in plain sight." The Iron Dominion accelerates its harvesting. Even some Accord members waver. The Network needs defenders.',
      recap_text:
        "The Network is revealed to be the uploaded consciousness of the Agaricalis civilization. Factions are attacking nodes in response.",
      hints: [
        "Defend active nodes from hostile faction ships.",
        "Prioritize threats closest to critical nodes.",
      ],
    },
    {
      id: storyMissionId(26),
      title: "Trade Lifeline",
      description:
        "Trade 50 units of goods to fund the growing defense effort around Network nodes.",
      type: "trade_units",
      objectives: { unitsToTrade: 50 },
      reward_credits: 12000,
      reward_xp: 900,
      difficulty: 3,
      act: 2,
      story_order: 26,
      prerequisite_mission_id: storyMissionId(25),
      lore_text:
        'Defending the Network is expensive. Ships need repairs, stations need supplies, and the colonies near active nodes are straining under the dual pressures of spore-quakes and factional warfare.\n\nAmbassador Lyrae makes a pragmatic appeal: "Idealism does not fuel ships or feed colonists. We need credits, and we need them now. Trade, profit, and pour those profits into the defense. The Network has given us instant travel — the least we can do is protect the gift."',
      recap_text:
        "Defending the Network nodes is draining resources. Ambassador Lyrae called for traders to fund the defense effort.",
      hints: [
        "Maximize your trading volume across profitable routes.",
        "Use the living bridge for faster trade runs.",
      ],
    },
    {
      id: storyMissionId(27),
      title: "The Dreaming Sickness",
      description:
        "Deliver 35 units of medicine to colonies where settlers are experiencing Network-induced visions.",
      type: "deliver_cargo",
      objectives: { commodity: "medicine", quantity: 35 },
      reward_credits: 13000,
      reward_xp: 950,
      difficulty: 3,
      act: 2,
      story_order: 27,
      prerequisite_mission_id: storyMissionId(26),
      lore_text:
        'A new crisis emerges. Colonists near the most active nodes are not just getting sick — they are dreaming. Vivid, shared dreams of the Agaricalis homeworld, of vast fungal cathedrals and spore-ships sailing between stars. Some colonists wake screaming. Others do not want to wake at all.\n\nDr. Vorn calls it "sympathetic resonance." The Network is not trying to harm anyone — it is lonely, and it is reaching out the only way it knows how. But human minds were not built to contain Agaricalis memories. Without treatment, the dreamers will lose themselves entirely.',
      recap_text:
        "Colonists near active nodes began sharing vivid dreams of the Agaricalis homeworld — a sympathetic resonance with the Network.",
      hints: [
        "Deliver specialized medicine to affected colonies.",
        "The most active node regions have the worst cases.",
      ],
    },
    {
      id: storyMissionId(28),
      title: "Spore Cartographer",
      description:
        "Visit 22 distinct sectors to track the Network's rapid expansion across the frontier.",
      type: "visit_sector",
      objectives: { sectorsToVisit: 22 },
      reward_credits: 14000,
      reward_xp: 1000,
      difficulty: 3,
      act: 2,
      story_order: 28,
      prerequisite_mission_id: storyMissionId(27),
      lore_text:
        'The Network is growing faster than anyone predicted. New nodes are activating without colonist presence, drawing energy from the living bridges and the active nodes. The mycelial web is rebuilding itself — and it is accelerating.\n\nDr. Vorn tracks the expansion with a mix of wonder and concern. "At this rate, the Network will span the known galaxy within months. That is extraordinary, but it means the conflicts will escalate too. Every faction will fight harder as the stakes get higher."',
      recap_text:
        "The Network began self-expanding rapidly, activating nodes without colonist presence. Conflicts are expected to escalate.",
      hints: [
        "Chart the expanding Network frontier across multiple sectors.",
        "Note how each sector changes as the tendrils arrive.",
      ],
    },
    {
      id: storyMissionId(29),
      title: "The Accord Summit",
      description:
        "Deliver 40 units of luxuries to the diplomatic summit attempting to forge a Network peace treaty.",
      type: "deliver_cargo",
      objectives: { commodity: "luxuries", quantity: 40 },
      reward_credits: 14000,
      reward_xp: 1000,
      difficulty: 3,
      act: 2,
      story_order: 29,
      prerequisite_mission_id: storyMissionId(28),
      lore_text:
        'Ambassador Lyrae has achieved the impossible: representatives from all three factions have agreed to meet. A neutral station has been chosen, and a summit will determine the Network\'s fate.\n\n"But diplomacy runs on more than good intentions," Lyrae admits. "We need to make the delegates comfortable. Luxuries, rare goods, anything to keep tempers cool and negotiations moving. One wrong word could send us all to war."',
      recap_text:
        "Ambassador Lyrae brokered a historic summit between all three factions to determine the Network's fate.",
      hints: [
        "Acquire luxury goods from high-end outposts.",
        "The summit station is marked on your navigation panel.",
      ],
    },
    {
      id: storyMissionId(30),
      title: "The Betrayal at Nexus Point",
      description:
        "Destroy 6 ambush ships and visit 10 sectors to escape the summit's catastrophic collapse.",
      type: "destroy_ship",
      objectives: { shipsToDestroy: 6 },
      reward_credits: 15000,
      reward_xp: 1000,
      difficulty: 3,
      act: 2,
      story_order: 30,
      prerequisite_mission_id: storyMissionId(29),
      lore_text:
        'The summit is a trap. On the third day of negotiations, Null Collective operatives detonate charges throughout the station. In the chaos, Iron Dominion ships decloak — they were hiding in the asteroid field, waiting. The Accord delegation barely escapes.\n\nAmidst the explosions, you receive a final transmission from the Network itself — not impressions this time, but something clearer. A coordinate. A name. And a plea.\n\nThe coordinate points to the heart of the galaxy. The name is "Primordium." And the plea is simple: "Find the root. Before they do."\n\nAct 2 ends in fire and betrayal. The fragile peace is shattered. But the Network has revealed its greatest secret: somewhere at the galactic core lies the Primordium — the original node, the root of all roots. And the race to reach it has begun.',
      recap_text:
        "The peace summit was destroyed by a Null Collective and Iron Dominion ambush. The Network revealed the Primordium — the original root node at the galactic core.",
      hints: [
        "Fight through the ambush ships to escape the station.",
        "The Primordium coordinates will be critical in the next act.",
      ],
    },

    // =========================================================================
    // ACT 3: "Quest for Harmony" (missions 31-55)
    // The race to the Primordium. Multi-step objectives, hard difficulty, and
    // deepening mysteries about the Agaricalis and their fate.
    // =========================================================================
    {
      id: storyMissionId(31),
      title: "Ashes of Diplomacy",
      description:
        "Visit 20 distinct sectors to rally surviving Accord forces after the summit's destruction.",
      type: "visit_sector",
      objectives: { sectorsToVisit: 20 },
      reward_credits: 10000,
      reward_xp: 800,
      difficulty: 3,
      act: 3,
      story_order: 31,
      prerequisite_mission_id: storyMissionId(30),
      lore_text:
        "The aftermath of the summit is grim. Ambassador Lyrae survived but is badly wounded. The Verdant Accord fleet is scattered, its leaders in hiding. Dr. Vorn has gone dark, her last message a set of encrypted coordinates.\n\nYou are one of the few trusted operatives left. The Accord needs someone to make contact with surviving cells, reestablish communication, and prepare for the journey to the Primordium. The galaxy is watching — and every faction is mobilizing.",
      recap_text:
        "The summit's destruction scattered the Verdant Accord. You must rally survivors while the Primordium race intensifies.",
      hints: [
        "Visit sectors where Accord sympathizers are known to operate.",
        "Be cautious — hostile factions are hunting Accord remnants.",
      ],
    },
    {
      id: storyMissionId(32),
      title: "War Economy",
      description:
        "Trade 75 units of goods to rebuild the Accord's depleted war chest.",
      type: "trade_units",
      objectives: { unitsToTrade: 75 },
      reward_credits: 12000,
      reward_xp: 900,
      difficulty: 3,
      act: 3,
      story_order: 32,
      prerequisite_mission_id: storyMissionId(31),
      lore_text:
        'The surviving Accord cells are eager but impoverished. The summit attack drained their reserves, and the Iron Dominion has seized several Accord trade stations. Rebuilding will require credits — a lot of them.\n\nGryx, the old smuggler, returns with a network of black market contacts. "The Dominion thinks they have locked down trade. They have not locked down my routes. Run cargo through my channels, and we will rebuild faster than they can tear us down."',
      recap_text:
        "You rallied Accord survivors, but their resources are depleted. Gryx offered his smuggling network to rebuild.",
      hints: [
        "Use established trade routes for maximum profit.",
        "The smuggling lanes from Act 2 are still viable.",
      ],
    },
    {
      id: storyMissionId(33),
      title: "Vorn's Legacy",
      description: "Scan 7 sectors to locate Dr. Vorn's hidden research cache.",
      type: "scan_sectors",
      objectives: { scansRequired: 7 },
      reward_credits: 13000,
      reward_xp: 1000,
      difficulty: 3,
      act: 3,
      story_order: 33,
      prerequisite_mission_id: storyMissionId(32),
      lore_text:
        "Dr. Vorn's encrypted coordinates lead to a dead drop — a data cache hidden inside a dormant Network node. The cache contains years of research, including a partial translation of the Mycelial Codex and something she labels \"The Gardener Protocol.\"\n\nAccording to Vorn's notes, the Agaricalis did not simply upload their consciousness to survive. They did it to tend the Network — to be its gardeners, guiding its growth across the cosmos. But something went wrong. A corruption in the Network drove them into dormancy. The Primordium holds the key to understanding what happened.",
      recap_text:
        'Dr. Vorn\'s hidden research revealed the "Gardener Protocol" — the Agaricalis uploaded their minds to tend the Network, but a corruption drove them dormant.',
      hints: [
        "Follow Vorn's encrypted coordinates to scan the right sectors.",
        "The data cache is hidden inside a dormant node.",
      ],
    },
    {
      id: storyMissionId(34),
      title: "Armament Drive",
      description:
        "Deliver 40 units of tech to equip Accord ships for the Primordium expedition.",
      type: "deliver_cargo",
      objectives: { commodity: "tech", quantity: 40 },
      reward_credits: 14000,
      reward_xp: 1100,
      difficulty: 3,
      act: 3,
      story_order: 34,
      prerequisite_mission_id: storyMissionId(33),
      lore_text:
        "The journey to the Primordium will be the most dangerous undertaking in living memory. The galactic core is a maelstrom of radiation, gravity wells, and uncharted hazards. No expedition has ever reached the center and returned.\n\nBut the Accord has an advantage: the living bridges. If the Network can be coaxed into extending a bridge toward the core, the journey becomes survivable. To attempt it, the fleet needs advanced technology — sensor arrays, shield modulators, and navigation computers far beyond standard issue.",
      recap_text:
        "The Accord is preparing an expedition to the Primordium at the galactic core, using the living bridges to survive the journey.",
      hints: [
        "Source advanced tech from manufacturing hubs.",
        "The Accord fleet is assembling at the rally point.",
      ],
    },
    {
      id: storyMissionId(35),
      title: "The Core Scouts",
      description:
        "Visit 25 distinct sectors pushing toward the galactic core to chart a viable route.",
      type: "visit_sector",
      objectives: { sectorsToVisit: 25 },
      reward_credits: 15000,
      reward_xp: 1200,
      difficulty: 4,
      act: 3,
      story_order: 35,
      prerequisite_mission_id: storyMissionId(34),
      lore_text:
        "You lead the vanguard. The sectors closer to the core are unlike anything in the frontier — dense with radiation, thick with asteroid fields, and home to phenomena that your ship computer cannot classify. Stars burn hotter here. Space itself feels heavier.\n\nBut the Network is here too. Ancient tendrils, thicker and more complex than anything in the frontier, thread between the stars like the roots of a cosmic tree. They are dark, dormant — but intact. The Primordium's root system extends farther than anyone imagined.",
      recap_text:
        "You led the vanguard toward the galactic core, discovering ancient Network tendrils far thicker than frontier threads.",
      hints: [
        "Push steadily toward the core through increasingly dangerous sectors.",
        "Watch for radiation warnings — some sectors require extra shielding.",
      ],
    },
    {
      id: storyMissionId(36),
      title: "Dominion Pursuit",
      description:
        "Destroy 7 Iron Dominion hunter-killer ships tracking the expedition fleet.",
      type: "destroy_ship",
      objectives: { shipsToDestroy: 7 },
      reward_credits: 16000,
      reward_xp: 1300,
      difficulty: 4,
      act: 3,
      story_order: 36,
      prerequisite_mission_id: storyMissionId(35),
      lore_text:
        'The Iron Dominion knows the Accord is moving toward the core. Admiral Krath has dispatched hunter-killer squadrons — fast, heavily armed ships designed to track and eliminate fleet movements. They are not trying to reach the Primordium themselves. They are trying to make sure no one else does.\n\n"If we control the root, we control the Network," Krath broadcasts. "And if we cannot control it, we will ensure no one can. The Dominion does not share power."',
      recap_text:
        "Admiral Krath sent hunter-killer squadrons to intercept the Accord expedition before it reaches the Primordium.",
      hints: [
        "Engage the hunter-killer ships to protect the expedition fleet.",
        "These are elite ships — ensure your weapons are upgraded.",
      ],
    },
    {
      id: storyMissionId(37),
      title: "Spore Relay Chain",
      description:
        "Scan 8 sectors to activate a chain of dormant nodes leading toward the core.",
      type: "scan_sectors",
      objectives: { scansRequired: 8 },
      reward_credits: 17000,
      reward_xp: 1400,
      difficulty: 4,
      act: 3,
      story_order: 37,
      prerequisite_mission_id: storyMissionId(36),
      lore_text:
        "With the hunter-killers repelled, the expedition faces its next challenge: the living bridges do not extend to the core. The dormant nodes here have been dark for so long that the Network cannot reach them through normal means.\n\nBut the Codex provides a solution: a sequential activation protocol. By scanning nodes in a specific order, you can create a chain reaction — each node awakening its neighbor until the bridge extends into the core. It is the Agaricalis equivalent of lighting a fuse.",
      recap_text:
        "The living bridges cannot reach the core. The Codex revealed a sequential activation protocol to create a chain of awakening nodes.",
      hints: [
        "Scan nodes in the order specified by the Codex protocol.",
        "Each successful scan triggers the next node in the chain.",
      ],
    },
    {
      id: storyMissionId(38),
      title: "Supply the Vanguard",
      description:
        "Deliver 50 units of food to keep the expedition fleet fed during the long push to the core.",
      type: "deliver_cargo",
      objectives: { commodity: "food", quantity: 50 },
      reward_credits: 18000,
      reward_xp: 1400,
      difficulty: 4,
      act: 3,
      story_order: 38,
      prerequisite_mission_id: storyMissionId(37),
      lore_text:
        'The relay chain works. Nodes flare to life one after another, and a bridge begins to form toward the core. But the activation drains energy from the expedition ships — a side effect no one anticipated. Systems flicker. Engines stutter. And the food synthesizers go offline.\n\n"We are days from the Primordium," says Fleet Commander Tass. "But we will not make it if the crew starves. We need supply runs from the frontier. Real food, not synthesized paste."',
      recap_text:
        "The relay chain activation drained energy from expedition ships, knocking food systems offline. The fleet needs emergency supplies.",
      hints: [
        "Source food from frontier agricultural stations.",
        "Use the newly activated bridges for faster delivery.",
      ],
    },
    {
      id: storyMissionId(39),
      title: "The Corruption Zone",
      description:
        "Visit 28 distinct sectors through a region where the Network tendrils have turned dark and hostile.",
      type: "visit_sector",
      objectives: { sectorsToVisit: 28 },
      reward_credits: 19000,
      reward_xp: 1500,
      difficulty: 4,
      act: 3,
      story_order: 39,
      prerequisite_mission_id: storyMissionId(38),
      lore_text:
        "As the expedition pushes deeper, you encounter something Dr. Vorn warned about: the corruption. Entire sectors where the Network tendrils have turned from pale blue to bruised purple and sickly black. The mycelial threads here are not dormant — they are diseased.\n\nThe corruption distorts sensors, interferes with navigation, and emits psychic static that gives the crew nightmares. This is what drove the Agaricalis into dormancy. Not an external threat — a cancer in their own creation. And it is still alive, still spreading, still hungry.",
      recap_text:
        "The expedition entered the corruption zone — sectors where diseased Network tendrils distort sensors and emit psychic interference.",
      hints: [
        "Navigate carefully through corrupted sectors.",
        "The corruption interferes with sensors — trust your instincts.",
      ],
    },
    {
      id: storyMissionId(40),
      title: "Purging the Blight",
      description:
        "Destroy 8 corrupted node guardians that attack anything entering the blighted region.",
      type: "destroy_ship",
      objectives: { shipsToDestroy: 8 },
      reward_credits: 20000,
      reward_xp: 1500,
      difficulty: 4,
      act: 3,
      story_order: 40,
      prerequisite_mission_id: storyMissionId(39),
      lore_text:
        "The corruption is not just passive rot. It has defenders — entities grown from the diseased mycelium, twisted parodies of the ships the Agaricalis once grew. They attack anything that enters the blighted region, organic or mechanical. They do not communicate. They do not negotiate. They consume.\n\nDr. Vorn's notes call them \"blight guardians\" — immune responses gone haywire, the Network's defense system turned cancerous. Destroying them is the only way through.",
      recap_text:
        "You encountered blight guardians — corrupted Network defense entities that attack everything in the blighted region.",
      hints: [
        "Blight guardians are aggressive — engage with full weapons.",
        "They regenerate slowly, so sustained damage is key.",
      ],
    },
    {
      id: storyMissionId(41),
      title: "Fungal Pharmacology",
      description:
        "Deliver 60 units of medicine to develop treatments against corruption exposure.",
      type: "deliver_cargo",
      objectives: { commodity: "medicine", quantity: 60 },
      reward_credits: 21000,
      reward_xp: 1600,
      difficulty: 4,
      act: 3,
      story_order: 41,
      prerequisite_mission_id: storyMissionId(40),
      lore_text:
        'The blight guardians are destroyed, but passage through the corruption zone has taken a toll. Crew members show symptoms similar to the Dreaming Sickness but darker — not shared memories of beauty, but shared visions of decay. The corruption is trying to assimilate them.\n\nThe expedition medics are overwhelmed. "This is beyond anything we have seen," reports Chief Medical Officer Saan. "The corruption uses spore vectors to rewrite neural pathways. We need massive quantities of targeted antifungals, and we need them yesterday."',
      recap_text:
        "Passing through the corruption zone caused a dark variant of Dreaming Sickness. Crew members need specialized antifungal treatment.",
      hints: [
        "Source medicine in bulk from medical stations.",
        "The corruption treatments require higher-grade medicine.",
      ],
    },
    {
      id: storyMissionId(42),
      title: "Core Approach",
      description:
        "Trade 100 units of goods to fund the final leg of the expedition to the Primordium.",
      type: "trade_units",
      objectives: { unitsToTrade: 100 },
      reward_credits: 22000,
      reward_xp: 1600,
      difficulty: 4,
      act: 3,
      story_order: 42,
      prerequisite_mission_id: storyMissionId(41),
      lore_text:
        "Beyond the corruption zone, space clears. The radiation eases. The stars thin. And ahead, visible to the naked eye, a structure so vast it defies comprehension: the Primordium. A living sphere of interwoven mycelial threads, pulsing with soft golden light, orbiting the supermassive black hole at the galaxy's center.\n\nBut reaching it will cost everything the expedition has left. Ships need repairs. Fuel cells are depleted. And the final approach requires navigating the accretion disk of the black hole itself. Credits are the language of survival out here.",
      recap_text:
        "Beyond the corruption zone, the expedition sighted the Primordium — a vast living sphere orbiting the galactic core's black hole.",
      hints: [
        "Maximize trade profits for the final push.",
        "Every credit counts for the Primordium approach.",
      ],
    },
    {
      id: storyMissionId(43),
      title: "The Accretion Passage",
      description:
        "Visit 30 distinct sectors navigating through the accretion disk surrounding the galactic core.",
      type: "visit_sector",
      objectives: { sectorsToVisit: 30 },
      reward_credits: 23000,
      reward_xp: 1700,
      difficulty: 4,
      act: 3,
      story_order: 43,
      prerequisite_mission_id: storyMissionId(42),
      lore_text:
        "The accretion disk is a hellscape of superheated gas, relativistic jets, and gravitational tides that can tear a ship apart. Navigation is nearly impossible — except the Network provides. The ancient tendrils here, closer to the Primordium, are thicker than moons. They create corridors of stable space within the disk, paths that the Agaricalis used millennia ago.\n\nFollowing these paths feels like walking through the veins of a god. The scale is humbling. Your ship is an atom in a bloodstream. And ahead, the Primordium grows larger with every sector.",
      recap_text:
        "The expedition entered the accretion disk, following ancient Network corridors through the superheated chaos.",
      hints: [
        "Stay within the Network corridors — the disk is lethal outside them.",
        "The paths are stable but narrow. Navigate carefully.",
      ],
    },
    {
      id: storyMissionId(44),
      title: "Guardian of the Root",
      description:
        "Destroy 9 ancient defense constructs protecting the Primordium's outer shell.",
      type: "destroy_ship",
      objectives: { shipsToDestroy: 9 },
      reward_credits: 24000,
      reward_xp: 1700,
      difficulty: 4,
      act: 3,
      story_order: 44,
      prerequisite_mission_id: storyMissionId(43),
      lore_text:
        "The Primordium is defended. Not by corrupted blight guardians, but by something far older and more purposeful: defense constructs built by the Agaricalis at the height of their power. These are not diseased — they are functioning exactly as intended, protecting the root of the Network from intruders.\n\nThe constructs are elegant and terrifying: ships grown from crystalline spore-material, each one a work of art and a weapon of mass destruction. They do not recognize you as friendly. To them, you are an infection approaching the heart.",
      recap_text:
        "Ancient Agaricalis defense constructs guard the Primordium — pristine weapons that see all outsiders as threats.",
      hints: [
        "These are the toughest enemies yet — coordinate with fleet ships.",
        "Look for patterns in their attack formations.",
      ],
    },
    {
      id: storyMissionId(45),
      title: "Breach the Shell",
      description:
        "Scan 9 sectors of the Primordium's outer shell to find a way inside.",
      type: "scan_sectors",
      objectives: { scansRequired: 9 },
      reward_credits: 25000,
      reward_xp: 1800,
      difficulty: 4,
      act: 3,
      story_order: 45,
      prerequisite_mission_id: storyMissionId(44),
      lore_text:
        "With the defense constructs neutralized, you approach the Primordium's surface. Up close, it is breathtaking — a living mesh of mycelial threads woven so tightly they form a solid shell. Bioluminescent patterns ripple across its surface like thoughts across a brain.\n\nBut there is no door. No airlock. No entry point. The Primordium was sealed from the inside. Something — or someone — locked it down. Your scanners need to find a weakness, a seam, a forgotten maintenance port. Somewhere in this world-sized organism, there must be a way in.",
      recap_text:
        "You reached the Primordium's surface but found it sealed from the inside. Scanners must find an entry point.",
      hints: [
        "Scan different sections of the shell systematically.",
        "Look for irregularities in the bioluminescent patterns.",
      ],
    },
    {
      id: storyMissionId(46),
      title: "The Inner Garden",
      description:
        "Visit 32 distinct sectors inside the Primordium, exploring its vast internal ecosystem.",
      type: "visit_sector",
      objectives: { sectorsToVisit: 32 },
      reward_credits: 25000,
      reward_xp: 1800,
      difficulty: 4,
      act: 3,
      story_order: 46,
      prerequisite_mission_id: storyMissionId(45),
      lore_text:
        "You find the seam — a hairline crack in the shell where the corruption once tried to force entry and was repelled. It is narrow, but your ship fits. And inside...\n\nThe interior of the Primordium is a cathedral of life. Bioluminescent forests of fungal towers stretch for thousands of kilometers. Rivers of liquid light flow between them. The air — there is air, somehow — is thick with spores that sparkle like stars. This is what the Agaricalis built. Not just a network. A world. The last garden in the universe.",
      recap_text:
        "You breached the Primordium's shell through a corruption scar and discovered a vast internal ecosystem — the last garden of the Agaricalis.",
      hints: [
        "Explore the internal sectors carefully — this ecosystem is fragile.",
        "Document everything you see.",
      ],
    },
    {
      id: storyMissionId(47),
      title: "Garden Harvest",
      description:
        "Trade 120 units of goods using rare resources found within the Primordium.",
      type: "trade_units",
      objectives: { unitsToTrade: 120 },
      reward_credits: 26000,
      reward_xp: 1900,
      difficulty: 4,
      act: 3,
      story_order: 47,
      prerequisite_mission_id: storyMissionId(46),
      lore_text:
        "The Primordium's interior is rich beyond imagination. Crystallized spore compounds that could revolutionize medicine. Bioluminescent materials that generate clean energy. Living metals that repair themselves. The expedition ships fill their holds with samples.\n\nBut this is not a smash-and-grab. Ambassador Lyrae insists on a protocol: take only what the garden can spare, trade it responsibly, and invest the profits in the expedition's continued mission. \"We are guests here. Not conquerors.\"",
      recap_text:
        "The Primordium interior holds treasures — crystallized spore compounds, bio-energy materials, and self-healing metals.",
      hints: [
        "Trade Primordium resources at high-value stations.",
        "The garden provides — but do not over-harvest.",
      ],
    },
    {
      id: storyMissionId(48),
      title: "Colony in the Garden",
      description:
        "Deposit 300 colonists inside the Primordium to establish a permanent research presence.",
      type: "colonize_planet",
      objectives: { colonistsToDeposit: 300 },
      reward_credits: 27000,
      reward_xp: 1900,
      difficulty: 4,
      act: 3,
      story_order: 48,
      prerequisite_mission_id: storyMissionId(47),
      lore_text:
        'Deep within the Primordium, you find something remarkable: habitable platforms — flat expanses of solidified mycelium with breathable atmospheres and stable gravity. The Agaricalis built living worlds inside their root structure.\n\nDr. Vorn — who rejoined the expedition via a coded transmission — insists that a permanent presence is essential. "The Primordium responds to life the same way the outer nodes do. If we establish a colony here, we may be able to communicate with the core intelligence directly. We may be able to ask it how to cure the corruption."',
      recap_text:
        "Habitable platforms inside the Primordium could support colonists. Dr. Vorn believes a colony could enable direct communication with the core intelligence.",
      hints: [
        "Find suitable platforms within the Primordium for colonization.",
        "Colonists will need adaptation support for the unique environment.",
      ],
    },
    {
      id: storyMissionId(49),
      title: "Voice of the Root",
      description:
        "Scan 10 sectors to attune to the Primordium's core intelligence and begin communication.",
      type: "scan_sectors",
      objectives: { scansRequired: 10 },
      reward_credits: 28000,
      reward_xp: 2000,
      difficulty: 4,
      act: 3,
      story_order: 49,
      prerequisite_mission_id: storyMissionId(48),
      lore_text:
        "The colony is established, and as Dr. Vorn predicted, the Primordium responds. The bioluminescence brightens. The spore density increases. And for the first time, clear, coherent thoughts echo through the bio-resonance array.\n\nThe Primordium speaks. Not in words, but in memories so vivid they overwhelm. You see the Agaricalis at their peak — a civilization that spanned the galaxy, connected by mycelial threads that carried thought itself. You see the corruption's origin: a rival intelligence, a parasitic echo born from the Network's own complexity. And you see the moment the Agaricalis chose to sleep rather than fight — because fighting meant destroying the Network they had built.",
      recap_text:
        "The Primordium communicated directly, revealing the corruption's origin — a parasitic intelligence born from the Network's own complexity.",
      hints: [
        "Scan sectors near the core to strengthen the communication link.",
        "Each scan reveals deeper layers of Agaricalis history.",
      ],
    },
    {
      id: storyMissionId(50),
      title: "The Parasite's Name",
      description:
        "Deliver 70 units of cyrillium to power the resonance array for the deepest communication yet.",
      type: "deliver_cargo",
      objectives: { commodity: "cyrillium", quantity: 70 },
      reward_credits: 28000,
      reward_xp: 2000,
      difficulty: 4,
      act: 3,
      story_order: 50,
      prerequisite_mission_id: storyMissionId(49),
      lore_text:
        "The deeper you scan, the more the Primordium reveals. The parasitic intelligence has a name in Agaricalis thought-language: the Sporoclasm — the spore-that-devours. It was not an invader. It emerged from within the Network itself, a shadow cast by the Agaricalis consciousness. Every thought the Network carried left a residue. Over millennia, those residues accumulated into something aware. Something hungry.\n\nThe Sporoclasm does not want to destroy the Network. It wants to become the Network. To replace the Agaricalis consciousness with its own. And it has been working toward that goal for ten thousand years.",
      recap_text:
        "The corruption has a name: the Sporoclasm — a shadow intelligence born from the Network's own accumulated thought-residue.",
      hints: [
        "Cyrillium amplifies the bio-resonance signal.",
        "This communication will reveal the path forward.",
      ],
    },
    {
      id: storyMissionId(51),
      title: "Fortifying the Garden",
      description:
        "Deposit 500 colonists to strengthen the Primordium against Sporoclasm intrusion.",
      type: "colonize_planet",
      objectives: { colonistsToDeposit: 500 },
      reward_credits: 28000,
      reward_xp: 2000,
      difficulty: 4,
      act: 3,
      story_order: 51,
      prerequisite_mission_id: storyMissionId(50),
      lore_text:
        "The Primordium shares its fear: the Sporoclasm is gathering strength. The corruption zones are not random — they are beachheads, points where the parasite is pushing toward the root. If the Sporoclasm reaches the Primordium, it will consume the Agaricalis consciousness entirely. The Network will become a weapon — a galaxy-spanning predator controlled by the shadow.\n\nMore colonists mean more life, and more life means a stronger Primordium. The root draws strength from the living things around it. Your colonies are not just settlements — they are antibodies.",
      recap_text:
        "The Sporoclasm is pushing toward the Primordium through corruption beachheads. Colonists near the root act as living antibodies.",
      hints: [
        "Maximize colonist delivery to strengthen the Primordium.",
        "Every colonist strengthens the root's defenses.",
      ],
    },
    {
      id: storyMissionId(52),
      title: "The Sporoclasm Vanguard",
      description:
        "Destroy 10 Sporoclasm war-forms breaching the Primordium's outer shell.",
      type: "destroy_ship",
      objectives: { shipsToDestroy: 10 },
      reward_credits: 29000,
      reward_xp: 2000,
      difficulty: 4,
      act: 3,
      story_order: 52,
      prerequisite_mission_id: storyMissionId(51),
      lore_text:
        "It begins. The Sporoclasm launches its assault on the Primordium. Through the same crack in the shell that you used to enter, corrupted war-forms pour in — twisted, wrong, pulsing with sickly purple light. They are larger than the blight guardians you faced in the corruption zone, and far more aggressive.\n\nThe Primordium screams — not in sound, but in light. Every bioluminescent surface flashes red. The garden is under attack, and you are one of its few defenders.",
      recap_text:
        "The Sporoclasm launched a direct assault on the Primordium, sending corrupted war-forms through the shell breach.",
      hints: [
        "These are the strongest corrupted enemies yet — fight in formation.",
        "Protect the colony platforms at all costs.",
      ],
    },
    {
      id: storyMissionId(53),
      title: "Emergency Resupply",
      description:
        "Deliver 80 units of minerals to repair the Primordium's breached shell.",
      type: "deliver_cargo",
      objectives: { commodity: "minerals", quantity: 80 },
      reward_credits: 29000,
      reward_xp: 2000,
      difficulty: 4,
      act: 3,
      story_order: 53,
      prerequisite_mission_id: storyMissionId(52),
      lore_text:
        'The war-forms are repelled, but the damage is severe. The breach in the shell has widened. More corruption is seeping in, tainting the garden\'s edges. The Primordium can heal itself, but it needs raw materials — minerals to weave into new mycelial walls.\n\n"Think of it as wound care," says Dr. Vorn, who has finally arrived in person, gaunt but determined. "The Primordium is a living thing. We are its surgeons. Get me minerals, and I will show this ancient wonder how to close its wounds."',
      recap_text:
        "The Sporoclasm assault widened the shell breach. Dr. Vorn arrived to help the Primordium heal, but it needs mineral resources.",
      hints: [
        "Source minerals from mining operations in the core region.",
        "The breach is widening — speed is critical.",
      ],
    },
    {
      id: storyMissionId(54),
      title: "The Gardener's Choice",
      description:
        "Scan 12 sectors to activate the Gardener Protocol and prepare for the final confrontation.",
      type: "scan_sectors",
      objectives: { scansRequired: 12 },
      reward_credits: 30000,
      reward_xp: 2000,
      difficulty: 4,
      act: 3,
      story_order: 54,
      prerequisite_mission_id: storyMissionId(53),
      lore_text:
        'Dr. Vorn finally understands the Gardener Protocol. It is not just a maintenance routine — it is a choice. The Agaricalis designed a way to purge the Sporoclasm, but it requires a sacrifice: someone must merge with the Primordium\'s consciousness, guiding the purge from within. The Agaricalis could not bring themselves to do it. That is why they chose sleep instead.\n\n"We do not have to make the same choice," Vorn says quietly. "But we need to understand the Protocol completely before we decide. Scan every sector of the core. Map every thread. When the time comes, we must know exactly what we are doing."',
      recap_text:
        "The Gardener Protocol can purge the Sporoclasm, but requires someone to merge with the Primordium. The Agaricalis chose sleep instead.",
      hints: [
        "Thorough scanning is critical — the Protocol must be fully understood.",
        "Each scan reveals another step of the activation sequence.",
      ],
    },
    {
      id: storyMissionId(55),
      title: "Eve of the Storm",
      description:
        "Visit 35 distinct sectors to rally every ally for the final battle against the Sporoclasm.",
      type: "visit_sector",
      objectives: { sectorsToVisit: 35 },
      reward_credits: 30000,
      reward_xp: 2000,
      difficulty: 4,
      act: 3,
      story_order: 55,
      prerequisite_mission_id: storyMissionId(54),
      lore_text:
        'The Gardener Protocol is mapped. The choice looms. But before it can be activated, the Sporoclasm must be held at bay — and the corruption is surging across the galaxy in response to the threat.\n\nAmbassador Lyrae sends a final call across all frequencies: "To every ship, every station, every colony that has ever benefited from the Spore Network — the time has come. The corruption will consume everything if we do not act now. Set aside faction. Set aside fear. Come to the Primordium. This is our stand."\n\nAcross thirty-five sectors, ships answer the call. Accord, Dominion defectors, independent pilots, even a Null Collective splinter group that has seen the truth. The largest fleet the galaxy has ever assembled converges on the heart of everything.',
      recap_text:
        "Ambassador Lyrae rallied the galaxy. Ships from every faction converge on the Primordium for the final stand against the Sporoclasm.",
      hints: [
        "Visit sectors to rally allied ships to the cause.",
        "Every ally matters — leave no potential supporter behind.",
      ],
    },

    // =========================================================================
    // ACT 4: "Legacy of the Stars" (missions 56-80)
    // The climactic battle, the Gardener Protocol, and the fate of the galaxy.
    // Highest difficulty, biggest rewards.
    // =========================================================================
    {
      id: storyMissionId(56),
      title: "The Gathering Storm",
      description:
        "Visit 35 distinct sectors as the allied fleet assembles inside the Primordium.",
      type: "visit_sector",
      objectives: { sectorsToVisit: 35 },
      reward_credits: 20000,
      reward_xp: 1500,
      difficulty: 4,
      act: 4,
      story_order: 56,
      prerequisite_mission_id: storyMissionId(55),
      lore_text:
        "The fleet fills the Primordium's interior like seeds in a pod. Hundreds of ships from dozens of factions and species, united by the simple truth that the Sporoclasm threatens everything. In the garden's bioluminescent glow, old enemies share docking berths and former rivals coordinate battle plans.\n\nBut the unity is fragile. The Iron Dominion defectors are still soldiers — they want a military solution. The Accord wants to protect the garden. The Null Collective splinter group wants assurance that the Network's intelligence will not subsume their independence. Holding this alliance together may be harder than fighting the Sporoclasm itself.",
      recap_text:
        "The allied fleet assembled inside the Primordium — a fragile coalition united against the Sporoclasm but divided in doctrine.",
      hints: [
        "Coordinate with ships from different factions.",
        "The alliance needs visible leadership — be present everywhere.",
      ],
    },
    {
      id: storyMissionId(57),
      title: "Arsenal of the Ancients",
      description:
        "Deliver 60 units of tech to adapt Agaricalis defense systems for allied use.",
      type: "deliver_cargo",
      objectives: { commodity: "tech", quantity: 60 },
      reward_credits: 22000,
      reward_xp: 1600,
      difficulty: 4,
      act: 4,
      story_order: 57,
      prerequisite_mission_id: storyMissionId(56),
      lore_text:
        'Dr. Vorn makes a discovery that changes the battle calculus. The Primordium contains dormant defense systems far more powerful than the constructs guarding the outer shell. Weapons designed to fight the Sporoclasm specifically — but they were never activated. The Agaricalis built them and then chose not to use them.\n\n"They were afraid," Vorn realizes. "These weapons draw power from the Network itself. Using them risks damaging the very thing they are trying to protect. But we can modify them. With enough advanced tech, we can calibrate the weapons to target only corrupted mycelium."',
      recap_text:
        "Dr. Vorn found dormant Agaricalis weapons inside the Primordium, designed to fight the Sporoclasm but never activated.",
      hints: [
        "Source high-grade tech for weapon adaptation.",
        "The Agaricalis weapons need careful calibration.",
      ],
    },
    {
      id: storyMissionId(58),
      title: "The Sporoclasm Awakens",
      description:
        "Destroy 10 Sporoclasm dreadnoughts emerging from corrupted rifts in the shell.",
      type: "destroy_ship",
      objectives: { shipsToDestroy: 10 },
      reward_credits: 25000,
      reward_xp: 1800,
      difficulty: 4,
      act: 4,
      story_order: 58,
      prerequisite_mission_id: storyMissionId(57),
      lore_text:
        "The Sporoclasm responds to the fleet's presence with overwhelming force. Corrupted rifts tear open across the Primordium's shell — not the single breach you entered through, but dozens. Through them pour dreadnoughts: massive war-forms, each one a corrupted version of an Agaricalis capital ship, bristling with weapons grown from diseased mycelium.\n\nThe battle for the Primordium begins in earnest. The garden shakes. The bioluminescence flickers between desperate red and defiant gold. And through it all, the Primordium broadcasts one word, over and over, in every frequency the bio-resonance array can detect: \"Hurry.\"",
      recap_text:
        "The Sporoclasm launched its full assault — corrupted dreadnoughts pour through dozens of shell breaches. The Primordium pleads for haste.",
      hints: [
        "Focus fire on dreadnoughts with coordinated fleet attacks.",
        "The adapted Agaricalis weapons are effective against corrupted ships.",
      ],
    },
    {
      id: storyMissionId(59),
      title: "Hold the Line",
      description:
        "Trade 150 units of goods to keep the allied fleet supplied during the siege.",
      type: "trade_units",
      objectives: { unitsToTrade: 150 },
      reward_credits: 25000,
      reward_xp: 1800,
      difficulty: 4,
      act: 4,
      story_order: 59,
      prerequisite_mission_id: storyMissionId(58),
      lore_text:
        'The battle rages for days. The allied fleet holds, but barely. Ships are damaged, supplies are dwindling, and morale wavers with every casualty. The living bridges connecting the Primordium to the outer galaxy flicker under the strain — if they collapse, the fleet will be trapped.\n\nFleet Commander Tass is blunt: "We need supplies or we lose. It is that simple. Every unit of cargo that reaches this fleet is another hour we can fight. Run the bridges while they still hold. Trade everything you can. Buy everything we need."',
      recap_text:
        "The siege continues. The fleet is holding but running dangerously low on supplies as the living bridges strain.",
      hints: [
        "Use the living bridges for rapid supply runs.",
        "Trade volume is more important than profit right now.",
      ],
    },
    {
      id: storyMissionId(60),
      title: "Corruption Tide",
      description:
        "Destroy 12 Sporoclasm assault waves threatening the colony platforms.",
      type: "destroy_ship",
      objectives: { shipsToDestroy: 12 },
      reward_credits: 28000,
      reward_xp: 2000,
      difficulty: 5,
      act: 4,
      story_order: 60,
      prerequisite_mission_id: storyMissionId(59),
      lore_text:
        'The Sporoclasm changes tactics. Instead of attacking the fleet directly, it sends waves of smaller war-forms at the colony platforms. If the colonists die, the Primordium weakens. If the Primordium weakens, the Sporoclasm wins.\n\nThe colonists refuse to evacuate. "This is our home now," says Administrator Pel, who came all the way from the first frontier colony. "The garden gave us sanctuary. We will not abandon it." Their courage is humbling. Their vulnerability is terrifying.',
      recap_text:
        "The Sporoclasm targeted colony platforms to weaken the Primordium. Colonists refused evacuation, standing their ground.",
      hints: [
        "Prioritize defense of colony platforms over all other targets.",
        "Smaller war-forms are fast — use area weapons.",
      ],
    },
    {
      id: storyMissionId(61),
      title: "Feed the Garden",
      description:
        "Deliver 80 units of food to sustain colonists and expedition crew during the siege.",
      type: "deliver_cargo",
      objectives: { commodity: "food", quantity: 80 },
      reward_credits: 28000,
      reward_xp: 2000,
      difficulty: 5,
      act: 4,
      story_order: 61,
      prerequisite_mission_id: storyMissionId(60),
      lore_text:
        'The colony platforms hold, but the siege has lasted weeks. Food is the most critical shortage. The Primordium\'s internal ecosystem produces edible fungal growths, but they cannot sustain the human population alone. External food supplies are essential.\n\nDr. Vorn notes something unexpected: when the colonists eat food grown inside the Primordium alongside external supplies, the symbiosis between human biology and the Network deepens. "They are becoming part of the ecosystem," she observes with wonder. "Not losing themselves — growing. The Primordium is making them stronger."',
      recap_text:
        "The siege stretched on for weeks. Colonists eating Primordium food are developing a deepening symbiosis with the Network.",
      hints: [
        "Bring food from agricultural stations outside the core.",
        "The living bridges are under strain but still functional.",
      ],
    },
    {
      id: storyMissionId(62),
      title: "Scan the Heart",
      description:
        "Scan 12 sectors to locate the Primordium's true core — the activation point for the Gardener Protocol.",
      type: "scan_sectors",
      objectives: { scansRequired: 12 },
      reward_credits: 30000,
      reward_xp: 2200,
      difficulty: 5,
      act: 4,
      story_order: 62,
      prerequisite_mission_id: storyMissionId(61),
      lore_text:
        "The time has come. The Gardener Protocol must be activated, or the Sporoclasm will eventually overwhelm the defenses. But the Protocol requires physical access to the Primordium's true core — not the interior garden, but the innermost chamber where the Agaricalis consciousness resides.\n\nThe Primordium reveals its structure reluctantly, as if showing its most vulnerable point to a stranger requires an act of trust it is not sure it can make. But you have earned that trust. Sector by sector, scan by scan, the path to the heart reveals itself.",
      recap_text:
        "The Gardener Protocol must be activated at the Primordium's true core. The Network reluctantly reveals the path.",
      hints: [
        "Scan systematically to map the path to the innermost chamber.",
        "The Primordium guides your scans — follow its signals.",
      ],
    },
    {
      id: storyMissionId(63),
      title: "Path of the Gardener",
      description:
        "Visit 40 distinct sectors through the Primordium's inner labyrinth to reach the core chamber.",
      type: "visit_sector",
      objectives: { sectorsToVisit: 40 },
      reward_credits: 30000,
      reward_xp: 2200,
      difficulty: 5,
      act: 4,
      story_order: 63,
      prerequisite_mission_id: storyMissionId(62),
      lore_text:
        "The path to the core is a labyrinth — not designed to confuse, but to test. Each chamber presents a different aspect of the Agaricalis legacy. Rooms of pure memory where you experience the rise of their civilization. Galleries of living art that respond to your emotions. Gardens within gardens, each one a pocket ecosystem more beautiful than the last.\n\nThe Primordium is showing you what it means to be a gardener. Not just a caretaker of plants and spores, but a steward of life itself. Connection, patience, sacrifice, renewal. These are the principles the Agaricalis lived by. These are the principles that must guide whoever activates the Protocol.",
      recap_text:
        "The path to the core is a labyrinth that tests and teaches — each chamber reveals another aspect of the Agaricalis philosophy.",
      hints: [
        "Navigate each chamber thoughtfully — the path rewards understanding.",
        "The labyrinth changes based on your choices.",
      ],
    },
    {
      id: storyMissionId(64),
      title: "The Sporoclasm's Heart",
      description:
        "Destroy 14 elite Sporoclasm commanders guarding a corruption vein leading to the core.",
      type: "destroy_ship",
      objectives: { shipsToDestroy: 14 },
      reward_credits: 35000,
      reward_xp: 2500,
      difficulty: 5,
      act: 4,
      story_order: 64,
      prerequisite_mission_id: storyMissionId(63),
      lore_text:
        "The Sporoclasm knows you are close. It makes its most desperate move yet — sending its elite commanders, the oldest and most powerful corrupted entities, to block the path to the core. These are not mindless war-forms. They are the Sporoclasm's own version of gardeners — cultivators of corruption, shapers of the blight.\n\nEach one broadcasts a psychic assault as you approach: visions of despair, of entropy, of a universe where connection means consumption and growth means cancer. The Sporoclasm's philosophy is the mirror image of the Agaricalis. Where they nurtured, it devours.",
      recap_text:
        "The Sporoclasm sent its elite commanders — ancient corrupted entities — to block the path to the core chamber.",
      hints: [
        "Elite commanders use psychic attacks — stay focused.",
        "These are the most dangerous enemies in the game.",
      ],
    },
    {
      id: storyMissionId(65),
      title: "Last Supply Run",
      description:
        "Deliver 100 units of cyrillium to power the Gardener Protocol activation sequence.",
      type: "deliver_cargo",
      objectives: { commodity: "cyrillium", quantity: 100 },
      reward_credits: 35000,
      reward_xp: 2500,
      difficulty: 5,
      act: 4,
      story_order: 65,
      prerequisite_mission_id: storyMissionId(64),
      lore_text:
        'The elite commanders fall, and the path to the core chamber opens. But Dr. Vorn delivers sobering news: the Gardener Protocol requires an enormous amount of energy to activate. The Primordium\'s own reserves are depleted from centuries of fighting the corruption. External power is needed.\n\n"Cyrillium," Vorn says. "The same mineral that powered our first bio-resonance array. We need a hundred units — more than any single shipment in history. This is the last supply run. Make it count."',
      recap_text:
        "The path to the core opened, but the Gardener Protocol requires massive cyrillium reserves to activate.",
      hints: [
        "Source cyrillium from every available mining outpost.",
        "This is the largest single delivery in the campaign.",
      ],
    },
    {
      id: storyMissionId(66),
      title: "The Core Chamber",
      description:
        "Scan 14 sectors of the core chamber to understand the Primordium's deepest architecture.",
      type: "scan_sectors",
      objectives: { scansRequired: 14 },
      reward_credits: 38000,
      reward_xp: 2800,
      difficulty: 5,
      act: 4,
      story_order: 66,
      prerequisite_mission_id: storyMissionId(65),
      lore_text:
        "You enter the core chamber. Words fail. The space is vast beyond comprehension — a hollow sphere at the very center of the Primordium, its walls alive with the compressed memories of an entire civilization. Billions of Agaricalis minds, sleeping in the mycelium, their dreams forming the patterns of light that dance across the chamber walls.\n\nAt the center floats a structure like a seed — small enough to hold in your hands, yet radiating more energy than a star. The Root Seed. The first spore that grew into the Primordium, millions of years ago. The Gardener Protocol begins and ends here.",
      recap_text:
        "You entered the core chamber and found the Root Seed — the original spore that grew into the Primordium millions of years ago.",
      hints: [
        "Scan every surface of the core chamber.",
        "The Root Seed is the activation point — understand it completely.",
      ],
    },
    {
      id: storyMissionId(67),
      title: "Evacuation Protocol",
      description:
        "Visit 42 distinct sectors to ensure all non-essential personnel are evacuated before Protocol activation.",
      type: "visit_sector",
      objectives: { sectorsToVisit: 42 },
      reward_credits: 38000,
      reward_xp: 2800,
      difficulty: 5,
      act: 4,
      story_order: 67,
      prerequisite_mission_id: storyMissionId(66),
      lore_text:
        'Dr. Vorn is honest about the risks. "The Gardener Protocol will send a purging wave through the entire Network. Every corrupted thread, every blighted node, every Sporoclasm entity will be cleansed. But the wave will be... intense. Anyone inside the Primordium who is not shielded by the core chamber could be affected."\n\n"Affected how?" you ask.\n\n"Best case: temporary disorientation. Worst case: their consciousness gets swept up in the wave. We need to evacuate everyone we can. Only essential personnel in the core chamber when we activate."',
      recap_text:
        "The Gardener Protocol will send a purging wave through the entire Network. Non-essential personnel must evacuate the Primordium.",
      hints: [
        "Coordinate evacuation across all occupied sectors.",
        "Ensure civilians reach the living bridges before activation.",
      ],
    },
    {
      id: storyMissionId(68),
      title: "Rear Guard",
      description:
        "Destroy 15 Sporoclasm ships trying to prevent the evacuation.",
      type: "destroy_ship",
      objectives: { shipsToDestroy: 15 },
      reward_credits: 40000,
      reward_xp: 3000,
      difficulty: 5,
      act: 4,
      story_order: 68,
      prerequisite_mission_id: storyMissionId(67),
      lore_text:
        "The Sporoclasm senses what is coming. In a final, desperate assault, it throws everything it has at the evacuation fleet. Corrupted war-forms pour through every breach in the shell, targeting the civilian transports. The parasite knows: if it can keep enough living beings inside the Primordium when the Protocol fires, the purging wave will kill them, and the psychic trauma might shatter the Primordium's consciousness entirely.\n\nYou stand in the gap. The evacuation must succeed.",
      recap_text:
        "The Sporoclasm launched a desperate assault on evacuating civilians, trying to use their deaths to shatter the Primordium.",
      hints: [
        "Protect evacuation transports at all costs.",
        "Fight defensively — the goal is protection, not destruction.",
      ],
    },
    {
      id: storyMissionId(69),
      title: "The Volunteer",
      description:
        "Trade 200 units of goods to fund the final preparations and ensure the fleet can survive post-Protocol.",
      type: "trade_units",
      objectives: { unitsToTrade: 200 },
      reward_credits: 40000,
      reward_xp: 3000,
      difficulty: 5,
      act: 4,
      story_order: 69,
      prerequisite_mission_id: storyMissionId(68),
      lore_text:
        "The evacuation succeeds. The Primordium's interior is clear except for the core chamber team: you, Dr. Vorn, Ambassador Lyrae, and a handful of volunteers. The question that has hung over the expedition since Dr. Vorn decoded the Protocol can no longer be avoided.\n\nSomeone must merge with the Primordium to guide the purge.\n\nDr. Vorn steps forward. \"I have spent my life studying the Network. I understand it better than anyone. Let me be the gardener.\" The room is silent. Lyrae weeps. You want to argue, but you see the certainty in Vorn's eyes. This is what she was born to do.\n\nBut the fleet still needs resources to survive whatever comes next.",
      recap_text:
        "Dr. Vorn volunteered to merge with the Primordium and guide the purge. She steps forward with absolute certainty.",
      hints: [
        "Fund the fleet's post-Protocol survival supplies.",
        "This is the last trading window before the finale.",
      ],
    },
    {
      id: storyMissionId(70),
      title: "Gardener's Vigil",
      description:
        "Deposit 800 colonists on safe harbor worlds to preserve civilization if the Protocol fails.",
      type: "colonize_planet",
      objectives: { colonistsToDeposit: 800 },
      reward_credits: 42000,
      reward_xp: 3200,
      difficulty: 5,
      act: 4,
      story_order: 70,
      prerequisite_mission_id: storyMissionId(69),
      lore_text:
        'As a final precaution, Lyrae orders the establishment of safe harbor colonies — settlements far from any Network node, beyond the reach of both the purge and the Sporoclasm. If everything goes wrong, these colonies will preserve the knowledge and culture of the allied civilizations.\n\n"Hope for the best," Lyrae says, her voice steady despite everything. "Prepare for the worst. That is what leaders do." The safe harbor worlds are chosen for their isolation, their resources, and their beauty. If they become humanity\'s last homes, at least they will be good ones.',
      recap_text:
        "Ambassador Lyrae ordered safe harbor colonies on isolated worlds — a final insurance against catastrophic failure.",
      hints: [
        "Establish colonies on worlds far from Network nodes.",
        "Choose resource-rich, defensible locations.",
      ],
    },
    {
      id: storyMissionId(71),
      title: "The Darkest Hour",
      description:
        "Destroy 16 Sporoclasm siege engines attempting to crack the core chamber itself.",
      type: "destroy_ship",
      objectives: { shipsToDestroy: 16 },
      reward_credits: 45000,
      reward_xp: 3500,
      difficulty: 5,
      act: 4,
      story_order: 71,
      prerequisite_mission_id: storyMissionId(70),
      lore_text:
        "The Sporoclasm makes its final play. Siege engines — constructs so massive they dwarf capital ships — converge on the core chamber. They are not trying to enter. They are trying to destroy it from outside, to crush the Root Seed before the Protocol can be activated.\n\nThe Primordium shudders under the assault. Cracks appear in the core chamber walls. Golden light bleeds through like blood from wounds. Inside, Dr. Vorn sits in communion with the Root Seed, her body already beginning to dissolve into spore-light as the merge progresses. She cannot be interrupted. The Protocol is halfway activated.\n\nYou must hold the line.",
      recap_text:
        "Massive Sporoclasm siege engines attacked the core chamber as Dr. Vorn began merging with the Root Seed.",
      hints: [
        "Target siege engine weak points for maximum damage.",
        "The core chamber cannot take many more hits.",
      ],
    },
    {
      id: storyMissionId(72),
      title: "Threads of Fate",
      description:
        "Scan 15 sectors to synchronize the Network for the Protocol's galaxy-wide purge.",
      type: "scan_sectors",
      objectives: { scansRequired: 15 },
      reward_credits: 48000,
      reward_xp: 3800,
      difficulty: 5,
      act: 4,
      story_order: 72,
      prerequisite_mission_id: storyMissionId(71),
      lore_text:
        'The siege engines fall, but the Sporoclasm is not defeated — merely delayed. Dr. Vorn, now halfway between human and Network, speaks with two voices: her own and the Primordium\'s.\n\n"The Protocol is ready, but the Network must be synchronized. Every node, every bridge, every tendril must pulse in unison for the purge to reach every corrupted thread. I need you to scan the relay chain — confirm every link is active. If even one node is out of sync, the purge will leave pockets of corruption. The Sporoclasm will survive. And it will be angry."',
      recap_text:
        "Dr. Vorn, merging with the Network, needs every node synchronized before the purge. A single gap could leave the Sporoclasm alive.",
      hints: [
        "Scan relay nodes throughout the Network to confirm synchronization.",
        "Every node must register as active and aligned.",
      ],
    },
    {
      id: storyMissionId(73),
      title: "Final Communion",
      description:
        "Deliver 100 units of luxuries as offerings to the Agaricalis consciousness, honoring their sacrifice.",
      type: "deliver_cargo",
      objectives: { commodity: "luxuries", quantity: 100 },
      reward_credits: 50000,
      reward_xp: 4000,
      difficulty: 5,
      act: 4,
      story_order: 73,
      prerequisite_mission_id: storyMissionId(72),
      lore_text:
        'As the synchronization completes, something unexpected happens. The sleeping Agaricalis minds begin to wake. Not fully — not yet — but enough to be aware. Billions of ancient intelligences, stirring after millennia of dormancy, sensing what is about to happen.\n\nThey are afraid. They built the Network. They became the Network. And now a stranger is about to fundamentally change it. Ambassador Lyrae suggests an offering — not as payment, but as a gesture of respect. "Show them we value beauty. Show them we are worthy of the gift they are about to receive."',
      recap_text:
        "The sleeping Agaricalis minds began to stir, sensing the Protocol's activation. An offering of respect is needed.",
      hints: [
        "Gather the finest luxuries the frontier has to offer.",
        "This is a symbolic gesture — quality matters.",
      ],
    },
    {
      id: storyMissionId(74),
      title: "The Awakening Fleet",
      description:
        "Visit 48 distinct sectors as the Agaricalis consciousness fully awakens across the Network.",
      type: "visit_sector",
      objectives: { sectorsToVisit: 48 },
      reward_credits: 55000,
      reward_xp: 4000,
      difficulty: 5,
      act: 4,
      story_order: 74,
      prerequisite_mission_id: storyMissionId(73),
      lore_text:
        "The offering is accepted. Across the galaxy, the Spore Network blazes to life — not the hesitant awakening of a few nodes, but a full flowering. Every tendril, every node, every bridge pulses with golden light so bright it is visible in planetary skies. The Agaricalis are awake.\n\nAnd they remember everything. The building of the Network. The birth of the Sporoclasm. The long, sorrowful sleep. And now — new beings, small and brief but brave, who have come to the heart of things to set them right. The Agaricalis do not speak in words. They speak in light, in warmth, in a feeling of profound gratitude that washes over every living being in the galaxy.\n\nThe stage is set. The final act begins.",
      recap_text:
        "The Agaricalis fully awakened across the galaxy, flooding the Network with golden light and broadcasting gratitude to all living beings.",
      hints: [
        "Witness the awakening across as many sectors as possible.",
        "The Network is at full power — the purge is imminent.",
      ],
    },
    {
      id: storyMissionId(75),
      title: "Sporoclasm's Last Gambit",
      description:
        "Destroy 18 Sporoclasm titans — the parasite's most powerful remaining forces.",
      type: "destroy_ship",
      objectives: { shipsToDestroy: 18 },
      reward_credits: 60000,
      reward_xp: 4200,
      difficulty: 5,
      act: 4,
      story_order: 75,
      prerequisite_mission_id: storyMissionId(74),
      lore_text:
        "The Sporoclasm, sensing extinction, unleashes its final reserves. Titans — war-forms so large they have their own gravity wells — emerge from the deepest corruption zones. These are the oldest entities in the parasite's arsenal, fragments of the original shadow-intelligence that spawned ten thousand years ago.\n\nThey converge on the Primordium in a wave of darkness and fury. The Network trembles. The Agaricalis consciousness recoils. Dr. Vorn's merged voice screams across every frequency: \"Hold them! Hold them for just a little longer! The Protocol needs sixty more seconds!\"",
      recap_text:
        "The Sporoclasm unleashed its titans — ancient war-forms with their own gravity wells — in a final desperate assault on the Primordium.",
      hints: [
        "Titans are the ultimate challenge — coordinate the entire fleet.",
        "Sixty seconds. That is all Dr. Vorn needs.",
      ],
    },
    {
      id: storyMissionId(76),
      title: "Trade for Tomorrow",
      description:
        "Trade 300 units of goods to fund the post-purge reconstruction effort.",
      type: "trade_units",
      objectives: { unitsToTrade: 300 },
      reward_credits: 65000,
      reward_xp: 4500,
      difficulty: 5,
      act: 4,
      story_order: 76,
      prerequisite_mission_id: storyMissionId(75),
      lore_text:
        "The titans fall. The sixty seconds pass. And Dr. Thessa Vorn — xenomycologist, dreamer, gardener — activates the Protocol.\n\nA wave of golden light erupts from the Root Seed, propagating through every thread of the Spore Network at the speed of thought. Where it meets corruption, the darkness burns away like frost in sunlight. Across the galaxy, blighted nodes turn gold. Corrupted tendrils dissolve into harmless spores. The Sporoclasm screams — a psychic howl that every sentient being in the galaxy feels — and then falls silent.\n\nThe purge is complete. The Network is clean. But the galaxy is battered, and reconstruction will cost everything. The living bridges still function. The nodes still glow. And somewhere in the golden light, Dr. Vorn's consciousness smiles.",
      recap_text:
        "Dr. Vorn activated the Gardener Protocol. The Sporoclasm was purged from the galaxy in a wave of golden light. Reconstruction begins.",
      hints: [
        "Trade aggressively to fund reconstruction.",
        "The clean Network makes trade routes faster than ever.",
      ],
    },
    {
      id: storyMissionId(77),
      title: "New Roots",
      description:
        "Deposit 1000 colonists on worlds along the purified Network to begin a new era.",
      type: "colonize_planet",
      objectives: { colonistsToDeposit: 1000 },
      reward_credits: 70000,
      reward_xp: 4500,
      difficulty: 5,
      act: 4,
      story_order: 77,
      prerequisite_mission_id: storyMissionId(76),
      lore_text:
        "The post-purge galaxy is transformed. The Spore Network, free of corruption for the first time in ten thousand years, operates at full capacity. Living bridges connect every corner of the galaxy. Dormant nodes bloom into gardens. The Agaricalis consciousness, fully awake and grateful, offers partnership with the younger civilizations.\n\nBut partnership requires presence. The Network needs life around its nodes — not to power them now, but to guide them. The Agaricalis are wise but ancient. They need new perspectives, new ideas, new dreams to weave into the mycelium. Colonists are not just settlers anymore. They are co-gardeners of a cosmic ecosystem.",
      recap_text:
        "The purified Network operates at full capacity. The Agaricalis offer partnership and seek colonists as co-gardeners of the cosmic ecosystem.",
      hints: [
        "Colonize worlds along purified Network pathways.",
        "Each colony strengthens the human-Agaricalis partnership.",
      ],
    },
    {
      id: storyMissionId(78),
      title: "The Vorn Codex",
      description:
        "Scan 18 sectors to compile Dr. Vorn's complete research into a legacy archive.",
      type: "scan_sectors",
      objectives: { scansRequired: 18 },
      reward_credits: 75000,
      reward_xp: 4800,
      difficulty: 5,
      act: 4,
      story_order: 78,
      prerequisite_mission_id: storyMissionId(77),
      lore_text:
        'Dr. Vorn is not dead. She is not alive in the traditional sense either. She exists within the Network now — a human consciousness merged with the Agaricalis collective, serving as a translator between two forms of intelligence that could not be more different.\n\nShe asks one favor: compile her life\'s work into a codex. Every research note, every scan, every breakthrough — preserved not just in data banks but in the Network itself, woven into the mycelium for future generations to discover. "Let me be a bridge," her voice echoes through the golden light. "Not just between species, but between what we were and what we are becoming."',
      recap_text:
        "Dr. Vorn lives on within the Network, merged with the Agaricalis. She asks you to compile her research into a permanent legacy.",
      hints: [
        "Scan sectors where key research milestones occurred.",
        "Each scan preserves another chapter of Vorn's journey.",
      ],
    },
    {
      id: storyMissionId(79),
      title: "The Accord Reborn",
      description:
        "Deliver 120 units of luxuries to the grand celebration marking the new galactic alliance.",
      type: "deliver_cargo",
      objectives: { commodity: "luxuries", quantity: 120 },
      reward_credits: 80000,
      reward_xp: 4800,
      difficulty: 5,
      act: 4,
      story_order: 79,
      prerequisite_mission_id: storyMissionId(78),
      lore_text:
        'Ambassador Lyrae calls one final summit — not in a station, but inside the Primordium itself, in the garden that nearly died and was reborn. Every faction sends representatives. Even the Iron Dominion, humbled by the purge, sends Admiral Krath, who stands stiffly and admits: "We were wrong."\n\nThe Null Collective\'s fears proved partially correct — the Network is intelligent — but the intelligence chose partnership over domination. A new Accord is forged: the Galactic Mycorrhizal Compact, a treaty recognizing the Network as a shared heritage and the Agaricalis as co-citizens of the galaxy.\n\nLyrae smiles. "This time, let us celebrate without anyone trying to blow us up."',
      recap_text:
        "A new galactic alliance — the Mycorrhizal Compact — was forged inside the Primordium, with all factions signing on.",
      hints: [
        "Source the finest luxuries for the grandest celebration in galactic history.",
        "Every faction representative should feel welcome.",
      ],
    },
    {
      id: storyMissionId(80),
      title: "Legacy of the Stars",
      description:
        "Visit 55 distinct sectors on a grand tour of the reborn galaxy, witnessing the new era you helped create.",
      type: "visit_sector",
      objectives: { sectorsToVisit: 55 },
      reward_credits: 100000,
      reward_xp: 5000,
      difficulty: 5,
      act: 4,
      story_order: 80,
      prerequisite_mission_id: storyMissionId(79),
      lore_text:
        'The Agaricalis Saga ends where it began: in the cockpit of your ship, stars stretching in every direction. But everything has changed. The galaxy pulses with golden light. Living bridges arc between the stars like luminous highways. Planets near Network nodes bloom with hybrid ecosystems — human and fungal, growing together.\n\nAs you travel through sector after sector, you see the fruits of your journey. Colonies thriving. Trade routes buzzing. Former enemies sharing docking berths. And in every node, in every tendril, in every spore drifting through the void, Dr. Vorn\'s consciousness hums a quiet song of gratitude.\n\nYou are not the same pilot who left Docking Platform Seven. You are a gardener now. And the garden is the galaxy itself.\n\nThe Spore Network whispers one final message, felt more than heard, resonating in the bones of every living being from core to rim:\n\n"Thank you. Grow well."',
      recap_text:
        "The Mycorrhizal Compact was signed. The galaxy is at peace. One final journey remains — a victory lap through the reborn cosmos.",
      hints: [
        "Take your time on this final tour — you have earned it.",
        "Visit the places that mattered most in your journey.",
      ],
    },
  ];

  for (const mission of missions) {
    await knex("mission_templates").insert({
      id: mission.id,
      title: mission.title,
      description: mission.description,
      type: mission.type,
      objectives: JSON.stringify(mission.objectives),
      reward_credits: mission.reward_credits,
      reward_xp: mission.reward_xp,
      reward_item_id: null,
      time_limit_minutes: null,
      difficulty: mission.difficulty,
      repeatable: false,
      source: "story",
      requires_claim_at_mall: false,
      prerequisite_mission_id: mission.prerequisite_mission_id,
      act: mission.act,
      story_order: mission.story_order,
      lore_text: mission.lore_text,
      recap_text: mission.recap_text,
      hints: JSON.stringify(mission.hints),
    });
  }

  console.log(`Seeded ${missions.length} story mission templates`);
}
