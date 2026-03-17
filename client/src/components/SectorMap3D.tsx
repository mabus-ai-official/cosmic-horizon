import { useRef, useMemo, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import type { MapData } from "./SectorMap";

/**
 * ParallaxLayer — shifts children opposite to camera movement at a fraction
 * of the camera's position, creating depth-based parallax.
 * factor: 0 = locked to world (no parallax), 1 = moves fully with camera (stays fixed on screen)
 * Typical values: 0.05 (distant bg), 0.15 (mid nebulae), 0.3 (near stars)
 */
function ParallaxLayer({
  factor,
  children,
}: {
  factor: number;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(
      camera.position.x * factor,
      camera.position.y * factor,
      camera.position.z * factor,
    );
  });

  return <group ref={groupRef}>{children}</group>;
}

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

// Tutorial sector positions — small chain near the galaxy center
const TUTORIAL_SECTOR_POSITIONS: Record<number, [number, number, number]> = {
  90001: [0, 0, 0],
  90002: [8, 3, 1],
  90003: [16, -2, 0.5],
  90004: [24, 4, -0.5],
  90005: [32, -1, 1],
};

// Lazy-init galaxy positions for all 5000 sectors + tutorial sectors
let _galaxyPositions: Map<number, THREE.Vector3> | null = null;
function getGalaxyPositions(): Map<number, THREE.Vector3> {
  if (!_galaxyPositions) {
    _galaxyPositions = new Map();
    for (let i = 1; i <= TOTAL_SECTORS; i++) {
      _galaxyPositions.set(i, galaxyPosition(i));
    }
    // Add tutorial sandbox sectors so they render on the 3D map
    for (const [id, pos] of Object.entries(TUTORIAL_SECTOR_POSITIONS)) {
      _galaxyPositions.set(Number(id), new THREE.Vector3(...pos));
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
      uBaseSize: { value: 2.2 },
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
            gl_PointSize = max(2.0, uBaseSize * (250.0 / -mvPosition.z));
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
            gl_FragColor = vec4(vColor * 1.8, alpha);
          }
        `}
      />
    </points>
  );
}

/** Single nebula cloud — procedural wispy shape, billboards to camera, zoom-responsive */
function NebulaCloud({
  position,
  color,
  scaleX,
  scaleY,
  opacity,
  zRotation,
  seed,
}: {
  position: [number, number, number];
  color: string;
  scaleX: number;
  scaleY: number;
  opacity: number;
  zRotation: number;
  seed: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ camera }, delta) => {
    if (!meshRef.current || !matRef.current) return;

    matRef.current.uniforms.uTime.value += delta;

    // Billboard: face camera, but preserve the artistic z-rotation
    meshRef.current.quaternion.copy(camera.quaternion);
    meshRef.current.rotateZ(zRotation);

    // Zoom-responsive opacity: fade down when very close, full when zoomed out
    const dist = camera.position.distanceTo(meshRef.current.position);
    const zoomFade = THREE.MathUtils.smoothstep(dist, 15, 80);
    matRef.current.uniforms.uOpacity.value = opacity * zoomFade;
  });

  return (
    <mesh ref={meshRef} position={position} scale={[scaleX, scaleY, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: opacity },
          uSeed: { value: seed },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uOpacity;
          uniform float uSeed;
          varying vec2 vUv;

          // Simplex-style noise for organic shapes
          vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
          vec2 mod289(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
          vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

          float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                               -0.577350269189626, 0.024390243902439);
            vec2 i = floor(v + dot(v, C.yy));
            vec2 x0 = v - i + dot(i, C.xx);
            vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                    + i.x + vec3(0.0, i1.x, 1.0));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                    dot(x12.zw,x12.zw)), 0.0);
            m = m*m; m = m*m;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
            vec3 g;
            g.x = a0.x * x0.x + h.x * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
          }

          float fbm(vec2 p) {
            float f = 0.0;
            f += 0.5000 * snoise(p); p *= 2.02;
            f += 0.2500 * snoise(p); p *= 2.03;
            f += 0.1250 * snoise(p); p *= 2.01;
            f += 0.0625 * snoise(p);
            return f;
          }

          void main() {
            vec2 uv = vUv - 0.5;
            float dist = length(uv);

            // Radial falloff — soft edge
            float falloff = smoothstep(0.5, 0.1, dist);

            // Wispy noise pattern — slowly drifts over time
            vec2 noiseCoord = uv * 3.0 + uSeed * 10.0;
            float drift = uTime * 0.02;
            float n1 = fbm(noiseCoord + vec2(drift, drift * 0.7));
            float n2 = fbm(noiseCoord * 1.5 + vec2(-drift * 0.5, drift * 0.3) + 5.0);

            // Combine noise layers for filament-like wisps
            float wisps = smoothstep(-0.1, 0.6, n1) * smoothstep(-0.2, 0.5, n2);

            float alpha = falloff * wisps * uOpacity;

            // Fade to zero at edges
            if (alpha < 0.001) discard;

            gl_FragColor = vec4(uColor, alpha);
          }
        `}
      />
    </mesh>
  );
}

