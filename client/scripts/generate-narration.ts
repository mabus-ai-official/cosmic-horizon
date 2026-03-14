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
