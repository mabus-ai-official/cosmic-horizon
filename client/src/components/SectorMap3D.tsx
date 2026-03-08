import { useRef, useMemo, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import * as THREE from "three";
import type { MapData } from "./SectorMap";

// --- Constants ---
const TOTAL_SECTORS = 5000;
const GALAXY_RADIUS = 100;
const NUM_ARMS = 4;

const SECTOR_COLORS: Record<string, string> = {
  standard: "#fffbe8",
  protected: "#a0ffb0",
  harmony_enforced: "#a0c8ff",
  one_way: "#ffd080",
};

// --- Stellar spectral classification ---
// Each sector gets a deterministic star type (O→M) based on ID.
// Weighted toward cooler stars like real distributions.
const SPECTRAL_CLASSES = [
  { type: "O", color: "#9bb0ff", core: "#cdd8ff", weight: 0.03 },
  { type: "B", color: "#aabfff", core: "#dde4ff", weight: 0.08 },
  { type: "A", color: "#cad7ff", core: "#eef1ff", weight: 0.12 },
  { type: "F", color: "#f8f7ff", core: "#ffffff", weight: 0.18 },
  { type: "G", color: "#fff4ea", core: "#fffcf6", weight: 0.22 },
  { type: "K", color: "#ffd2a1", core: "#ffedda", weight: 0.22 },
  { type: "M", color: "#ffb56c", core: "#ffe0c0", weight: 0.15 },
] as const;

// Pre-compute cumulative weights for selection
const SPECTRAL_CDF: number[] = [];
{
  let sum = 0;
  for (const sc of SPECTRAL_CLASSES) {
    sum += sc.weight;
    SPECTRAL_CDF.push(sum);
  }
}

function getSpectralClass(sectorId: number) {
  const rand = seededRng(sectorId * 4391 + 77731);
  const r = rand();
  for (let i = 0; i < SPECTRAL_CDF.length; i++) {
    if (r < SPECTRAL_CDF[i]) return SPECTRAL_CLASSES[i];
  }
  return SPECTRAL_CLASSES[SPECTRAL_CLASSES.length - 1];
}

// Deterministic binary star check (~15% of sectors)
function isBinaryStar(sectorId: number): boolean {
  const rand = seededRng(sectorId * 6173 + 33391);
  return rand() < 0.15;
}

// Deterministic companion offset for binary stars
function binaryOffset(
  sectorId: number,
  size: number,
): [number, number, number] {
  const rand = seededRng(sectorId * 2039 + 51427);
  const angle = rand() * Math.PI * 2;
  const dist = size * 1.8 + rand() * size * 0.6;
  return [
    Math.cos(angle) * dist,
    Math.sin(angle) * dist,
    (rand() - 0.5) * size * 0.5,
  ];
}

// --- Seeded PRNG (Park-Miller) ---
function seededRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

// --- Deterministic galaxy position for any sector ID ---
// Produces a spiral galaxy with a thick central bulge and thinner disk.
function galaxyPosition(sectorId: number): THREE.Vector3 {
  const rand = seededRng(sectorId * 7919 + 104729);

  // ~12% in central bulge — spherical distribution, tall
  if (rand() < 0.12) {
    const r = rand() * 14;
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1); // spherical, not just ring
    return new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * r + (rand() - 0.5) * 3,
      Math.sin(phi) * Math.sin(theta) * r + (rand() - 0.5) * 3,
      Math.cos(phi) * r * 0.6, // squashed sphere for bulge shape
    );
  }

  // Spiral arm
  const arm = Math.floor(rand() * NUM_ARMS);
  const t = Math.pow(rand(), 0.65);
  const baseAngle = (arm / NUM_ARMS) * Math.PI * 2;
  const spiralTightness = 2.5;
  const angle = baseAngle + t * Math.PI * spiralTightness;
  const radius = 10 + t * (GALAXY_RADIUS - 10);

  const armWidth = (1 - t * 0.3) * 12;
  const perpScatter = (rand() - 0.5) * armWidth;
  const perpAngle = angle + Math.PI / 2;

  const x =
    Math.cos(angle) * radius +
    Math.cos(perpAngle) * perpScatter +
    (rand() - 0.5) * 3;
  const y =
    Math.sin(angle) * radius +
    Math.sin(perpAngle) * perpScatter +
    (rand() - 0.5) * 3;
  // Disk thickness: thicker near center, thinner at edges
  // Gaussian-ish distribution using Box-Muller-lite
  const u1 = Math.max(0.001, rand());
  const u2 = rand();
  const gaussZ = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const diskThickness = (1 - t * 0.7) * 6; // 6 units thick near center, ~1.8 at edge
  const z = gaussZ * diskThickness;

  return new THREE.Vector3(x, y, z);
}

