#!/usr/bin/env npx tsx
/**
 * generate-narration-multivoice.ts — Multi-voice MP3 generation for all narration.
 *
 * Parses voice-tagged scripts ([ARIA] and [NPC:name] tags), generates each
 * segment with the appropriate ElevenLabs voice, then concatenates with ffmpeg.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=... npx tsx client/scripts/generate-narration-multivoice.ts [--category story|faction|event] [--dry-run]
 *
 * Env vars:
 *   ELEVENLABS_API_KEY   — required
 *   ELEVENLABS_MODEL     — optional, defaults to eleven_turbo_v2_5
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.ELEVENLABS_API_KEY || "";
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_turbo_v2_5";
const DRY_RUN = process.argv.includes("--dry-run");
const CATEGORY_FILTER = (() => {
  const idx = process.argv.indexOf("--category");
  return idx >= 0 ? process.argv[idx + 1] : null;
})();

if (!API_KEY && !DRY_RUN) {
  console.error("ELEVENLABS_API_KEY is required (or use --dry-run)");
  process.exit(1);
}

const OUTPUT_DIR = path.resolve(__dirname, "../public/audio/narration");
const TEMP_DIR = path.resolve(__dirname, "../public/audio/narration/.tmp");

// ── Voice ID Map ──────────────────────────────────────────────────────────────

const VOICE_MAP: Record<string, string> = {
  // Narrator
  aria: "goT3UYdM9bhm0n2lmKQx", // Edward — ARIA narrator
  dr_vorn: "goT3UYdM9bhm0n2lmKQx", // Dr. Vorn uses ARIA voice (M1-10 legacy)

  // Main NPCs
  alarion: "6sFKzaJr574YWVu4UuJF", // Warm elder statesman
  valandor: "HAvvFKatz0uu0Fv55Riy", // Ancient sage, ethereal
  raxus: "yhf80q1381zd2JJQ4tM7", // Military commander, gruff
  kovax: "mrmh5i7zNpOwftrj8xdS", // Merchant, sly
  miraen: "XEoBW4iDmiawQP72xnAF", // Scientist, warm
  elenion: "lKMAeQD7Brvj7QCWByqK", // Diplomat, composed
  caelum: "nzeAacJi50IvxcyDnMXa", // Engineer, energetic
  oracle: "jAUCvi11wHjVRQNQdT4W", // Cryptic entity
  lyra: "flHkNRp1BlvT73UL6gyz", // Academic, curious
  shade: "2gPFXx8pN3Avh27Dw5Ma", // Spy, conspiratorial
  viper_nox: "2gPFXx8pN3Avh27Dw5Ma", // Same voice as Shade

  // Secondary NPCs
  sarge: "TxWZERZ5Hc6h9dGxVmXa", // Drill sergeant
  elara_voss: "lhsOe6KovF0XxcKEsHpN", // Military officer
  commander_thane: "ouL9IsyrSnUkCmfnD02u", // Stern commander
  hawk: "Z7RrOqZFTyLpIlzCgfsp", // Intelligence operative
  jyn: "WMKg7TxPpPWCryaXE42r", // Quartermaster
  archivist_thal: "MKlLqCItoCkvdhrxgtLv", // Aged scholar
  professor_thane: "RDSy0QN68yhrjuOgqzQ4", // Excited academic
  hermit: "1zvnni6XluAvqQJWPf1M", // Philosophical wanderer
  doc_helix: "zpnRoleXRhWcv8KmQc0N", // Compassionate medic
  tiktok: "YOq2y2Up4RgXP2HyXjE5", // Mechanical/synthetic
  sella: "lUCNYQh2kqW2wiie85Qk", // Warm merchant
};

// ── Voice Tag Parser ──────────────────────────────────────────────────────────

interface VoiceSegment {
  voice: string; // key into VOICE_MAP (e.g. "aria", "alarion")
  text: string; // the text to speak
}

function parseVoiceTags(script: string): VoiceSegment[] {
  const segments: VoiceSegment[] = [];
  // Match [ARIA] or [NPC:name] tags
  const tagPattern = /\[(ARIA|NPC:([a-z_]+))\]/g;

  let lastIndex = 0;
  let currentVoice = "aria"; // default to ARIA if no tag at start
  let match: RegExpExecArray | null;

  // Check if script starts with a tag
  const firstTag = /^\[(ARIA|NPC:([a-z_]+))\]/.exec(script.trim());
  if (!firstTag) {
    // No tags at all — entire script is ARIA
    return [{ voice: "aria", text: script.trim() }];
  }

  while ((match = tagPattern.exec(script)) !== null) {
    // Save text before this tag (belongs to previous voice)
    const textBefore = script.slice(lastIndex, match.index).trim();
    if (textBefore && lastIndex > 0) {
      segments.push({ voice: currentVoice, text: textBefore });
    }

    // Update current voice
    if (match[1] === "ARIA") {
      currentVoice = "aria";
    } else {
      currentVoice = match[2]; // NPC name
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last tag
  const remaining = script.slice(lastIndex).trim();
  if (remaining) {
    segments.push({ voice: currentVoice, text: remaining });
  }

  return segments;
}

// ── ElevenLabs TTS ────────────────────────────────────────────────────────────

async function generateTTS(text: string, voiceId: string): Promise<Buffer> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
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

// ── Audio Concatenation ───────────────────────────────────────────────────────

function concatenateAudio(segmentFiles: string[], outputFile: string): void {
  if (segmentFiles.length === 1) {
    // Single segment — just copy
    fs.copyFileSync(segmentFiles[0], outputFile);
    return;
  }

  // Create ffmpeg concat list
  const listFile = path.join(TEMP_DIR, `concat_${Date.now()}.txt`);
  const listContent = segmentFiles.map((f) => `file '${f}'`).join("\n");
  fs.writeFileSync(listFile, listContent);

  try {
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c:a libmp3lame -q:a 2 "${outputFile}" 2>/dev/null`,
      { stdio: "pipe" },
    );
  } finally {
    fs.unlinkSync(listFile);
  }
}

// ── Multi-Voice Generation ────────────────────────────────────────────────────

async function generateMultiVoice(
  script: string,
  outputFile: string,
  label: string,
): Promise<void> {
  if (fs.existsSync(outputFile)) {
    console.log(`  [skip] ${path.basename(outputFile)} already exists`);
    return;
  }

  const segments = parseVoiceTags(script);

  if (DRY_RUN) {
    console.log(`  [dry-run] ${label}: ${segments.length} segment(s)`);
    for (const seg of segments) {
      const voiceId = VOICE_MAP[seg.voice];
      if (!voiceId) {
        console.error(`    ⚠ Unknown voice: ${seg.voice}`);
      }
      console.log(
        `    ${seg.voice} (${seg.text.length} chars): "${seg.text.slice(0, 60)}..."`,
      );
    }
    return;
  }

  console.log(`  ${label}: ${segments.length} segment(s)...`);
  const start = Date.now();
  const segmentFiles: string[] = [];

  try {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const voiceId = VOICE_MAP[seg.voice];
      if (!voiceId) {
        console.error(
          `    ⚠ Unknown voice "${seg.voice}", falling back to ARIA`,
        );
      }
      const vid = voiceId || VOICE_MAP.aria;

      const segFile = path.join(TEMP_DIR, `seg_${Date.now()}_${i}.mp3`);
      const audio = await generateTTS(seg.text, vid);
      fs.writeFileSync(segFile, audio);
      segmentFiles.push(segFile);

      console.log(
        `    segment ${i + 1}/${segments.length}: ${seg.voice} (${seg.text.length} chars)`,
      );
    }

    // Concatenate segments
    concatenateAudio(segmentFiles, outputFile);

    const finalSize = fs.statSync(outputFile).size;
    const sizeMB = (finalSize / (1024 * 1024)).toFixed(2);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(
      `    → ${path.basename(outputFile)} (${sizeMB} MB, ${elapsed}s)`,
    );
  } finally {
    // Clean up temp segment files
    for (const f of segmentFiles) {
      try {
        fs.unlinkSync(f);
      } catch {
        /* ignore */
      }
    }
  }
}

