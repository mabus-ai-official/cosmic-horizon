export interface AudioTrack {
  id: string;
  src: string;
  volume: number;
  loop: boolean;
}

// Single-track contexts
export const AUDIO_TRACKS: AudioTrack[] = [
  { id: "intro", src: "/audio/intro.mp3", volume: 0.6, loop: true },
  {
    id: "post-tutorial",
    src: "/audio/post-tutorial.mp3",
    volume: 0.6,
    loop: true,
  },
  { id: "combat", src: "/audio/combat.mp3", volume: 0.7, loop: true },
];

// Gameplay playlist — shuffled with crossfade between tracks
export const GAMEPLAY_TRACKS: AudioTrack[] = [
  { id: "gameplay-1", src: "/audio/gameplay-1.mp3", volume: 0.5, loop: false },
  { id: "gameplay-2", src: "/audio/gameplay-2.mp3", volume: 0.5, loop: false },
  { id: "gameplay-3", src: "/audio/gameplay-3.mp3", volume: 0.5, loop: false },
  { id: "gameplay-4", src: "/audio/gameplay-4.mp3", volume: 0.5, loop: false },
  { id: "gameplay-5", src: "/audio/gameplay-5.mp3", volume: 0.5, loop: false },
  // Scott Buckley — CC-BY 4.0 — www.scottbuckley.com.au
  { id: "gameplay-6", src: "/audio/gameplay-6.mp3", volume: 0.5, loop: false }, // Decoherence
  { id: "gameplay-7", src: "/audio/gameplay-7.mp3", volume: 0.5, loop: false }, // Permafrost
  { id: "gameplay-8", src: "/audio/gameplay-8.mp3", volume: 0.5, loop: false }, // Shadows and Dust
  { id: "gameplay-9", src: "/audio/gameplay-9.mp3", volume: 0.5, loop: false }, // Aurora
  {
    id: "gameplay-10",
    src: "/audio/gameplay-10.mp3",
    volume: 0.5,
    loop: false,
  }, // Incantation
  {
    id: "gameplay-11",
    src: "/audio/gameplay-11.mp3",
    volume: 0.5,
    loop: false,
  }, // Cirrus
  {
    id: "gameplay-12",
    src: "/audio/gameplay-12.mp3",
    volume: 0.5,
    loop: false,
  }, // Hymn to the Dawn
  {
    id: "gameplay-13",
    src: "/audio/gameplay-13.mp3",
    volume: 0.5,
    loop: false,
  }, // Phase Shift
  {
    id: "gameplay-14",
    src: "/audio/gameplay-14.mp3",
    volume: 0.5,
    loop: false,
  }, // Echoes
  {
    id: "gameplay-15",
    src: "/audio/gameplay-15.mp3",
    volume: 0.5,
    loop: false,
  }, // Meanwhile
  {
    id: "gameplay-16",
    src: "/audio/gameplay-16.mp3",
    volume: 0.5,
    loop: false,
  }, // Effervescence
  {
    id: "gameplay-17",
    src: "/audio/gameplay-17.mp3",
    volume: 0.5,
    loop: false,
  }, // In Search of Solitude
  {
    id: "gameplay-18",
    src: "/audio/gameplay-18.mp3",
    volume: 0.5,
    loop: false,
  }, // Moonlight
  {
    id: "gameplay-19",
    src: "/audio/gameplay-19.mp3",
    volume: 0.5,
    loop: false,
  }, // First Snow
  {
    id: "gameplay-20",
    src: "/audio/gameplay-20.mp3",
    volume: 0.5,
    loop: false,
  }, // Hour of the Witch
  {
    id: "gameplay-21",
    src: "/audio/gameplay-21.mp3",
    volume: 0.5,
    loop: false,
  }, // Signal to Noise
  {
    id: "gameplay-22",
    src: "/audio/gameplay-22.mp3",
    volume: 0.5,
    loop: false,
  }, // Undertow
  {
    id: "gameplay-23",
    src: "/audio/gameplay-23.mp3",
    volume: 0.5,
    loop: false,
  }, // Hiraeth
  {
    id: "gameplay-24",
    src: "/audio/gameplay-24.mp3",
    volume: 0.5,
    loop: false,
  }, // Sanctuary
  {
    id: "gameplay-25",
    src: "/audio/gameplay-25.mp3",
    volume: 0.5,
    loop: false,
  }, // Balefire
];

// Star Mall playlist — cyberpunk/synthwave shuffled with crossfade
export const STARMALL_TRACKS: AudioTrack[] = [
  { id: "starmall-og", src: "/audio/starmall.mp3", volume: 0.5, loop: false },
  // Scott Buckley — CC-BY 4.0 — www.scottbuckley.com.au
  { id: "starmall-1", src: "/audio/starmall-1.mp3", volume: 0.5, loop: false }, // Neon
  { id: "starmall-2", src: "/audio/starmall-2.mp3", volume: 0.5, loop: false }, // Electric Dreams
  { id: "starmall-3", src: "/audio/starmall-3.mp3", volume: 0.5, loop: false }, // Red
  { id: "starmall-4", src: "/audio/starmall-4.mp3", volume: 0.5, loop: false }, // Machina
  { id: "starmall-5", src: "/audio/starmall-5.mp3", volume: 0.5, loop: false }, // Resonance
  { id: "starmall-6", src: "/audio/starmall-6.mp3", volume: 0.5, loop: false }, // Twilight Echo
  { id: "starmall-7", src: "/audio/starmall-7.mp3", volume: 0.5, loop: false }, // Tears in Rain
];

export type AudioContextId =
  | "intro"
  | "post-tutorial"
  | "combat"
  | "starmall"
  | "gameplay";