/** Nebula clouds — wispy procedural noise billboards scattered along spiral arms */
function NebulaClouds() {
  const clouds = useMemo(
    () => [
      // Inner arm nebulae
      {
        pos: [25, 15, -5] as [number, number, number],
        color: "#e847a0",
        sx: 45,
        sy: 28,
        opacity: 0.16,
        rot: 0.4,
      },
      {
        pos: [-30, -12, -3] as [number, number, number],
        color: "#4060c0",
        sx: 50,
        sy: 30,
        opacity: 0.14,
        rot: -0.6,
      },
      {
        pos: [-18, 25, -2] as [number, number, number],
        color: "#c05040",
        sx: 35,
        sy: 22,
        opacity: 0.12,
        rot: -0.3,
      },
      {
        pos: [-8, -4, -1] as [number, number, number],
        color: "#9060d0",
        sx: 35,
        sy: 22,
        opacity: 0.16,
        rot: -1.0,
      },
      // Mid-range arm nebulae
      {
        pos: [50, -25, -5] as [number, number, number],
        color: "#3080a0",
        sx: 50,
        sy: 30,
        opacity: 0.12,
        rot: 0.8,
      },
      {
        pos: [40, 35, -4] as [number, number, number],
        color: "#d06080",
        sx: 40,
        sy: 24,
        opacity: 0.12,
        rot: 0.2,
      },
      {
        pos: [-45, 30, -5] as [number, number, number],
        color: "#5070e0",
        sx: 45,
        sy: 26,
        opacity: 0.11,
        rot: -0.9,
      },
      {
        pos: [10, -45, -4] as [number, number, number],
        color: "#8040a0",
        sx: 40,
        sy: 25,
        opacity: 0.13,
        rot: 1.1,
      },
      // Outer edge nebulae
      {
        pos: [75, 20, -6] as [number, number, number],
        color: "#3070b0",
        sx: 50,
        sy: 28,
        opacity: 0.09,
        rot: 0.5,
      },
      {
        pos: [-70, -35, -6] as [number, number, number],
        color: "#a04080",
        sx: 55,
        sy: 30,
        opacity: 0.08,
        rot: -0.7,
      },
      {
        pos: [-25, -70, -5] as [number, number, number],
        color: "#40a0a0",
        sx: 45,
        sy: 25,
        opacity: 0.08,
        rot: 1.3,
      },
      {
        pos: [60, -60, -6] as [number, number, number],
        color: "#6050c0",
        sx: 50,
        sy: 28,
        opacity: 0.07,
        rot: -1.2,
      },
      {
        pos: [-60, 55, -5] as [number, number, number],
        color: "#c06050",
        sx: 45,
        sy: 26,
        opacity: 0.08,
        rot: 0.9,
      },
      {
        pos: [20, 75, -5] as [number, number, number],
        color: "#5080d0",
        sx: 40,
        sy: 24,
        opacity: 0.07,
        rot: -0.4,
      },
      // Warm core haze
      {
        pos: [0, 0, -2] as [number, number, number],
        color: "#ffe0a0",
        sx: 28,
        sy: 28,
        opacity: 0.12,
        rot: 0,
      },
      {
        pos: [5, -3, -1] as [number, number, number],
        color: "#ffb060",
        sx: 22,
        sy: 18,
        opacity: 0.09,
        rot: 0.7,
      },
    ],
    [],
  );

  return (
    <group>
      {clouds.map((c, i) => (
        <NebulaCloud
          key={i}
          position={c.pos}
          color={c.color}
          scaleX={c.sx}
          scaleY={c.sy}
          opacity={c.opacity}
          zRotation={c.rot}
          seed={i * 1.37}
        />
      ))}
    </group>
  );
}