// Lazy-init galaxy positions for all 5000 sectors
let _galaxyPositions: Map<number, THREE.Vector3> | null = null;
function getGalaxyPositions(): Map<number, THREE.Vector3> {
  if (!_galaxyPositions) {
    _galaxyPositions = new Map();
    for (let i = 1; i <= TOTAL_SECTORS; i++) {
      _galaxyPositions.set(i, galaxyPosition(i));
    }
  }
  return _galaxyPositions;
}

// Node size based on sector content
function getSectorNodeSize(
  sector: MapData["sectors"][0],
  isCurrent: boolean,
  isAdjacent: boolean,
): number {
  if (isCurrent) return 1.4;
  let base = isAdjacent ? 0.7 : 0.4;
  base += (sector.planetCount || 0) * 0.1;
  base += (sector.outpostCount || 0) * 0.08;
  if (sector.hasStarMall) base += 0.2;
  return Math.min(base, 1.2);
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

/** Galaxy dust — all 5000 sectors as dim points forming the spiral, with twinkling */
function GalaxyDust({ exploredSet }: { exploredSet: Set<number> }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry } = useMemo(() => {
    const positions = getGalaxyPositions();
    const posArray = new Float32Array(TOTAL_SECTORS * 3);
    const colorArray = new Float32Array(TOTAL_SECTORS * 3);
    const phases = new Float32Array(TOTAL_SECTORS);

    for (let id = 1; id <= TOTAL_SECTORS; id++) {
      const pos = positions.get(id)!;
      const i = id - 1;
      posArray[i * 3] = pos.x;
      posArray[i * 3 + 1] = pos.y;
      posArray[i * 3 + 2] = pos.z;

      // Random phase offset for twinkle timing
      phases[i] = seededRng(id * 1571 + 4219)() * Math.PI * 2;

      const isExplored = exploredSet.has(id);
      const spectral = getSpectralClass(id);
      const sc = new THREE.Color(spectral.color);

      if (isExplored) {
        colorArray[i * 3] = sc.r * 0.7 + 0.15;
        colorArray[i * 3 + 1] = sc.g * 0.7 + 0.15;
        colorArray[i * 3 + 2] = sc.b * 0.7 + 0.15;
      } else {
        const dimFactor = 0.35 + seededRng(id * 31 + 997)() * 0.25;
        colorArray[i * 3] = sc.r * dimFactor;
        colorArray[i * 3 + 1] = sc.g * dimFactor;
        colorArray[i * 3 + 2] = sc.b * dimFactor;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(posArray, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colorArray, 3));
    geo.setAttribute("phase", new THREE.Float32BufferAttribute(phases, 1));
    return { geometry: geo, phaseArray: phases };
  }, [exploredSet]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBaseSize: { value: 1.2 },
    }),
    [],
  );

  useFrame((_, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexColors
        transparent
        depthWrite={false}
        vertexShader={`
          attribute float phase;
          uniform float uTime;
          uniform float uBaseSize;
          varying vec3 vColor;
          varying float vTwinkle;
          void main() {
            vColor = color;
            // Each star twinkles at its own rate and phase
            float speed = 0.6 + phase * 0.5;
            float twinkle = sin(uTime * speed + phase) * 0.5 + 0.5;
            // ~30% of stars twinkle noticeably
            float twinkleStrength = step(0.7, fract(phase * 3.17));
            vTwinkle = mix(1.0, 0.3 + twinkle * 0.7, twinkleStrength);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = max(1.5, uBaseSize * (200.0 / -mvPosition.z));
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          varying float vTwinkle;
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            float alpha = smoothstep(0.5, 0.0, dist) * vTwinkle;
            gl_FragColor = vec4(vColor * 1.4, alpha);
          }
        `}
      />
    </points>
  );
}

