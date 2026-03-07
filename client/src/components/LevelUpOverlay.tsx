import { useEffect, useRef, useState } from "react";

interface LevelUpOverlayProps {
  level: number;
  rank: string;
}

export default function LevelUpOverlay({ level, rank }: LevelUpOverlayProps) {
  const [show, setShow] = useState(false);
  const [displayLevel, setDisplayLevel] = useState(0);
  const [displayRank, setDisplayRank] = useState("");
  const prevLevel = useRef(level);

  useEffect(() => {
    // Only trigger on a real level change, not initial load
    // prevLevel must already be a real value (> 0) to count as a level-up
    if (prevLevel.current > 0 && level > prevLevel.current) {
      setDisplayLevel(level);
      setDisplayRank(rank);
      setShow(true);
      const timer = setTimeout(() => setShow(false), 4000);
      prevLevel.current = level;
      return () => clearTimeout(timer);
    }
    prevLevel.current = level;
  }, [level, rank]);

  if (!show) return null;

  return (
    <div className="level-up-overlay" onClick={() => setShow(false)}>
      <div className="level-up-overlay__content">
        <div className="level-up-overlay__burst" />
        <div className="level-up-overlay__title">LEVEL UP!</div>
        <div className="level-up-overlay__level">{displayLevel}</div>
        <div className="level-up-overlay__rank">{displayRank}</div>
        <div className="level-up-overlay__hint">Click to dismiss</div>
      </div>
    </div>
  );
}
