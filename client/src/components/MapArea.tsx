/**
 * MapArea — the game-map-area section containing 2D/3D map toggle,
 * commodity filter buttons, and the SectorMap/SectorMap3D components.
 */
import SectorMap, { type CommodityFilter } from "./SectorMap";
import SectorMap3D from "./SectorMap3D";

interface MapAreaProps {
  map3D: boolean;
  setMap3D: React.Dispatch<React.SetStateAction<boolean>>;
  commodityFilter: CommodityFilter;
  setCommodityFilter: React.Dispatch<React.SetStateAction<CommodityFilter>>;
  combatFlash: boolean;
  mapData: any;
  currentSectorId: number | null;
  adjacentSectorIds: number[];
  onMoveToSector: (sectorId: number) => void;
}

export default function MapArea({
  map3D,
  setMap3D,
  commodityFilter,
  setCommodityFilter,
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
      <button
        className="map-toggle-btn"
        onClick={() => setMap3D((v) => !v)}
        title={map3D ? "Switch to 2D map" : "Switch to 3D map"}
      >
        {map3D ? "2D" : "3D"}
      </button>
      {!map3D && (
        <div className="map-commodity-filters">
          {(
            [
              ["buys_cyr", "Sell Cyr", "var(--cyan)"],
              ["sells_cyr", "Buy Cyr", "var(--cyan)"],
              ["buys_food", "Sell Food", "var(--green)"],
              ["sells_food", "Buy Food", "var(--green)"],
              ["buys_tech", "Sell Tech", "var(--purple)"],
              ["sells_tech", "Buy Tech", "var(--purple)"],
              ["sells_fuel", "Fuel", "var(--yellow)"],
            ] as [CommodityFilter, string, string][]
          ).map(([key, label, color]) => (
            <button
              key={key}
              className={`map-filter-btn${commodityFilter === key ? " map-filter-btn--active" : ""}`}
              style={{
                borderColor: commodityFilter === key ? color : undefined,
                color: commodityFilter === key ? color : undefined,
              }}
              onClick={() =>
                setCommodityFilter(commodityFilter === key ? null : key)
              }
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {map3D ? (
        <SectorMap3D
          mapData={mapData}
          currentSectorId={currentSectorId}
          adjacentSectorIds={adjacentSectorIds}
          onMoveToSector={onMoveToSector}
        />
      ) : (
        <SectorMap
          mapData={mapData}
          currentSectorId={currentSectorId}
          adjacentSectorIds={adjacentSectorIds}
          onMoveToSector={onMoveToSector}
          commodityFilter={commodityFilter}
        />
      )}
    </div>
  );
}