/** Nebula clouds — soft billboard sprites with radial gradient (no hard edges) */
function NebulaClouds() {
  const nebulaTexture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(255,255,255,0.6)");
    gradient.addColorStop(0.3, "rgba(255,255,255,0.2)");
    gradient.addColorStop(0.7, "rgba(255,255,255,0.04)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  const clouds = useMemo(
    () => [
      {
        pos: [30, 20, -5] as [number, number, number],
        color: "#e847a0",
        scale: 50,
        opacity: 0.06,
      },
      {
        pos: [-40, -15, -3] as [number, number, number],
        color: "#4060c0",
        scale: 60,
        opacity: 0.05,
      },
      {
        pos: [15, -35, -4] as [number, number, number],
        color: "#8040a0",
        scale: 45,
        opacity: 0.06,
      },
      {
        pos: [-25, 30, -2] as [number, number, number],
        color: "#c05040",
        scale: 40,
        opacity: 0.04,
      },
      {
        pos: [55, -30, -6] as [number, number, number],
        color: "#3080a0",
        scale: 55,
        opacity: 0.04,
      },
      {
        pos: [-10, -5, -1] as [number, number, number],
        color: "#9060d0",
        scale: 35,
        opacity: 0.07,
      },
    ],
    [],
  );

  return (
    <group>
      {clouds.map((c, i) => (
        <sprite key={i} position={c.pos} scale={[c.scale, c.scale, 1]}>
          <spriteMaterial
            map={nebulaTexture}
            color={c.color}
            transparent
            opacity={c.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  );
}

/** Single star core — white-hot center with colored halo */
function StarCore({
  size,
  coreColor,
  haloColor,
  emissiveIntensity,
  glowSize,
  isCurrent,
  sectorId,
  onClick,
  onPointerOver,
  onPointerOut,
}: {
  size: number;
  coreColor: string;
  haloColor: string;
  emissiveIntensity: number;
  glowSize: number;
  isCurrent: boolean;
  sectorId: number;
  onClick?: () => void;
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const time = useRef(Math.random() * 100);

  useFrame((_, delta) => {
    time.current += delta;
    if (meshRef.current) {
      const pulse = isCurrent
        ? 1 + Math.sin(time.current * 2) * 0.15
        : 1 + Math.sin(time.current * 0.8 + sectorId) * 0.05;
      meshRef.current.scale.setScalar(pulse);
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = isCurrent
        ? 0.15 + Math.sin(time.current * 2) * 0.05
        : 0.06 + Math.sin(time.current * 0.5 + sectorId * 0.3) * 0.02;
    }
  });

  return (
    <group>
      {/* Outer halo — spectral color */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[glowSize, 16, 16]} />
        <meshBasicMaterial
          color={haloColor}
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>

      {/* Inner core — white-hot */}
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={coreColor}
          emissive={coreColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>

      {/* Mid-layer — spectral color blended between core and halo */}
      <mesh>
        <sphereGeometry args={[size * 1.5, 16, 16]} />
        <meshBasicMaterial
          color={haloColor}
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** Diffraction spikes — cross-shaped light rays for notable sectors */
function DiffractionSpikes({
  size,
  color,
  sectorId,
}: {
  size: number;
  color: string;
  sectorId: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const time = useRef(Math.random() * 100);
  // Deterministic rotation offset per sector
  const rotOffset = useMemo(
    () => seededRng(sectorId * 1223 + 8887)() * Math.PI,
    [sectorId],
  );

  useFrame((_, delta) => {
    time.current += delta;
    if (groupRef.current) {
      // Very slow rotation
      groupRef.current.rotation.z =
        rotOffset + Math.sin(time.current * 0.15) * 0.1;
      // Subtle brightness pulse
      groupRef.current.children.forEach((child) => {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat?.opacity !== undefined) {
          mat.opacity = 0.15 + Math.sin(time.current * 0.8) * 0.05;
        }
      });
    }
  });

  const spikeLength = size * 5;
  const spikeWidth = size * 0.15;

  return (
    <group ref={groupRef}>
      {/* Horizontal spike */}
      <mesh>
        <planeGeometry args={[spikeLength, spikeWidth]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Vertical spike */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[spikeLength, spikeWidth]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Diagonal spikes (dimmer, thinner) */}
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[spikeLength * 0.6, spikeWidth * 0.6]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[0, 0, -Math.PI / 4]}>
        <planeGeometry args={[spikeLength * 0.6, spikeWidth * 0.6]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** Binary star companion — smaller star orbiting the primary */
function BinaryCompanion({
  sectorId,
  primarySize,
}: {
  sectorId: number;
  primarySize: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const time = useRef(Math.random() * 100);
  const companionSpectral = useMemo(
    () => getSpectralClass(sectorId + 50000),
    [sectorId],
  );
  const offset = useMemo(
    () => binaryOffset(sectorId, primarySize),
    [sectorId, primarySize],
  );
  const orbitSpeed = useMemo(
    () => 0.3 + seededRng(sectorId * 991 + 3337)() * 0.4,
    [sectorId],
  );
  const companionSize =
    primarySize * (0.4 + seededRng(sectorId * 773 + 2221)() * 0.3);

  useFrame((_, delta) => {
    time.current += delta;
    if (groupRef.current) {
      groupRef.current.rotation.z = time.current * orbitSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      <group position={offset}>
        {/* Companion halo */}
        <mesh>
          <sphereGeometry args={[companionSize * 2, 12, 12]} />
          <meshBasicMaterial
            color={companionSpectral.color}
            transparent
            opacity={0.06}
            depthWrite={false}
          />
        </mesh>
        {/* Companion core */}
        <mesh>
          <sphereGeometry args={[companionSize, 12, 12]} />
          <meshStandardMaterial
            color={companionSpectral.core}
            emissive={companionSpectral.core}
            emissiveIntensity={0.6}
            metalness={0.3}
            roughness={0.2}
          />
        </mesh>
      </group>
    </group>
  );
}

/** Individual explored sector node — full star system */
function SectorNode({
  sector,
  position,
  isCurrent,
  isAdjacent,
  size,
  onClick,
  onPointerOver,
  onPointerOut,
}: {
  sector: MapData["sectors"][0];
  position: THREE.Vector3;
  isCurrent: boolean;
  isAdjacent: boolean;
  size: number;
  onClick?: () => void;
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
}) {
  const spectral = useMemo(() => getSpectralClass(sector.id), [sector.id]);
  const binary = useMemo(() => isBinaryStar(sector.id), [sector.id]);

  // Override spectral for special sector types
  const haloColor = isCurrent
    ? "#56d4dd"
    : sector.hasStarMall
      ? "#d29922"
      : SECTOR_COLORS[sector.type] !== "#fffbe8"
        ? SECTOR_COLORS[sector.type]
        : spectral.color;

  const coreColor = isCurrent ? "#b0f0f5" : spectral.core;

  const glowSize = size * (isCurrent ? 3 : 2);
  const emissiveIntensity = isCurrent ? 2.0 : isAdjacent ? 1.2 : 0.5;

  // Show diffraction spikes on notable sectors
  const hasSpikes =
    isCurrent ||
    sector.hasStarMall ||
    (sector.planetCount || 0) >= 3 ||
    (sector.outpostCount || 0) >= 2;

  return (
    <group position={position}>
      {/* Primary star */}
      <StarCore
        size={size}
        coreColor={coreColor}
        haloColor={haloColor}
        emissiveIntensity={emissiveIntensity}
        glowSize={glowSize}
        isCurrent={isCurrent}
        sectorId={sector.id}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      />

      {/* Diffraction spikes on notable sectors */}
      {hasSpikes && (
        <DiffractionSpikes size={size} color={haloColor} sectorId={sector.id} />
      )}

      {/* Binary companion */}
      {binary && !isCurrent && (
        <BinaryCompanion sectorId={sector.id} primarySize={size} />
      )}

      {/* Labels — current + adjacent only */}
      {(isCurrent || isAdjacent) && (
        <Html
          center
          distanceFactor={15}
          style={{
            color: isCurrent ? "#56d4dd" : "#a0c8ff",
            fontSize: isCurrent ? 12 : 10,
            fontFamily: "IBM Plex Mono, monospace",
            fontWeight: isCurrent ? "bold" : "normal",
            textShadow: "0 0 6px rgba(0,0,0,0.9)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            userSelect: "none",
          }}
          position={[0, size + 0.6, 0]}
        >
          {sector.id}
          {sector.sectorName && (
            <div style={{ fontSize: 8, color: "#6e7681" }}>
              {sector.sectorName}
            </div>
          )}
        </Html>
      )}

      {/* Pulse ring — current only */}
      {isCurrent && <PulseRing color={haloColor} size={size} />}
    </group>
  );
}

function PulseRing({ color, size }: { color: string; size: number }) {
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
      <ringGeometry args={[size * 1.2, size * 1.35, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Current sector edges — always visible */
function CurrentEdges({
  edges,
  positions,
  currentSectorId,
}: {
  edges: MapData["edges"];
  positions: Map<number, THREE.Vector3>;
  currentSectorId: number;
}) {
  const geometry = useMemo(() => {
    const points: number[] = [];
    const colors: number[] = [];

    for (const e of edges) {
      if (e.from !== currentSectorId && e.to !== currentSectorId) continue;
      const a = positions.get(e.from);
      const b = positions.get(e.to);
      if (!a || !b) continue;

      points.push(a.x, a.y, a.z, b.x, b.y, b.z);
      colors.push(0.34, 0.83, 0.87, 0.34, 0.83, 0.87);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [edges, positions, currentSectorId]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </lineSegments>
  );
}

/** Highlighted sector edges — appear on click, fade out over 5s */
function HighlightEdges({
  edges,
  positions,
  highlightedSectorId,
  startTime,
}: {
  edges: MapData["edges"];
  positions: Map<number, THREE.Vector3>;
  highlightedSectorId: number | null;
  startTime: number;
}) {
  const matRef = useRef<THREE.LineBasicMaterial>(null);

  const geometry = useMemo(() => {
    if (highlightedSectorId == null) return null;
    const points: number[] = [];
    const colors: number[] = [];

    for (const e of edges) {
      if (e.from !== highlightedSectorId && e.to !== highlightedSectorId)
        continue;
      const a = positions.get(e.from);
      const b = positions.get(e.to);
      if (!a || !b) continue;

      points.push(a.x, a.y, a.z, b.x, b.y, b.z);
      colors.push(0.6, 0.75, 0.4, 0.6, 0.75, 0.4);
    }

    if (points.length === 0) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [edges, positions, highlightedSectorId]);

  // Fade opacity from 0.6 → 0 over 5 seconds
  useFrame(() => {
    if (matRef.current && highlightedSectorId != null) {
      const elapsed = (Date.now() - startTime) / 1000;
      const t = Math.max(0, 1 - elapsed / 5);
      matRef.current.opacity = t * 0.6;
    }
  });

  if (!geometry || highlightedSectorId == null) return null;

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        ref={matRef}
        vertexColors
        transparent
        opacity={0.6}
        depthWrite={false}
      />
    </lineSegments>
  );
}

/** Camera with orbit controls, travel animation, + double-click fly-to-home */
function CameraController({
  target,
  controlsRef,
}: {
  target: THREE.Vector3 | null;
  controlsRef: React.MutableRefObject<any>;
}) {
  const { camera, gl } = useThree();
  const initialized = useRef(false);
  const prevTarget = useRef<THREE.Vector3 | null>(null);

  // Travel animation state — cinematic zoom-out, sweep, zoom-in
  const travelAnim = useRef<{
    startTime: number;
    duration: number;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    fromCamera: THREE.Vector3;
    toCamera: THREE.Vector3;
    midCamera: THREE.Vector3;
  } | null>(null);

  // Simple fly-to state (double-click)
  const flyingTo = useRef<{
    target: THREE.Vector3;
    camera: THREE.Vector3;
  } | null>(null);

  // Default camera offset from target
  const CAM_OFFSET = new THREE.Vector3(3, -10, 18);

  // Set initial camera — offset at an angle to show galaxy depth
  useEffect(() => {
    if (target && !initialized.current) {
      camera.position.copy(target.clone().add(CAM_OFFSET));
      if (controlsRef.current) {
        controlsRef.current.target.copy(target);
        controlsRef.current.update();
      }
      prevTarget.current = target.clone();
      initialized.current = true;
    }
  }, [target, camera, controlsRef]);

  // Detect sector change → start cinematic travel animation
  useEffect(() => {
    if (!target || !initialized.current || !controlsRef.current) return;
    if (!prevTarget.current) {
      prevTarget.current = target.clone();
      return;
    }

    // Skip if target hasn't actually moved
    if (prevTarget.current.distanceTo(target) < 0.01) return;

    const from = prevTarget.current.clone();
    const to = target.clone();
    const fromCam = camera.position.clone();
    const toCam = to.clone().add(CAM_OFFSET);

    // Midpoint between old and new position
    const mid = from.clone().lerp(to, 0.5);
    const dist = from.distanceTo(to);

    // Pull the camera back proportional to travel distance
    // This creates the "zoom out → sweep → zoom in" effect
    const pullBack = Math.max(25, dist * 0.8);

    // Camera direction for the pullback — use current view direction
    const camDir = fromCam.clone().sub(from).normalize();
    const midCam = mid.clone().add(camDir.clone().multiplyScalar(pullBack));
    // Add height for a dramatic overhead sweep angle
    midCam.z += pullBack * 0.4;
    // Slight lateral offset for more cinematic arc
    const lateral = new THREE.Vector3(-camDir.y, camDir.x, 0).normalize();
    midCam.add(lateral.multiplyScalar(dist * 0.15));

    // Duration scales with distance (1.2s–2.8s)
    const duration = Math.min(2.8, Math.max(1.2, dist * 0.025));

    travelAnim.current = {
      startTime: performance.now() / 1000,
      duration,
      fromTarget: from,
      toTarget: to,
      fromCamera: fromCam,
      toCamera: toCam,
      midCamera: midCam,
    };

    // Cancel any double-click fly
    flyingTo.current = null;
    prevTarget.current = to.clone();
  }, [target, camera, controlsRef]);

  // Double-click → fly back to current sector
  useEffect(() => {
    const handleDblClick = (e: MouseEvent) => {
      e.preventDefault();
      if (target && !travelAnim.current) {
        flyingTo.current = {
          target: target.clone(),
          camera: target.clone().add(CAM_OFFSET),
        };
      }
    };
    const el = gl.domElement;
    el.addEventListener("dblclick", handleDblClick);
    return () => el.removeEventListener("dblclick", handleDblClick);
  }, [target, gl.domElement]);

  // Animation loop
  useFrame(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    // Travel animation takes priority
    if (travelAnim.current) {
      const anim = travelAnim.current;
      const now = performance.now() / 1000;
      const elapsed = now - anim.startTime;
      const rawT = Math.min(1, elapsed / anim.duration);

      // Ease-in-out cubic for smooth acceleration/deceleration
      const t =
        rawT < 0.5
          ? 4 * rawT * rawT * rawT
          : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

      // Camera follows a quadratic bezier curve through the midpoint:
      // B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
      const oneMinusT = 1 - t;
      const camPos = new THREE.Vector3()
        .addScaledVector(anim.fromCamera, oneMinusT * oneMinusT)
        .addScaledVector(anim.midCamera, 2 * oneMinusT * t)
        .addScaledVector(anim.toCamera, t * t);

      // Look-at target lerps with easing
      const targetPos = anim.fromTarget.clone().lerp(anim.toTarget, t);

      camera.position.copy(camPos);
      controls.target.copy(targetPos);
      controls.update();

      if (rawT >= 1) {
        travelAnim.current = null;
      }
      return;
    }

    // Double-click fly-to (simple lerp)
    if (flyingTo.current) {
      controls.target.lerp(flyingTo.current.target, 0.06);
      camera.position.lerp(flyingTo.current.camera, 0.06);
      controls.update();

      if (controls.target.distanceTo(flyingTo.current.target) < 0.05) {
        flyingTo.current = null;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.1}
      minDistance={3}
      maxDistance={250}
      rotateSpeed={0.5}
      zoomSpeed={1.0}
      panSpeed={0.8}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════

interface Props {
  mapData: MapData | null;
  currentSectorId: number | null;
  adjacentSectorIds: number[];
  onMoveToSector: (sectorId: number) => void;
}

export default function SectorMap3D({
  mapData,
  currentSectorId,
  adjacentSectorIds,
  onMoveToSector,
}: Props) {
  const controlsRef = useRef<any>(null);
  const [highlightedSector, setHighlightedSector] = useState<number | null>(
    null,
  );
  const [highlightTime, setHighlightTime] = useState(0);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Reset cursor on unmount
  useEffect(() => {
    return () => {
      document.body.style.cursor = "default";
    };
  }, []);

  const exploredSet = useMemo(
    () => new Set(mapData?.sectors.map((s) => s.id) || []),
    [mapData],
  );

  const adjacentSet = useMemo(
    () => new Set(adjacentSectorIds),
    [adjacentSectorIds],
  );

  // Galaxy positions for explored sectors only (for nodes + edges)
  const exploredPositions = useMemo(() => {
    const galaxyPos = getGalaxyPositions();
    const map = new Map<number, THREE.Vector3>();
    if (mapData) {
      for (const s of mapData.sectors) {
        const gp = galaxyPos.get(s.id);
        if (gp) map.set(s.id, gp);
      }
    }
    return map;
  }, [mapData]);

  // Use full galaxy positions for camera target so it's available
  // immediately when currentSectorId changes (before mapData refreshes)
  const currentPos = currentSectorId
    ? (getGalaxyPositions().get(currentSectorId) ?? null)
    : null;

  const handlePointerOver = useCallback(
    (sector: MapData["sectors"][0], isAdj: boolean) =>
      (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        document.body.style.cursor = isAdj ? "pointer" : "crosshair";
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

  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = "default";
    setHovered(null);
  }, []);

  // Click non-adjacent explored sector → show its edges for 5s
  const handleSectorClick = useCallback(
    (sectorId: number, isAdjacent: boolean) => {
      if (isAdjacent) {
        onMoveToSector(sectorId);
        return;
      }
      // Highlight this sector's edges
      setHighlightedSector(sectorId);
      setHighlightTime(Date.now());
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => {
        setHighlightedSector(null);
      }, 5000);
    },
    [onMoveToSector],
  );

  if (!mapData || currentSectorId == null) return null;

  return (
    <div className="sector-map-3d" style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, -5, 20], fov: 55 }}
        style={{ background: "#020206" }}
        gl={{ antialias: true }}
      >
        <fog attach="fog" args={["#020206", 150, 500]} />
        <ambientLight color="#0a0a2e" intensity={0.4} />
        <pointLight position={[40, 30, 20]} color="#56d4dd" intensity={0.3} />
        <pointLight position={[-40, -20, 10]} color="#e847a0" intensity={0.2} />
        <pointLight position={[0, 0, 15]} color="#fffbe8" intensity={0.15} />

        <Stars
          radius={200}
          depth={150}
          count={4000}
          factor={4}
          saturation={0.1}
          fade
          speed={0.2}
        />

        <GalaxyDust exploredSet={exploredSet} />
        <NebulaClouds />

        <CurrentEdges
          edges={mapData.edges}
          positions={exploredPositions}
          currentSectorId={currentSectorId}
        />
        <HighlightEdges
          edges={mapData.edges}
          positions={exploredPositions}
          highlightedSectorId={highlightedSector}
          startTime={highlightTime}
        />

        {mapData.sectors.map((s) => {
          const pos = exploredPositions.get(s.id);
          if (!pos) return null;
          const isCurrent = s.id === currentSectorId;
          const isAdjacent = adjacentSet.has(s.id);
          const size = getSectorNodeSize(s, isCurrent, isAdjacent);

          return (
            <SectorNode
              key={s.id}
              sector={s}
              position={pos}
              isCurrent={isCurrent}
              isAdjacent={isAdjacent}
              size={size}
              onClick={() => handleSectorClick(s.id, isAdjacent)}
              onPointerOver={handlePointerOver(s, isAdjacent)}
              onPointerOut={handlePointerOut}
            />
          );
        })}

        <CameraController target={currentPos} controlsRef={controlsRef} />
      </Canvas>

      {/* Header */}
      <div className="sector-map-3d__header">
        GALAXY MAP | {currentSectorId}
        <span style={{ opacity: 0.4, marginLeft: 8, fontSize: "0.6rem" }}>
          {exploredSet.size}/{TOTAL_SECTORS} explored
        </span>
      </div>

      {/* Hint */}
      <div className="sector-map-3d__hint">double-click to center</div>

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
              {hovered.planetCount} Planet
              {hovered.planetCount !== 1 ? "s" : ""}
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
