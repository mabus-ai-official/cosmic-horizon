/**
 * narration-scripts-eavesdrop.ts — Voice-tagged scripts for cantina eavesdrop conversations.
 *
 * 10 conversations, each with 2 speakers trading lines back and forth.
 * Lines alternate between speakers starting with speaker[0].
 * Text matches the server-side EAVESDROP_CONVERSATIONS in starmall.ts exactly.
 *
 * Voice tags use [NPC:key] format for the multivoice generation pipeline.
 * New voices needed: rookie (young/nervous), bartender (warm/gruff), prospector (rough/working-class)
 */

export interface EavesdropScript {
  id: string;
  filename: string;
  speakers: [string, string]; // [voiceKey1, voiceKey2]
  /** Full concatenated script with voice tags, one line per speaker alternating */
  script: string;
}

export const EAVESDROP_SCRIPTS: EavesdropScript[] = [
  {
    id: "eavesdrop_01",
    filename: "eavesdrop_01.mp3",
    speakers: ["sarge", "rookie"],
    script: `[NPC:sarge] ...told you, the outer rim routes pay triple right now.
[NPC:rookie] But the pirate activity out there—
[NPC:sarge] Pirates? Kid, the real danger is the toll drones. Some syndicate set up a chokepoint near Sector 3000.
[NPC:rookie] How do you avoid them?
[NPC:sarge] You don't avoid them. You budget for them. Or you find another way around.`,
  },
  {
    id: "eavesdrop_02",
    filename: "eavesdrop_02.mp3",
    speakers: ["kovax", "shade"],
    script: `[NPC:kovax] ...the cyrillium shipment never arrived.
[NPC:shade] The Void Runners intercepted it. Third convoy this cycle.
[NPC:kovax] We can't keep losing cargo like this. What about armed escorts?
[NPC:shade] Escorts cost more than the cargo. Better to split shipments across multiple routes.
[NPC:kovax] Hmm. Diversify the supply chain. Not a bad idea.`,
  },
  {
    id: "eavesdrop_03",
    filename: "eavesdrop_03.mp3",
    speakers: ["commander_thane", "bartender"],
    script: `[NPC:commander_thane] Quiet night.
[NPC:bartender] Too quiet. Last time it was this calm, the Syndicate hit the refinery in sector 1800.
[NPC:commander_thane] You think something's coming?
[NPC:bartender] Something's always coming. Keep your scanner charged.
[NPC:commander_thane] Ha. I'll have another drink instead.`,
  },
  {
    id: "eavesdrop_04",
    filename: "eavesdrop_04.mp3",
    speakers: ["prospector", "raxus"],
    script: `[NPC:prospector] Found a vein of pure cyrillium on that volcanic world. Class V deposit.
[NPC:raxus] Class V? That's rare. Which sector?
[NPC:prospector] Nice try. But I'll tell you this — volcanic planets with high tectonic activity always have the best yields.
[NPC:raxus] What about the colonist safety ratings?
[NPC:prospector] Safety? In mining? Ha!`,
  },
  {
    id: "eavesdrop_05",
    filename: "eavesdrop_05.mp3",
    speakers: ["hermit", "elara_voss"],
    script: `[NPC:hermit] ...and that's why you never enter a nebula without full shields.
[NPC:elara_voss] What happened to the crew?
[NPC:hermit] Lost them all. The nebula stripped our shields in two jumps. By the third, hull integrity was at 40%.
[NPC:elara_voss] So how did you survive?
[NPC:hermit] I didn't go in the third time. Know when to retreat, Lieutenant.`,
  },
  {
    id: "eavesdrop_06",
    filename: "eavesdrop_06.mp3",
    speakers: ["hawk", "kovax"],
    script: `[NPC:hawk] I've got 50 units of 'unregistered' tech components.
[NPC:kovax] Unregistered. Right. Where'd they come from?
[NPC:hawk] A derelict near the core. No ID tags, no serial numbers.
[NPC:kovax] I'll give you 60% market rate.
[NPC:hawk] Seventy or I walk. There are other fences in this galaxy.
[NPC:kovax] ...Fine. But next time, bring food. Food moves faster.`,
  },
  {
    id: "eavesdrop_07",
    filename: "eavesdrop_07.mp3",
    speakers: ["elenion", "jyn"],
    script: `[NPC:elenion] We need 200 more colonists by next cycle or the council pulls funding.
[NPC:jyn] Where are we supposed to find 200 volunteers?
[NPC:elenion] Seed planets. There are always people looking for a fresh start.
[NPC:jyn] Transport costs are brutal right now.
[NPC:elenion] Use a colony ship. Slower but the cargo capacity makes up for it.`,
  },
  {
    id: "eavesdrop_08",
    filename: "eavesdrop_08.mp3",
    speakers: ["raxus", "shade"],
    script: `[NPC:raxus] The target was last seen near the starmall in the northern sectors.
[NPC:shade] Armed?
[NPC:raxus] Shadow Runner class. Cloaking capability. You won't see them coming.
[NPC:shade] Then I'll use sector probes. Can't cloak from those.
[NPC:raxus] Smart. The bounty is 5,000 credits. Dead or alive.`,
  },
  {
    id: "eavesdrop_09",
    filename: "eavesdrop_09.mp3",
    speakers: ["valandor", "professor_thane"],
    script: `[NPC:valandor] The Spore Network once connected every living world in this galaxy.
[NPC:professor_thane] Connected how?
[NPC:valandor] Mycelial filaments — microscopic threads running through subspace. Information traveled faster than light.
[NPC:professor_thane] And it's gone now?
[NPC:valandor] Not gone. Dormant. Some nodes still pulse if you know where to scan.`,
  },
  {
    id: "eavesdrop_10",
    filename: "eavesdrop_10.mp3",
    speakers: ["caelum", "doc_helix"],
    script: `[NPC:caelum] Your weapon energy coupling is shot. I can fix it, but it'll cost.
[NPC:doc_helix] How much?
[NPC:caelum] Less than a new ship. The starmall garage has upgrade slots for a reason.
[NPC:doc_helix] Can I stack weapon upgrades?
[NPC:caelum] Up to three per slot. Diminishing returns after the first, but still worth it.`,
  },
];

/**
 * Voice map for new voices needed (to be filled in with ElevenLabs voice IDs).
 * Existing voices are already in generate-narration-multivoice.ts VOICE_MAP.
 */
export const NEW_VOICES_NEEDED = {
  rookie: "PLACEHOLDER — young, nervous, uncertain male voice",
  bartender: "PLACEHOLDER — warm, gruff, seen-it-all barkeep voice",
  prospector: "PLACEHOLDER — rough, working-class, gravelly male voice",
};
