import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import SectorSkybox from "./SectorSkybox";
import SceneLighting from "./SceneLighting";
import SectorObjects from "./SectorObjects";
import AtmosphereEffects from "./AtmosphereEffects";
import { CONTEXT_COLORS } from "./constants";

type Context = "ambient" | "combat" | "docked" | "danger" | "warp";

interface SectorState {
  sectorId: number;
  hasStarMall: boolean;
  planets: {
    id: string;
    name: string;
    planetClass: string;
    ownerId: string | null;
  }[];
  outposts: { id: string; name: string }[];
  players: { id: string; username: string }[];
}

interface SectorSceneProps {
  sector: SectorState | null;
  playerId: string;
  shipTypeId: string;
  context: Context;
  sectorType?: string;
  onPlanetClick?: (planetId: string) => void;
  onOutpostClick?: (outpostId: string) => void;
}

export default function SectorScene({
  sector,
  playerId,
  shipTypeId,
  context,
  sectorType,
  onPlanetClick,
  onOutpostClick,
}: SectorSceneProps) {
  const fogColor =
    CONTEXT_COLORS[context]?.fogColor || CONTEXT_COLORS.ambient.fogColor;

  return (
    <Canvas
      camera={{ position: [0, 8, 18], fov: 50 }}
      style={{ background: fogColor }}
      gl={{ antialias: true, alpha: false }}
    >
      <fog attach="fog" args={[fogColor, 80, 200]} />

      <SceneLighting context={context} />
      <SectorSkybox />
      <AtmosphereEffects context={context} sectorType={sectorType} />

      <OrbitControls
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.1}
        minDistance={5}
        maxDistance={100}
        rotateSpeed={0.5}
        zoomSpeed={1.0}
        panSpeed={0.8}
        maxPolarAngle={Math.PI * 0.85}
        minPolarAngle={Math.PI * 0.1}
      />

      <Suspense fallback={null}>
        {sector && (
          <SectorObjects
            sector={sector}
            playerId={playerId}
            shipTypeId={shipTypeId}
            onPlanetClick={onPlanetClick}
            onOutpostClick={onOutpostClick}
          />
        )}
      </Suspense>
    </Canvas>
  );
}
