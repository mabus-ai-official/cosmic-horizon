// ══════════════════════════════════════════════════════════════
// RANDOM EVENT NARRATION — All 20 event trigger scripts
// One narration per event, played when the event overlay appears.
//
// Voice tags:
//   [ARIA]              — ship AI narrator (second-person, urgent)
//   [NPC:kovax]         — Kovax Prime, Kalin trade master (shrewd, calculating)
//   [NPC:shade]         — Shade, Shadow Syndicate operative (whispered, conspiratorial)
//   [NPC:sarge]         — Sarge, Kalin Ranger patrol leader (gruff, military)
//   [NPC:archivist_thal]— Archivist Thal, ancient Vedic historian (aged, academic)
//   [NPC:raxus]         — Commander Raxus, Kalin warrior (direct, honor-bound)
//   [NPC:alarion]       — High Sage Alarion (wise, measured, philosophical)
//   [NPC:oracle]        — The Oracle, ancient Vedic seer (cryptic, ethereal)
//   [NPC:hermit]        — The Hermit, Muscarian wanderer (philosophical, nature-connected)
// ══════════════════════════════════════════════════════════════

// Keyed by event_key from random_event_definitions
export const EVENT_NARRATION: Record<string, string> = {
  // ═══════════════════════════════════════════════════════════
  // ACTION-TRIGGERED EVENTS (1-10)
  // ═══════════════════════════════════════════════════════════

  distress_signal: `[ARIA] Your comm array crackles with interference, and beneath the static, something breaks through — a repeating pattern, machine-generated but carrying the unmistakable cadence of desperation. A distress beacon. Faint. Fragmented. Coming from a sector your charts mark as empty.

[ARIA] I have isolated the signal. It is a standard emergency broadcast, but the power output is dangerously low — whoever is transmitting is running on backup cells. Based on signal degradation, they have been broadcasting for at least seventy-two hours. Life support at that power draw would be critically compromised.

[ARIA] There is no Central Authority patrol within response range. No Ranger station close enough. Just you, Commander. The signal is already fading. If you do not go now, no one will.`,

  pirate_ambush: `[ARIA] Contact. Multiple contacts. Warp signatures materializing at bearing two-seven-zero, emerging from the asteroid shadow where your scanners could not reach them. This was planned, Commander. They were waiting.

[ARIA] I am reading three vessels — stripped-down interceptors running hot with overcharged weapons arrays. No transponders, no faction markings. Hull configurations match the raider clans that prey on ships transiting unprotected sectors. They are already accelerating to combat speed, cutting off your exit vectors one by one.

[ARIA] Shields are up. Weapons are charging. I have calculated six possible evasion routes and none of them are good. The pirates are jamming our distress frequency — no one is coming to help. This is your fight, Commander. Make it theirs to regret.`,

  trade_opportunity: `[ARIA] An incoming hail on the merchant frequency — priority flagged, time-sensitive. Someone wants your attention before the market shifts.

[NPC:kovax] "Pilot. I will be direct — I have a consignment of crystallized bio-compounds that must reach an outpost on the frontier before the next trading cycle closes. My regular courier was intercepted. The window is narrow and the payout is double standard rates. I need someone who can move fast and keep their mouth shut about the cargo's origin."

[ARIA] Kovax Prime's reputation precedes him — the Traders Guild's regional coordinator does not waste words or credits. The delivery coordinates check out, the payment is already in escrow, and the clock is ticking. Whatever these compounds are, someone on the frontier needs them badly enough to pay twice what they are worth.`,

  derelict_discovery: `[ARIA] Commander, your scanner sweep has returned an anomaly. A vessel, approximately four hundred meters in length, drifting without power in the void between sectors. No running lights. No emissions. No life signs. It is not on any registry I can access, and the hull alloy composition does not match any known manufacturer.

[ARIA] The vessel's design is angular and ornate — not the utilitarian geometry of modern ships. Micro-asteroid impacts and radiation scoring suggest it has been drifting for centuries, possibly longer. The cargo bays appear intact. Whatever this ship was carrying when it died, it is still carrying now.

[ARIA] I am detecting faint electromagnetic fluctuations from the lower decks — too regular to be decay, too weak to be active systems. Something aboard that wreck is still functioning. Whether that is an opportunity or a warning is for you to decide. I would recommend caution, but I know you, Commander.`,

  fungal_bloom: `[ARIA] Sensors are going haywire, Commander. A massive mycelial bloom has erupted across the planetary surface near your colony — bioluminescent tendrils spreading outward at a rate that defies any biological model in my database. The ground is glowing. I mean that literally. Visible from orbit.

[ARIA] Spectral analysis reveals concentrations of rare organic compounds in the bloom's fruiting bodies — materials that pharmaceutical syndicates and bio-engineers would pay fortunes for. But the bloom is already past peak. These organisms burn bright and burn fast. Within hours, the spores will disperse and the compounds will break down into inert residue.

[ARIA] Your colony teams are standing by for harvesting orders. This is a narrow window for an extraordinary haul, Commander. The Spore Network provides — but only to those who act quickly.`,

  smugglers_offer: `[ARIA] The docking bay's tertiary corridor is dimly lit — maintenance lights only, casting long shadows between the cargo containers. Someone is waiting for you. I cannot get a clear read on their biosignature. That takes equipment.

[NPC:shade] "You were not followed. Good. I have a proposition for someone with your particular skill set. Unmarked cargo, seventeen sealed containers, destination coordinates that will be provided upon acceptance. The contents are not your concern. The payment — eight thousand credits, clean and untraceable — very much is."

[ARIA] Shade's voice modulator strips every identifying feature from their words. The containers are shielded against standard scans — Ranger patrols would need a deep inspection warrant to open them. The delivery route skirts three patrol corridors. This is a professional operation, Commander. The question is whether the credits are worth the risk if something goes wrong.`,

  ranger_emergency: `[ARIA] Emergency broadcast on all Ranger frequencies — priority one, no encryption. They want everyone to hear this.

[NPC:sarge] "All available assets, this is Sarge at Outpost Theta-Seven. We have three — no, four hostile contacts closing on our position. Heavy weapons signatures. Our patrol ship took critical damage on the first pass and we are grounded. I have twelve Rangers and six civilians in this outpost. We can hold the perimeter for maybe twenty minutes. After that, it is over. If anyone can hear this, we need you. Now."

[ARIA] Outpost Theta-Seven is six jumps from your current position. At maximum burn, you can make it in fourteen minutes. Sarge's voice is steady — the kind of steady that comes from knowing the odds and choosing to fight anyway. Twelve Rangers and six civilians, Commander. The clock is running.`,

  scholars_request: `[ARIA] An encrypted transmission on the Scholars' private frequency. Authentication codes check out — this is a verified member of the Cosmic Scholars, and they are reaching out to you specifically.

[NPC:archivist_thal] "Forgive the intrusion, traveler. I am Archivist Thal. Your recent scan data has triggered an alert in our monitoring systems. The electromagnetic patterns you recorded match signatures from the Substrate Archives — energy configurations we have been searching for across seventeen star systems. I must ask you to deliver the raw data to our research station. The academic compensation will be generous, but more importantly, you may have stumbled upon a thread that connects to civilizations two billion years gone."

[ARIA] Archivist Thal is not given to exaggeration, Commander. If the oldest living historian in the Cosmic Scholars says your scan data matters, it matters. The research station coordinates are attached. The experience alone would be worth the trip.`,

  raxus_challenge: `[ARIA] An open hail on the Kalin warrior frequency — formal challenge protocol. Someone has been watching your combat engagements, Commander.

[NPC:raxus] "Pilot. I am Commander Raxus of the Kalin Fourth Fleet. I have reviewed your combat record. Your tactics are unorthodox but effective. Among my people, skill in battle is not proven by records or reputation — it is proven by facing a worthy opponent. I challenge you to single combat. No allies. No retreat. Ship against ship, as the Forge Doctrine demands. Accept, and whatever the outcome, you will have earned a warrior's respect. Refuse, and we will not speak again."

[ARIA] The Kalin do not issue challenges lightly, Commander. A formal combat trial under the Forge Doctrine is a mark of profound respect. Raxus has put his own honor on the line by acknowledging you as a potential equal. The reward for victory is said to be unique — something the Kalin reserve for those who have been tested and found worthy.`,

  mycelial_surge: `[ARIA] Commander, I am reading an energy spike from the spore node in this sector — massive, orders of magnitude beyond anything previously recorded. The node's crystalline shell is fracturing along deliberate geometric lines, and bioluminescent tendrils are erupting outward in a radial pattern that spans the entire sector.

[ARIA] This is not a malfunction. This is activation. The dormant node is waking up, and the Spore Network is surging with energy that is cascading through subspace channels to neighboring systems. My sensors are picking up resonance echoes from at least four other sectors — nodes responding to this one, like a heartbeat spreading through a vast organism.

[ARIA] The surge is broadcasting coordinates, Commander. Specific locations within this sector where the mycelial energy is pooling into dense concentrations. Something wants to be found. The Network is offering you a map. I recommend we follow it before the surge subsides and the trail goes cold.`,

  // ═══════════════════════════════════════════════════════════
  // GAME-STATE SPAWNED EVENTS (11-20)
  // ═══════════════════════════════════════════════════════════

  colony_crisis: `[ARIA] Priority alert from your colony network, Commander. One of your worlds is in crisis. Happiness indicators have dropped into the red — food reserves are critically depleted, rationing has failed, and civil unrest is spreading through the population centers. I am receiving reports of supply depot raids and protest blockades at the spaceport.

[ARIA] The colony's agricultural output collapsed after a soil contamination event wiped out the primary crop cycle. Emergency reserves lasted ten days. It has been twelve. Without immediate food resupply, you are looking at population decline, infrastructure damage, and a loyalty collapse that could take months to recover from.

[ARIA] Your colonists are counting on you, Commander. A cargo hold full of food supplies delivered to the surface within the next few hours is the difference between a setback and a catastrophe. The coordinates are already plotted.`,

  trade_route_disruption: `[ARIA] One of your trade routes has gone dark, Commander. The scheduled caravan failed to arrive at its destination, and the last telemetry ping shows it dead in space — cargo scattered across a debris field that stretches for kilometers. Raiders hit it clean. No survivors on the manifest.

[ARIA] The trade corridor is now flagged as hostile. Outposts along the route are reporting supply shortages, and market prices are already spiking as merchants reroute through longer, safer paths. A replacement caravan has been assembled and is ready to depart, but no escort means no departure. The convoy operators will not risk another loss.

[ARIA] Every hour that trade route stays disrupted costs you credits and reputation. The replacement caravan needs safe passage — and the raiders who hit the first one are likely still operating in the area, waiting for the next easy target. This time, they will not find one easy.`,

  faction_tension: `[ARIA] Commander, your rising reputation has not gone unnoticed. Diplomatic channels are buzzing with encrypted traffic, and the tone is not congratulatory. Your strong ties with one faction have shifted the balance of power in this region, and their rivals are not pleased.

[ARIA] A formal diplomatic communique has arrived — language carefully measured, but the subtext is clear. The rival faction views your influence as a destabilizing force and is requesting a meeting to discuss the situation. Refusal would be interpreted as an act of hostility. Acceptance, at minimum, buys time.

[ARIA] I should point out that diplomatic missions of this nature have historically ended in one of two ways: a negotiated detente that strengthens both parties, or a public breakdown that accelerates open conflict. Your reputation for walking between factions is what makes this meeting possible, Commander. Whether it ends well depends entirely on you.`,

  new_frontier: `[ARIA] Commander, after five hundred sectors explored, your navigational database has achieved something remarkable. Cross-referencing gravitational lensing data, background radiation patterns, and anomalous energy signatures that never quite made sense on their own, my systems have identified a convergence — a sector that exists in no database, on no chart, in no faction's territorial claims.

[ARIA] It is hidden behind a fold in spacetime, a natural cloaking effect created by the gravitational interaction of three dead stars. No casual scan would ever detect it. Only the sheer volume of data you have accumulated across hundreds of sectors made the pattern visible.

[ARIA] Ancient energy signatures are radiating from inside the fold — faint but unmistakable. Whatever is in there has been waiting a very long time for someone to gather enough pieces of the puzzle to find it. You are the first, Commander. Possibly the first in millennia.`,

  mentors_call: `[ARIA] A priority transmission on a channel you have never seen before — hand-encrypted with a cipher that predates the founding of the Traders Guild. The authentication resolves to a single name: High Sage Alarion.

[NPC:alarion] "I have watched your journey from the beginning, pilot. The choices you have made, the alliances you have forged, the enemies you have turned and the ones you chose to spare. You have reached a level of experience that few attain, and with it comes a responsibility that fewer still are prepared for. I am asking you to come to me. Not as a subordinate — as an equal. There is a matter of galactic significance that requires your perspective. I will share what I know. What you do with that knowledge will be your decision alone."

[ARIA] High Sage Alarion does not summon casually, Commander. In the entire recorded history of the Muscarian exodus, he has issued personal invitations to exactly four individuals. You are the fifth. The coordinates are for the Star Seeker's private chambers.`,

  economic_boom: `[ARIA] Your financial portfolio has crossed a threshold that attracts a very specific kind of attention, Commander. Half a million credits makes you wealthy. It also makes you visible.

[NPC:kovax] "Pilot. Your ledger speaks for itself — you have accumulated capital at a rate that impresses even the Traders Guild's actuarial division. I come to you not as a merchant but as an intermediary. A consortium of investors has identified an opportunity — an expedition to a resource-rich sector that requires significant capital outlay. The projected returns are extraordinary. I would not bring this to someone I did not trust to understand the difference between risk and recklessness."

[ARIA] Kovax's eyes gleam with the particular intensity he reserves for deals that could reshape market dynamics. The consortium's prospectus is detailed, the risk assessment is honest about the dangers, and the projected return on investment is the kind of number that makes conservative accountants faint. This is a once-in-a-lifetime opportunity, Commander — if the numbers hold.`,

  alliance_test: `[ARIA] Commander, your syndicate has drawn attention — the kind that comes with growing influence in contested space. An encrypted challenge has been broadcast on open channels, addressed directly to your alliance by name.

[ARIA] A rival faction is testing your syndicate's resolve. Coordinated strikes against your peripheral holdings, probing attacks on your trade routes, and intelligence operatives mapping your defensive posture. This is not a random escalation — it is a calculated assessment of whether your alliance has the cohesion to respond as a unified force or fracture under pressure.

[ARIA] Your syndicate members are awaiting orders. The response you coordinate in the next few hours will determine whether your alliance is perceived as a serious power or a loose confederation of opportunists. Every faction in the sector is watching. Make it count.`,

  ancient_signal: `[ARIA] Commander, my deep-space monitoring array has detected something that should not exist. A signal, emanating from the galactic core, pulsing in mathematical sequences that predate every known civilization. The waveform is not electromagnetic, not gravitational, not subspace — it occupies a frequency band that my sensors were never designed to detect. I only found it because it wants to be found.

[NPC:oracle] "You hear it now, walker between worlds. The Primordium stirs. What sleeps at the heart of the galaxy is neither alive nor dead — it is waiting. It waited while the Progenitors built their archives. It waited while the Vedic learned to see. It waited while the Kalin learned to endure. Now it calls to you. Not because you are special — because you are ready."

[ARIA] The Oracle's words align with the signal's mathematical structure, Commander. Whatever is broadcasting from the galactic core has been broadcasting since before life existed in this region of space. And it just changed its pattern for the first time in two billion years — in response to you.`,

  the_wanderer: `[ARIA] A proximity alert — but not from a ship. A single life sign, impossibly located on an asteroid fragment that should be too small and too irradiated to support anything alive. Your sensors confirm it: Muscarian biosignature. One individual. No vessel, no habitat structure, no visible means of survival.

[NPC:hermit] "Ah. You came. I was not certain you would, but the fungi whispered that you might. One hundred encounters with the souls of this galaxy, and still you travel. Still you seek. That tells me everything I needed to know about you, pilot. I have found something in the deep places between the stars — not a thing, not a treasure, not a weapon. A question. And I have searched for someone with enough experience of the living galaxy to help me understand what it means."

[ARIA] The Hermit has not been seen in years, Commander. The last pilot to encounter him described the meeting as the most significant conversation of their life. His fungi garden glows on that impossible asteroid, soft and patient, as though the void itself made room for him. This is not a man who wastes your time.`,

  galactic_crisis: `[ARIA] All-channel emergency broadcast. Every faction, every frequency, every station in range is receiving the same alert simultaneously. This is not a drill, Commander.

[ARIA] A cascading failure has erupted in the Spore Network. Three major nodes have gone critical, their mycelial links destabilizing in a chain reaction that is spreading outward at faster-than-light speeds through subspace. Entire sectors are losing Network connectivity — communications collapsing, navigation beacons going dark, and the bio-energy that thousands of systems depend on is guttering like a candle in a hurricane.

[ARIA] The cause is unknown. The scope is unprecedented. The Central Authority is mobilizing every available ship. The Frontier Rangers have declared a state of emergency. Even the Shadow Syndicate has broken radio silence to coordinate response efforts. All hands are needed, Commander. Not for glory, not for credits — for survival. If the Network collapse reaches critical mass, the infrastructure that holds interstellar civilization together goes with it.`,
};
