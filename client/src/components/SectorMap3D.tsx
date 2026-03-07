import { useRef, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import * as THREE from "three";
import type { MapData } from "./SectorMap";

interface Props {
  mapData: MapData | null;
  currentSectorId: number | null;
  adjacentSectorIds: number[];
  onMoveToSector: (sectorId: number) => void;
}

// Seeded PRNG
function seededRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const SECTOR_COLORS: Record<string, string> = {
  standard: "#fffbe8",
  protected: "#a0ffb0",
  harmony_enforced: "#a0c8ff",
  one_way: "#ffd080",
};

function computePositions3D(
  sectors: MapData["sectors"],
  edges: MapData["edges"],
  currentSectorId: number,
): Map<number, THREE.Vector3> {
  const positions = new Map<number, THREE.Vector3>();
  const sectorIds = new Set(sectors.map((s) => s.id));

  // Build adjacency
  const adjacency = new Map<number, Set<number>>();
  for (const s of sectors) adjacency.set(s.id, new Set());
  for (const e of edges) {
    adjacency.get(e.from)?.add(e.to);
    adjacency.get(e.to)?.add(e.from);
  }

  // BFS layout from current sector
  const seedBase = sectors.reduce(
    (acc, s) => acc + s.id * 7919,
    currentSectorId * 104729,
  );
  const rand = seededRng(seedBase);

  const visited = new Set<number>();
  const queue: { id: number; depth: number }[] = [];

  if (sectorIds.has(currentSectorId)) {
    positions.set(currentSectorId, new THREE.Vector3(0, 0, 0));
    visited.add(currentSectorId);
    queue.push({ id: currentSectorId, depth: 0 });
  }

  const spacing = 3;

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    const neighbors = adjacency.get(id);
    if (!neighbors) continue;

    const unvisited = [...neighbors]
      .filter((n) => !visited.has(n) && sectorIds.has(n))
      .sort((a, b) => a - b);
    if (unvisited.length === 0) continue;

    const parentPos = positions.get(id)!;
    const ringRadius = spacing * (0.8 + depth * 0.2);
    const angleStep = (2 * Math.PI) / Math.max(unvisited.length, 3);
    const baseAngle = rand() * Math.PI * 2;

    for (let i = 0; i < unvisited.length; i++) {
      const nid = unvisited[i];
      const angle = baseAngle + angleStep * i;
      const zJitter = (rand() - 0.5) * 2;
      positions.set(
        nid,
        new THREE.Vector3(
          parentPos.x + Math.cos(angle) * ringRadius,
          parentPos.y + Math.sin(angle) * ringRadius,
          parentPos.z + zJitter,
        ),
      );
      visited.add(nid);
      queue.push({ id: nid, depth: depth + 1 });
    }
  }

  // Disconnected nodes
  for (const s of sectors) {
    if (!positions.has(s.id)) {
      positions.set(
        s.id,
        new THREE.Vector3(
          (rand() - 0.5) * 20,
          (rand() - 0.5) * 20,
          (rand() - 0.5) * 4,
        ),
      );
    }
  }

  // Simple force-directed relaxation (fewer iterations than 2D since it's visual only)
  for (let iter = 0; iter < 40; iter++) {
    const temp = 1 - iter / 40;

    // Repulsion
    for (let i = 0; i < sectors.length; i++) {
      for (let j = i + 1; j < sectors.length; j++) {
        const a = positions.get(sectors[i].id)!;
        const b = positions.get(sectors[j].id)!;
        const diff = a.clone().sub(b);
        const dist = diff.length();
        if (dist < 0.1) diff.set(1, 0, 0);
        const force = (3000 / (dist * dist + 1)) * temp;
        const push = diff.normalize().multiplyScalar(force * 0.01);
        a.add(push);
        b.sub(push);
      }
    }

    // Attraction along edges
    for (const e of edges) {
      const a = positions.get(e.from);
      const b = positions.get(e.to);
      if (!a || !b) continue;
      const diff = b.clone().sub(a);
      const dist = diff.length();
      const displacement = dist - spacing;
      const force = 0.1 * displacement * temp;
      const pull = diff.normalize().multiplyScalar(force * 0.01);
      a.add(pull);
      b.sub(pull);
    }

    // Center gravity
    for (const s of sectors) {
      const p = positions.get(s.id)!;
      p.multiplyScalar(0.998);
    }
  }

  return positions;
}

