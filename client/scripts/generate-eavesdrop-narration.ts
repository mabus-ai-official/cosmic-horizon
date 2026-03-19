/**
 * Generate eavesdrop conversation MP3s using the multivoice pipeline.
 * Each conversation has 2 speakers with alternating lines.
 * Uses [NPC:voiceKey] tags → per-segment TTS → ffmpeg concat.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=... npx tsx scripts/generate-eavesdrop-narration.ts [--dry-run]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { EAVESDROP_SCRIPTS } from "./narration-scripts-eavesdrop";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error("ELEVENLABS_API_KEY required");
  process.exit(1);
}

const MODEL = process.env.ELEVENLABS_MODEL || "eleven_turbo_v2_5";
const OUTPUT_DIR = path.join(__dirname, "../public/audio/narration");
const TEMP_DIR = path.join(__dirname, "../.narration-tmp");
const DRY_RUN = process.argv.includes("--dry-run");

const VOICE_MAP: Record<string, string> = {
  aria: "goT3UYdM9bhm0n2lmKQx",
  alarion: "6sFKzaJr574YWVu4UuJF",
  valandor: "HAvvFKatz0uu0Fv55Riy",
  raxus: "yhf80q1381zd2JJQ4tM7",
  kovax: "mrmh5i7zNpOwftrj8xdS",
  miraen: "XEoBW4iDmiawQP72xnAF",
  elenion: "lKMAeQD7Brvj7QCWByqK",
  caelum: "nzeAacJi50IvxcyDnMXa",
  oracle: "jAUCvi11wHjVRQNQdT4W",
  lyra: "flHkNRp1BlvT73UL6gyz",
  shade: "2gPFXx8pN3Avh27Dw5Ma",
  sarge: "TxWZERZ5Hc6h9dGxVmXa",
  elara_voss: "lhsOe6KovF0XxcKEsHpN",
  commander_thane: "ouL9IsyrSnUkCmfnD02u",
  hawk: "Z7RrOqZFTyLpIlzCgfsp",
  jyn: "WMKg7TxPpPWCryaXE42r",
  archivist_thal: "MKlLqCItoCkvdhrxgtLv",
  professor_thane: "RDSy0QN68yhrjuOgqzQ4",
  hermit: "1zvnni6XluAvqQJWPf1M",
  doc_helix: "zpnRoleXRhWcv8KmQc0N",
  tiktok: "YOq2y2Up4RgXP2HyXjE5",
  sella: "lUCNYQh2kqW2wiie85Qk",
  bartender: "2ajXGJNYBR0iNHpS4VZb",
  prospector: "zYcjlYFOd3taleS0gkk3",
  rookie: "TtRFBnwQdH1k01vR0hMz",
  gravel_krix: "oR4uRy4fHDUGGISL0Rev",
};

interface VoiceSegment {
  voice: string;
  text: string;
}

function parseVoiceTags(script: string): VoiceSegment[] {
  const segments: VoiceSegment[] = [];
  const tagPattern = /\[(ARIA|NPC:([a-z_]+))\]/g;
  let lastIndex = 0;
  let currentVoice = "aria";
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(script)) !== null) {
    const textBefore = script.slice(lastIndex, match.index).trim();
    if (textBefore && lastIndex > 0) {
      segments.push({ voice: currentVoice, text: textBefore });
    }
    currentVoice = match[1] === "ARIA" ? "aria" : match[2];
    lastIndex = match.index + match[0].length;
  }

  const remaining = script.slice(lastIndex).trim();
  if (remaining) {
    segments.push({ voice: currentVoice, text: remaining });
  }

  return segments;
}

async function generateTTS(text: string, voiceId: string): Promise<Buffer> {
  const resp = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": API_KEY!,
      },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  );

  if (!resp.ok) {
    const body = await resp.text().catch(() => "(unreadable)");
    throw new Error(`ElevenLabs ${resp.status}: ${body}`);
  }

  return Buffer.from(await resp.arrayBuffer());
}

function concatMP3s(parts: string[], output: string): void {
  const listFile = path.join(TEMP_DIR, "concat.txt");
  const content = parts.map((p) => `file '${p}'`).join("\n");
  fs.writeFileSync(listFile, content);
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${output}" 2>/dev/null`,
  );
}

async function main() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  const toGenerate = EAVESDROP_SCRIPTS.filter((s) => {
    const out = path.join(OUTPUT_DIR, s.filename);
    if (fs.existsSync(out)) {
      console.log(`  ○ ${s.filename} exists, skipping`);
      return false;
    }
    return true;
  });

  console.log(`\n${toGenerate.length} eavesdrop conversations to generate:\n`);
  for (const s of toGenerate) {
    console.log(`  → ${s.filename} (${s.speakers.join(" + ")})`);
  }

  if (DRY_RUN) {
    console.log("\n--dry-run: no files generated.");
    return;
  }

  console.log("\nGenerating...\n");

  for (const script of toGenerate) {
    const segments = parseVoiceTags(script.script);
    const partFiles: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const voiceId = VOICE_MAP[seg.voice];
      if (!voiceId) {
        console.error(`  ✗ Unknown voice key: ${seg.voice}`);
        continue;
      }

      const partFile = path.join(TEMP_DIR, `${script.id}_part${i}.mp3`);
      const buf = await generateTTS(seg.text, voiceId);
      fs.writeFileSync(partFile, buf);
      partFiles.push(partFile);

      // Throttle API calls
      await new Promise((r) => setTimeout(r, 800));
    }

    if (partFiles.length > 1) {
      const output = path.join(OUTPUT_DIR, script.filename);
      concatMP3s(partFiles, output);
      const size = fs.statSync(output).size;
      console.log(
        `  ✓ ${script.filename} (${size} bytes, ${partFiles.length} segments)`,
      );
    } else if (partFiles.length === 1) {
      const output = path.join(OUTPUT_DIR, script.filename);
      fs.copyFileSync(partFiles[0], output);
      const size = fs.statSync(output).size;
      console.log(`  ✓ ${script.filename} (${size} bytes, single voice)`);
    }

    // Clean up temp parts
    for (const f of partFiles) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  }

  // Cleanup temp dir
  const listFile = path.join(TEMP_DIR, "concat.txt");
  if (fs.existsSync(listFile)) fs.unlinkSync(listFile);
  if (fs.existsSync(TEMP_DIR)) fs.rmdirSync(TEMP_DIR);

  console.log("\nDone!");
}

main().catch(console.error);
