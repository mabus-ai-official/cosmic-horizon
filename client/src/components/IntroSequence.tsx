import { useState, useEffect, useCallback, useRef } from "react";
import {
  ASCII_COSMIC_HORIZON,
  ASCII_WORMHOLE,
  ASCII_EXPLOSION,
  ASCII_GALAXY,
  ASCII_SHIP,
} from "../config/ascii-art";

export interface LoreBeat {
  text: string;
  pause?: number;
  ascii?: string;
}

interface IntroSequenceProps {
  beats: LoreBeat[];
  onComplete: () => void;
  title?: string;
  buttonLabel?: string;
  trackId?: string;
  onTrackRequest?: (trackId: string) => void;
  onAudioResume?: () => void;
  narrationUrls?: string[];
  narrationEnabled?: boolean;
  narrationVolume?: number;
  setVolumeMultiplier?: (m: number) => void;
}

const CHAR_DELAY = 30;
const DUCK_VOLUME = 0.3;

export const INTRO_BEATS: LoreBeat[] = [
  {
    text: "On the other side of the Cosmos, in a corner of the Agaricalis system, lived an advanced race of humanoids known as the Muscarians.",
    ascii: ASCII_COSMIC_HORIZON,
  },
  {
    text: "After picking up a curious signal from their home planet, the Muscarians launched a mission to investigate. The source: an artificial wormhole, created by an alien race of avid explorers known as the Vedic.",
  },
  {
    text: "The Vedic introduced them to cyrillium -- a power source capable of providing a great leap forward to Muscarian space travel. Within years, ships capable of traversing galaxies were built.",
    ascii: ASCII_WORMHOLE,
  },
  {
    text: "The Vedic invited the Muscarians to use their wormhole to access the Calvatian Galaxy, where cyrillium is plentiful. With good money to be made, those with the resources headed through in private ships.",
  },
  {
    text: "In the massive Calvatian Galaxy, the Muscarians were not alone. Kalin warships and Tar'ri merchant caravans also traversed this space, collecting cyrillium and transporting it to their homeworlds.",
  },
  {
    text: "Tensions escalated when a Kalin ship discovered the wormhole to Agaricalis. The Muscarian Central Authority hatched a plan: destroy the Kalin wormhole and fortify their own.",
  },
  {
    text: "The Kalin retaliated. A partisan pilot flew a captured freighter overloaded with volatile cyrillium into the Muscarian wormhole and detonated it. Both connections home were severed.",
    ascii: ASCII_EXPLOSION,
  },
  {
    text: "Decades of conflict followed. The Muscarian Central Authority weakened. The Tar'ri established outposts and trade routes. The Vedic settled into quiet observation. The Kalin splintered into rival clans.",
  },
  {
    text: "A ceasefire was established -- not from peace, but exhaustion. Syndicates rose where governments fell. Only a handful of protected sectors remain under Central Authority patrol.",
    ascii: ASCII_GALAXY,
  },
  {
    text: "Today all races coexist in the Calvatian quadrant together, with an expected mixture of conflict and alliance. Stranded in this strange new world, you set out to carve a piece of the galaxy for yourself.",
    pause: 1500,
  },
];

export const POST_TUTORIAL_BEATS: LoreBeat[] = [
  {
    text: "You've learned the basics, pilot. But the basics won't keep you alive out here.",
  },
  {
    text: "You begin at a Star Mall, where you can purchase and equip ships. Once equipped, you may explore the vast, uncharted reaches of the galaxy.",
  },
  {
    text: "As you travel to new sectors, your navigational computer logs your path, gradually constructing a cosmic map. Through exploration, you'll discover profitable outposts and strategically significant sectors.",
  },
  {
    text: "Outposts value commodities differently based on supply and demand. By buying low and selling high between ports -- celestial arbitrage -- you can build a fortune.",
  },
  {
    text: "Planets can be claimed and developed. Collect colonists from seed planets, deposit them on your worlds, and upgrade them into fortified strongholds producing valuable resources.",
  },
  {
    text: "You will encounter other pilots. Attack them, ignore them, or form syndicates -- alliances that collectively hold planets, funds, and strategic defenses.",
  },
  {
    text: "The galaxy has no ruler. Will you dominate through force, trade your way to fortune, build a planetary empire, or forge alliances that reshape the frontier?",
  },
  {
    text: "The ceasefire holds. For now.",
    pause: 2000,
    ascii: ASCII_SHIP,
  },
];

