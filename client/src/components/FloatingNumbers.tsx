import { useEffect, useRef, useState } from "react";

interface FloatingNumber {
  id: number;
  text: string;
  type: "xp" | "credits" | "loss";
}

let floatId = 0;

interface FloatingNumbersProps {
  xp: number;
  credits: number;
}

export default function FloatingNumbers({ xp, credits }: FloatingNumbersProps) {
  const [numbers, setNumbers] = useState<FloatingNumber[]>([]);
  const prevXp = useRef(xp);
  const prevCredits = useRef(credits);

  useEffect(() => {
    // Only show diffs after we've had real values (not the 0 → real transition on load)
    const hadRealValues = prevXp.current > 0 || prevCredits.current > 0;

    if (!hadRealValues) {
      prevXp.current = xp;
      prevCredits.current = credits;
      return;
    }

    const newNumbers: FloatingNumber[] = [];

    const xpDiff = xp - prevXp.current;
    if (xpDiff > 0) {
      newNumbers.push({
        id: floatId++,
        text: `+${xpDiff} XP`,
        type: "xp",
      });
    }

    const creditDiff = credits - prevCredits.current;
    if (creditDiff > 0) {
      newNumbers.push({
        id: floatId++,
        text: `+${creditDiff.toLocaleString()} cr`,
        type: "credits",
      });
    } else if (creditDiff < 0) {
      newNumbers.push({
        id: floatId++,
        text: `${creditDiff.toLocaleString()} cr`,
        type: "loss",
      });
    }

    prevXp.current = xp;
    prevCredits.current = credits;

    if (newNumbers.length > 0) {
      setNumbers((prev) => [...prev, ...newNumbers]);
      // Remove after animation completes
      setTimeout(() => {
        setNumbers((prev) =>
          prev.filter((n) => !newNumbers.some((nn) => nn.id === n.id)),
        );
      }, 1800);
    }
  }, [xp, credits]);

  if (numbers.length === 0) return null;

  return (
    <div className="floating-numbers">
      {numbers.map((n, i) => (
        <div
          key={n.id}
          className={`floating-number floating-number--${n.type}`}
          style={{ animationDelay: `${i * 0.15}s` }}
        >
          {n.text}
        </div>
      ))}
    </div>
  );
}