// ── Single-Voice Generation (for codex, claim, complete — no tags) ────────────

async function generateSingleVoice(
  text: string,
  outputFile: string,
  label: string,
  voiceId: string = VOICE_MAP.aria,
): Promise<void> {
  if (fs.existsSync(outputFile)) {
    console.log(`  [skip] ${path.basename(outputFile)} already exists`);
    return;
  }

  if (DRY_RUN) {
    console.log(`  [dry-run] ${label}: ${text.length} chars`);
    return;
  }

  console.log(`  ${label}: generating (${text.length} chars)...`);
  const start = Date.now();
  const audio = await generateTTS(text, voiceId);
  fs.writeFileSync(outputFile, audio);
  const sizeMB = (audio.length / (1024 * 1024)).toFixed(2);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`    → ${path.basename(outputFile)} (${sizeMB} MB, ${elapsed}s)`);
}

// ── Script Imports ────────────────────────────────────────────────────────────
// These will be imported from the generated script files

async function loadScripts() {
  const ch14 = await import("./narration-scripts-story-ch1-4.js");
  const ch58 = await import("./narration-scripts-story-ch5-8.js");
  const codex = await import("./narration-scripts-codex.js");
  const factions = await import("./narration-scripts-factions.js");
  const events = await import("./narration-scripts-events.js");
  const phases = await import("./narration-scripts-phases.js");

  return { ch14, ch58, codex, factions, events, phases };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  if (CATEGORY_FILTER) console.log(`Filter: ${CATEGORY_FILTER}`);

  const scripts = await loadScripts();

  // ── Story Mission Accept (multi-voice, M5-60) ──
  if (!CATEGORY_FILTER || CATEGORY_FILTER === "story") {
    console.log("\n══ Story Mission Accept Narration ══");

    // Ch1-4 (M5-31)
    const acceptCh14 = scripts.ch14.ACCEPT_TEXTS as Record<number, string>;
    for (const [num, text] of Object.entries(acceptCh14)) {
      const n = String(Number(num)).padStart(2, "0");
      const outFile = path.join(OUTPUT_DIR, `m${n}_accept.mp3`);
      await generateMultiVoice(text, outFile, `accept M${n}`);
    }

    // Ch5-8 (M32-60)
    const acceptCh58 = scripts.ch58.ACCEPT_TEXTS as Record<number, string>;
    for (const [num, text] of Object.entries(acceptCh58)) {
      const n = String(Number(num)).padStart(2, "0");
      const outFile = path.join(OUTPUT_DIR, `m${n}_accept.mp3`);
      await generateMultiVoice(text, outFile, `accept M${n}`);
    }

    // ── Story Mission Complete (single-voice ARIA, M5-60) ──
    console.log("\n══ Story Mission Complete Narration ══");

    const completeCh14 = scripts.ch14.COMPLETE_TEXTS as Record<number, string>;
    for (const [num, text] of Object.entries(completeCh14)) {
      const n = String(Number(num)).padStart(2, "0");
      const outFile = path.join(OUTPUT_DIR, `m${n}_complete.mp3`);
      // Complete texts may have voice tags too
      if (text.includes("[ARIA]") || text.includes("[NPC:")) {
        await generateMultiVoice(text, outFile, `complete M${n}`);
      } else {
        await generateSingleVoice(text, outFile, `complete M${n}`);
      }
    }

    const completeCh58 = scripts.ch58.COMPLETE_TEXTS as Record<number, string>;
    for (const [num, text] of Object.entries(completeCh58)) {
      const n = String(Number(num)).padStart(2, "0");
      const outFile = path.join(OUTPUT_DIR, `m${n}_complete.mp3`);
      if (text.includes("[ARIA]") || text.includes("[NPC:")) {
        await generateMultiVoice(text, outFile, `complete M${n}`);
      } else {
        await generateSingleVoice(text, outFile, `complete M${n}`);
      }
    }

    // ── Story Codex (single-voice ARIA, M11-60) ──
    console.log("\n══ Story Codex Narration ══");
    const codexTexts = scripts.codex.CODEX_TEXTS as Record<number, string>;
    for (const [num, text] of Object.entries(codexTexts)) {
      const n = String(Number(num)).padStart(2, "0");
      const outFile = path.join(OUTPUT_DIR, `codex_${n}.mp3`);
      await generateSingleVoice(text, outFile, `codex M${n}`);
    }

    // ── Story Claim (single-voice ARIA, M11-60) ──
    // Claim texts are already in narration-manifest.ts CLAIM_TEXTS
    console.log("\n══ Story Claim Narration (M11-60) ══");
    const { CLAIM_TEXTS } = await import("../src/config/narration-manifest.js");
    for (let i = 11; i <= 60; i++) {
      const text = (CLAIM_TEXTS as Record<number, string>)[i];
      if (!text) continue;
      const n = String(i).padStart(2, "0");
      const outFile = path.join(OUTPUT_DIR, `m${n}_claim.mp3`);
      await generateSingleVoice(text, outFile, `claim M${n}`);
    }
  }

  // ── Phase Transition Narration (story + faction) ──
  if (!CATEGORY_FILTER || CATEGORY_FILTER === "phase") {
    console.log("\n══ Phase Transition Narration ══");

    // Story phase narrations
    const storyPhases = scripts.phases.STORY_PHASE_TEXTS as Record<
      string,
      string
    >;
    for (const [key, text] of Object.entries(storyPhases)) {
      const outFile = path.join(OUTPUT_DIR, `${key}.mp3`);
      await generateMultiVoice(text, outFile, `phase: ${key}`);
    }

    // Faction phase narrations
    const factionPhases = scripts.phases.FACTION_PHASE_TEXTS as Record<
      string,
      string
    >;
    for (const [key, text] of Object.entries(factionPhases)) {
      const outFile = path.join(OUTPUT_DIR, `${key}.mp3`);
      await generateMultiVoice(text, outFile, `phase: ${key}`);
    }
  }

  // ── Faction Questline Narration ──
  if (!CATEGORY_FILTER || CATEGORY_FILTER === "faction") {
    console.log("\n══ Faction Questline Narration ══");

    const fAccept = scripts.factions.FACTION_ACCEPT as Record<string, string>;
    const fComplete = scripts.factions.FACTION_COMPLETE as Record<
      string,
      string
    >;
    const fClaim = scripts.factions.FACTION_CLAIM as Record<string, string>;
    const fCodex = scripts.factions.FACTION_CODEX as Record<string, string>;

    for (const key of Object.keys(fAccept)) {
      // key format: "mycorrhizal_network:1"
      const [faction, num] = key.split(":");
      const fShort = faction.replace(/_/g, "").slice(0, 6);
      const n = String(Number(num)).padStart(2, "0");
      const prefix = `fq_${faction}_m${n}`;

      // Accept (multi-voice)
      const acceptFile = path.join(OUTPUT_DIR, `${prefix}_accept.mp3`);
      await generateMultiVoice(
        fAccept[key],
        acceptFile,
        `${faction}:${num} accept`,
      );

      // Complete (single-voice)
      if (fComplete[key]) {
        const completeFile = path.join(OUTPUT_DIR, `${prefix}_complete.mp3`);
        await generateSingleVoice(
          fComplete[key],
          completeFile,
          `${faction}:${num} complete`,
        );
      }

      // Claim (single-voice)
      if (fClaim[key]) {
        const claimFile = path.join(OUTPUT_DIR, `${prefix}_claim.mp3`);
        await generateSingleVoice(
          fClaim[key],
          claimFile,
          `${faction}:${num} claim`,
        );
      }

      // Codex (single-voice)
      if (fCodex[key]) {
        const codexFile = path.join(OUTPUT_DIR, `${prefix}_codex.mp3`);
        await generateSingleVoice(
          fCodex[key],
          codexFile,
          `${faction}:${num} codex`,
        );
      }
    }
  }

  // ── Random Event Narration ──
  if (!CATEGORY_FILTER || CATEGORY_FILTER === "event") {
    console.log("\n══ Random Event Narration ══");

    const eventTexts = scripts.events.EVENT_NARRATION as Record<string, string>;
    for (const [eventKey, text] of Object.entries(eventTexts)) {
      const outFile = path.join(OUTPUT_DIR, `event_${eventKey}.mp3`);
      if (text.includes("[ARIA]") || text.includes("[NPC:")) {
        await generateMultiVoice(text, outFile, `event: ${eventKey}`);
      } else {
        await generateSingleVoice(text, outFile, `event: ${eventKey}`);
      }
    }
  }

  // ── Summary ──
  const count = fs
    .readdirSync(OUTPUT_DIR)
    .filter((f) => f.endsWith(".mp3")).length;
  console.log(`\nDone! ${count} narration MP3s in ${OUTPUT_DIR}`);

  // Clean up temp dir
  try {
    fs.rmdirSync(TEMP_DIR);
  } catch {
    /* may not be empty */
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