/**
 * Background galaxy shader — supports spiral, elliptical, and irregular types.
 * type 0 = spiral, 1 = elliptical, 2 = irregular
 */
const BG_GALAXY_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BG_GALAXY_FRAGMENT = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec3 uCoreColor;
  uniform float uOpacity;
  uniform float uFade;
  uniform float uSpiralTightness;
  uniform float uTumbleSpeed;
  uniform float uSeed;
  uniform int uType; // 0=spiral, 1=elliptical, 2=irregular
  varying vec2 vUv;

  // Simple hash noise for irregular galaxies
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i); float b = hash(i + vec2(1,0));
    float c = hash(i + vec2(0,1)); float d = hash(i + vec2(1,1));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
  }

  void main() {
    vec2 uv = vUv - 0.5;

    // Slow tumble
    float tumble = sin(uTime * uTumbleSpeed) * 0.15;
    float co = cos(tumble); float si = sin(tumble);
    uv = mat2(co, -si, si, co) * uv;

    float dist = length(uv);
    // Circular discard
    if (dist > 0.48) discard;
    float mask = smoothstep(0.48, 0.2, dist);

    float brightness = 0.0;

    if (uType == 0) {
      // SPIRAL — arms + core + halo
      float core = exp(-dist * 16.0) * 0.8;
      float angle = atan(uv.y, uv.x);
      float s1 = sin(angle * 2.0 + dist * uSpiralTightness + uSeed * 6.28);
      float s2 = sin(angle * 2.0 + dist * uSpiralTightness + 3.14 + uSeed * 6.28);
      float arms = (smoothstep(0.2, 0.8, s1) + smoothstep(0.2, 0.8, s2)) * 0.5;
      arms *= smoothstep(0.0, 0.08, dist) * smoothstep(0.48, 0.12, dist);
      float halo = exp(-dist * 5.0) * 0.25;
      brightness = core + arms * 0.35 + halo;
    } else if (uType == 1) {
      // ELLIPTICAL — smooth fuzzy blob, no arms
      float core = exp(-dist * 12.0) * 0.7;
      float halo = exp(-dist * 4.0) * 0.35;
      // Subtle mottling
      float mottle = vnoise(uv * 8.0 + uSeed * 5.0) * 0.15;
      brightness = core + halo + mottle * smoothstep(0.4, 0.05, dist);
    } else {
      // IRREGULAR — patchy, asymmetric blobs
      float n1 = vnoise(uv * 6.0 + uSeed * 10.0);
      float n2 = vnoise(uv * 10.0 + uSeed * 7.0 + 3.0);
      float patches = smoothstep(0.3, 0.7, n1) * smoothstep(0.25, 0.65, n2);
      float glow = exp(-dist * 6.0) * 0.4;
      brightness = patches * 0.5 * smoothstep(0.45, 0.1, dist) + glow;
    }

    vec3 color = mix(uColor, uCoreColor, exp(-dist * 12.0));
    float alpha = brightness * uOpacity * uFade * mask;
    if (alpha < 0.001) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

/** Single distant background galaxy — billboard, zoom-responsive */
function BackgroundGalaxy({
  position,
  color,
  coreColor,
  size,
  tilt,
  spiralTightness,
  tumbleSpeed,
  seed,
  baseOpacity,
  type,
}: {
  position: [number, number, number];
  color: string;
  coreColor: string;
  size: number;
  tilt: number;
  spiralTightness: number;
  tumbleSpeed: number;
  seed: number;
  baseOpacity: number;
  type: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ camera }, delta) => {
    if (!meshRef.current || !matRef.current) return;
    matRef.current.uniforms.uTime.value += delta;
    meshRef.current.quaternion.copy(camera.quaternion);
    const camDist = camera.position.length();
    const fade = THREE.MathUtils.smoothstep(camDist, 30, 120);
    matRef.current.uniforms.uFade.value = fade;
  });

  return (
    <mesh ref={meshRef} position={position} scale={[size, size * tilt, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(color) },
          uCoreColor: { value: new THREE.Color(coreColor) },
          uOpacity: { value: baseOpacity },
          uFade: { value: 0 },
          uSpiralTightness: { value: spiralTightness },
          uTumbleSpeed: { value: tumbleSpeed },
          uSeed: { value: seed },
          uType: { value: type },
        }}
        vertexShader={BG_GALAXY_VERTEX}
        fragmentShader={BG_GALAXY_FRAGMENT}
      />
    </mesh>
  );
}

