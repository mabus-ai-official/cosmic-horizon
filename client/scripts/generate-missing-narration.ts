/**
 * Generate specific missing narration MP3s via ElevenLabs TTS.
 * Targets: codex_09, codex_10, chapter_01-04_complete
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  CODEX_TEXTS,
  CHAPTER_COMPLETION_TEXTS,
} from "./narration-scripts-codex";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error("ELEVENLABS_API_KEY required");
  process.exit(1);
}

const VOICE_ID = "goT3UYdM9bhm0n2lmKQx"; // Edward (ARIA narrator)
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_turbo_v2_5";
const OUTPUT_DIR = path.join(__dirname, "../public/audio/narration");
const DRY_RUN = process.argv.includes("--dry-run");

interface GenerationJob {
  filename: string;
  text: string;
}

async function generateMP3(text: string, outputPath: string): Promise<void> {
  const resp = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY!,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`ElevenLabs API error ${resp.status}: ${err}`);
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  console.log(`  ✓ ${path.basename(outputPath)} (${buffer.length} bytes)`);
}

async function main() {
  const jobs: GenerationJob[] = [];

  // Codex entries for missions 9-10
  for (const num of [9, 10]) {
    const text = CODEX_TEXTS[num];
    if (!text) {
      console.warn(`  ⚠ No codex text for mission ${num}`);
      continue;
    }
    const filename = `codex_${String(num).padStart(2, "0")}.mp3`;
    const outputPath = path.join(OUTPUT_DIR, filename);
    if (fs.existsSync(outputPath)) {
      console.log(`  ○ ${filename} already exists, skipping`);
      continue;
    }
    jobs.push({ filename, text });
  }

  // Chapter completion narrations (1-4)
  for (const [chapterStr, text] of Object.entries(CHAPTER_COMPLETION_TEXTS)) {
    const chapter = parseInt(chapterStr);
    const filename = `chapter_${String(chapter).padStart(2, "0")}_complete.mp3`;
    const outputPath = path.join(OUTPUT_DIR, filename);
    if (fs.existsSync(outputPath)) {
      console.log(`  ○ ${filename} already exists, skipping`);
      continue;
    }
    jobs.push({ filename, text });
  }

  console.log(`\n${jobs.length} files to generate:\n`);
  for (const job of jobs) {
    console.log(`  → ${job.filename}`);
  }

  if (DRY_RUN) {
    console.log("\n--dry-run: no files generated.");
    return;
  }

  console.log("\nGenerating...\n");

  for (const job of jobs) {
    const outputPath = path.join(OUTPUT_DIR, job.filename);
    try {
      await generateMP3(job.text, outputPath);
      // Throttle to stay under ElevenLabs rate limits
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      console.error(`  ✗ ${job.filename}: ${err}`);
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);