export default function IntroSequence({
  beats,
  onComplete,
  title,
  buttonLabel,
  trackId,
  onTrackRequest,
  onAudioResume,
  narrationUrls,
  narrationEnabled = true,
  narrationVolume = 1,
  setVolumeMultiplier,
}: IntroSequenceProps) {
  const [currentBeat, setCurrentBeat] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [skipAll, setSkipAll] = useState(false);
  const [narrationPlaying, setNarrationPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const typingDoneRef = useRef(false);
  const narrationDoneRef = useRef(false);
  const narrationVolumeRef = useRef(narrationVolume);

  // Keep volume ref in sync
  useEffect(() => {
    narrationVolumeRef.current = narrationVolume;
    if (audioRef.current) {
      audioRef.current.volume = narrationVolume;
    }
  }, [narrationVolume]);

  // Request audio track on mount
  useEffect(() => {
    if (trackId && onTrackRequest) {
      onTrackRequest(trackId);
    }
  }, [trackId, onTrackRequest]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setVolumeMultiplier?.(1.0);
    };
  }, [setVolumeMultiplier]);

  const stopNarration = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setNarrationPlaying(false);
    setVolumeMultiplier?.(1.0);
  }, [setVolumeMultiplier]);

  // Check if both typing and narration are done → auto-advance
  const checkAutoAdvance = useCallback(() => {
    if (typingDoneRef.current && narrationDoneRef.current) {
      // Both done — auto-advance after beat's pause (or 1s default)
      const beat = beats[currentBeat];
      const delay = beat?.pause || 1000;
      setTimeout(() => {
        setCurrentBeat((prev) => prev + 1);
      }, delay);
    }
  }, [currentBeat, beats]);

  // Play narration for current beat
  useEffect(() => {
    if (currentBeat >= beats.length) return;
    if (skipAll) return;

    typingDoneRef.current = false;
    narrationDoneRef.current = false;

    const url = narrationUrls?.[currentBeat];
    if (!url || !narrationEnabled) {
      narrationDoneRef.current = true;
      return;
    }

    // Stop previous
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(url);
    audio.volume = narrationVolumeRef.current;
    audioRef.current = audio;

    audio.addEventListener("ended", () => {
      setNarrationPlaying(false);
      narrationDoneRef.current = true;
      audioRef.current = null;
      setVolumeMultiplier?.(1.0);
      checkAutoAdvance();
    });

    audio.addEventListener("error", () => {
      setNarrationPlaying(false);
      narrationDoneRef.current = true;
      audioRef.current = null;
      setVolumeMultiplier?.(1.0);
      checkAutoAdvance();
    });

    setVolumeMultiplier?.(DUCK_VOLUME);
    setNarrationPlaying(true);
    audio.play().catch(() => {
      setNarrationPlaying(false);
      narrationDoneRef.current = true;
      setVolumeMultiplier?.(1.0);
      checkAutoAdvance();
    });
  }, [
    currentBeat,
    beats.length,
    skipAll,
    narrationUrls,
    narrationEnabled,
    setVolumeMultiplier,
    checkAutoAdvance,
  ]);

  // Typewriter effect
  useEffect(() => {
    if (currentBeat >= beats.length) return;
    if (skipAll) return;

    const fullText = beats[currentBeat].text;
    let charIndex = 0;
    setDisplayedText("");
    setIsTyping(true);

    const interval = setInterval(() => {
      charIndex++;
      if (charIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, charIndex));
      } else {
        clearInterval(interval);
        setIsTyping(false);
        typingDoneRef.current = true;
        checkAutoAdvance();
      }
    }, CHAR_DELAY);

    return () => clearInterval(interval);
  }, [currentBeat, beats, skipAll, checkAutoAdvance]);

  const handleSkipAll = useCallback(() => {
    stopNarration();
    setSkipAll(true);
    setIsTyping(false);
    setCurrentBeat(beats.length);
    setDisplayedText("");
  }, [beats.length, stopNarration]);

  // Start narration for a specific beat (used on first user interaction)
  const startBeatNarration = useCallback(
    (beatIndex: number) => {
      const url = narrationUrls?.[beatIndex];
      if (!url || !narrationEnabled) return;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      const audio = new Audio(url);
      audio.volume = narrationVolumeRef.current;
      audioRef.current = audio;
      audio.addEventListener("ended", () => {
        setNarrationPlaying(false);
        narrationDoneRef.current = true;
        audioRef.current = null;
        setVolumeMultiplier?.(1.0);
        checkAutoAdvance();
      });
      audio.addEventListener("error", () => {
        setNarrationPlaying(false);
        narrationDoneRef.current = true;
        audioRef.current = null;
        setVolumeMultiplier?.(1.0);
        checkAutoAdvance();
      });
      setVolumeMultiplier?.(DUCK_VOLUME);
      setNarrationPlaying(true);
      narrationDoneRef.current = false;
      audio.play().catch(() => {
        setNarrationPlaying(false);
        narrationDoneRef.current = true;
        setVolumeMultiplier?.(1.0);
        checkAutoAdvance();
      });
    },
    [narrationUrls, narrationEnabled, setVolumeMultiplier, checkAutoAdvance],
  );

  const advance = useCallback(() => {
    if (skipAll) return;

    if (isTyping) {
      // Skip current typewriter, show full text immediately
      setDisplayedText(beats[currentBeat].text);
      setIsTyping(false);
      typingDoneRef.current = true;
      checkAutoAdvance();
      return;
    }

    // If narration is still playing, skip it and advance
    if (narrationPlaying) {
      stopNarration();
      narrationDoneRef.current = true;
    }

    // Move to next beat
    setCurrentBeat((prev) => prev + 1);
  }, [
    isTyping,
    currentBeat,
    beats,
    skipAll,
    narrationPlaying,
    stopNarration,
    checkAutoAdvance,
    startBeatNarration,
  ]);

  const isFinished = currentBeat >= beats.length;
  const activeBeat = !isFinished ? beats[currentBeat] : null;

  return (
    <div
      className="intro-sequence"
      onClick={
        !isFinished
          ? () => {
              onAudioResume?.();
              advance();
            }
          : undefined
      }
    >
      <div className="intro-sequence__container">
        {title && <h2 className="intro-sequence__title">{title}</h2>}
        <div className="intro-sequence__text">
          {activeBeat && (
            <div className="intro-sequence__beat intro-sequence__beat--active">
              {activeBeat.ascii && (
                <pre className="intro-sequence__ascii">{activeBeat.ascii}</pre>
              )}
              <p>
                {displayedText}
                {isTyping && <span className="intro-sequence__cursor">_</span>}
              </p>
            </div>
          )}
        </div>
        <div className="intro-sequence__controls">
          {!isFinished ? (
            <>
              <span className="intro-sequence__prompt">
                {narrationPlaying
                  ? "Listening... click to skip"
                  : isTyping
                    ? "Click to skip text..."
                    : "Click to continue..."}
              </span>
              {narrationPlaying && (
                <button
                  className="intro-sequence__skip"
                  onClick={(e) => {
                    e.stopPropagation();
                    stopNarration();
                    narrationDoneRef.current = true;
                    checkAutoAdvance();
                  }}
                >
                  Skip Narration
                </button>
              )}
              <button
                className="intro-sequence__skip"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkipAll();
                }}
              >
                Skip All
              </button>
            </>
          ) : (
            <button
              className="intro-sequence__continue"
              onClick={(e) => {
                e.stopPropagation();
                onComplete();
              }}
            >
              {buttonLabel || "ENTER THE GALAXY"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