/** Distant background galaxies — visible when zoomed out */
function BackgroundGalaxies() {
  // type: 0=spiral, 1=elliptical, 2=irregular
  const galaxies = useMemo(
    () => [
      // --- Spirals ---
      // Face-on spiral — far upper right
      {
        pos: [500, 350, -300] as [number, number, number],
        color: "#b464dc",
        coreColor: "#ffe6ff",
        size: 25,
        tilt: 0.5,
        spiral: 12.0,
        tumble: 0.04,
        opacity: 0.1,
        type: 0,
      },
      // Large faint spiral — far left
      {
        pos: [-600, 80, -400] as [number, number, number],
        color: "#6080c0",
        coreColor: "#ffffff",
        size: 55,
        tilt: 0.55,
        spiral: 10.0,
        tumble: 0.02,
        opacity: 0.05,
        type: 0,
      },
      // Small spiral — lower right, very distant
      {
        pos: [400, -500, -450] as [number, number, number],
        color: "#5090dc",
        coreColor: "#c8f0ff",
        size: 18,
        tilt: 0.4,
        spiral: 14.0,
        tumble: 0.035,
        opacity: 0.07,
        type: 0,
      },

      // --- Ellipticals ---
      // Big fuzzy elliptical — upper left, warm gold
      {
        pos: [-450, 480, -350] as [number, number, number],
        color: "#d0a060",
        coreColor: "#fff4e0",
        size: 50,
        tilt: 0.7,
        spiral: 0.0,
        tumble: 0.03,
        opacity: 0.05,
        type: 1,
      },
      // Compact elliptical — far right
      {
        pos: [650, -150, -380] as [number, number, number],
        color: "#c09070",
        coreColor: "#ffe8d0",
        size: 14,
        tilt: 0.8,
        spiral: 0.0,
        tumble: 0.05,
        opacity: 0.07,
        type: 1,
      },
      // Faint large elliptical — far below
      {
        pos: [120, -620, -500] as [number, number, number],
        color: "#b0a090",
        coreColor: "#f0e8e0",
        size: 60,
        tilt: 0.65,
        spiral: 0.0,
        tumble: 0.02,
        opacity: 0.04,
        type: 1,
      },

      // --- Irregulars ---
      // Irregular — far lower left
      {
        pos: [-520, -420, -380] as [number, number, number],
        color: "#4090b0",
        coreColor: "#a0e0ff",
        size: 22,
        tilt: 0.85,
        spiral: 0.0,
        tumble: 0.04,
        opacity: 0.06,
        type: 2,
      },
      // Patchy irregular — far upper middle
      {
        pos: [200, 580, -420] as [number, number, number],
        color: "#a06090",
        coreColor: "#e0b0d0",
        size: 30,
        tilt: 0.75,
        spiral: 0.0,
        tumble: 0.03,
        opacity: 0.05,
        type: 2,
      },

      // --- Edge-on spiral (very thin tilt) ---
      {
        pos: [-350, -550, -400] as [number, number, number],
        color: "#7090c0",
        coreColor: "#e0f0ff",
        size: 35,
        tilt: 0.15,
        spiral: 15.0,
        tumble: 0.025,
        opacity: 0.06,
        type: 0,
      },
    ],
    [],
  );

  return (
    <group>
      {galaxies.map((g, i) => (
        <BackgroundGalaxy
          key={i}
          position={g.pos}
          color={g.color}
          coreColor={g.coreColor}
          size={g.size}
          tilt={g.tilt}
          spiralTightness={g.spiral}
          tumbleSpeed={g.tumble}
          seed={i * 2.71}
          baseOpacity={g.opacity}
          type={g.type}
        />
      ))}
    </group>
  );
}

