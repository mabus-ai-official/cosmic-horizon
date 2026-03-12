import { memo } from "react";
import { SPRITES } from "../config/pixel-sprites";

interface Props {
  spriteKey: string;
  size?: number;
  className?: string;
  title?: string;
}

function PixelSprite({ spriteKey, size = 16, className, title }: Props) {
  const def = SPRITES[spriteKey];
  if (!def) return null;

  const rects: React.ReactNode[] = [];
  for (let y = 0; y < def.rows; y++) {
    for (let x = 0; x < def.cols; x++) {
      const idx = def.grid[y][x];
      if (idx === 0) continue;
      const fill = def.palette[idx];
      if (!fill) continue;
      rects.push(
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />,
      );
    }
  }

  return (
    <svg
      className={`pixel-sprite${className ? ` ${className}` : ""}`}
      viewBox={`0 0 ${def.cols} ${def.rows}`}
      width={size}
      height={size}
      style={{
        imageRendering: "pixelated",
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
      }}
      aria-label={title}
    >
      {rects}
    </svg>
  );
}

export default memo(PixelSprite);