/** Individual sector node — glowing sphere */
function SectorNode({
  sector,
  position,
  isCurrent,
  isAdjacent,
  onClick,
  onHover,
  onUnhover,
}: {
  sector: MapData["sectors"][0];
  position: THREE.Vector3;
  isCurrent: boolean;
  isAdjacent: boolean;
  onClick?: () => void;
  onHover: (e: ThreeEvent<PointerEvent>) => void;
  onUnhover: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const time = useRef(Math.random() * 100);

  const color = isCurrent
    ? "#56d4dd"
    : SECTOR_COLORS[sector.type] || SECTOR_COLORS.standard;

  const baseSize = isCurrent ? 0.35 : isAdjacent ? 0.25 : 0.15;
  const glowSize = baseSize * (isCurrent ? 3 : 2);

  useFrame((_, delta) => {
    time.current += delta;
    if (meshRef.current) {
      const pulse = isCurrent
        ? 1 + Math.sin(time.current * 2) * 0.15
        : 1 + Math.sin(time.current * 0.8) * 0.05;
      meshRef.current.scale.setScalar(pulse);
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = isCurrent ? 0.15 + Math.sin(time.current * 2) * 0.05 : 0.08;
    }
  });

  return (
    <group position={position}>
      {/* Glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[glowSize, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} />
      </mesh>

      {/* Core sphere */}
      <mesh
        ref={meshRef}
        onClick={isAdjacent ? onClick : undefined}
        onPointerOver={onHover}
        onPointerOut={onUnhover}
      >
        <sphereGeometry args={[baseSize, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isCurrent ? 1.5 : isAdjacent ? 0.8 : 0.3}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* Sector label */}
      {(isCurrent || isAdjacent) && (
        <Html
          center
          distanceFactor={12}
          style={{
            color: isCurrent ? "#56d4dd" : "#8b949e",
            fontSize: isCurrent ? 12 : 10,
            fontFamily: "IBM Plex Mono, monospace",
            fontWeight: isCurrent ? "bold" : "normal",
            textShadow: "0 0 4px rgba(0,0,0,0.8)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            userSelect: "none",
          }}
          position={[0, baseSize + 0.4, 0]}
        >
          {sector.id}
          {sector.sectorName && (
            <div style={{ fontSize: 8, color: "#6e7681" }}>
              {sector.sectorName}
            </div>
          )}
        </Html>
      )}

      {/* Pulse ring for current */}
      {isCurrent && <PulseRing color={color} />}
    </group>
  );
}

function PulseRing({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const time = useRef(0);

  useFrame((_, delta) => {
    time.current += delta;
    if (ref.current) {
      const scale = 1 + (time.current % 2) * 0.8;
      ref.current.scale.setScalar(scale);
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.3 - (time.current % 2) * 0.15);
    }
  });

  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.4, 0.45, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** All edges as a single LineSegments for performance */
function EdgeLines({
  edges,
  positions,
  adjacentSet,
}: {
  edges: MapData["edges"];
  positions: Map<number, THREE.Vector3>;
  adjacentSet: Set<number>;
}) {
  const geometry = useMemo(() => {
    const points: number[] = [];
    const colors: number[] = [];

    for (const e of edges) {
      const a = positions.get(e.from);
      const b = positions.get(e.to);
      if (!a || !b) continue;

      points.push(a.x, a.y, a.z, b.x, b.y, b.z);

      // Color: bright for adjacent connections, dim for others
      const isAdjacentEdge = adjacentSet.has(e.from) || adjacentSet.has(e.to);
      const r = isAdjacentEdge ? 0.34 : 0.15;
      const g = isAdjacentEdge ? 0.83 : 0.2;
      const b2 = isAdjacentEdge ? 0.87 : 0.25;
      colors.push(r, g, b2, r, g, b2);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [edges, positions, adjacentSet]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.4} />
    </lineSegments>
  );
}

/** Camera auto-focus on current sector */
function CameraController({ target }: { target: THREE.Vector3 | null }) {
  const { camera } = useThree();
  const initialized = useRef(false);

  useFrame(() => {
    if (target && !initialized.current) {
      camera.position.set(target.x, target.y - 2, target.z + 12);
      camera.lookAt(target);
      initialized.current = true;
    }
  });

  return (
    <OrbitControls
      target={target ?? undefined}
      enableDamping
      dampingFactor={0.1}
      minDistance={3}
      maxDistance={40}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
    />
  );
}

export default function SectorMap3D({
  mapData,
  currentSectorId,
  adjacentSectorIds,
  onMoveToSector,
}: Props) {
  const [hovered, setHovered] = useState<{
    id: number;
    type: string;
    sectorName?: string | null;
    hasStarMall?: boolean;
    hasPlanets?: boolean;
    planetCount?: number;
    hasOutposts?: boolean;
    outpostCount?: number;
  } | null>(null);

  const positions = useMemo(() => {
    if (!mapData || currentSectorId == null) return new Map();
    return computePositions3D(mapData.sectors, mapData.edges, currentSectorId);
  }, [mapData, currentSectorId]);

  const adjacentSet = useMemo(
    () => new Set(adjacentSectorIds),
    [adjacentSectorIds],
  );

  const currentPos = currentSectorId ? positions.get(currentSectorId) : null;

  const handleHover = useCallback(
    (sector: MapData["sectors"][0]) => (_e: ThreeEvent<PointerEvent>) => {
      setHovered({
        id: sector.id,
        type: sector.type,
        sectorName: sector.sectorName,
        hasStarMall: sector.hasStarMall,
        hasPlanets: sector.hasPlanets,
        planetCount: sector.planetCount,
        hasOutposts: sector.hasOutposts,
        outpostCount: sector.outpostCount,
      });
    },
    [],
  );

  const handleUnhover = useCallback(() => setHovered(null), []);

  if (!mapData || currentSectorId == null) return null;

  return (
    <div className="sector-map-3d" style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, -2, 12], fov: 55 }}
        style={{ background: "#030308" }}
        gl={{ antialias: true }}
      >
        <fog attach="fog" args={["#030308", 15, 50]} />
        <ambientLight color="#1a1a3e" intensity={0.3} />
        <pointLight position={[10, 10, 10]} color="#56d4dd" intensity={0.4} />
        <pointLight position={[-10, -10, 5]} color="#e847a0" intensity={0.2} />

        <Stars
          radius={80}
          depth={80}
          count={3000}
          factor={3}
          saturation={0.1}
          fade
          speed={0.3}
        />

        <EdgeLines
          edges={mapData.edges}
          positions={positions}
          adjacentSet={adjacentSet}
        />

        {mapData.sectors.map((s) => {
          const pos = positions.get(s.id);
          if (!pos) return null;
          return (
            <SectorNode
              key={s.id}
              sector={s}
              position={pos}
              isCurrent={s.id === currentSectorId}
              isAdjacent={adjacentSet.has(s.id)}
              onClick={() => onMoveToSector(s.id)}
              onHover={handleHover(s)}
              onUnhover={handleUnhover}
            />
          );
        })}

        <CameraController target={currentPos ?? null} />
      </Canvas>

      {/* 3D Map header */}
      <div className="sector-map-3d__header">
        SECTOR MAP | {currentSectorId}
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div className="sector-map-3d__tooltip">
          <div>
            Sector {hovered.id}{" "}
            <span style={{ opacity: 0.6 }}>[{hovered.type}]</span>
          </div>
          {hovered.sectorName && (
            <div style={{ color: "#56d4dd", fontWeight: "bold" }}>
              {hovered.sectorName}
            </div>
          )}
          {hovered.hasStarMall && (
            <div style={{ color: "#d29922", fontSize: 10 }}>Star Mall</div>
          )}
          {hovered.hasPlanets && (
            <div style={{ color: "#58a6ff", fontSize: 10 }}>
              {hovered.planetCount} Planet{hovered.planetCount !== 1 ? "s" : ""}
            </div>
          )}
          {hovered.hasOutposts && (
            <div style={{ color: "#3fb950", fontSize: 10 }}>
              {hovered.outpostCount} Outpost
              {hovered.outpostCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
