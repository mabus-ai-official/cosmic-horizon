import { useState, useCallback, useRef, useEffect } from "react";

// Fibonacci durations in seconds for each drink level
const FIB_DURATIONS = [5, 8, 13, 21, 34, 55, 89, 144];

// Seconds per intensity level during wind-down
const FADE_STEP_SECONDS = 3;

function getFibDuration(drinkCount: number): number {
  if (drinkCount <= 0) return 0;
  const idx = Math.min(drinkCount - 1, FIB_DURATIONS.length - 1);
  return FIB_DURATIONS[idx];
}

export function useDrunkEffect() {
  const [drinkCount, setDrinkCount] = useState(0);
  const [intensity, setIntensity] = useState(0); // 0 = sober, 1-6+ = drunk levels
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number>(0);
  const peakLevelRef = useRef(0);
  const fadingRef = useRef(false);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = useCallback((durationSec: number, level: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    fadingRef.current = false;

    // Reserve time at the end for gradual fade-out (3s per level to step down)
    const fadeTime = Math.min(level, 6) * FADE_STEP_SECONDS;
    const peakTime = Math.max(durationSec - fadeTime, durationSec * 0.5);
    const fadeStart = Date.now() + peakTime * 1000;
    const endTime = Date.now() + durationSec * 1000;
    endTimeRef.current = endTime;
    peakLevelRef.current = Math.min(level, 6);
    setIntensity(Math.min(level, 6));
    setTimeLeft(durationSec);

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(
        0,
        Math.ceil((endTimeRef.current - now) / 1000),
      );
      setTimeLeft(remaining);

      if (remaining <= 0) {
        // Fully sober
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setIntensity(0);
        setDrinkCount(0);
        peakLevelRef.current = 0;
        fadingRef.current = false;
        return;
      }

      // Gradual wind-down: step intensity down as we approach the end
      if (now >= fadeStart) {
        fadingRef.current = true;
        const fadeRemaining = (endTimeRef.current - now) / 1000;
        const peakLevel = peakLevelRef.current;
        // Map remaining fade time to intensity level
        const currentLevel = Math.max(
          1,
          Math.ceil((fadeRemaining / (fadeTime || 1)) * peakLevel),
        );
        setIntensity(currentLevel);
      }
    }, 250);
  }, []);

  const addDrink = useCallback(() => {
    setDrinkCount((prev) => {
      const newCount = prev + 1;
      const duration = getFibDuration(newCount);
      startTimer(duration, newCount);
      return newCount;
    });
  }, [startTimer]);

  return { drinkCount, intensity, timeLeft, addDrink };
}
