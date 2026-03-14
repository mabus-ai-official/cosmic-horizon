import { useMemo, useState } from "react";
import * as THREE from "three";
import { entityPosition } from "./constants";
import PlayerShip from "./PlayerShip";
import SectorPlanet from "./SectorPlanet";
import SectorOutpost from "./SectorOutpost";
import OtherShip from "./OtherShip";

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
  warpGates?: {
    id: string;
    destinationSectorId: number;
  }[];
}

interface SectorObjectsProps {
  sector: SectorState;
  playerId: string;
  shipTypeId: string;
  onPlanetClick?: (planetId: string) => void;
  onOutpostClick?: (outpostId: string) => void;
}

export default function SectorObjects({
  sector,
  playerId,
  shipTypeId,
  onPlanetClick,
  onOutpostClick,
}: SectorObjectsProps) {
  const [flightTarget, setFlightTarget] = useState<THREE.Vector3 | null>(null);

  // Player ship starts at origin
  const playerPos = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  // Deterministic positions for all sector entities
  const planetPositions = useMemo(
    () =>
      sector.planets.map((_, i) =>
        entityPosition(sector.sectorId, i, "planet"),
      ),
    [sector.sectorId, sector.planets.length],
  );

  const outpostPositions = useMemo(
    () =>
      sector.outposts.map((_, i) =>
        entityPosition(sector.sectorId, i, "outpost"),
      ),
    [sector.sectorId, sector.outposts.length],
  );

  const otherPlayers = sector.players.filter((p) => p.id !== playerId);
  const otherPlayerPositions = useMemo(
    () =>
      otherPlayers.map((_, i) => entityPosition(sector.sectorId, i, "player")),
    [sector.sectorId, otherPlayers.length],
  );

  const handlePlanetClick = (planetId: string, index: number) => {
    setFlightTarget(
      planetPositions[index].clone().add(new THREE.Vector3(0, 0, 8)),
    );
    onPlanetClick?.(planetId);
  };

  const handleOutpostClick = (outpostId: string, index: number) => {
    setFlightTarget(
      outpostPositions[index].clone().add(new THREE.Vector3(0, 0, 6)),
    );
    onOutpostClick?.(outpostId);
  };

  return (
    <>
      {/* Player ship */}
      <PlayerShip
        shipTypeId={shipTypeId}
        position={playerPos}
        targetPosition={flightTarget}
        onArrival={() => setFlightTarget(null)}
      />

      {/* Planets */}
      {sector.planets.map((planet, i) => (
        <SectorPlanet
          key={planet.id}
          planetId={planet.id}
          name={planet.name}
          planetClass={planet.planetClass}
          position={planetPositions[i]}
          owned={planet.ownerId !== null}
          onClick={() => handlePlanetClick(planet.id, i)}
        />
      ))}

      {/* Outposts */}
      {sector.outposts.map((outpost, i) => (
        <SectorOutpost
          key={outpost.id}
          outpostId={outpost.id}
          name={outpost.name}
          isStarMall={sector.hasStarMall && i === 0}
          position={outpostPositions[i]}
          onClick={() => handleOutpostClick(outpost.id, i)}
        />
      ))}

      {/* Other players */}
      {otherPlayers.map((player, i) => (
        <OtherShip
          key={player.id}
          username={player.username}
          position={otherPlayerPositions[i]}
        />
      ))}
    </>
  );
}
