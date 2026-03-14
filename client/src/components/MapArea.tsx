/**
 * MapArea — full-screen 3D galaxy map background.
 * The 2D sector map modal is rendered in Game.tsx for proper z-index.
 */
import SectorMap3D from "./SectorMap3D";

interface MapAreaProps {
  combatFlash: boolean;
  mapData: any;
  currentSectorId: number | null;
  adjacentSectorIds: number[];
  onMoveToSector: (sectorId: number) => void;
}

export default function MapArea({
  combatFlash,
  mapData,
  currentSectorId,
  adjacentSectorIds,
  onMoveToSector,
}: MapAreaProps) {
  return (
    <div
      className={`game-map-area${combatFlash ? " terminal--combat-flash" : ""}`}
    >
      <SectorMap3D
        mapData={mapData}
        currentSectorId={currentSectorId}
        adjacentSectorIds={adjacentSectorIds}
        onMoveToSector={onMoveToSector}
      />
    </div>
  );
}
