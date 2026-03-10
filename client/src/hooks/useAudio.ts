import { useRef, useState, useCallback, useEffect } from "react";
import {
  AUDIO_TRACKS,
  GAMEPLAY_TRACKS,
  STARMALL_TRACKS,
  type AudioTrack,
} from "../config/audio-tracks";
import { SFX, type SfxId } from "../config/sfx";

const FADE_DURATION = 1000; // ms
const FADE_STEPS = 20;
const STORAGE_KEY_MUTED = "cosmic-horizon-muted";
const STORAGE_KEY_VOLUME = "cosmic-horizon-volume";
const STORAGE_KEY_SFX_VOLUME = "cosmic-horizon-sfx-volume";

// External mood-based track filter — when set, gameplay next-track picks from this subset
let moodTrackFilter: AudioTrack[] | null = null;
// External volume multiplier (e.g., silence/bliss state)
let externalVolumeMultiplier = 1.0;

// Track whether user has interacted with the page (for autoplay policy)
let userHasInteracted = false;
let interactionCallback: (() => void) | null = null;

function onFirstInteraction() {
  userHasInteracted = true;
  if (interactionCallback) {
    interactionCallback();
    interactionCallback = null;
  }
  document.removeEventListener("click", onFirstInteraction);
  document.removeEventListener("keydown", onFirstInteraction);
}
document.addEventListener("click", onFirstInteraction);
document.addEventListener("keydown", onFirstInteraction);

function getStoredMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_MUTED) === "true";
  } catch {
    return false;
  }
}

function getStoredVolume(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY_VOLUME);
    return v ? parseFloat(v) : 1;
  } catch {
    return 1;
  }
}

function getStoredSfxVolume(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY_SFX_VOLUME);
    return v ? parseFloat(v) : 0.7;
  } catch {
    return 0.7;
  }
}

