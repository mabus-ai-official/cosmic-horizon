import { useRef, useEffect, useCallback, useState } from "react";

interface RoundStartData {
  round: number;
  sweetSpotPositions: number[];
  barSpeed: number;
  effects: any[];
}

interface PhaserGameWrapperProps {
  roundStart: RoundStartData;
  onRoundComplete: (hitTimings: number[]) => Promise<any>;
}

export default function PhaserGameWrapper({
  roundStart,
  onRoundComplete,
}: PhaserGameWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  const handleRoundComplete = useCallback(
    (hitTimings: number[]) => {
      onRoundComplete(hitTimings);
    },
    [onRoundComplete],
  );

  useEffect(() => {
    let destroyed = false;

    async function initPhaser() {
      if (!containerRef.current) return;

      const Phaser = await import("phaser");
      const { AsteroidMiningScene } =
        await import("./games/asteroid-mining/AsteroidMiningScene");

      if (destroyed) return;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: 800,
        height: 500,
        backgroundColor: "#0a0e14",
        scene: [AsteroidMiningScene],
        physics: { default: "arcade" },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        audio: { noAudio: true },
      };

      const game = new Phaser.Game(config);
      gameRef.current = game;

      // Pass round data to the scene via registry
      game.registry.set("roundStart", roundStart);
      game.registry.set("onRoundComplete", handleRoundComplete);

      setLoading(false);
    }

    initPhaser();

    return () => {
      destroyed = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // Update round data when it changes (new round)
  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.registry.set("roundStart", roundStart);
      gameRef.current.events.emit("newRound", roundStart);
    }
  }, [roundStart]);

  return (
    <div className="arcade-phaser-container">
      {loading && (
        <div className="arcade-phaser-loading">Loading game engine...</div>
      )}
      <div ref={containerRef} className="arcade-phaser-canvas" />
    </div>
  );
}
