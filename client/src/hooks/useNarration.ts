import { useRef, useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "cosmic-horizon-narration-enabled";
const STORAGE_KEY_VOLUME = "cosmic-horizon-narration-volume";
const DUCK_VOLUME = 0.5;

function getStoredEnabled(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === "true";
  } catch {
    return true;
  }
}

function getStoredNarrationVolume(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY_VOLUME);
    return v ? parseFloat(v) : 1;
  } catch {
    return 1;
  }
}

export function useNarration(setVolumeMultiplier: (m: number) => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [narrationEnabled, setNarrationEnabledState] =
    useState(getStoredEnabled);
  const [narrationVolume, setNarrationVolumeState] = useState(
    getStoredNarrationVolume,
  );
  const narrationVolumeRef = useRef(narrationVolume);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setVolumeMultiplier(1.0);
  }, [setVolumeMultiplier]);

  const playNarration = useCallback(
    (url: string) => {
      // Stop any existing narration
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(url);
      audio.volume = narrationVolumeRef.current;
      audioRef.current = audio;

      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setVolumeMultiplier(1.0);
        audioRef.current = null;
      });

      audio.addEventListener("error", () => {
        setIsPlaying(false);
        setVolumeMultiplier(1.0);
        audioRef.current = null;
      });

      // Duck background music
      setVolumeMultiplier(DUCK_VOLUME);
      setIsPlaying(true);

      audio.play().catch(() => {
        // Autoplay blocked — clean up
        setIsPlaying(false);
        setVolumeMultiplier(1.0);
        audioRef.current = null;
      });
    },
    [setVolumeMultiplier],
  );

  const skipNarration = useCallback(() => {
    stopAudio();
  }, [stopAudio]);

  const setNarrationEnabled = useCallback((enabled: boolean) => {
    setNarrationEnabledState(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {}
  }, []);

  const setNarrationVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setNarrationVolumeState(clamped);
    narrationVolumeRef.current = clamped;
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    try {
      localStorage.setItem(STORAGE_KEY_VOLUME, String(clamped));
    } catch {}
  }, []);

  return {
    playNarration,
    skipNarration,
    isPlaying,
    narrationEnabled,
    setNarrationEnabled,
    narrationVolume,
    setNarrationVolume,
  };
}
