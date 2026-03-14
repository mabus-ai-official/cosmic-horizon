import { useRef, useEffect, useCallback, useState } from "react";

interface RoundStartData {
  round: number;
  sweetSpotPositions?: number[];
  barSpeed?: number;
  roundConfig?: any;
  effects: any[];
}

interface PhaserGameWrapperProps {
  gameType: string;
  roundStart: RoundStartData;
  onRoundComplete: (result: any) => Promise<any>;
}

export default function PhaserGameWrapper({
  gameType,
  roundStart,
  onRoundComplete,
}: PhaserGameWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  const handleRoundComplete = useCallback(
    (result: any) => {
      onRoundComplete(result);
    },
    [onRoundComplete],
  );

  useEffect(() => {
    let destroyed = false;

    async function initPhaser() {
      if (!containerRef.current) return;

      const Phaser = await import("phaser");

      let SceneClass: any;
      if (gameType === "turret_defense") {
        const mod = await import("./games/turret-defense/TurretDefenseScene");
        SceneClass = mod.TurretDefenseScene;
      } else if (gameType === "nebula_runner") {
        const mod = await import("./games/nebula-runner/NebulaRunnerScene");
        SceneClass = mod.NebulaRunnerScene;
      } else if (gameType === "cargo_tetris") {
        const mod = await import("./games/cargo-tetris/CargoTetrisScene");
        SceneClass = mod.CargoTetrisScene;
      } else {
        const mod = await import("./games/asteroid-mining/AsteroidMiningScene");
        SceneClass = mod.AsteroidMiningScene;
      }

      if (destroyed) return;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: 800,
        height: 500,
        backgroundColor: "#0a0e14",
        scene: [SceneClass],
        physics: { default: "arcade" },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        audio: { noAudio: true },
      };

      const game = new Phaser.Game(config);
      gameRef.current = game;

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
