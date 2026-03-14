import { memo, useMemo } from "react";

const CHARS = "0123456789ABCDEF.:+*#";
const COLUMN_COUNT = 14;
const ROWS_PER_COLUMN = 12;

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

/** Generates a single column of falling characters */
function buildColumn(index: number) {
  const chars: string[] = [];
  for (let i = 0; i < ROWS_PER_COLUMN; i++) {
    chars.push(randomChar());
  }
  const left =
    (index / COLUMN_COUNT) * 100 + Math.random() * (100 / COLUMN_COUNT);
  const duration = 8 + Math.random() * 12; // 8–20s
  const delay = -(Math.random() * 20); // staggered start
  const opacity = 0.025 + Math.random() * 0.035; // 0.025–0.06

  return { chars, left, duration, delay, opacity, key: index };
}

function DataStreamRain() {
  const columns = useMemo(
    () => Array.from({ length: COLUMN_COUNT }, (_, i) => buildColumn(i)),
    [],
  );

  return (
    <div className="data-rain" aria-hidden="true">
      {columns.map((col) => (
        <div
          key={col.key}
          className="data-rain__col"
          style={{
            left: `${col.left}%`,
            animationDuration: `${col.duration}s`,
            animationDelay: `${col.delay}s`,
            opacity: col.opacity,
          }}
        >
          {col.chars.map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

export default memo(DataStreamRain);