/** Galactic core — bright warm glow at the galaxy center, billboards to camera */
function GalacticCore() {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ camera }, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += delta;
    }
    if (meshRef.current) {
      meshRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -3]}>
      <planeGeometry args={[60, 60]} />
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uColor1: { value: new THREE.Color("#ffcc66") },
          uColor2: { value: new THREE.Color("#ff8844") },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          varying vec2 vUv;
          void main() {
            float dist = length(vUv - vec2(0.5));
            // Hard circular cutoff — discard outside radius to avoid square edges
            if (dist > 0.48) discard;
            // Smooth circular mask
            float mask = smoothstep(0.48, 0.25, dist);
            // Soft radial falloff with pulsing
            float pulse = 1.0 + sin(uTime * 0.3) * 0.08;
            float glow = exp(-dist * 8.0) * 0.3 * pulse;
            float outerGlow = exp(-dist * 4.0) * 0.08;
            vec3 color = mix(uColor1, uColor2, smoothstep(0.0, 0.35, dist));
            float alpha = (glow + outerGlow) * mask;
            if (alpha < 0.002) discard;
            gl_FragColor = vec4(color, alpha);
          }
        `}
      />
    </mesh>
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

  // Default camera offset from target (close-in after travel)
  const CAM_OFFSET = new THREE.Vector3(3, -10, 18);

  // Set initial camera — always start with a wide cinematic galaxy view
  // Low angle, looking up at the galactic disk edge-on
  useEffect(() => {
    if (target && !initialized.current) {
      // Position camera below and far back for a panoramic edge-on view
      const galaxyCenter = new THREE.Vector3(0, 0, 0);
      camera.position.set(15, -175, 60);
      // Shift look target slightly below center so galaxy appears higher on screen
      galaxyCenter.set(8, 0, -10);
      if (controlsRef.current) {
        controlsRef.current.target.copy(galaxyCenter);
        controlsRef.current.update();
      }
      prevTarget.current = target.clone();
      initialized.current = true;
    }
  }, [target, camera, controlsRef]);

  // Zoom-to-cursor: on wheel, shift orbit target toward mouse world position.
  // OrbitControls handles the actual dolly — we only nudge the target.
  useEffect(() => {
    const el = gl.domElement;
    const handleWheel = (e: WheelEvent) => {
      const controls = controlsRef.current;
      if (!controls || travelAnim.current) return;

      const zoomingIn = e.deltaY < 0;
      const GALAXY_CENTER = new THREE.Vector3(8, 0, -10);

      if (zoomingIn) {
        // Zoom in → shift target toward mouse cursor
        const rect = el.getBoundingClientRect();
        const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const mouseNDC = new THREE.Vector2(ndcX, ndcY);
        const ray = new THREE.Raycaster();
        ray.setFromCamera(mouseNDC, camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersection = new THREE.Vector3();
        if (!ray.ray.intersectPlane(plane, intersection)) return;

        const camDist = camera.position.distanceTo(controls.target);
        const shift = THREE.MathUtils.clamp(camDist / 800, 0.005, 0.04);

        const offset = intersection
          .clone()
          .sub(controls.target)
          .multiplyScalar(shift);
        controls.target.add(offset);
        camera.position.add(offset);
      } else {
        // Zoom out → drift target back toward galaxy center
        const camDist = camera.position.distanceTo(controls.target);
        const shift = THREE.MathUtils.clamp(camDist / 800, 0.005, 0.04);

        const offset = GALAXY_CENTER.clone()
          .sub(controls.target)
          .multiplyScalar(shift);
        controls.target.add(offset);
        camera.position.add(offset);
      }

      controls.update();
    };

    el.addEventListener("wheel", handleWheel, { passive: true });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [camera, gl.domElement, controlsRef]);

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
      maxDistance={200}
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
  onCurrentSectorClick?: () => void;
}

export default function SectorMap3D({
  mapData,
  currentSectorId,
  adjacentSectorIds,
  onMoveToSector,
  onCurrentSectorClick,
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
      if (sectorId === currentSectorId) {
        onCurrentSectorClick?.();
        return;
      }
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
    [onMoveToSector, currentSectorId, onCurrentSectorClick],
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

        <ParallaxLayer factor={0.3}>
          <Stars
            radius={200}
            depth={150}
            count={4000}
            factor={4}
            saturation={0.1}
            fade
            speed={0.2}
          />
        </ParallaxLayer>

        <GalaxyDust exploredSet={exploredSet} />
        <ParallaxLayer factor={0.15}>
          <NebulaClouds />
        </ParallaxLayer>
        <GalacticCore />
        <ParallaxLayer factor={0.05}>
          <BackgroundGalaxies />
        </ParallaxLayer>

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

        <EffectComposer>
          <Bloom
            intensity={0.6}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
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
