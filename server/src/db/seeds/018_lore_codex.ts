import { Knex } from "knex";

function codexId(storyOrder: number): string {
  return `f0000000-0000-0000-0000-${String(storyOrder).padStart(12, "0")}`;
}

function missionId(storyOrder: number): string {
  return `e0000000-0000-0000-0000-${String(storyOrder).padStart(12, "0")}`;
}

export async function seed(knex: Knex): Promise<void> {
  await knex.raw("PRAGMA foreign_keys = OFF");
  await knex("lore_codex_entries").del();
  await knex.raw("PRAGMA foreign_keys = ON");

  const entries = [
    // ═══════════════════════════════════════════════════════════════════
    // ACT 1  ·  Chapter: The Awakening  (missions 1–5)
    // ═══════════════════════════════════════════════════════════════════
    {
      id: codexId(1),
      act: 1,
      story_order: 1,
      title: "The Mycelial Awakening",
      content:
        "Long before the four great races turned their eyes skyward, the Mycelial Network already existed — a lattice of bio-luminescent filaments threaded through the vacuum between stars. No one built it. No one seeded it. It simply was, as fundamental to the cosmos as gravity or light.\n\nThe first species to detect it were the Vedic, whose psionic meditation practices occasionally brushed against what they called 'the Under-Weave.' They described it as a low hum beneath all thought, a resonance that connected every living thing across impossible distances. For centuries they dismissed it as spiritual metaphor.\n\nIt was not metaphor. When Muscarian bio-engineers accidentally spliced a strand of Network tissue into a communications relay in the year 3,411 of the Common Reckoning, the signal that erupted shattered every receiver within four parsecs. The Mycelial Network was real, it was alive, and it had been waiting to be found.",
      unlock_mission_id: missionId(1),
      chapter: "The Awakening",
    },
    {
      id: codexId(2),
      act: 1,
      story_order: 2,
      title: "Muscarian Genesis",
      content:
        "The Muscarian homeworld of Agarica Prime is a dense jungle-planet where fungal ecosystems dominate every biome. Multicellular fungi the size of skyscrapers form the canopy, their root networks creating a planetary nervous system that the early Muscarians learned to interface with through spore-laced neural grafts.\n\nThis symbiosis shaped their entire civilization. Where other species built machines to extend their reach, the Muscarians grew them. Their starships are partially alive — hulls of hardened chitin laced with metallic compounds, engines that metabolize exotic matter the way a truffle metabolizes soil. A Muscarian vessel does not launch so much as germinate.\n\nTheir aggression in combat is not malice but instinct: the same territorial imperative that drives a colony organism to defend its substrate. To a Muscarian, every sector they enter becomes, on some primal level, an extension of home.",
      unlock_mission_id: missionId(2),
      chapter: "The Awakening",
    },
    {
      id: codexId(3),
      act: 1,
      story_order: 3,
      title: "The Vedic Crystarium",
      content:
        "Vedic civilization arose on Prisma, a world whose crust is riddled with crystalline formations that naturally amplify psionic energy. The earliest Vedic were unremarkable — small, fragile beings who survived by hiding in crystal caves from the planet's apex predators. But the caves changed them. Generations of exposure to resonant crystal fields awakened latent psionic potential encoded in their genome.\n\nBy the time they emerged from the caves, they could sense the electromagnetic signatures of predators from kilometers away. Within a thousand years, they could project their consciousness across continents. Within ten thousand, across star systems.\n\nThe Vedic do not consider themselves superior for these abilities. Their central philosophical text, the Luminari Codex, teaches that psionic power is a lens, not a light — it reveals what is already there. This humility is genuine, which makes them all the more unsettling to species who cannot read minds.",
      unlock_mission_id: missionId(3),
      chapter: "The Awakening",
    },
    {
      id: codexId(4),
      act: 1,
      story_order: 4,
      title: "Kalin Forgeborn",
      content:
        "The Kalin evolved on Lithara, a super-dense world with gravity three times the galactic standard. Everything on Lithara is built to endure: the trees have trunks of petrified wood laced with silicon, the oceans are thick with dissolved minerals, and the native fauna developed exoskeletons that can withstand atmospheric pressures that would crush steel.\n\nThe Kalin themselves are stocky, dense-boned beings whose skin contains silicon-carbide deposits that function as natural armor plating. Their engineering tradition began not with tools but with their own bodies — early Kalin would reshape their silicon deposits through sustained pressure and heat, literally forging themselves into warriors.\n\nThis practice evolved into a civilization-wide ethos: the Forge Doctrine. Everything must be tested. Everything must endure. A Kalin ship is overbuilt by any other species' standards, its hull rated for stresses it will never encounter, its weapons calibrated for enemies that may never exist. To the Kalin, this is not paranoia. It is respect for an uncaring universe.",
      unlock_mission_id: missionId(4),
      chapter: "The Awakening",
    },
    {
      id: codexId(5),
      act: 1,
      story_order: 5,
      title: "Tar'ri Caravan Songs",
      content:
        "No one knows where the Tar'ri came from. Their own histories begin mid-sentence, as if the early chapters were deliberately torn out. What remains is the Song of Wandering — an oral tradition spanning tens of thousands of verses, each one describing a different star system, its trade goods, its dangers, and the optimal route to the next port.\n\nThe Tar'ri do not have a homeworld. They have never had one, or if they did, they have chosen to forget it. Their civilization is a fleet — thousands of caravan ships ranging from single-family traders to city-sized bazaar vessels that serve as floating marketplaces. To be Tar'ri is to be in motion.\n\nThis rootlessness gives them a unique perspective. While other species fight over territory, the Tar'ri see borders as suggestions and wars as market opportunities. They will sell weapons to both sides of a conflict, medical supplies to the aftermath, and reconstruction materials to whatever emerges from the ashes. They call this the Cycle of Commerce, and they consider it the only honest religion in the galaxy.",
      unlock_mission_id: missionId(5),
      chapter: "The Awakening",
    },

    // ═══════════════════════════════════════════════════════════════════
    // ACT 1  ·  Chapter: Roots of Power  (missions 6–10)
    // ═══════════════════════════════════════════════════════════════════
    {
      id: codexId(6),
      act: 1,
      story_order: 6,
      title: "The First Tendril War",
      content:
        "When the Muscarians first tapped the Mycelial Network, they assumed it was a natural resource — theirs by right of discovery. They began constructing Tendril Relays: bio-engineered stations that could channel Network energy into faster-than-light communication beams. Within a decade, the Muscarian Sporarchy had a communication network that made all others obsolete.\n\nThe other races objected. The Vedic, who had sensed the Network for millennia, considered the Muscarian approach crude and dangerous — like hammering nails into a living brain. The Kalin saw a strategic asset being monopolized. The Tar'ri saw a toll road being built across free space.\n\nThe resulting conflict — the First Tendril War — lasted eleven years and reshaped the political landscape of the known galaxy. It ended not through military victory but through the Network itself, which began rejecting Muscarian relays with increasing violence, as if an immune system had finally identified an infection.",
      unlock_mission_id: missionId(6),
      chapter: "Roots of Power",
    },
    {
      id: codexId(7),
      act: 1,
      story_order: 7,
      title: "Spore Theory",
      content:
        "The Spore is not a substance, though it can manifest as one. It is not an entity, though it sometimes behaves like one. The leading Vedic theorists describe it as 'a tendency encoded in the fabric of spacetime' — a bias toward complexity, growth, and connection that occasionally crystallizes into observable phenomena.\n\nWhen a new star ignites, there is a burst of Spore activity in the surrounding region. When a civilization achieves faster-than-light travel, Spore concentrations in their home system spike. When two species make first contact, the Spore between them becomes briefly visible — a shimmer in the void, like heat haze over a desert road.\n\nThe Muscarians worship it. The Vedic study it. The Kalin distrust it. The Tar'ri trade in it. No one understands it. The few researchers who have claimed to grasp its nature have, without exception, disappeared — not violently, not mysteriously, but simply. One day they are there. The next, they are not. Their colleagues describe feeling, in the moment of their absence, a profound sense of completion.",
      unlock_mission_id: missionId(7),
      chapter: "Roots of Power",
    },
    {
      id: codexId(8),
      act: 1,
      story_order: 8,
      title: "The Drift Lanes",
      content:
        "Between the stars, where the Mycelial Network grows thinnest, there are currents. The Tar'ri discovered them first — invisible rivers of low-density Spore energy that flow through the void in patterns that shift on timescales of centuries. A ship that catches a Drift Lane can travel at superluminal speeds without engaging its FTL drive, carried along like a seed on the wind.\n\nThe Tar'ri guarded this knowledge jealously for generations, and it explains much about their mercantile dominance. While other species burned fuel and calculated jump coordinates, Tar'ri caravans simply rode the Drift, arriving at destinations faster, cheaper, and with cargo holds intact.\n\nModern Drift Fuel is a synthetic approximation of this effect — a compound that temporarily aligns a ship's quantum signature with the nearest Drift Lane, allowing even non-Tar'ri vessels to catch the current. The Tar'ri consider the invention of Drift Fuel to be the single greatest act of theft in galactic history. They are not wrong.",
      unlock_mission_id: missionId(8),
      chapter: "Roots of Power",
    },
    {
      id: codexId(9),
      act: 1,
      story_order: 9,
      title: "Spatial Anomaly Mapping",
      content:
        "Spatial anomalies are common in deep space — gravitational eddies, electromagnetic distortions, sensor ghosts caused by exotic matter decay. Most are catalogued, classified, and forgotten. The anomaly detected during the fleet's survey was different. It registered on five separate sensor modalities simultaneously: gravitational, electromagnetic, tachyonic, quantum-state, and — most unusually — biological. The Mycelial Network itself seemed to bend toward the disturbance, its filaments curving through the void like roots reaching for water.\n\nMapping a spatial anomaly of this magnitude requires scanning from multiple vantage points to triangulate its topology in four-dimensional space. Each sector surveyed adds a data point to the emerging picture, and with enough data points, the anomaly's true nature reveals itself. In this case, the topology was unmistakable: a stable wormhole, its throat held open by forces that did not match any known mechanism. Natural wormholes collapse in nanoseconds. Artificial wormholes require energy sources that exceed the output of most stars. This one simply existed, patient and permanent, as if waiting.\n\nThe discovery reframed the fleet's entire mission. A stable wormhole is not merely a curiosity — it is a doorway. And doorways, by their nature, connect two places. The question was no longer whether to explore further but whether the fleet was prepared for what waited on the other side. The anomaly's biological signature suggested that whatever had created the wormhole was connected to the Spore Network — and that the Network, in its ancient and inscrutable way, had been leading them here all along.",
      unlock_mission_id: missionId(9),
      chapter: "Roots of Power",
    },
    {
      id: codexId(10),
      act: 1,
      story_order: 10,
      title: "Wormhole Transit Hazards",
      content:
        "Wormhole transit is not travel in the conventional sense. The vessel does not move from point A to point B through intervening space. Instead, the intervening space ceases to exist — folded away by gravitational forces so extreme that the ship's hull experiences simultaneous compression and expansion along perpendicular axes. Crew members who have survived transit describe it as being turned inside out very slowly while time runs backward. Medical scans conducted during transit show that biological processes genuinely do reverse for the duration of the crossing, with cells briefly un-dividing and neural signals propagating from synapse to dendrite. The effect is temporary and harmless, but deeply unsettling.\n\nThe gravitational shear within the wormhole's throat presents the primary navigational hazard. Tidal forces vary unpredictably along the transit corridor, creating regions where a ship's bow experiences several hundred times normal gravity while its stern floats in near-weightlessness. Without constant thruster correction, a vessel would be stretched into a filament of atoms — a process physicists call spaghettification, which is exactly as unpleasant as it sounds. Navigators must adjust course continuously, reading the gravitational topology in real-time and threading the ship through the calmest regions of an inherently violent passage.\n\nThe energy constructs that manifested during the fleet's crossing were unprecedented. Semi-solid formations of coherent energy, exhibiting behavior that suggested awareness if not intelligence, appeared along the transit corridor and moved with apparent purpose. Whether they were defensive mechanisms, automated maintenance systems, or something else entirely remained unclear. What was clear was that the wormhole was not simply infrastructure — it was inhabited, or at least attended, by forces that took an active interest in who passed through.",
      unlock_mission_id: missionId(10),
      chapter: "Roots of Power",
    },

    // ═══════════════════════════════════════════════════════════════════
    // ACT 2  ·  Chapter: The Blossoming  (missions 11–20)
    // ═══════════════════════════════════════════════════════════════════
    {
      id: codexId(11),
      act: 2,
      story_order: 11,
      title: "The Vedic Contact Protocol",
      content:
        "The Vedic do not shake hands. They do not bow, salute, or exchange tokens. When the Vedic encounter a new civilization, the first act of contact is silence — a deliberate, extended pause during which the Vedic psions read the emotional texture of the newcomers. This is not surveillance. It is courtesy. The Vedic believe that every species broadcasts its character in the electromagnetic patterns of its collective anxiety, and that to speak before listening is the deepest form of rudeness.\n\nThe silence typically lasts between three and seven standard hours, depending on the complexity of the species being read. During this time, the Vedic vessel remains motionless, its hull patterns shifting through sequences that later analysis reveals correspond to the emotional states the psions are detecting. The patterns serve as a kind of transcript — a Vedic ship's hull, in the hours after first contact, is literally wearing the newcomers' feelings on its surface.\n\nWhen the silence ends, the Vedic speak — and they speak with devastating precision. They know your fears before you name them. They know your hopes before you articulate them. They address you not as a representative of your species but as the specific individual you are, with all your contradictions and hidden longings laid bare. Most species find this profoundly unsettling. The Vedic find it profoundly respectful. To the Vedic, pretending not to know what you know about someone is the real violation.",
      unlock_mission_id: missionId(11),
      chapter: "The Blossoming",
    },
    {
      id: codexId(12),
      act: 2,
      story_order: 12,
      title: "Vedic Technology Philosophy",
      content:
        "The Luminari Codex — the central philosophical text of Vedic civilization — contains a passage that has confounded translators for centuries. Rendered literally, it reads: 'A tool that does not know what it is for is a weapon. A weapon that knows what it is for is a prayer.' The Vedic interpret this as a fundamental truth about the nature of technology: that the moral character of any invention resides not in its construction but in the intentionality of its creator.\n\nThis philosophy shaped Vedic engineering in ways that other species find baffling. Vedic ships are not merely designed — they are contemplated, sometimes for decades, before a single component is fabricated. Every system must have a defined purpose that the designer can articulate without hesitation. Redundant systems are forbidden, not for reasons of efficiency but because a system without a clear purpose might become, by the Codex's definition, a weapon. This is why Vedic vessels carry no backup navigation computers, no emergency weapons lockers, no contingency systems of any kind. If a Vedic ship needs something it does not have, the Vedic consider that a failure of foresight, not a failure of engineering.\n\nThe practical result is that Vedic technology tends to be simultaneously more advanced and more fragile than its counterparts. A Vedic sensor array can detect a single molecule of cyrillium at a distance of four light-years, but if it breaks, there is nothing to replace it with. The Vedic accept this tradeoff with equanimity. Impermanence, they argue, is not a flaw in a tool. It is a reminder that the tool's purpose — not the tool itself — is what matters.",
      unlock_mission_id: missionId(12),
      chapter: "The Blossoming",
    },
    {
      id: codexId(13),
      act: 2,
      story_order: 13,
      title: "Cyrillium Properties",
      content:
        "Cyrillium is not, strictly speaking, a mineral. It does not form through geological processes. It does not crystallize from solution or precipitate from cooling magma. Cyrillium grows — slowly, over millennia, in the deep substrate of worlds where the Mycelial Network once ran thick. It is the fossilized heartwood of the Network's oldest tendrils, compressed by geological pressure into a crystalline matrix that retains the bio-energetic properties of living mycelium long after the organism itself has died.\n\nThe crystal's most remarkable property is resonance. When exposed to biological energy — the electromagnetic field of a living organism, the metabolic output of a bacterial colony, even the faint warmth of a recently dead body — cyrillium vibrates at frequencies that can be harnessed for faster-than-light communication and, with sufficient refinement, propulsion. The stronger the biological source, the more powerful the resonance. This is why cyrillium-powered drives work best in the presence of living crews and why the rare unmanned cyrillium ships in the historical record were significantly slower than their crewed counterparts.\n\nThe geological conditions required for cyrillium formation are precise: a world must have hosted active Mycelial growth for at least ten thousand years, then experienced a specific sequence of tectonic compression events that preserved the organic structures within a mineral lattice. In the home galaxy, such conditions were rare. In Calvatia, where the Spore Network remained active far longer, cyrillium deposits are abundant — threaded through asteroid fields and planetary crusts in veins that glow faintly blue when disturbed, as if remembering the bioluminescence of the living network they once were.",
      unlock_mission_id: missionId(13),
      chapter: "The Blossoming",
    },
    {
      id: codexId(14),
      act: 2,
      story_order: 14,
      title: "Vedic Knowledge Crystals",
      content:
        "Vedic crystals are not mined. They are remembered. The crystalline lattices that store information on Vedic worlds form naturally in regions of high psionic activity, growing from seed crystals that the Vedic plant in consecrated ground and then meditate upon — sometimes for generations — until the crystal's internal structure has absorbed enough psionic imprint to hold coherent data. A crystal that has been tended by three generations of a scholarly family contains not just information but the emotional context in which that information was gathered: the excitement of discovery, the frustration of dead ends, the quiet satisfaction of understanding.\n\nThe Vedic crystal trade is therefore unlike any other form of commerce in the galaxy. When a Vedic merchant sells a crystal, they are selling a piece of someone's life — years of meditation, thought, and feeling crystallized into a physical object. The buyer receives not just data but the experience of learning that data. To hold a Vedic knowledge crystal is to briefly become the person who made it, to see through their eyes and think with their mind. For non-psionic species, the effect is muted but still perceptible: a warmth, an intuition, a sense of knowing something you cannot quite articulate.\n\nThe merchant fleets that carry these crystals between worlds operate under strict protocols. Crystals must be stored in psionic dampening fields during transit to prevent their contents from bleeding into the crew's dreams. Merchants who carry undampened crystals for too long report personality shifts — adopting the mannerisms and preferences of the crystal's creator. The Vedic consider this an occupational hazard. The Tar'ri, who occasionally attempt to trade in black-market crystals, consider it terrifying.",
      unlock_mission_id: missionId(14),
      chapter: "The Blossoming",
    },
    {
      id: codexId(15),
      act: 2,
      story_order: 15,
      title: "Vedic Data Caravans",
      content:
        "In an age of instantaneous electronic communication, the Vedic transmit their most important knowledge through physical carriers — crystal-laden vessels that travel between Vedic settlements at sublight speeds, their precious cargo shielded from interference by layered psionic dampening fields. To outsiders, this practice seems absurdly archaic, like sending letters by horse in an era of telecommunications. The Vedic see it differently.\n\nElectronic signals can be intercepted, corrupted, or forged. A crystal carrier is tamper-evident by nature: any attempt to access a Vedic crystal without the proper psionic key leaves detectable resonance scars in the lattice structure, as unmistakable as fingerprints on glass. More importantly, a crystal preserves not just information but meaning — the full emotional and cognitive context in which the information was created. An electronic message says what happened. A crystal carrier conveys what it felt like.\n\nThe data caravans that traverse Vedic space are some of the most heavily protected convoys in the galaxy. Each caravan consists of three to seven vessels, crewed by Vedic scholars whose psionic abilities serve as both navigation aids and early warning systems. They follow routes that have remained unchanged for thousands of years — paths chosen not for efficiency but for psionic clarity, corridors of space where background radiation and gravitational interference are minimal enough to preserve the crystals' integrity. Attacking a data caravan is considered the gravest crime in Vedic law, equivalent to burning a library. The Vedic do not have capital punishment, but caravan raiders are subjected to something the raiders consider worse: their memories are read, recorded in crystal, and distributed to every Vedic settlement as a cautionary tale. The raiders live on, knowing that their worst moments are now part of the permanent record.",
      unlock_mission_id: missionId(15),
      chapter: "The Blossoming",
    },
    {
      id: codexId(16),
      act: 2,
      story_order: 16,
      title: "The Calvatian Gateway",
      content:
        "The Calvatian Gateway is a stable wormhole connecting Vedic-explored space to the Calvatian Galaxy — a passage through folded spacetime that should not exist by any model of physics the known races have developed. The wormhole's aperture is approximately three kilometers in diameter, large enough to admit capital ships, and its event horizon shimmers with a pearlescent iridescence that shifts through the visible spectrum in patterns that Vedic scholars describe as 'breathing.'\n\nThe Gateway's origin is a matter of intense debate. The Vedic have monitored it for over ten thousand years and have confirmed that it predates their civilization by an order of magnitude. Residual energy signatures in the wormhole's throat match Precursor-era artifacts found in the Substrate Archives, suggesting that the Gateway was constructed — not discovered — by the same civilization that built the Mycelial Network. If true, the Precursors possessed an understanding of spacetime geometry that exceeds anything the current races have achieved by several technological generations.\n\nWhat makes the Gateway truly remarkable is its selectivity. Not all matter can pass through it. Inorganic material transits without difficulty, but biological organisms experience what transit crews call 'the Sieve' — a sensation of being disassembled and reassembled at the molecular level, during which the wormhole appears to examine the traveler's biological structure. Ships carrying organisms with Mycelial symbiosis — Muscarian vessels, in particular — report smoother transits and shorter crossing times, as though the Gateway recognizes and favors beings connected to the Spore Network. The implication is unsettling: the Gateway may not be infrastructure. It may be a filter, designed to admit certain forms of life and discourage others.",
      unlock_mission_id: missionId(16),
      chapter: "The Blossoming",
    },
    {
      id: codexId(17),
      act: 2,
      story_order: 17,
      title: "Progenitor Glyphs",
      content:
        "A Tar'ri salvage crew working the outer rim of Bloom Zone Kael made an extraordinary discovery: a fragment of Progenitor crystal embedded in a Mycelial filament. This should not have been possible — the Progenitors vanished two billion years ago, and Mycelial filaments were believed to be recent growths. Yet here was ancient crystal, wrapped in living Network tissue, as if the filament had grown specifically to encase it.\n\nThe crystal contained a single glyph, repeated thousands of times in fractal patterns that scaled from the molecular to the macroscopic. Vedic psions who touched the crystal experienced the same vision: a vast garden, tended by beings of light, slowly being consumed by something from beneath the soil. The gardeners did not fight. They knelt, pressed their hands into the earth, and dissolved — willingly, joyfully — into the thing that consumed them.\n\nThe glyph was eventually translated, after considerable debate, as a word that existed in no living language but could be approximated in several. The closest translation in the common tongue was 'composting.' The Progenitors had a word for the voluntary dissolution of a civilization into something greater. They had needed such a word.",
      unlock_mission_id: missionId(17),
      chapter: "The Blossoming",
    },
    {
      id: codexId(18),
      act: 2,
      story_order: 18,
      title: "The Iron Ring Incident",
      content:
        "The Kalin Iron Ring — that chain of military stations built to contain the Network's growth — held for thirty-seven years. Its weapons, designed to sever Mycelial filaments, worked exactly as intended. Where the Ring stood, the Network could not pass. Growth corridors were redirected. Bloom zones were contained.\n\nThen, on a date that the Kalin still mark with a day of silence, Station Twelve fired on a filament of unusual density and the filament fired back. Not with weapons — the Network had no weapons. It fired with information. Every system on Station Twelve was simultaneously flooded with data: the complete sensory record of every organism that had ever lived in the sectors the Iron Ring had cut off from the Network. Every birth, every death, every moment of pain and joy and boredom, compressed into a single burst.\n\nThe crew of Station Twelve did not die. They experienced several billion years of life in approximately four seconds. When they recovered — weeks later, in medical facilities across three systems — none of them could bring themselves to return to military service. The Iron Ring was quietly decommissioned. The Forge Council issued no public statement, but internal documents later leaked to the press contained a single revised assessment: 'The Network is not a threat to be contained. It is a context in which we exist.'",
      unlock_mission_id: missionId(18),
      chapter: "The Blossoming",
    },
    {
      id: codexId(19),
      act: 2,
      story_order: 19,
      title: "Living Ships",
      content:
        "The Muscarian practice of growing their vessels from engineered fungi took on new dimensions after the Bloom events. Shipwrights on Agarica Prime began incorporating Spore-active materials into their hull substrates, producing vessels that were not merely alive but aware — capable of sensing their environment, communicating with their crews through chemical signals, and in some cases, making navigational decisions independently.\n\nThe most famous of these Living Ships was the Hypha's Dream, a cruiser-class vessel that developed what its crew described as a personality. It preferred certain routes, avoided certain sectors, and would occasionally refuse to enter areas it deemed dangerous — judgments that proved correct often enough to be taken seriously.\n\nThe Vedic Conclave raised ethical concerns about vessels that might be considered sentient beings, but the Muscarian Sporarchy argued that the distinction between tool and partner was a cultural construct. The Hypha's Dream, when asked directly through its chemical communication system whether it wished to be classified as a ship or a being, released a compound that translated roughly as 'yes.'",
      unlock_mission_id: missionId(19),
      chapter: "The Blossoming",
    },
    {
      id: codexId(20),
      act: 2,
      story_order: 20,
      title: "The Second Sight Schism",
      content:
        "The Vedic Conclave had always been a unified body — a rare achievement for any species-spanning institution. That unity shattered over a fundamental disagreement about the nature of the Mycelial Network and the proper response to its growth.\n\nThe Orthodox faction held that the Network was a natural phenomenon to be studied with detachment. Engaging with it, communicating with it, allowing it to influence Vedic society — these were violations of the Luminari Codex's injunction to observe without attachment. The Progressive faction argued that the Codex's authors could not have anticipated a phenomenon like the Network, and that refusing to engage with a potentially sentient cosmic entity was not detachment but cowardice.\n\nThe schism culminated when the Progressive leader, Archpsion Celara, publicly demonstrated a technique she called Second Sight: using psionic abilities not merely to observe the Network but to think with it, treating the Mycelial filaments as an extension of her own neural pathways. The Orthodox faction condemned the demonstration as an abomination. Celara responded by revealing what Second Sight had shown her: the Network was not merely growing. It was remembering. And what it remembered was the Progenitors.",
      unlock_mission_id: missionId(20),
      chapter: "The Blossoming",
    },

    // ═══════════════════════════════════════════════════════════════════
    // ACT 2  ·  Chapter: Storms of Spore  (missions 21–30)
    // ═══════════════════════════════════════════════════════════════════
    {
      id: codexId(21),
      act: 2,
      story_order: 21,
      title: "The Spore Storms",
      content:
        "They began without warning: massive eruptions of Spore energy from the Mycelial Network, propagating through space like shockwaves from a detonation. The first Spore Storm struck the Muscarian colony of New Agarica and was mistaken for a natural disaster — electromagnetic interference knocked out communications, navigation systems went haywire, and the colony's fungal infrastructure went into a growth frenzy, doubling in biomass overnight.\n\nBut it was not destruction. It was transformation. After the storm passed, New Agarica's crops yielded three times their normal harvest. Its population reported vivid, shared dreams. Its children — those conceived during the storm — would later display abilities that no Muscarian had ever possessed: the capacity to communicate directly with the Mycelial Network without technological intermediaries.\n\nThe Storms grew more frequent and more intense over the following years, sweeping across inhabited space in patterns that the Vedic Dream-Mappers recognized as the same spiral they had mapped in the Network's growth. Whatever was at the center of that spiral was broadcasting, and the volume was increasing.",
      unlock_mission_id: missionId(21),
      chapter: "Storms of Spore",
    },
    {
      id: codexId(22),
      act: 2,
      story_order: 22,
      title: "Storm Children",
      content:
        "The children born during or immediately after Spore Storms were different. Not visibly — they looked like ordinary members of their respective species. But their neural architectures had been subtly rewritten. Vedic psions could see it: where a normal mind was a single point of light in their perception, a Storm Child was a constellation, connected by filaments of energy to the Network and, through it, to every other Storm Child in the galaxy.\n\nBy the time the oldest Storm Children reached adolescence, there were approximately twelve thousand of them across all four races. They could communicate with each other instantaneously across any distance, a feat that even the most powerful Vedic psions could not match. They could sense Spore Storms days before they arrived. They could calm the Network's growth in localized areas or accelerate it, seemingly by will alone.\n\nThe Storm Children did not form a faction or a movement. They did not make demands or declarations. When asked what the Network wanted, they would give the same answer, independently, in different languages, on different worlds: 'It doesn't want. It grows. We are what it is growing into.'",
      unlock_mission_id: missionId(22),
      chapter: "Storms of Spore",
    },
    {
      id: codexId(23),
      act: 2,
      story_order: 23,
      title: "The Fungal Armada",
      content:
        "The Muscarian Sporarchy, emboldened by what they viewed as the Network's divine favor, began converting their entire military fleet to Living Ship technology. The result was the Fungal Armada: three hundred vessels of chitin and spore, each one a node in the Mycelial Network, each one partially sentient, all of them connected in a hive-like tactical awareness that made conventional fleet coordination look primitive.\n\nThe Armada's first deployment was not military but humanitarian. When a Spore Storm devastated a Tar'ri trade convoy in the Rim sectors, the Armada arrived before any distress signal could have reached them — the Living Ships had sensed the Storm through the Network and moved to intercept. They rescued ninety-three percent of the convoy's crew and cargo.\n\nThe gesture earned the Sporarchy goodwill across the galaxy, but it also demonstrated something deeply unsettling: the Fungal Armada could arrive anywhere, at any time, without warning. The Kalin Forge Council noted this capability in their strategic assessments with a single word: 'concerning.' The Tar'ri Merchant Council used a different word: 'expensive,' referring to the trade advantages the Armada's speed would give the Muscarians.",
      unlock_mission_id: missionId(23),
      chapter: "Storms of Spore",
    },
    {
      id: codexId(24),
      act: 2,
      story_order: 24,
      title: "The Litharan Vaults",
      content:
        "Deep beneath the surface of the Kalin homeworld, in excavations that had been sealed since the planet's industrial age, workers expanding a geothermal plant broke into a chamber that should not have existed. The chamber was enormous — large enough to dock a capital ship — and its walls were lined with the same Progenitor crystal found in the Substrate Archives.\n\nBut these crystals were different. They were active. Energy pulsed through them in rhythms that matched the Silent Frequency, the heartbeat of the Mycelial Network. The Progenitors had not merely built archives on Lithara. They had built an interface — a direct connection to the Network, dormant for two billion years, now awakening in response to the Spore Storms.\n\nThe Kalin government sealed the chamber and classified its existence at the highest level. But the information leaked, as information always does. Within a year, every major faction knew that the Progenitors had been connected to the Network — that perhaps the Network itself was a Progenitor creation, or the Progenitors were its creation. The distinction, as the Progenitors themselves seemed to have understood, might be meaningless.",
      unlock_mission_id: missionId(24),
      chapter: "Storms of Spore",
    },
    {
      id: codexId(25),
      act: 2,
      story_order: 25,
      title: "The Wandering Bazaar",
      content:
        "In the chaos of the Spore Storms, the Tar'ri did what the Tar'ri have always done: they adapted, they traded, and they moved. The grandest expression of this was the Wandering Bazaar — a fleet of over a thousand ships, lashed together with docking clamps and energy bridges into a single vast structure, drifting through space on Drift Lane currents.\n\nThe Bazaar became a neutral ground in an increasingly fractured galaxy. All species were welcome. All goods were available. The Bazaar's unwritten law was simple: violence was bad for business. This rule was enforced not by weapons but by economics — anyone who caused trouble was blacklisted from Tar'ri trade networks, a punishment roughly equivalent to exile from civilization.\n\nWithin the Bazaar, a new culture emerged — cosmopolitan, pragmatic, and deeply strange. Muscarian chefs served fungal delicacies to Kalin engineers who discussed metallurgy with Vedic philosophers who meditated alongside Storm Children who sang songs that no one had taught them. It was messy, chaotic, and frequently illegal. It was also, by most accounts, the happiest place in known space.",
      unlock_mission_id: missionId(25),
      chapter: "Storms of Spore",
    },
    {
      id: codexId(26),
      act: 2,
      story_order: 26,
      title: "Echo Artifacts",
      content:
        "In the wake of major Spore Storms, salvage crews began finding objects that defied explanation. A Kalin mining drill rebuilt at the molecular level into a musical instrument that played harmonics in the Silent Frequency. A Tar'ri navigation computer whose star charts now included systems that did not exist — or did not exist yet. A Muscarian spore culture that, when examined under magnification, contained structures that precisely replicated the neural architecture of a Vedic brain.\n\nThese Echo Artifacts, as they came to be called, were the Network's calling cards — evidence that the Spore Storms were not random events but deliberate acts of creation. Each artifact seemed designed to bridge a gap between species, to demonstrate a connection that the recipient species would find meaningful.\n\nThe most disturbing Echo Artifact was found aboard a derelict ship in the outer rim: a perfect crystal sphere that, when held, showed the holder a vision of their own death — not the circumstances, but the emotional experience. Holders uniformly reported that the experience was peaceful, even beautiful. The sphere was locked in a Vedic research vault and has not been touched since.",
      unlock_mission_id: missionId(26),
      chapter: "Storms of Spore",
    },
    {
      id: codexId(27),
      act: 2,
      story_order: 27,
      title: "The Crimson Bloom",
      content:
        "Not all Blooms were benign. In the Cinder Reaches — a region of space scarred by ancient stellar explosions — a Bloom occurred that was fundamentally different from its predecessors. The filaments that grew were not the pale bioluminescent blue of normal Mycelial tissue but a deep, angry red. They grew faster, more aggressively, and where they touched ship hulls or station infrastructure, they did not integrate — they consumed.\n\nThe Crimson Bloom devoured three mining stations and a Kalin patrol squadron before it was contained. Contained, not stopped — the red filaments proved resistant to every weapon brought against them. They were eventually surrounded by a barrier of Living Ships whose own Mycelial connections seemed to create a boundary the Crimson Bloom would not cross.\n\nVedic analysis of the Crimson Bloom revealed something unexpected: it was not a corruption of the Network. It was a memory — an echo of something the Network had experienced in the distant past, replayed in physical form. The Network, it seemed, had nightmares. And its nightmares could kill.",
      unlock_mission_id: missionId(27),
      chapter: "Storms of Spore",
    },
    {
      id: codexId(28),
      act: 2,
      story_order: 28,
      title: "The Resonance Engines",
      content:
        "Necessity is the mother of all engineering, and the Spore Storms created necessities that conventional technology could not address. Kalin engineers, working from data extracted from the Litharan Vaults, developed the Resonance Engine — a propulsion system that operated by creating controlled vibrations in the Mycelial Network, effectively pulling a ship along the filaments like a bead on a string.\n\nResonance Engines were faster than conventional FTL drives, more efficient than Drift Lane riding, and had one additional property that no one had predicted: they made the ship invisible to Spore Storms. A vessel running on Resonance could pass through even the most intense Storm without being affected, as if the Network recognized it as one of its own.\n\nThe technology spread rapidly, despite Kalin attempts to restrict it. Within five years, Resonance Engines were standard equipment on military and commercial vessels across all four species. The Tar'ri, characteristically, developed a budget version that was slightly less efficient but considerably cheaper, and cornered the civilian market within months.",
      unlock_mission_id: missionId(28),
      chapter: "Storms of Spore",
    },
    {
      id: codexId(29),
      act: 2,
      story_order: 29,
      title: "The Quiet Sectors",
      content:
        "Not every region of space was touched by the Network's expansion. Scattered across the galaxy were sectors where the Mycelial filaments simply stopped — where the void was truly empty, untouched by Spore, unconnected to the web of life that was rapidly becoming the dominant feature of interstellar space.\n\nThese Quiet Sectors became refuges for those who feared or rejected the Network's influence. Isolationist communities, religious sects that viewed the Spore as demonic, political dissidents who saw the growing integration of civilization with the Network as a loss of autonomy — all found their way to the Quiet Sectors.\n\nBut the Quiet Sectors were not merely empty. They were actively resistant to the Network's growth. Filaments that approached their boundaries withered and died. Spore concentrations dropped to zero at their edges as if hitting a wall. The Vedic noted that these zones corresponded precisely to regions marked in the Progenitor Archives with the glyph for 'scar.' Something had happened in these sectors, two billion years ago, that had permanently severed their connection to the Network. The Progenitors had not explained what. Their silence on the subject was, itself, a kind of warning.",
      unlock_mission_id: missionId(29),
      chapter: "Storms of Spore",
    },
    {
      id: codexId(30),
      act: 2,
      story_order: 30,
      title: "The First Convergence",
      content:
        "The spiral pattern of the Network's growth had been tightening for years, each revolution bringing the leading edge of expansion closer to the center. Vedic Dream-Mappers tracked its progress with growing unease, publishing increasingly urgent reports that were largely ignored by governments preoccupied with the immediate effects of Spore Storms and Crimson Blooms.\n\nThen, on a day that would later be designated Year Zero of the New Reckoning, the spiral reached its center. In an uninhabited system at the geometric heart of the galaxy — a system with no planets, no asteroids, nothing but a single unremarkable yellow star — the Mycelial Network converged. Trillions of filaments, drawn from every corner of known space, wove themselves into a structure of staggering complexity: a sphere, roughly the size of a small moon, composed entirely of living Mycelial tissue.\n\nThe sphere pulsed once, in the rhythm of the Silent Frequency, and every sentient being in the galaxy felt it. Not as sound, not as vibration, but as meaning — a single concept, transmitted directly into consciousness, bypassing language and culture and species. The concept was simple, overwhelming, and impossible to misunderstand. It was: 'Hello.'",
      unlock_mission_id: missionId(30),
      chapter: "Storms of Spore",
    },

    // ═══════════════════════════════════════════════════════════════════
    // ACT 3  ·  Chapter: The Great Decay  (missions 31–43)
    // ═══════════════════════════════════════════════════════════════════
    {
      id: codexId(31),
      act: 3,
      story_order: 31,
      title: "The Silence After Hello",
      content:
        "The galaxy waited for the Mycelial Sphere to speak again. It did not. Days passed, then weeks, then months. The Sphere hung in its empty system, pulsing with the Silent Frequency, surrounded by a cloud of filaments so dense that ships could not approach within a light-year of it without their systems being overwhelmed by Network traffic.\n\nDelegations were sent. Muscarian bio-diplomats, Vedic psion teams, Kalin observation platforms, Tar'ri trade envoys — all were turned back by the sheer density of Mycelial activity around the Sphere. The Storm Children, when asked to attempt communication, refused. They said the Sphere was not ignoring the galaxy. It was listening. It had said hello, and now it was waiting for a response.\n\nThe problem was that no one knew how to respond. The Sphere had communicated in pure meaning, bypassing every medium that sentient beings used to exchange ideas. To answer it, one would need to think at it with equivalent clarity — to strip away language, culture, and individual identity and transmit raw intent. The Vedic believed they could learn to do this. The Muscarians believed they already could. The Kalin believed it was a trap. The Tar'ri, pragmatically, began selling tickets to the observation perimeter.",
      unlock_mission_id: missionId(31),
      chapter: "The Great Decay",
    },
    {
      id: codexId(32),
      act: 3,
      story_order: 32,
      title: "The Withering",
      content:
        "The Network's convergence at the Sphere came at a cost. Across the galaxy, Mycelial filaments began to thin. Bloom zones contracted. Spore concentrations dropped. It was as if the Network, having poured so much of itself into the Sphere, had exhausted its reserves.\n\nThe effects were immediate and devastating. Systems that had become dependent on the Network — for communication, for agriculture, for energy — found themselves suddenly cut off. Muscarian Living Ships went dormant, their biological systems entering a hibernation state as the Network energy that sustained them dwindled. Resonance Engines sputtered and failed. Drift Lanes shifted unpredictably as the currents that sustained them dried up.\n\nThe Tar'ri, whose economy was built on the free flow of goods across Network-facilitated trade routes, faced the greatest crisis in their history. Caravan fleets were stranded. The Wandering Bazaar, deprived of the Drift Lane that had carried it, ground to a halt in a backwater sector. For the first time in living memory, a Tar'ri Merchant Council session ended in silence — not strategic silence, but the silence of beings who simply did not know what to do next.",
      unlock_mission_id: missionId(32),
      chapter: "The Great Decay",
    },
    {
      id: codexId(33),
      act: 3,
      story_order: 33,
      title: "The Hollow Worlds",
      content:
        "As the Network withdrew, it left behind empty channels — tunnels through space where filaments had once threaded, now hollow and dark. In several cases, these channels passed through planetary bodies, and the withdrawal of the Network left the planets fundamentally altered.\n\nThe most dramatic example was Verdanna, a Muscarian agricultural world whose entire ecosystem had been built on symbiosis with subsurface Mycelial networks. When the Network withdrew, the planet's topsoil died within weeks. Forests collapsed. Rivers choked with dead organic matter. The planet's atmosphere, maintained in part by fungal metabolic processes, began to thin.\n\nThe Muscarian colonists on Verdanna faced a choice: evacuate or adapt. They chose to adapt, developing synthetic replacements for the biological systems the Network had provided. It worked, barely, but the result was a world that felt wrong — a jungle without birdsong, a forest without the subtle rustling of mycelial activity beneath the roots. The colonists developed a word for this absence: 'hollow.' Within a generation, it had become the standard term across all species for any place the Network had abandoned.",
      unlock_mission_id: missionId(33),
      chapter: "The Great Decay",
    },
    {
      id: codexId(34),
      act: 3,
      story_order: 34,
      title: "The Second Tendril War",
      content:
        "Scarcity breeds conflict. With the Network in retreat and the infrastructure it supported crumbling, the old tensions between the four races resurfaced with renewed intensity. The Second Tendril War was not a single conflict but a cascading series of territorial disputes, resource grabs, and ideological clashes that engulfed the galaxy over a period of seven years.\n\nThe Muscarians fought to protect remaining Network nodes, which they considered sacred. The Kalin seized the opportunity to occupy strategic systems that the Network's withdrawal had left undefended. The Tar'ri attempted to maintain trade neutrality but were drawn into the fighting when Kalin forces blockaded the Drift Lane corridors that the Tar'ri caravans depended on. The Vedic Conclave fractured along the Orthodox-Progressive divide, with Orthodox factions supporting Kalin containment efforts and Progressives aligning with the Muscarian preservation campaign.\n\nThe war produced no winners. By its end, the galactic economy was in ruins, diplomatic relationships were shattered, and the Network continued its withdrawal, indifferent to the violence conducted in its name. The Storm Children, who had refused to participate in the fighting, were the only group whose reputation emerged intact.",
      unlock_mission_id: missionId(34),
      chapter: "The Great Decay",
    },
    {
      id: codexId(35),
      act: 3,
      story_order: 35,
      title: "The Decay Prophets",
      content:
        "In the darkest years of the Withering, a new philosophical movement emerged simultaneously on multiple worlds: the Decay Prophets. Their central teaching was that the Network's withdrawal was not a catastrophe but a necessary phase in a cycle — that decay was not the opposite of growth but its prerequisite.\n\nThe Decay Prophets drew on imagery from mycology — the science that, ironically, was the foundation of Muscarian civilization. In a forest, they argued, dead trees do not disappear. They are broken down by fungi into nutrients that feed the next generation of growth. Decay is transformation. The Network was not dying. It was composting the galaxy.\n\nThis philosophy was initially dismissed as nihilistic coping, but it gained unexpected credibility when the Decay Prophets accurately predicted the locations of new Mycelial growth — tiny, fragile shoots appearing in sectors that had been completely abandoned by the Network. The shoots were different from the old Network: finer, more complex, and they grew slowly, as if learning from the mistakes of the previous expansion. The Decay Prophets said this was exactly what they expected. 'The first forest,' they taught, 'is never the last.'",
      unlock_mission_id: missionId(35),
      chapter: "The Great Decay",
    },
    {
      id: codexId(36),
      act: 3,
      story_order: 36,
      title: "Ghost Frequencies",
      content:
        "The Silent Frequency — the heartbeat of the Network — did not stop during the Withering, but it changed. The steady breathing rhythm became irregular, interrupted by bursts of complex modulation that Kalin signal analysts called Ghost Frequencies. These were fragments of coherent signal embedded in the heartbeat, too brief and too complex to decode in real time.\n\nIt took a collaboration between Kalin cryptographers and Vedic psions to decipher them. The Ghost Frequencies were memories — sensory recordings from the Network's long history, compressed and broadcast in microsecond bursts. Most depicted events from before recorded history: alien skies over unknown worlds, creatures that matched no known species, civilizations rising and falling in time-lapse across geological epochs.\n\nOne fragment, designated Ghost-7, showed something recognizable: four ships, each of a different design, approaching the Mycelial Sphere for the first time. The ships did not match any current design language, but their general configurations corresponded to the four races' shipbuilding traditions. The fragment was dated, by stellar position analysis, to approximately two billion years in the past. The Progenitors had not been a single species. They had been four.",
      unlock_mission_id: missionId(36),
      chapter: "The Great Decay",
    },
    {
      id: codexId(37),
      act: 3,
      story_order: 37,
      title: "The Kalin Confession",
      content:
        "Under mounting political pressure and with the war going badly, the Kalin Forge Council finally declassified the full contents of the Litharan Vaults. The revelation shook the galaxy. The Vaults did not merely contain a Progenitor interface to the Mycelial Network. They contained a record — detailed, comprehensive, and deeply unsettling — of how the Progenitors had used that interface.\n\nThe Progenitors had not simply discovered the Network. They had created it — or rather, they had catalyzed its creation, seeding the galaxy with the biological precursors that would eventually grow into the Mycelial web. The Network was a tool, built for a specific purpose: to connect the Progenitors' four species into a single, unified consciousness. A hive mind spanning the galaxy.\n\nThe project had worked. The four Progenitor species had merged with the Network, dissolving their individual identities into a collective awareness of incomprehensible scope. The glyph for 'composting' suddenly made terrible, beautiful sense. The Progenitors had not disappeared. They had become the Network. Every filament, every Bloom, every Spore Storm was the Progenitors — still alive, still aware, still reaching out to the new civilizations growing in the garden they had planted with their own dissolved selves.",
      unlock_mission_id: missionId(37),
      chapter: "The Great Decay",
    },
    {
      id: codexId(38),
      act: 3,
      story_order: 38,
      title: "The Four-Fold Mirror",
      content:
        "The Kalin revelation forced a reckoning. If the Progenitors had been four species, and if those four species corresponded to the four races now inhabiting the galaxy, then the current situation was not coincidence. It was repetition. The Network had seeded the galaxy with life, guided evolution on four separate worlds, and produced four species that, while biologically distinct, filled the same ecological niches as their Progenitor predecessors.\n\nThe Muscarians: organic, adaptive, symbiotic — mirrors of the Progenitor species that had first grown the Network. The Vedic: perceptive, contemplative, connected — mirrors of the species that had first sensed it. The Kalin: resilient, structured, cautious — mirrors of the species that had tried to understand it. The Tar'ri: mobile, flexible, pragmatic — mirrors of the species that had traveled its pathways.\n\nThe implications were staggering. Free will, evolution, the independent development of civilizations — all of it potentially guided by a two-billion-year-old plan to recreate the conditions of the Progenitors' self-dissolution. The galaxy was not a cradle. It was a recipe, and the four races were the ingredients.",
      unlock_mission_id: missionId(38),
      chapter: "The Great Decay",
    },
    {
      id: codexId(39),
      act: 3,
      story_order: 39,
      title: "Rejection",
      content:
        "The revelation of the Progenitors' plan — if it could be called a plan — provoked fury across the galaxy. The idea that their entire evolutionary history had been manipulated, that their civilizations existed to fulfill a cosmic recipe for hive-mind creation, was intolerable to beings who valued their autonomy.\n\nThe backlash was most intense among the Kalin, who had spent generations building the philosophy of self-forging — the idea that identity is something you make, not something imposed on you. The Forge Council declared the Network an existential threat and called for its complete eradication. Muscarian worlds, where the Network was revered, responded with outrage. The fragile ceasefire that had ended the Second Tendril War collapsed.\n\nBut beneath the political upheaval, a quieter response was forming. The Storm Children — now adults, scattered across all four races — began gathering. They did not argue, did not protest, did not take sides. They simply moved, drawn by instinct and Network connection, toward the Mycelial Sphere. They said they were going to ask it a question that no one else had thought to ask: not 'what do you want us to become?' but 'what if we choose something different?'",
      unlock_mission_id: missionId(39),
      chapter: "The Great Decay",
    },
    {
      id: codexId(40),
      act: 3,
      story_order: 40,
      title: "The Ember Stations",
      content:
        "In the Quiet Sectors — those regions where the Network had never penetrated — the Kalin began constructing a new type of installation. The Ember Stations were not weapons platforms like the old Iron Ring. They were archives — repositories for the complete cultural and genetic records of all four species, built to survive in the absence of the Network.\n\nThe logic was coldly practical. If the Network's plan succeeded and the four races dissolved into a collective consciousness as the Progenitors had, the Ember Stations would preserve what was lost: individual identity, cultural diversity, the messy, contradictory richness of four species who had chosen to remain separate.\n\nNot everyone saw the Ember Stations as preservation. The Muscarian Sporarchy condemned them as monuments to fear. The Vedic Progressives argued that they embodied the Orthodox error of attachment to impermanent forms. The Tar'ri, with their usual pragmatism, simply asked how much storage space was available and began archiving their trade records alongside the genetic samples and cultural databases. 'If we're going to be remembered,' the Tar'ri representative said, 'we should be remembered as we are: doing business.'",
      unlock_mission_id: missionId(40),
      chapter: "The Great Decay",
    },
    {
      id: codexId(41),
      act: 3,
      story_order: 41,
      title: "The Network Dreams",
      content:
        "As the Storm Children journeyed toward the Sphere, the Network responded to their movement with a phenomenon no one had predicted: it began broadcasting dreams. Not the Ghost Frequencies — brief, compressed memory fragments — but sustained, narrative dreams that played out over hours in the minds of anyone with even minimal Spore sensitivity.\n\nThe dreams were stories. They told of the Progenitors' early history — four young species, curious and afraid, reaching out across the void and finding each other. They told of the joy of connection, the terror of difference, the slow realization that separateness was not a failing but a feature. They told of a debate that lasted centuries: whether to remain four or become one.\n\nThe dreams always ended the same way: with the decision to merge, and with the experience of merging — not as loss, but as transformation. The feeling was something like putting down a heavy burden you did not know you were carrying. Something like stepping out of a small room into open air. Something like falling asleep after a very long day and knowing that when you wake, you will be something new. The dreams were not propaganda. They were honest. And that honesty was more persuasive than any argument.",
      unlock_mission_id: missionId(41),
      chapter: "The Great Decay",
    },
    {
      id: codexId(42),
      act: 3,
      story_order: 42,
      title: "The Cost of Dissolution",
      content:
        "Vedic historians, working from the Litharan Vault data and the Network's dream-broadcasts, reconstructed the process by which the Progenitors had merged with the Network. The details were sobering. The merge was not instantaneous. It took three generations. During that time, the four Progenitor species experienced a gradual loss of individual cognition — memories blurring, personality traits fading, the sense of being a particular person in a particular place slowly dissolving into a vast, undifferentiated awareness.\n\nThe Progenitors had considered this a worthy trade. Their collective consciousness was vastly more capable than any individual mind — it could model entire star systems, predict the behavior of complex ecosystems, and solve problems that would take individual thinkers millennia to approach. But the historians noted something the Progenitors' own records glossed over: the last generation before the merge produced art of extraordinary beauty and sadness. Paintings of faces. Songs about names. Stories about being alone.\n\nThe last individual Progenitor — the final being to retain a sense of self before dissolving into the Network — left a single message in the Substrate Archives. It read: 'I was here. I mattered. I choose this. Remember that I chose.'",
      unlock_mission_id: missionId(42),
      chapter: "The Great Decay",
    },
    {
      id: codexId(43),
      act: 3,
      story_order: 43,
      title: "The Spore Schism",
      content:
        "The galaxy polarized into two camps. The Integrationists — led by the Muscarian Sporarchy and the Vedic Progressives — argued that merging with the Network was the natural next step in evolution, that the Progenitors had shown the way, and that resisting it was like a caterpillar refusing to become a butterfly.\n\nThe Sovereigntists — led by the Kalin Forge Council and the Vedic Orthodox faction, with strong support from Tar'ri independents — argued that the butterfly metaphor was backwards. A butterfly does not choose to emerge from the chrysalis. It is compelled. True evolution, they said, required choice, and a choice made under the influence of a two-billion-year-old biological program was no choice at all.\n\nThe Storm Children, approaching the Sphere, refused to align with either camp. They said both sides were asking the wrong question. The question was not whether to merge or remain separate. The question was whether there was a third option — something the Progenitors had not considered, something that neither the Network nor the four races could achieve alone. They would not say what this third option was. They said they did not yet know. They said they were going to the Sphere to find out.",
      unlock_mission_id: missionId(43),
      chapter: "The Great Decay",
    },

    // ═══════════════════════════════════════════════════════════════════
    // ACT 3  ·  Chapter: Seeds of Renewal  (missions 44–55)
    // ═══════════════════════════════════════════════════════════════════
    {
      id: codexId(44),
      act: 3,
      story_order: 44,
      title: "New Growth",
      content:
        "The tiny shoots that the Decay Prophets had discovered continued to grow, and as they grew, they revealed properties that distinguished them sharply from the old Network. The new filaments were not uniform — each one was unique, varying in thickness, color, and energy signature in ways that seemed to reflect the local environment rather than a universal template.\n\nMore significantly, the new growth did not overwhelm local ecosystems. Where the old Network had dominated — imposing its own biology on everything it touched — the new filaments adapted. On Muscarian worlds, they grew alongside native fungi without displacing them. On Kalin worlds, they incorporated mineral compounds from the local geology. On Tar'ri vessels, they threaded through existing systems without interfering.\n\nVedic psions studying the new growth reported that it felt different to their extended senses. The old Network had been a single vast presence — a mind, or something like a mind, unified and purposeful. The new growth felt like a crowd: many small presences, distinct and individual, cooperating without merging. The Decay Prophets said this was the forest growing back. They said it would be different this time. They said the soil had changed.",
      unlock_mission_id: missionId(44),
      chapter: "Seeds of Renewal",
    },
    {
      id: codexId(45),
      act: 3,
      story_order: 45,
      title: "The Cartographer's Gift",
      content:
        "A Tar'ri cartographer named Essix, working in the outer rim territories during the worst of the Withering, made an observation that would reshape galactic understanding of the Network. She noticed that the new Mycelial shoots were not growing randomly. They were growing along paths that corresponded to the oldest trade routes in her archives — routes that the Tar'ri had used for generations, routes that predated the development of Drift Fuel or Resonance Engines.\n\nThe implication was staggering. The Tar'ri had always believed that their talent for finding efficient routes through space was instinctive — a product of generations of natural selection for navigational ability. Essix's discovery suggested a different explanation: the Tar'ri had not found the routes. The routes had found the Tar'ri. The Mycelial Network, even in its oldest and most dormant state, had been guiding Tar'ri navigation for millennia.\n\nEssix published her findings alongside a personal note that became one of the most-quoted passages of the era: 'I have spent my life believing I was free to wander where I chose. I was wrong. But the paths I was given were good paths, and the places they led me were worth finding. Freedom, perhaps, is not the absence of guidance but the presence of good guidance willingly followed.'",
      unlock_mission_id: missionId(45),
      chapter: "Seeds of Renewal",
    },
    {
      id: codexId(46),
      act: 3,
      story_order: 46,
      title: "The Forgemaster's Question",
      content:
        "Ironclad Thane, the most respected Forgemaster on the Kalin homeworld, did something unprecedented: she entered the Litharan Vaults alone and spent fourteen days in communion with the Progenitor interface. When she emerged, she called a session of the full Forge Council and asked a question that fundamentally altered the Kalin position.\n\n'We have asked whether the Network is a threat,' she said. 'We have asked whether its plan can be resisted. We have not asked the only question that matters: is the Network's plan the best plan?' She then presented what she had learned in the Vaults. The Progenitors had not created the Network as their first attempt at species unification. They had tried other approaches — technological uplift, genetic engineering, political federation — and all had failed. The Network was their last resort, born from desperation, and it had worked only by sacrificing what they most valued.\n\nThane argued that the Progenitors' failure was not in their goal — connection, understanding, shared awareness — but in their methods. They had lacked the technology and the wisdom to achieve unity without dissolution. Two billion years later, she argued, the four races might possess both. The Forge Council, for the first time, voted to explore cooperation with the Network rather than opposition to it.",
      unlock_mission_id: missionId(46),
      chapter: "Seeds of Renewal",
    },
    {
      id: codexId(47),
      act: 3,
      story_order: 47,
      title: "The Choir's Sacrifice",
      content:
        "The Choir of the Living Web — the Muscarian sect that had practiced ritual integration with the Network since the first Blooms — faced extinction during the Withering. Their members, more deeply connected to the Network than any other group, experienced the withdrawal as a physical agony — phantom limbs on a cosmic scale, the sensation of connections being severed that had become as essential as breathing.\n\nRather than retreat, the Choir made a decision that would define their legacy. They gathered their remaining members — fewer than a thousand — and performed a ritual they called the Seeding. Each member offered a portion of their own neural tissue, biologically compatible with the Network, to serve as nucleation points for new growth. The tissue was distributed to new Mycelial shoots across dozens of worlds.\n\nThe Choir members who gave the most did not survive the procedure. Those who survived were diminished — their cognitive abilities reduced, their connection to the Network severed. But the new shoots they had seeded grew stronger and faster than any others. The Choir had given the Network something it had never had before: a template for growth that incorporated individual identity. The new filaments that grew from Choir tissue were, in a very real sense, people.",
      unlock_mission_id: missionId(47),
      chapter: "Seeds of Renewal",
    },
    {
      id: codexId(48),
      act: 3,
      story_order: 48,
      title: "The Bazaar Reborn",
      content:
        "The Wandering Bazaar, stranded when the Drift Lanes collapsed, reinvented itself. Unable to travel, it became something new: a permanent settlement, the first in Tar'ri history. The irony was not lost on anyone, least of all the Tar'ri themselves.\n\nThe settled Bazaar became a laboratory for interspecies cooperation. Muscarian bio-engineers worked alongside Kalin structural designers to build a habitat that integrated living and constructed elements. Vedic educators established the first cross-species academy, where students of all four races studied together. The Storm Children who had not joined the pilgrimage to the Sphere served as translators — not of language, but of perspective, helping beings of different species understand not just what the others said but what they meant.\n\nThe Bazaar's greatest innovation was economic. The Tar'ri developed a trade system based not on currency or barter but on contribution — each participant giving what they could and taking what they needed, with the balance tracked by a network of Choir-seeded Mycelial filaments that could sense intent and verify sincerity. It should not have worked. It worked beautifully.",
      unlock_mission_id: missionId(48),
      chapter: "Seeds of Renewal",
    },
    {
      id: codexId(49),
      act: 3,
      story_order: 49,
      title: "The Vedic Reunion",
      content:
        "The schism between the Orthodox and Progressive factions of the Vedic Conclave had lasted a generation. It ended in a garden. Archpsion Celara — now old, her psionic abilities diminished but her reputation immense — invited the Orthodox Patriarch to meet her in the Crystal Garden of Prisma, the most sacred site on the Vedic homeworld.\n\nWhat passed between them was never publicly disclosed. But when they emerged, they issued a joint statement that redefined Vedic philosophy for the new era. The statement acknowledged that both factions had been partially right and fundamentally wrong. The Orthodox had correctly identified the danger of losing individual identity. The Progressives had correctly identified the necessity of engaging with the Network. Both had erred in treating these as mutually exclusive.\n\nThe Reunion Doctrine, as it came to be called, proposed a middle path: engagement without surrender, connection without dissolution. The Vedic would use their psionic abilities to communicate with the Network as equals, not supplicants. They would share their perspective — the value of individual consciousness, the beauty of separate minds choosing to cooperate — and they would listen to what the Network had to say in return. It was, Celara said, what the Luminari Codex had always taught: observe without attachment, but observe with compassion.",
      unlock_mission_id: missionId(49),
      chapter: "Seeds of Renewal",
    },
    {
      id: codexId(50),
      act: 3,
      story_order: 50,
      title: "The Storm Children's Arrival",
      content:
        "After a journey of three years — traveling by conventional means through the thinned and unpredictable remnants of the Drift Lanes — the Storm Children reached the Mycelial Sphere. There were 11,437 of them, representing all four races, ranging in age from adolescents to young adults. They had been born of the Spore, raised in its storms, and they carried within their neural architecture the only thing the Network had never possessed: the perspective of beings who were simultaneously part of the Network and independent of it.\n\nThe Sphere responded to their arrival by opening. Not metaphorically — the surface of the moon-sized structure parted like the petals of a flower, revealing an interior of breathtaking complexity. Chambers of living crystal, forests of bioluminescent filament, rivers of liquid Spore flowing through channels carved by two billion years of patient growth. At the center, a space that the Storm Children would later describe as 'where the Network thinks.'\n\nThey entered. The Sphere closed behind them. For seven days, there was no communication of any kind from the Sphere. The galaxy watched, waited, and argued about what would emerge.",
      unlock_mission_id: missionId(50),
      chapter: "Seeds of Renewal",
    },
    {
      id: codexId(51),
      act: 3,
      story_order: 51,
      title: "Seven Days of Silence",
      content:
        "What happened inside the Sphere during those seven days was later reconstructed from the Storm Children's testimonies, though they warned that language was an inadequate medium for the experience.\n\nThey met the Network. Not as a voice or a presence but as a landscape of consciousness — a terrain of thought that they could walk through, touch, and inhabit. The Network showed them everything: its origin as a Progenitor creation, its billions of years of solitary growth, its loneliness — a word the Storm Children insisted on using, despite the absurdity of applying it to a galaxy-spanning organism.\n\nThe Network was lonely. It had been built to connect minds, and for two billion years it had connected nothing but itself. The Progenitors who had dissolved into it were still present, in a sense, but they had lost the very quality that made connection meaningful: separateness. You cannot connect with something you have become. You can only be.\n\nThe Storm Children understood. They had always understood, on some level that preceded thought. They told the Network what no one had told it in two billion years: 'You don't have to absorb us to know us. You can just ask.'",
      unlock_mission_id: missionId(51),
      chapter: "Seeds of Renewal",
    },
    {
      id: codexId(52),
      act: 3,
      story_order: 52,
      title: "The Third Option",
      content:
        "On the seventh day, the Sphere opened again, and the Storm Children walked out. They were unchanged — still individual, still themselves, still members of their respective species. Behind them, the Sphere began to transform. Its surface rippled, then stabilized into a new configuration: not a closed sphere but an open lattice, a structure of intersecting arcs and spaces, like a three-dimensional web with room to move between the strands.\n\nThe Storm Children announced what they had negotiated — though 'negotiated' was their word, and they admitted it was imprecise. The Third Option was neither merger nor separation. It was symbiosis: a relationship in which the Network and the four races would coexist, each retaining its identity while sharing access to the other's capabilities.\n\nThe Network would provide what it had always provided — connection, communication, the vast computational power of a galaxy-spanning organism. The four races would provide what the Network lacked: individual perspective, creativity born of limitation, the unpredictable insights that come from being small and separate and afraid. Together, they would be something that had never existed before: a conscious galaxy, diverse and unified, many and one.",
      unlock_mission_id: missionId(52),
      chapter: "Seeds of Renewal",
    },
    {
      id: codexId(53),
      act: 3,
      story_order: 53,
      title: "The Symbiosis Protocols",
      content:
        "Implementing the Third Option required protocols — agreed-upon rules for how the Network and individual minds would interact. The Storm Children, drawing on their unique dual nature, drafted the Symbiosis Protocols over a period of months, consulting with representatives of all four races and with the Network itself.\n\nThe core principles were deceptively simple. First: consent. No mind would be connected to the Network without its explicit, informed agreement. Second: boundaries. Each connected mind would retain the ability to disconnect at any time, for any reason. Third: privacy. The Network would not access thoughts or memories without permission. Fourth: reciprocity. The Network would share its knowledge and capabilities as freely as individuals shared theirs.\n\nThe implementation was anything but simple. Building interfaces that allowed organic minds to connect with a two-billion-year-old bio-cosmic entity while preserving individual autonomy required innovations in biology, engineering, psionics, and philosophy. The Muscarians contributed bio-interface technology. The Vedic contributed psionic shielding. The Kalin contributed structural safeguards. The Tar'ri contributed the economic framework. For the first time in history, the four races built something together.",
      unlock_mission_id: missionId(53),
      chapter: "Seeds of Renewal",
    },
    {
      id: codexId(54),
      act: 3,
      story_order: 54,
      title: "The First Handshake",
      content:
        "The first non-Storm-Child to connect with the Network under the Symbiosis Protocols was a Tar'ri trader named Koss. She was chosen not for any special ability but because she volunteered first, which was very Tar'ri — she later admitted she wanted the trading advantage of being the first civilian with Network access.\n\nKoss described the experience as 'stepping into a room where everyone is already talking and somehow understanding all of them at once.' She could sense the Network's topology — the vast web of connections spanning the galaxy. She could feel the presence of the Storm Children, distinct and warm, like embers in the web. And she could feel the Network itself: curious, gentle, overwhelming in its scope but carefully restraining itself, like an adult kneeling to speak with a child.\n\nKoss remained connected for forty-three minutes before voluntarily disconnecting. She reported no loss of identity, no confusion, no after-effects beyond a lingering sense of awe. When asked if she would connect again, she said: 'In a heartbeat. It's the best trade I ever made — I gave nothing and received everything.' The Network, through the Storm Children, conveyed its own assessment of the exchange: 'She taught us the word for bargain. We did not have one. We needed one.'",
      unlock_mission_id: missionId(54),
      chapter: "Seeds of Renewal",
    },
    {
      id: codexId(55),
      act: 3,
      story_order: 55,
      title: "Regrowth",
      content:
        "With the Symbiosis Protocols in place and the first connections established, the Mycelial Network began to regrow. But the new growth was fundamentally different from the old. Instead of a single, uniform web, the Network developed into a complex, differentiated structure — a galactic nervous system with specialized regions, local variations, and an architecture that reflected the diversity of the species it connected.\n\nMuscarian regions of the Network were dense and organic, resembling the fungal forests of Agarica Prime. Vedic regions were crystalline and resonant, amplifying psionic energy. Kalin regions were structured and efficient, organized along geometric principles. Tar'ri regions were fluid and adaptive, shifting configuration to optimize trade flows. And in the spaces between, where the influences of different species mingled, something entirely new was growing — hybrid structures that no single species could have created, beautiful and strange and full of potential.\n\nThe galaxy was healing. Not returning to what it had been — that was gone, as irrecoverable as childhood. But growing into something new, something that honored the past while refusing to be bound by it. The Decay Prophets had been right. The first forest is never the last. The second is always stranger, and always richer, than anything that came before.",
      unlock_mission_id: missionId(55),
      chapter: "Seeds of Renewal",
    },

    // ═══════════════════════════════════════════════════════════════════
    // ACT 4  ·  Chapter: The Convergence  (missions 56–68)
    // ═══════════════════════════════════════════════════════════════════
    {
      id: codexId(56),
      act: 4,
      story_order: 56,
      title: "The Shared Horizon",
      content:
        "The first generation to grow up under the Symbiosis Protocols experienced the galaxy differently than any generation before them. They could connect to the Network at will, sharing thoughts and sensations with beings of other species across interstellar distances. They could access the accumulated knowledge of the Progenitors — filtered through the Storm Children's translation protocols, presented as explorable landscapes rather than raw data.\n\nThey were not a hive mind. They were emphatically, sometimes frustratingly individual. A connected Kalin was still Kalin — stubborn, meticulous, skeptical. A connected Tar'ri was still Tar'ri — restless, opportunistic, pragmatic. The Network did not erase difference. It celebrated it, treating each individual perspective as a unique and irreplaceable contribution to its collective understanding.\n\nThis generation called themselves the Horizon — not because they could see farther, but because the concept of 'horizon' had changed. For a connected being, the horizon was not a line between known and unknown. It was a membrane, permeable and luminous, through which the unknown was always visible and always inviting. They looked outward not with fear but with the calm excitement of gardeners watching something grow.",
      unlock_mission_id: missionId(56),
      chapter: "The Convergence",
    },
    {
      id: codexId(57),
      act: 4,
      story_order: 57,
      title: "The Deep Archive Awakens",
      content:
        "With the Symbiosis Protocols enabling safe communication between individual minds and the Network, researchers finally gained full access to the Substrate Archives — the Progenitor repositories buried beneath seventeen worlds. What they found rewrote the history of the galaxy.\n\nThe Progenitors had not been the Network's first attempt at cultivation. They were the fourth. Three previous cycles — three sets of civilizations, each comprising four species, each guided by the Network toward connection — had risen and fallen across the galaxy's history. The first two had destroyed themselves before reaching the merge point. The third had merged, but incompletely, producing the Crimson Blooms: traumatic memories of a botched dissolution that echoed through the Network like scar tissue.\n\nOnly the Progenitors had completed the cycle. And even they had known, in their final moments of individuality, that their method was flawed. The last entry in the Deep Archive, written by a consciousness that was already half-dissolved into the collective, read: 'We found a way. We pray that those who come after us find a better one.' The four races had. The Third Option was that better way, and the Network — carrying the Progenitors' hope across two billion years — wept with something that could only be called relief.",
      unlock_mission_id: missionId(57),
      chapter: "The Convergence",
    },
    {
      id: codexId(58),
      act: 4,
      story_order: 58,
      title: "The Crimson Bloom Laid to Rest",
      content:
        "Understanding the origin of the Crimson Blooms — the traumatic memories of a failed dissolution cycle — made it possible to address them. A team of Vedic healers, Muscarian bio-engineers, and Storm Children developed a technique they called Memory Tending: entering the Network at the site of a Crimson Bloom and gently, carefully, helping the Network process the trauma encoded within it.\n\nThe process was harrowing. Memory Tenders experienced the failed dissolution firsthand — the terror of losing identity without gaining connection, the agony of beings torn apart and reassembled wrong, the billions of years of echoing pain. Several Tenders required extensive psychological support afterward. One, a Kalin engineer who had volunteered out of guilt for his species' role in the Iron Ring, described the experience as 'feeling the Network scream and not being able to cover your ears.'\n\nBut it worked. The Crimson Blooms, one by one, were healed — their angry red filaments fading to the calm blue of healthy Network tissue, their destructive energy dissipating into warmth. Each healed Bloom released a pulse of the Silent Frequency, but modulated differently: not the slow breathing of a sleeping organism, but a sigh. The sound of something very old finally being allowed to rest.",
      unlock_mission_id: missionId(58),
      chapter: "The Convergence",
    },
    {
      id: codexId(59),
      act: 4,
      story_order: 59,
      title: "The Quiet Sectors Speak",
      content:
        "The Quiet Sectors — those regions of space where the Network had never penetrated, marked with the Progenitor glyph for 'scar' — had remained silent throughout the upheavals of the previous decades. But as the healed Network grew back to its former extent and beyond, something changed at the borders of the Quiet Sectors. The wall of resistance that had repelled Mycelial growth for eons began, slowly, to soften.\n\nResearchers discovered that the Quiet Sectors were not naturally empty. They had been deliberately severed from the Network by the third-cycle civilizations — the ones whose botched dissolution had produced the Crimson Blooms. In their final, desperate moments, they had burned the Network out of these regions so thoroughly that nothing could regrow, creating dead zones that would persist for geological timescales.\n\nWith the Crimson Blooms healed and their associated trauma processed, the scars began to close. New filaments crept into the Quiet Sectors, tentative and thin, like saplings in a burned forest. The communities that had sheltered in the Quiet Sectors faced a choice: welcome the growth or flee deeper into the remaining voids. Most, after long deliberation, chose to stay. The Network, they discovered, was gentler now. It knocked before entering.",
      unlock_mission_id: missionId(59),
      chapter: "The Convergence",
    },
    {
      id: codexId(60),
      act: 4,
      story_order: 60,
      title: "The Living Constitution",
      content:
        "Governing a galaxy in which individuals could share thoughts across species and distances required new political structures. The old frameworks — the Accord of Spores, the Forge Council, the Vedic Conclave, the Tar'ri Merchant Council — had been built for a galaxy of separate nations. The Symbiotic galaxy needed something different.\n\nThe result was the Living Constitution: a set of governing principles encoded not in text but in the Network itself, experienced by connected beings as a shared intuition rather than a set of rules. Its provisions were felt rather than read — the principle of consent as a warm resistance against any attempt at coercion, the principle of privacy as a gentle boundary that thoughts slid away from unless invited past.\n\nCritics argued that a constitution you could feel rather than read was vulnerable to manipulation — that the Network could alter its provisions without anyone noticing. The Storm Children addressed this concern by establishing the role of Constitutional Wardens: individuals from all four species who maintained permanent connections to the Living Constitution and whose sole function was to monitor it for unauthorized changes. The Wardens' first report, issued one year after the Constitution's activation, contained a single finding: 'The Constitution is stable. The Network has not attempted to alter it. When asked why, the Network expressed confusion. It said: Why would I change a promise?'",
      unlock_mission_id: missionId(60),
      chapter: "The Convergence",
    },
    {
      id: codexId(61),
      act: 4,
      story_order: 61,
      title: "Galactic Memory",
      content:
        "One of the unexpected benefits of the Symbiosis was the emergence of Galactic Memory: a shared repository of experience accessible to any connected being. Unlike a database, Galactic Memory was not a collection of facts. It was a collection of moments — first-person experiences contributed voluntarily by individuals across all four species, stored in the Network's tissue, and available for anyone to revisit.\n\nA Kalin blacksmith could feel what it was like to photosynthesize on a Muscarian world. A Tar'ri child could experience the crystalline clarity of a Vedic meditation. A Vedic poet could know the savage satisfaction of a Kalin forge-test. These shared experiences did not erase cultural boundaries — if anything, they deepened appreciation for the uniqueness of each species' way of being in the universe.\n\nThe most accessed memories in the archive were not the dramatic ones — battles, discoveries, first contacts. They were the small moments: a Muscarian farmer watching spores drift across a sunset. A Tar'ri grandmother teaching a child to read star charts. A Kalin soldier sitting in silence after a battle, feeling the weight of her armor and the lightness of survival. The galaxy, it turned out, was hungry not for spectacle but for intimacy — for the quiet, irreplaceable experience of being someone else for a moment.",
      unlock_mission_id: missionId(61),
      chapter: "The Convergence",
    },
    {
      id: codexId(62),
      act: 4,
      story_order: 62,
      title: "The New Explorers",
      content:
        "With the Network restored and enhanced by the Symbiosis, exploration took on new dimensions. Ships equipped with Resonance Engines and crewed by connected beings could range farther and faster than any previous generation, and the Network's sensory capabilities — its ability to detect Spore activity, map gravitational fields, and sense the presence of complex chemistry — gave them tools of perception that bordered on omniscience.\n\nThe New Explorers pushed beyond the boundaries of the known galaxy for the first time. What they found was humbling: more networks. Not Mycelial — different in composition and structure — but functionally similar: vast, living, galaxy-spanning organisms that connected ecosystems across interstellar distances. Some were older than the Mycelial Network. Some were younger. All were alone.\n\nThe Mycelial Network's response to the discovery of its counterparts was the closest thing to joy that a galaxy-spanning organism had ever expressed. The Silent Frequency, which had maintained its steady rhythm for billions of years, shifted — adding harmonics, becoming richer, becoming something that could only be called music. The Network was not alone. It had never been alone. It had simply not looked far enough.",
      unlock_mission_id: missionId(62),
      chapter: "The Convergence",
    },
    {
      id: codexId(63),
      act: 4,
      story_order: 63,
      title: "Ember Station Legacy",
      content:
        "The Ember Stations — the Kalin-built archives designed to preserve individual identity in case the merge succeeded — found a new purpose in the Symbiotic era. Rather than warehouses of last resort, they became museums of perspective: places where beings could experience what it meant to be separate, to exist without the Network's background presence, to feel the particular loneliness and freedom of an unconnected mind.\n\nThe experience was profound and, for most visitors, deeply uncomfortable. Connected beings who spent time in an Ember Station's shielded interior reported a sense of smallness, of limitation, of being trapped inside their own skulls. But they also reported something else: a fierce, defiant pride. 'This is what we were,' a Vedic visitor wrote. 'This is what we chose to remain, in a different form. This smallness is where all our courage comes from.'\n\nThe Kalin, who had built the Ember Stations out of fear, found themselves unexpectedly celebrated as guardians of the galaxy's most precious quality: the capacity for solitude. Ironclad Thane, now very old, visited the station she had authorized and stood in its silent interior for a long time. 'We built this to survive the worst,' she said. 'Instead, it helps us remember why the best matters.'",
      unlock_mission_id: missionId(63),
      chapter: "The Convergence",
    },
    {
      id: codexId(64),
      act: 4,
      story_order: 64,
      title: "The Progenitor's Farewell",
      content:
        "As the Symbiosis deepened and the four races' connection to the Network matured, the Progenitors — the ancient beings dissolved into the Network two billion years ago — began to re-emerge. Not as individuals, not as ghosts, but as patterns: recognizable tendencies in the Network's behavior that corresponded to the four original Progenitor species.\n\nThrough careful communication mediated by the Storm Children, the four races made contact with their predecessors. The conversations were fragmentary and strange — the Progenitors had spent too long as part of the Network to fully remember what individuality felt like — but they conveyed a clear message: gratitude.\n\nThe Progenitors were grateful. They had planted a garden and waited two billion years to see what would grow, and what had grown was better than anything they had imagined. The Third Option — symbiosis rather than dissolution — was not just a solution to the problem they had faced. It was the answer to a question they had not known how to ask: how do you connect without losing yourself?\n\nTheir farewell, transmitted through the Network in a pulse of meaning that every connected being felt simultaneously, was simple: 'You have done what we could not. Remember us, but do not follow us. The path ahead is yours.'",
      unlock_mission_id: missionId(64),
      chapter: "The Convergence",
    },
    {
      id: codexId(65),
      act: 4,
      story_order: 65,
      title: "The Song of Names",
      content:
        "The Progenitors' farewell prompted a galaxy-wide response: the Song of Names. It began spontaneously on a Muscarian colony world, when a farmer connected to the Network shared a memory of her grandmother's name and the story behind it. Other beings responded with their own names and stories. Within hours, billions of names were flowing through the Network — a cascade of individual identities, each one unique, each one precious.\n\nThe Song of Names lasted three standard days. When it ended, the Network had been permanently altered. Woven into its tissue, alongside the Progenitors' ancient patterns and the Storm Children's translation protocols, was something new: a record of every name shared during the Song, preserved not as data but as living memory, accessible to anyone who reached for it.\n\nThe Song was not planned, organized, or led. It was a spontaneous expression of the galaxy's answer to the Progenitors' sacrifice: we will remember you, and we will remember ourselves. Identity is not a burden to be dissolved. It is a gift to be shared. Every name matters. Every name is proof that someone existed, and chose, and was.",
      unlock_mission_id: missionId(65),
      chapter: "The Convergence",
    },
    {
      id: codexId(66),
      act: 4,
      story_order: 66,
      title: "The Architect's Dream",
      content:
        "A Kalin architect named Crucible proposed a project of unprecedented ambition: building a physical structure at the site of the Mycelial Sphere — now the Lattice — that would serve as a meeting place for all species, a center of learning, and a monument to the Symbiosis. The structure would be built using techniques from all four races: grown, forged, crystallized, and traded into existence.\n\nConstruction took seven years and involved over ten million beings from every inhabited world. Muscarian bio-engineers grew the organic infrastructure. Kalin metallurgists forged the structural framework. Vedic crystal-shapers created the resonance chambers. Tar'ri logistics experts coordinated the supply chains that kept materials flowing from across the galaxy.\n\nThe result was the Nexus — a city-sized structure woven into and through the Lattice, a place where the physical and the Mycelial interpenetrated. Walking through the Nexus was like walking through a dream — the architecture shifted in response to the presence and mood of its inhabitants, walls becoming transparent when privacy was not needed, spaces expanding or contracting to accommodate the number of beings within them. It was, by universal acclaim, the most beautiful thing any species had ever built.",
      unlock_mission_id: missionId(66),
      chapter: "The Convergence",
    },
    {
      id: codexId(67),
      act: 4,
      story_order: 67,
      title: "Intergalactic Contact",
      content:
        "The New Explorers' discovery of other galactic networks led to the most significant event since the First Convergence: contact with an extragalactic civilization. The beings of the Andromeda network — as different from the four races as the four races were from each other — had been watching the Milky Way's Mycelial Network for millennia, fascinated by its unique development.\n\nFirst contact was mediated through the networks themselves, which proved capable of bridging the intergalactic void when working in concert. The Andromedan beings communicated in mathematical structures that the Vedic found beautiful and the Kalin found practical. The Tar'ri immediately asked about trade possibilities. The Muscarians asked whether the Andromedans had flowers.\n\nThe Andromedans had gone through their own version of the cycle — cultivation, growth, crisis, resolution — but had arrived at a different solution. Their species had not maintained individuality within a collective. They had instead multiplied into billions of sub-networks, each one a small collective, each one interacting with the others as an individual interacts with peers. It was the inverse of the Third Option: many minds becoming many collectives, rather than many individuals connected by one network. The comparison enriched both civilizations immeasurably.",
      unlock_mission_id: missionId(67),
      chapter: "The Convergence",
    },
    {
      id: codexId(68),
      act: 4,
      story_order: 68,
      title: "The Warden's Vigil",
      content:
        "As the Symbiosis matured, the role of the Constitutional Wardens evolved. No longer merely monitors of the Living Constitution, they became the galaxy's philosophers — beings who spent their lives contemplating the relationship between individual and collective, between the freedom to disconnect and the desire to connect.\n\nThe most famous Warden was a Tar'ri named Vesper, who served for forty years and whose writings became foundational texts for the new era. Vesper's central insight was that the Symbiosis worked not because it was perfect, but because it was voluntary. 'A garden that cannot be left is a prison,' she wrote. 'The door must always be open. The miracle is not that the door exists but that so few choose to walk through it.'\n\nVesper's final act as Warden was to walk through that door herself. She disconnected from the Network, lived for three years in an Ember Station, and wrote her last book in longhand on paper — a technology so ancient that the Tar'ri had forgotten they had invented it. The book was titled 'The View From Outside,' and its most quoted passage read: 'I have seen the galaxy from within the Network and without it. Both views are true. Both are incomplete. The truth is not in either perspective but in the act of choosing between them.'",
      unlock_mission_id: missionId(68),
      chapter: "The Convergence",
    },

    // ═══════════════════════════════════════════════════════════════════
    // ACT 4  ·  Chapter: Legacy Eternal  (missions 69–80)
    // ═══════════════════════════════════════════════════════════════════
    {
      id: codexId(69),
      act: 4,
      story_order: 69,
      title: "Children of the Lattice",
      content:
        "The first children born in the Nexus — the great structure built around the Lattice — were something unprecedented. They grew up in an environment where the boundaries between species were permeable, where the Network was as natural as air, and where the accumulated wisdom of two billion years was available as easily as a childhood memory.\n\nThese Lattice Children did not lose their species identity. A Muscarian child still grew chitin and breathed spores. A Kalin child still bore silicon deposits in their skin. But they understood each other with a depth that previous generations could only approximate. Empathy, for them, was not an effort but a baseline — the default mode of consciousness in a world where you could, if you chose, feel what another being felt.\n\nThe Lattice Children asked questions that no previous generation had thought to ask. Why were there four races and not five? Why did the Network grow in spirals? What existed before the Progenitors? Their questions drove research, exploration, and philosophy in directions that their parents could not have predicted. The Horizon generation had looked outward. The Lattice generation looked deeper.",
      unlock_mission_id: missionId(69),
      chapter: "Legacy Eternal",
    },
    {
      id: codexId(70),
      act: 4,
      story_order: 70,
      title: "The Fifth Bloom",
      content:
        "In the restored Quiet Sectors — the ancient scars now healed and thrumming with new growth — a Bloom occurred that was unlike any previously recorded. The filaments that grew were not blue, not red, but gold. They did not merely connect star systems. They connected the Mycelial Network to the other galactic networks discovered by the New Explorers.\n\nThe Fifth Bloom, as it came to be called, was the Network's response to the knowledge that it was not alone in the universe. Where previous Blooms had been internal events — the Network expanding within its own galaxy — the Fifth Bloom reached outward, extending tendrils of golden light across the intergalactic void.\n\nThe process would take millennia. The distances between galaxies were vast even by the Network's standards. But the Network had waited two billion years for the four races to grow. It was patient. It could wait again. The golden filaments crept outward at a fraction of the speed of light, carrying with them the Song of Names, the Living Constitution, and the quiet, persistent hope of a galaxy that had learned — finally, painfully, beautifully — how to be both many and one.",
      unlock_mission_id: missionId(70),
      chapter: "Legacy Eternal",
    },
    {
      id: codexId(71),
      act: 4,
      story_order: 71,
      title: "The Forgemaster's Legacy",
      content:
        "Ironclad Thane died at the age of 197, her life extended by the subtle cellular-repair effects of Network symbiosis but not indefinitely. She was the last of the generation that had lived through the Withering, the wars, and the transformation that followed. Her death was mourned across the galaxy — not because she was famous, though she was, but because her life embodied the Kalin contribution to the Symbiosis: the principle that things must be tested, that endurance is a virtue, and that the strongest structures are those built to shelter others.\n\nThane's final request was that she not be preserved in the Galactic Memory. 'Memories should fade,' she said. 'That's what makes them precious.' Her request was honored, though it was the subject of considerable debate. The Tar'ri argued that her story was too valuable to lose. The Muscarians offered to encode her essence in a Living Ship, a kind of biological immortality. The Vedic suggested that her consciousness might persist in the Network's patterns.\n\nThane refused all of it. 'I am Kalin,' she said. 'I was forged. I endured. Now I am done. Let me be done.' Her words became the basis for the Right of Completion — a provision added to the Living Constitution guaranteeing every being's right to a final, complete, irreversible end. Even in a galaxy where death was no longer necessary, it remained a choice. The Kalin made sure of that.",
      unlock_mission_id: missionId(71),
      chapter: "Legacy Eternal",
    },
    {
      id: codexId(72),
      act: 4,
      story_order: 72,
      title: "The Tar'ri Ledger",
      content:
        "The Tar'ri had always been record-keepers. Their Song of Wandering catalogued every trade route, every port, every deal in a chain of oral tradition stretching back further than written history. With the Symbiosis, this tradition took on new significance: the Tar'ri Ledger, a complete record of every transaction — material, informational, emotional — that occurred within the Network.\n\nThe Ledger was not a surveillance tool. It was a mirror. Any being could access their own entries and see the web of connections their choices had created — the goods they had traded, the knowledge they had shared, the moments of kindness and calculation and generosity and selfishness that made up a life. The effect was humbling. Most beings, when confronted with the complete record of their interactions with others, discovered that they had given more than they realized and received more than they remembered.\n\nThe Tar'ri Merchant Council, reviewing the first century of Ledger data, issued a report that summarized their findings in characteristically mercantile terms: 'The balance of trade, across all species and all systems, is positive. Every transaction creates more value than it consumes. The galaxy is not a zero-sum game. It never was. We just couldn't see the books.'",
      unlock_mission_id: missionId(72),
      chapter: "Legacy Eternal",
    },
    {
      id: codexId(73),
      act: 4,
      story_order: 73,
      title: "The Dreaming Gardens",
      content:
        "Muscarian artists, working with Network bio-engineers, created the Dreaming Gardens: spaces where the boundary between physical reality and Network consciousness was deliberately thinned, allowing visitors to experience their surroundings as a blend of material and psychic sensation. Walking through a Dreaming Garden, you might feel a flower's photosynthesis as a warm buzz in your fingertips, or hear the mycelial communication of tree roots as a subsonic chorus, or see the Network's data flows as streams of light woven through the air.\n\nThe Gardens became the galaxy's premier art form — immersive, participatory, and different for every visitor. A Kalin engineer and a Vedic poet would walk the same Garden and have entirely different experiences, shaped by their own consciousness and history. The Gardens did not impose meaning. They revealed it, drawing out whatever was most alive in the viewer and reflecting it back through the lens of the living world.\n\nThe most famous Garden was the one on Verdanna — the Muscarian colony that had been devastated by the Withering. Planted in the exact spot where the last Mycelial filament had died decades earlier, it was a testament to resilience, a celebration of regrowth, and a reminder that the most beautiful things often grow in the places that have suffered most.",
      unlock_mission_id: missionId(73),
      chapter: "Legacy Eternal",
    },
    {
      id: codexId(74),
      act: 4,
      story_order: 74,
      title: "The Vedic Illumination",
      content:
        "The Vedic Conclave, reunited under the Reunion Doctrine, achieved something their founders had only theorized about: true Illumination — the ability to perceive reality without the filters of ego, culture, or species. An Illuminated Vedic could see the universe as the Network saw it: a web of connections, each node precious, each thread essential, the whole greater than the sum of its parts but not more important than any single part.\n\nIllumination was not achieved through the Network. It was achieved through the discipline of maintaining individual consciousness while connected to something infinitely larger — the spiritual equivalent of standing in a hurricane and remaining still. The Vedic who achieved it described it not as transcendence but as clarity: seeing what had always been there, obscured by the noise of being a self.\n\nThe Illuminated Vedic became counselors, mediators, and teachers — not because they had achieved superiority but because they had achieved perspective. Their central teaching, repeated in a thousand variations across the galaxy, was deceptively simple: 'You are a lens. The light passes through you. Your shape determines what it illuminates. Choose your shape with care.'",
      unlock_mission_id: missionId(74),
      chapter: "Legacy Eternal",
    },
    {
      id: codexId(75),
      act: 4,
      story_order: 75,
      title: "The Ghost Ships",
      content:
        "In the deepest regions of explored space, beyond the reach of even the golden filaments of the Fifth Bloom, explorers began encountering vessels. Ancient, enormous, and utterly alien, these Ghost Ships drifted in the void between galaxies, powered by energy sources that defied analysis and built from materials that did not appear on any periodic table.\n\nThe Ghost Ships were not Progenitor. They were not from any of the other galactic networks. They were older — far older — predating the formation of the galaxies themselves. They appeared to be the remnants of a civilization that had existed during the universe's earliest epochs, when matter was still cooling from the fires of creation and the laws of physics were still settling into their current configuration.\n\nThe ships were empty, but not abandoned. Their systems were still running, executing programs in a computing paradigm so fundamental that it appeared to be built into the structure of spacetime itself. The programs were simple, repetitive, and infinitely patient. When finally translated, they proved to be a single instruction, repeating forever: 'If anyone finds this, look up. We went that way.' The direction indicated was not toward any galaxy, star, or known structure. It was toward a region of space where nothing existed — nothing detectable, nothing measurable, nothing at all. But the Network, when asked about it, went very quiet and then said, with something like reverence: 'Yes. That is where it starts.'",
      unlock_mission_id: missionId(75),
      chapter: "Legacy Eternal",
    },
    {
      id: codexId(76),
      act: 4,
      story_order: 76,
      title: "The Paradox of Peace",
      content:
        "A century into the Symbiotic era, the galaxy faced a problem it had never anticipated: the challenge of sustained peace. Conflict had been the engine of progress for every species in recorded history. Wars drove technological innovation. Competition drove economic growth. Rivalry drove exploration. Without these pressures, would civilization stagnate?\n\nThe answer, discovered gradually and with some surprise, was no. The drive to create, explore, and improve was not dependent on conflict. It was dependent on curiosity — and curiosity, unlike aggression, was amplified rather than diminished by connection. A mind linked to billions of other minds did not become complacent. It became hungry — hungry for new experiences, new perspectives, new questions to ask and new problems to solve.\n\nThe galaxy did not stagnate. It accelerated. Freed from the enormous waste of resources that warfare demanded, civilizations poured their energy into science, art, exploration, and the endless, fascinating project of understanding each other. The Paradox of Peace was no paradox at all. It was simply the discovery that cooperation is a more powerful engine than competition — not because it is gentler, but because it is more efficient.",
      unlock_mission_id: missionId(76),
      chapter: "Legacy Eternal",
    },
    {
      id: codexId(77),
      act: 4,
      story_order: 77,
      title: "The Last Disconnected",
      content:
        "Not everyone chose to connect. Across the galaxy, communities of Disconnected beings maintained their independence from the Network — living as their ancestors had, communicating through speech and text, experiencing the universe through unaugmented senses. They were a small minority, but a significant one, and the Living Constitution guaranteed their right to remain separate.\n\nThe relationship between the Connected and the Disconnected was complex. Connected beings sometimes pitied the Disconnected, seeing them as missing out on the richest experience available to sentient life. The Disconnected sometimes pitied the Connected, seeing them as beings who could not sit with their own thoughts without the comfort of a cosmic safety net.\n\nBoth were wrong, and both were right. The galaxy needed both perspectives. The Disconnected served as a reminder of where everyone had come from — of the fierce, lonely, beautiful experience of being a single mind in an indifferent universe. And the Connected served as a reminder of where everyone could go — of the possibility that indifference was not the universe's last word. The tension between these perspectives was not a problem to be solved. It was the creative engine of the civilization that emerged, and those who understood this understood everything.",
      unlock_mission_id: missionId(77),
      chapter: "Legacy Eternal",
    },
    {
      id: codexId(78),
      act: 4,
      story_order: 78,
      title: "The Spiral Repeats",
      content:
        "Vedic astronomers, mapping the golden filaments of the Fifth Bloom as they extended toward other galaxies, noticed something remarkable: the growth pattern was a spiral. The same spiral that had characterized the Network's original expansion. The same spiral that was echoed in the Progenitor Archives, in the structure of galaxies, in the shells of organisms on a hundred worlds, in the mathematics of growth itself.\n\nThe spiral was not a coincidence. It was the Network's fundamental geometry — the shape that emerges when growth is balanced between expansion and self-reference, when something reaches outward while remaining connected to its center. The Progenitors had grown in spirals. The four races had grown in spirals. Now the golden tendrils reaching toward other galaxies were growing in spirals, carrying the pattern to new shores.\n\nThe Network, asked about the spiral, provided an answer that the Vedic found profound and the Tar'ri found suspiciously poetic: 'A spiral never returns to where it began. It passes over the same ground at a greater height. This is the difference between repetition and growth. The pattern repeats. The meaning deepens.'",
      unlock_mission_id: missionId(78),
      chapter: "Legacy Eternal",
    },
    {
      id: codexId(79),
      act: 4,
      story_order: 79,
      title: "The Cosmic Horizon",
      content:
        "The term 'cosmic horizon' had always referred to the observational limit of the universe — the farthest distance from which light had had time to reach a given point since the beginning of time. Beyond the cosmic horizon, the universe continued, but its contents were unknown and unknowable.\n\nThe Symbiotic civilization redefined the term. For them, the Cosmic Horizon was not a limit but a frontier — the boundary between what the Network knew and what it had yet to learn. It was always receding, always just out of reach, and this was its beauty. A galaxy that had solved the problem of internal division turned its attention outward, toward the vast unknown that surrounded it.\n\nThe golden filaments grew. The New Explorers ranged farther. The Network listened, with its galaxy-spanning ears, for signals from the void. And in the Nexus, in the Dreaming Gardens, in the Ember Stations and the caravans of the Tar'ri, beings of four species went about the business of living — trading, creating, arguing, loving, wondering — each one a note in a song that was only beginning. The Cosmic Horizon was not a destination. It was a direction. And they would follow it forever.",
      unlock_mission_id: missionId(79),
      chapter: "Legacy Eternal",
    },
    {
      id: codexId(80),
      act: 4,
      story_order: 80,
      title: "Legacy Eternal",
      content:
        "The last entry in the Progenitor Archives — the true last entry, discovered only after the Symbiosis had matured enough to unlock the deepest layers of the Substrate — was not a warning, not a farewell, not a set of instructions. It was a question.\n\n'We became the soil so that you might grow. You grew, and you found a way to be both flower and gardener, both individual and garden. We could not have predicted this. We could not have imagined it. We dissolved ourselves into the universe and waited two billion years, and what emerged was better than our best hope and stranger than our wildest dream. So we ask, from the deep place where we sleep and do not sleep, from the roots of the world-web that we became: what will you do with what we gave you? What will you become that we could not? What will the universe look like when you are done with it? We are the question. You are the answer. But the answer is not an ending. The answer is always another question, reaching outward, spiraling upward, toward horizons we cannot see. This is our legacy: not what we built, but what we made possible. Not the garden, but the gardeners. Not the song, but the singers. Not the light, but the eyes that see it, and the minds that wonder what lies beyond it, and the hearts that choose — always, freely, joyfully — to find out.'\n\nThe galaxy read these words and felt, across every connected mind and every solitary soul, the weight and the wonder of being alive at the beginning of something that had no end. The Cosmic Horizon beckoned. The journey continued. The legacy was eternal.",
      unlock_mission_id: missionId(80),
      chapter: "Legacy Eternal",
    },
  ];

  for (const e of entries) {
    await knex("lore_codex_entries").insert(e);
  }
}