function pickRandom(tracks: AudioTrack[], lastId: string | null): AudioTrack {
  if (tracks.length === 1) return tracks[0];
  const candidates = tracks.filter((t) => t.id !== lastId);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function getPlaylistForContext(contextId: string): AudioTrack[] | null {
  if (contextId === "gameplay") return GAMEPLAY_TRACKS;
  if (contextId === "starmall") return STARMALL_TRACKS;
  return null;
}

function resolveTrack(
  trackId: string,
):
  | { track: AudioTrack; isPlaylist: false }
  | { track: AudioTrack; isPlaylist: true; playlist: AudioTrack[] }
  | null {
  const playlist = getPlaylistForContext(trackId);
  if (playlist) {
    if (playlist.length === 0) return null;
    const picked = pickRandom(playlist, null);
    return { track: picked, isPlaylist: true, playlist };
  }
  const found = AUDIO_TRACKS.find((t) => t.id === trackId);
  return found ? { track: found, isPlaylist: false } : null;
}

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentContextRef = useRef<string | null>(null);
  const currentTrackIdRef = useRef<string | null>(null);
  const pendingPlayRef = useRef<boolean>(false);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onEndedRef = useRef<(() => void) | null>(null);
  const [muted, setMuted] = useState(getStoredMuted);
  const [volume, setVolumeState] = useState(getStoredVolume);
  const [sfxVolume, setSfxVolumeState] = useState(getStoredSfxVolume);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [currentContext, setCurrentContext] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const trackHistoryRef = useRef<string[]>([]);
  const mutedRef = useRef(muted);
  const volumeRef = useRef(volume);
  const sfxVolumeRef = useRef(sfxVolume);

  // Keep refs in sync with state
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);
  useEffect(() => {
    sfxVolumeRef.current = sfxVolume;
  }, [sfxVolume]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
      if (audioRef.current) {
        if (onEndedRef.current)
          audioRef.current.removeEventListener("ended", onEndedRef.current);
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const fadeIn = useCallback(
    (audio: HTMLAudioElement, targetVolume: number) => {
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);

      const stepTime = FADE_DURATION / FADE_STEPS;
      const volumeStep = targetVolume / FADE_STEPS;
      let currentVol = 0;

      fadeTimerRef.current = setInterval(() => {
        currentVol += volumeStep;
        if (currentVol >= targetVolume) {
          audio.volume = targetVolume;
          if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
          fadeTimerRef.current = null;
        } else {
          audio.volume = currentVol;
        }
      }, stepTime);
    },
    [],
  );

  const fadeOut = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const audio = audioRef.current;
      if (!audio || audio.paused) {
        resolve();
        return;
      }

      const stepTime = FADE_DURATION / FADE_STEPS;
      const volumeStep = audio.volume / FADE_STEPS;

      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);

      fadeTimerRef.current = setInterval(() => {
        if (audio.volume > volumeStep) {
          audio.volume = Math.max(0, audio.volume - volumeStep);
        } else {
          audio.volume = 0;
          audio.pause();
          if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
          fadeTimerRef.current = null;
          resolve();
        }
      }, stepTime);
    });
  }, []);

  const startTrack = useCallback(
    async (
      track: AudioTrack,
      isPlaylist: boolean,
      mutedVal: boolean,
      volumeVal: number,
      playlist?: AudioTrack[],
    ) => {
      // Clean up previous audio element completely
      if (audioRef.current) {
        if (onEndedRef.current) {
          audioRef.current.removeEventListener("ended", onEndedRef.current);
          onEndedRef.current = null;
        }
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }

      const audio = new Audio(track.src);
      audio.loop = track.loop;
      audio.volume = 0;
      audio.muted = mutedVal;
      audioRef.current = audio;
      // Push previous track to history before switching
      if (currentTrackIdRef.current && currentTrackIdRef.current !== track.id) {
        trackHistoryRef.current = [
          ...trackHistoryRef.current.slice(-19),
          currentTrackIdRef.current,
        ];
      }
      currentTrackIdRef.current = track.id;
      setCurrentTrackId(track.id);
      setPaused(false);

      const targetVolume = track.volume * volumeVal * externalVolumeMultiplier;

      // For playlist tracks, listen for 'ended' to crossfade to next
      // Read current muted/volume from refs to avoid stale closure values
      if (isPlaylist && playlist) {
        const onEnded = () => {
          // Use mood-filtered subset for gameplay, full playlist otherwise
          const pickFrom =
            moodTrackFilter &&
            moodTrackFilter.length > 0 &&
            playlist === GAMEPLAY_TRACKS
              ? moodTrackFilter
              : playlist;
          const next = pickRandom(pickFrom, track.id);
          startTrack(next, true, mutedRef.current, volumeRef.current, playlist);
        };
        onEndedRef.current = onEnded;
        audio.addEventListener("ended", onEnded);
      }

      try {
        await audio.play();
        pendingPlayRef.current = false;
      } catch {
        pendingPlayRef.current = true;
        return;
      }

      fadeIn(audio, targetVolume);
    },
    [fadeIn],
  );

  const playInternal = useCallback(
    async (contextId: string) => {
      // Already playing this context and audio is active
      if (
        currentContextRef.current === contextId &&
        audioRef.current &&
        !audioRef.current.paused
      )
        return;

      const resolved = resolveTrack(contextId);
      if (!resolved) return;

      // Fade out current track
      await fadeOut();

      currentContextRef.current = contextId;
      setCurrentContext(contextId);
      pendingPlayRef.current = false;
      // Read current muted/volume from refs to avoid stale closure values
      await startTrack(
        resolved.track,
        resolved.isPlaylist,
        mutedRef.current,
        volumeRef.current,
        resolved.isPlaylist ? resolved.playlist : undefined,
      );
    },
    [fadeOut, startTrack],
  );

  const play = useCallback(
    async (contextId: string) => {
      if (!userHasInteracted) {
        // Defer until first user interaction
        interactionCallback = () => playInternal(contextId);
        return;
      }
      await playInternal(contextId);
    },
    [playInternal],
  );

  // Call resume() from a user interaction (click) to unblock autoplay
  const resume = useCallback(async () => {
    if (!pendingPlayRef.current) return;

    const audio = audioRef.current;
    const trackId = currentTrackIdRef.current;
    if (!audio || !trackId) return;

    // Find the track in any list
    const track =
      AUDIO_TRACKS.find((t) => t.id === trackId) ||
      GAMEPLAY_TRACKS.find((t) => t.id === trackId) ||
      STARMALL_TRACKS.find((t) => t.id === trackId);
    if (!track) return;

    try {
      await audio.play();
      pendingPlayRef.current = false;
      fadeIn(audio, track.volume * volume);
    } catch {
      // Still blocked
    }
  }, [volume, fadeIn]);

  const stop = useCallback(async () => {
    if (audioRef.current && onEndedRef.current) {
      audioRef.current.removeEventListener("ended", onEndedRef.current);
      onEndedRef.current = null;
    }
    await fadeOut();
    currentContextRef.current = null;
    setCurrentContext(null);
    currentTrackIdRef.current = null;
    setCurrentTrackId(null);
    audioRef.current = null;
    pendingPlayRef.current = false;
  }, [fadeOut]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    try {
      localStorage.setItem(STORAGE_KEY_VOLUME, String(clamped));
    } catch {}
    if (audioRef.current && currentTrackIdRef.current) {
      const track =
        AUDIO_TRACKS.find((t) => t.id === currentTrackIdRef.current) ||
        GAMEPLAY_TRACKS.find((t) => t.id === currentTrackIdRef.current) ||
        STARMALL_TRACKS.find((t) => t.id === currentTrackIdRef.current);
      if (track) {
        audioRef.current.volume =
          track.volume * clamped * externalVolumeMultiplier;
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_MUTED, String(next));
      } catch {}
      if (audioRef.current) {
        audioRef.current.muted = next;
      }
      return next;
    });
  }, []);

  const skip = useCallback(async () => {
    const playlist = getPlaylistForContext(currentContextRef.current || "");
    if (!playlist || playlist.length < 2) return;

    if (audioRef.current && onEndedRef.current) {
      audioRef.current.removeEventListener("ended", onEndedRef.current);
      onEndedRef.current = null;
    }

    await fadeOut();

    const next = pickRandom(playlist, currentTrackIdRef.current);
    await startTrack(next, true, mutedRef.current, volumeRef.current, playlist);
  }, [fadeOut, startTrack]);

  const previous = useCallback(async () => {
    const playlist = getPlaylistForContext(currentContextRef.current || "");
    if (!playlist) return;
    if (trackHistoryRef.current.length === 0) return;

    const prevId = trackHistoryRef.current[trackHistoryRef.current.length - 1];
    trackHistoryRef.current = trackHistoryRef.current.slice(0, -1);

    const prevTrack = playlist.find((t) => t.id === prevId);
    if (!prevTrack) return;

    if (audioRef.current && onEndedRef.current) {
      audioRef.current.removeEventListener("ended", onEndedRef.current);
      onEndedRef.current = null;
    }

    await fadeOut();
    await startTrack(
      prevTrack,
      true,
      mutedRef.current,
      volumeRef.current,
      playlist,
    );
  }, [fadeOut, startTrack]);

  const togglePause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch(() => {});
      setPaused(false);
    } else {
      audio.pause();
      setPaused(true);
    }
  }, []);

  const setMoodTracks = useCallback((tracks: AudioTrack[] | null) => {
    moodTrackFilter = tracks;
  }, []);

  const setVolumeMultiplier = useCallback((multiplier: number) => {
    externalVolumeMultiplier = Math.max(0, Math.min(1, multiplier));
    // Apply immediately to current audio
    if (audioRef.current && currentTrackIdRef.current) {
      const track =
        AUDIO_TRACKS.find((t) => t.id === currentTrackIdRef.current) ||
        GAMEPLAY_TRACKS.find((t) => t.id === currentTrackIdRef.current) ||
        STARMALL_TRACKS.find((t) => t.id === currentTrackIdRef.current);
      if (track) {
        audioRef.current.volume =
          track.volume * volumeRef.current * externalVolumeMultiplier;
      }
    }
  }, []);

  // Play a short one-shot sound effect (does not interrupt music)
  const playSfx = useCallback((src: string, baseVolume = 0.5) => {
    if (mutedRef.current) return;
    try {
      const audio = new Audio(src);
      audio.volume =
        baseVolume * sfxVolumeRef.current * externalVolumeMultiplier;
      audio.play().catch(() => {});
    } catch {
      // SFX failure is non-critical
    }
  }, []);

  // Play a typed SFX by key (picks random variant)
  const sfx = useCallback(
    (id: SfxId) => {
      const def = SFX[id];
      if (!def) return;
      const src = def.src[Math.floor(Math.random() * def.src.length)];
      playSfx(src, def.volume);
    },
    [playSfx],
  );

  const setSfxVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setSfxVolumeState(clamped);
    try {
      localStorage.setItem(STORAGE_KEY_SFX_VOLUME, String(clamped));
    } catch {}
  }, []);

  const activePlaylist = getPlaylistForContext(currentContext || "");
  const canSkip = !!activePlaylist && activePlaylist.length > 1;
  const canPrevious = !!activePlaylist && trackHistoryRef.current.length > 0;

  return {
    play,
    stop,
    resume,
    skip,
    previous,
    togglePause,
    canSkip,
    canPrevious,
    paused,
    setVolume,
    muted,
    toggleMute,
    volume,
    currentTrackId,
    setMoodTracks,
    setVolumeMultiplier,
    playSfx,
    sfx,
    sfxVolume,
    setSfxVolume,
  };
}
