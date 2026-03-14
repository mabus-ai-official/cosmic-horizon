#!/usr/bin/env npx tsx
/**
 * generate-narration.ts — Offline MP3 generation for Act 1 story mission narration.
 *
 * Calls ElevenLabs TTS API to produce 20 MP3 files (10 accept + 10 claim).
 * Output: client/public/audio/narration/m{01-10}_{accept,claim}.mp3
 *
 * Usage:
 *   ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... npx tsx client/scripts/generate-narration.ts
 *
 * Env vars:
 *   ELEVENLABS_API_KEY   — required
 *   ELEVENLABS_VOICE_ID  — required (e.g. Edward voice ID from your ElevenLabs account)
 *   ELEVENLABS_MODEL     — optional, defaults to eleven_turbo_v2_5
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.ELEVENLABS_API_KEY || "";
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "";
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_turbo_v2_5";

if (!API_KEY) {
  console.error("ELEVENLABS_API_KEY is required");
  process.exit(1);
}
if (!VOICE_ID) {
  console.error("ELEVENLABS_VOICE_ID is required");
  process.exit(1);
}

const OUTPUT_DIR = path.resolve(__dirname, "../public/audio/narration");

// ── Act 1 lore texts (accept narration) ──────────────────────────────────────

const ACCEPT_TEXTS: Record<number, string> = {
  1: `You grip the flight stick as your ship lifts away from Docking Platform Seven. The station shrinks behind you, and the vast tapestry of stars stretches in every direction. Your comm crackles with static — and beneath it, something else. A rhythmic pulse, almost organic, threading through the background radiation like a heartbeat.

The Spore Network. You have heard the rumors in cantinas and cargo bays: an ancient mycelial web that once connected every corner of the galaxy. Most pilots dismiss it as spacer folklore. But that pulse is real, and it is calling to you.`,

  2: `Your navigation calibration picked up something unexpected: faint bioluminescent markers drifting through the void between sectors. Station archivists identify them as dormant spore clusters — remnants of the Network that once carried information across lightyears in an instant.

Before you chase ghosts, you need supplies. The frontier is unforgiving, and an empty cargo hold means an early grave.`,

  3: `With your cargo hold stocked, you return to the mystery. The rhythmic pulse has grown stronger, resolving into distinct patterns that your ship computer flags as "non-random biological origin." Whatever is broadcasting, it is alive — or was, once.

Your navigation computer can triangulate the signal by cross-referencing readings from multiple sectors. Each jump peels back another layer of static, revealing structures hidden beneath the noise.`,

  4: `Your scans reveal a trail — not a physical path, but a gradient of spore density increasing toward a point deep in unexplored space. The ancient network left breadcrumbs, and you are the first pilot in centuries to follow them.

As you travel, your ship sensors register micro-tremors in subspace. The mycelial threads are vibrating, responding to your presence. The Spore Network knows you are coming.`,

  5: `You find it: a massive crystalline structure pulsing with pale blue light, suspended in the void like a frozen jellyfish the size of a moon. The first Spore Network node, dormant but intact. A research station orbits nearby, hastily assembled by the Xenomycology Institute.

Dr. Thessa Vorn, the lead researcher, hails you immediately. "We have been monitoring that signal too. We need cyrillium to power our analysis arrays. Bring us what you can — this discovery could change everything."`,

  6: `Word of the discovery has spread faster than light. Pirate clans, drawn by rumors of ancient technology worth fortunes on the black market, have begun harassing supply ships heading to the research station. Two freighters have already been lost.

Dr. Vorn is desperate. "We cannot continue our work if supplies cannot reach us. Those pirates will strip the node for parts if they get close enough. We need someone to clear the lanes."`,

  7: `With the pirate threat suppressed, Dr. Vorn's team makes a breakthrough. The node is not just a relay — it is a seed. Given the right conditions, it could germinate, reconnecting a strand of the ancient network.

"But we need funding," Vorn admits. "The Institute cut our budget when we refused to hand over samples to the military. We need independent traders like you to keep us going. Earn what you can and funnel it our way."`,

  8: `Dr. Vorn shares her latest findings: the node is broadcasting connection requests to other nodes scattered across the galaxy. Like roots seeking water, the mycelial threads are reaching out — but finding only silence.

"If we can map where these threads are reaching, we can find the other nodes," she says. "Your ship scanner is sensitive enough. We just need you to listen."`,

  9: `Your scans reveal a second node — but it is far from any station or outpost. To study it, you will need a permanent presence in the region. Dr. Vorn has identified a habitable world near the signal source.

"Set up a colony there," she urges. "Nothing elaborate — just enough people to maintain a research outpost. The Network seems to respond to the presence of living beings. The more life around a node, the stronger its signal becomes."`,

  10: `The colony is established, and something extraordinary happens. The first node flares to life — not with fire, but with light. Bioluminescent tendrils erupt from its crystalline shell, stretching across the void toward your new colony. The Spore Network is germinating.

Across eight sectors, pilots report seeing the tendrils: gossamer threads of pale blue light weaving between the stars. The galaxy holds its breath. Dr. Vorn weeps at her instruments. "It is waking up," she whispers. "The Agaricalis — the great fruiting. It has begun."

But not everyone celebrates. Military channels buzz with alarm. Corporate interests mobilize. And in the deep dark, something ancient stirs in response to the Network's call.`,
};

// ── Claim completion texts ───────────────────────────────────────────────────

const CLAIM_TEXTS: Record<number, string> = {
  1: "Your first steps into the unknown are complete. The Spore Network stirs.",
  2: "Supplies secured. The bioluminescent trail grows clearer with each passing moment.",
  3: "The signal is triangulated. Something ancient waits at the convergence point.",
  4: "You have found the first node. The mycelial threads tremble at your approach.",
  5: "Cyrillium delivered. Dr. Vorn's arrays hum to life, peeling back layers of ancient mystery.",
  6: "The pirate threat is suppressed. The research corridor is secure — for now.",
  7: "Funding secured. The seed stirs, reaching tendrils toward the stars.",
  8: "The map is drawn. Dormant threads stretch across the galaxy like roots seeking water.",
  9: "Colony established. The presence of life strengthens the Network's signal.",
  10: "The Agaricalis has begun. Bioluminescent tendrils weave between the stars, and the galaxy will never be the same.",
};

// ── Mission complete texts (objectives fulfilled, before claiming) ───────────

const COMPLETE_TEXTS: Record<number, string> = {
  1: "Your first expedition is complete, pilot. The signal source awaits your return.",
  2: "Supplies secured and delivered. The bioluminescent trail grows clearer.",
  3: "Signal triangulated across multiple sectors. The convergence point is within reach.",
  4: "The first node has been located. Its ancient pulse resonates with your ship's scanners.",
  5: "Cyrillium shipment delivered to the research station. Dr. Vorn's analysis can begin.",
  6: "Pirate forces neutralized. The research corridor is secure once more.",
  7: "Funding objectives met. The Xenomycology Institute can continue its work.",
  8: "Mapping complete. The dormant threads of the Spore Network are charted.",
  9: "Colony established near the second node. Life takes root among the stars.",
  10: "All objectives fulfilled. The Agaricalis unfolds across the galaxy.",
};

// ── Codex entry texts (unlocked on mission claim) ───────────────────────────

const CODEX_TEXTS: Record<number, string> = {
  1: `Long before the four great races turned their eyes skyward, the Mycelial Network already existed — a lattice of bio-luminescent filaments threaded through the vacuum between stars. No one built it. No one seeded it. It simply was, as fundamental to the cosmos as gravity or light.

The first species to detect it were the Vedic, whose psionic meditation practices occasionally brushed against what they called 'the Under-Weave.' They described it as a low hum beneath all thought, a resonance that connected every living thing across impossible distances. For centuries they dismissed it as spiritual metaphor.

It was not metaphor. When Muscarian bio-engineers accidentally spliced a strand of Network tissue into a communications relay in the year 3,411 of the Common Reckoning, the signal that erupted shattered every receiver within four parsecs. The Mycelial Network was real, it was alive, and it had been waiting to be found.`,

  2: `The Muscarian homeworld of Agarica Prime is a dense jungle-planet where fungal ecosystems dominate every biome. Multicellular fungi the size of skyscrapers form the canopy, their root networks creating a planetary nervous system that the early Muscarians learned to interface with through spore-laced neural grafts.

This symbiosis shaped their entire civilization. Where other species built machines to extend their reach, the Muscarians grew them. Their starships are partially alive — hulls of hardened chitin laced with metallic compounds, engines that metabolize exotic matter the way a truffle metabolizes soil. A Muscarian vessel does not launch so much as germinate.

Their aggression in combat is not malice but instinct: the same territorial imperative that drives a colony organism to defend its substrate. To a Muscarian, every sector they enter becomes, on some primal level, an extension of home.`,

  3: `Vedic civilization arose on Prisma, a world whose crust is riddled with crystalline formations that naturally amplify psionic energy. The earliest Vedic were unremarkable — small, fragile beings who survived by hiding in crystal caves from the planet's apex predators. But the caves changed them. Generations of exposure to resonant crystal fields awakened latent psionic potential encoded in their genome.

By the time they emerged from the caves, they could sense the electromagnetic signatures of predators from kilometers away. Within a thousand years, they could project their consciousness across continents. Within ten thousand, across star systems.

The Vedic do not consider themselves superior for these abilities. Their central philosophical text, the Luminari Codex, teaches that psionic power is a lens, not a light — it reveals what is already there. This humility is genuine, which makes them all the more unsettling to species who cannot read minds.`,

  4: `The Kalin evolved on Lithara, a super-dense world with gravity three times the galactic standard. Everything on Lithara is built to endure: the trees have trunks of petrified wood laced with silicon, the oceans are thick with dissolved minerals, and the native fauna developed exoskeletons that can withstand atmospheric pressures that would crush steel.

The Kalin themselves are stocky, dense-boned beings whose skin contains silicon-carbide deposits that function as natural armor plating. Their engineering tradition began not with tools but with their own bodies — early Kalin would reshape their silicon deposits through sustained pressure and heat, literally forging themselves into warriors.

This practice evolved into a civilization-wide ethos: the Forge Doctrine. Everything must be tested. Everything must endure. A Kalin ship is overbuilt by any other species' standards, its hull rated for stresses it will never encounter, its weapons calibrated for enemies that may never exist. To the Kalin, this is not paranoia. It is respect for an uncaring universe.`,

  5: `No one knows where the Tar'ri came from. Their own histories begin mid-sentence, as if the early chapters were deliberately torn out. What remains is the Song of Wandering — an oral tradition spanning tens of thousands of verses, each one describing a different star system, its trade goods, its dangers, and the optimal route to the next port.

The Tar'ri do not have a homeworld. They have never had one, or if they did, they have chosen to forget it. Their civilization is a fleet — thousands of caravan ships ranging from single-family traders to city-sized bazaar vessels that serve as floating marketplaces. To be Tar'ri is to be in motion.

This rootlessness gives them a unique perspective. While other species fight over territory, the Tar'ri see borders as suggestions and wars as market opportunities. They will sell weapons to both sides of a conflict, medical supplies to the aftermath, and reconstruction materials to whatever emerges from the ashes. They call this the Cycle of Commerce, and they consider it the only honest religion in the galaxy.`,

  6: `When the Muscarians first tapped the Mycelial Network, they assumed it was a natural resource — theirs by right of discovery. They began constructing Tendril Relays: bio-engineered stations that could channel Network energy into faster-than-light communication beams. Within a decade, the Muscarian Sporarchy had a communication network that made all others obsolete.

The other races objected. The Vedic, who had sensed the Network for millennia, considered the Muscarian approach crude and dangerous — like hammering nails into a living brain. The Kalin saw a strategic asset being monopolized. The Tar'ri saw a toll road being built across free space.

The resulting conflict — the First Tendril War — lasted eleven years and reshaped the political landscape of the known galaxy. It ended not through military victory but through the Network itself, which began rejecting Muscarian relays with increasing violence, as if an immune system had finally identified an infection.`,

  7: `The Spore is not a substance, though it can manifest as one. It is not an entity, though it sometimes behaves like one. The leading Vedic theorists describe it as 'a tendency encoded in the fabric of spacetime' — a bias toward complexity, growth, and connection that occasionally crystallizes into observable phenomena.

When a new star ignites, there is a burst of Spore activity in the surrounding region. When a civilization achieves faster-than-light travel, Spore concentrations in their home system spike. When two species make first contact, the Spore between them becomes briefly visible — a shimmer in the void, like heat haze over a desert road.

The Muscarians worship it. The Vedic study it. The Kalin distrust it. The Tar'ri trade in it. No one understands it. The few researchers who have claimed to grasp its nature have, without exception, disappeared — not violently, not mysteriously, but simply. One day they are there. The next, they are not. Their colleagues describe feeling, in the moment of their absence, a profound sense of completion.`,

  8: `Between the stars, where the Mycelial Network grows thinnest, there are currents. The Tar'ri discovered them first — invisible rivers of low-density Spore energy that flow through the void in patterns that shift on timescales of centuries. A ship that catches a Drift Lane can travel at superluminal speeds without engaging its FTL drive, carried along like a seed on the wind.

The Tar'ri guarded this knowledge jealously for generations, and it explains much about their mercantile dominance. While other species burned fuel and calculated jump coordinates, Tar'ri caravans simply rode the Drift, arriving at destinations faster, cheaper, and with cargo holds intact.

Modern Drift Fuel is a synthetic approximation of this effect — a compound that temporarily aligns a ship's quantum signature with the nearest Drift Lane, allowing even non-Tar'ri vessels to catch the current. The Tar'ri consider the invention of Drift Fuel to be the single greatest act of theft in galactic history. They are not wrong.`,

  9: `Beneath the surface of seventeen known worlds, explorers have discovered identical structures: vast underground chambers whose walls are lined with a crystalline material that does not match any known mineral. When a Vedic psion enters one of these chambers, they experience a flood of information — images, sensations, and mathematical concepts from a civilization that predates all four known races by at least two billion years.

These are the Substrate Archives, and they represent the single greatest unsolved mystery in galactic archaeology. The civilization that built them — referred to in academic literature as the Progenitors — left no other trace. No cities, no ships, no bones. Only these archives, buried deep enough to survive the geological upheavals of eons.

The information within them is fragmentary and often contradictory, as if the Progenitors could not agree on what was worth preserving. But one theme recurs across every archive on every world: a warning. Something is coming. Something came before. The distinction, in the Progenitor language, appears to be meaningless.`,

  10: `The treaty that ended the First Tendril War was not negotiated at a diplomatic summit. It was grown. Muscarian bio-diplomats planted a ring of symbiotic fungi around a neutral space station, and representatives of all four races were invited to sit within the ring and breathe the spores. The effect was not mind control — the Vedic confirmed this repeatedly — but rather a profound deepening of empathy. Each delegate could feel, viscerally, the fears and hopes of the others.

The resulting document, the Accord of Spores, established the framework that still governs interstellar relations. The Mycelial Network was declared a shared resource. Tendril Relays would be jointly operated. No single species could claim sovereignty over Network nodes.

The Accord held for nearly a century. When it finally broke, it broke not because of betrayal or ambition, but because of something none of the signatories had anticipated: the Network began to change. Nodes that had been stable for millennia started migrating. New tendrils appeared in empty space. The Network was growing, and it was growing toward something.`,
};

// ── ElevenLabs TTS ───────────────────────────────────────────────────────────

async function generateTTS(text: string): Promise<Buffer> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "(unreadable)");
    throw new Error(
      `ElevenLabs error: ${response.status} ${response.statusText} — ${body}`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

// ── Intro beats (10 beats) ────────────────────────────────────────────────────

const INTRO_TEXTS: string[] = [
  "On the other side of the Cosmos, in a corner of the Agaricalis system, lived an advanced race of humanoids known as the Muscarians.",
  "After picking up a curious signal from their home planet, the Muscarians launched a mission to investigate. The source: an artificial wormhole, created by an alien race of avid explorers known as the Vedic.",
  "The Vedic introduced them to cyrillium — a power source capable of providing a great leap forward to Muscarian space travel. Within years, ships capable of traversing galaxies were built.",
  "The Vedic invited the Muscarians to use their wormhole to access the Calvatian Galaxy, where cyrillium is plentiful. With good money to be made, those with the resources headed through in private ships.",
  "In the massive Calvatian Galaxy, the Muscarians were not alone. Kalin warships and Tar'ri merchant caravans also traversed this space, collecting cyrillium and transporting it to their homeworlds.",
  "Tensions escalated when a Kalin ship discovered the wormhole to Agaricalis. The Muscarian Central Authority hatched a plan: destroy the Kalin wormhole and fortify their own.",
  "The Kalin retaliated. A partisan pilot flew a captured freighter overloaded with volatile cyrillium into the Muscarian wormhole and detonated it. Both connections home were severed.",
  "Decades of conflict followed. The Muscarian Central Authority weakened. The Tar'ri established outposts and trade routes. The Vedic settled into quiet observation. The Kalin splintered into rival clans.",
  "A ceasefire was established — not from peace, but exhaustion. Syndicates rose where governments fell. Only a handful of protected sectors remain under Central Authority patrol.",
  "Today all races coexist in the Calvatian quadrant together, with an expected mixture of conflict and alliance. Stranded in this strange new world, you set out to carve a piece of the galaxy for yourself.",
];

// ── Post-tutorial beats (8 beats) ────────────────────────────────────────────

const POST_TUTORIAL_TEXTS: string[] = [
  "You've learned the basics, pilot. But the basics won't keep you alive out here.",
  "You begin at a Star Mall, where you can purchase and equip ships. Once equipped, you may explore the vast, uncharted reaches of the galaxy.",
  "As you travel to new sectors, your navigational computer logs your path, gradually constructing a cosmic map. Through exploration, you'll discover profitable outposts and strategically significant sectors.",
  "Outposts value commodities differently based on supply and demand. By buying low and selling high between ports — celestial arbitrage — you can build a fortune.",
  "Planets can be claimed and developed. Collect colonists from seed planets, deposit them on your worlds, and upgrade them into fortified strongholds producing valuable resources.",
  "You will encounter other pilots. Attack them, ignore them, or form syndicates — alliances that collectively hold planets, funds, and strategic defenses.",
  "The galaxy has no ruler. Will you dominate through force, trade your way to fortune, build a planetary empire, or forge alliances that reshape the frontier?",
  "The ceasefire holds. For now.",
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function generateBatch(
  texts: Record<number, string> | string[],
  prefix: string,
  label: string,
) {
  const entries = Array.isArray(texts)
    ? texts.map((t, i) => [i, t] as [number, string])
    : Object.entries(texts).map(([k, v]) => [Number(k), v] as [number, string]);

  for (const [idx, text] of entries) {
    const num = Array.isArray(texts)
      ? String(idx + 1).padStart(2, "0")
      : String(idx).padStart(2, "0");
    const filename = `${prefix}${num}.mp3`;
    const filePath = path.join(OUTPUT_DIR, filename);

    // Skip if already exists
    if (fs.existsSync(filePath)) {
      console.log(`  [skip] ${filename} already exists`);
      continue;
    }

    console.log(`  ${label} ${num}: generating (${text.length} chars)...`);
    const start = Date.now();
    const audio = await generateTTS(text);
    fs.writeFileSync(filePath, audio);
    const sizeMB = (audio.length / (1024 * 1024)).toFixed(2);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`    → ${filename} (${sizeMB} MB, ${elapsed}s)`);
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Voice ID: ${VOICE_ID}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_DIR}`);

  // Mission accept narration (m01_accept .. m10_accept)
  console.log("\n── Mission Accept Narration ──");
  for (let i = 1; i <= 10; i++) {
    const num = String(i).padStart(2, "0");
    const filename = `m${num}_accept.mp3`;
    const filePath = path.join(OUTPUT_DIR, filename);
    if (fs.existsSync(filePath)) {
      console.log(`  [skip] ${filename} already exists`);
      continue;
    }
    const text = ACCEPT_TEXTS[i];
    if (!text) continue;
    console.log(`  accept ${num}: generating (${text.length} chars)...`);
    const start = Date.now();
    const audio = await generateTTS(text);
    fs.writeFileSync(filePath, audio);
    const sizeMB = (audio.length / (1024 * 1024)).toFixed(2);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`    → ${filename} (${sizeMB} MB, ${elapsed}s)`);
  }

  // Mission claim narration (m01_claim .. m10_claim)
  console.log("\n── Mission Claim Narration ──");
  for (let i = 1; i <= 10; i++) {
    const num = String(i).padStart(2, "0");
    const filename = `m${num}_claim.mp3`;
    const filePath = path.join(OUTPUT_DIR, filename);
    if (fs.existsSync(filePath)) {
      console.log(`  [skip] ${filename} already exists`);
      continue;
    }
    const text = CLAIM_TEXTS[i];
    if (!text) continue;
    console.log(`  claim ${num}: generating (${text.length} chars)...`);
    const start = Date.now();
    const audio = await generateTTS(text);
    fs.writeFileSync(filePath, audio);
    const sizeMB = (audio.length / (1024 * 1024)).toFixed(2);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`    → ${filename} (${sizeMB} MB, ${elapsed}s)`);
  }

  // Mission complete narration (m01_complete .. m10_complete)
  console.log("\n── Mission Complete Narration ──");
  for (let i = 1; i <= 10; i++) {
    const num = String(i).padStart(2, "0");
    const filename = `m${num}_complete.mp3`;
    const filePath = path.join(OUTPUT_DIR, filename);
    if (fs.existsSync(filePath)) {
      console.log(`  [skip] ${filename} already exists`);
      continue;
    }
    const text = COMPLETE_TEXTS[i];
    if (!text) continue;
    console.log(`  complete ${num}: generating (${text.length} chars)...`);
    const start = Date.now();
    const audio = await generateTTS(text);
    fs.writeFileSync(filePath, audio);
    const sizeMB = (audio.length / (1024 * 1024)).toFixed(2);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`    → ${filename} (${sizeMB} MB, ${elapsed}s)`);
  }

  // Codex entry narration (codex_01 .. codex_10)
  console.log("\n── Codex Entry Narration ──");
  for (let i = 1; i <= 10; i++) {
    const num = String(i).padStart(2, "0");
    const filename = `codex_${num}.mp3`;
    const filePath = path.join(OUTPUT_DIR, filename);
    if (fs.existsSync(filePath)) {
      console.log(`  [skip] ${filename} already exists`);
      continue;
    }
    const text = CODEX_TEXTS[i];
    if (!text) continue;
    console.log(`  codex ${num}: generating (${text.length} chars)...`);
    const start = Date.now();
    const audio = await generateTTS(text);
    fs.writeFileSync(filePath, audio);
    const sizeMB = (audio.length / (1024 * 1024)).toFixed(2);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`    → ${filename} (${sizeMB} MB, ${elapsed}s)`);
  }

  // Intro beats (intro_01 .. intro_10)
  console.log("\n── Intro Narration ──");
  await generateBatch(INTRO_TEXTS, "intro_", "intro");

  // Post-tutorial beats (posttut_01 .. posttut_08)
  console.log("\n── Post-Tutorial Narration ──");
  await generateBatch(POST_TUTORIAL_TEXTS, "posttut_", "posttut");

  const count = fs
    .readdirSync(OUTPUT_DIR)
    .filter((f) => f.endsWith(".mp3")).length;
  console.log(`\nDone! ${count} narration MP3s in ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
