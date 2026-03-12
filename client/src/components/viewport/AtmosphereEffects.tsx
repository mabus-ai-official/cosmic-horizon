import { memo, useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type Context = "ambient" | "combat" | "docked" | "danger" | "warp";

interface AtmosphereEffectsProps {
  context: Context;
  sectorType?: string;
}

// Procedural nebula cloud sprite
function generateNebulaTexture(color: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const c = new THREE.Color(color);

  // Radial gradient cloud
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, `rgba(${c.r * 255},${c.g * 255},${c.b * 255},0.3)`);
  gradient.addColorStop(
    0.4,
    `rgba(${c.r * 255},${c.g * 255},${c.b * 255},0.12)`,
  );
  gradient.addColorStop(
    0.7,
    `rgba(${c.r * 255},${c.g * 255},${c.b * 255},0.04)`,
  );
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const nebulaTextureCache = new Map<string, THREE.CanvasTexture>();
function getNebulaTexture(color: string) {
  if (!nebulaTextureCache.has(color)) {
    nebulaTextureCache.set(color, generateNebulaTexture(color));
  }
  return nebulaTextureCache.get(color)!;
}

// Sector type -> nebula color mapping
const SECTOR_NEBULA: Record<string, string> = {
  protected: "#1a4a3a",
  harmony: "#1a2a5a",
  lawless: "#4a1a1a",
  frontier: "#3a2a1a",
  one_way: "#3a3a1a",
  default: "#1a1a3a",
};

function NebulaClouds({ sectorType }: { sectorType?: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const time = useRef(0);
  const nebulaColor =
    SECTOR_NEBULA[sectorType || "default"] || SECTOR_NEBULA.default;
  const texture = useMemo(() => getNebulaTexture(nebulaColor), [nebulaColor]);

  // Generate cloud positions deterministically
  const clouds = useMemo(() => {
    const result: {
      pos: [number, number, number];
      scale: number;
      rot: number;
    }[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.5;
      const dist = 50 + Math.sin(i * 2.3) * 20;
      result.push({
        pos: [
          Math.cos(angle) * dist,
          (Math.sin(i * 1.7) - 0.5) * 30,
          Math.sin(angle) * dist,
        ],
        scale: 25 + Math.sin(i * 3.1) * 15,
        rot: i * 0.7,
      });
    }
    return result;
  }, []);

  useFrame((_, delta) => {
    time.current += delta;
    if (groupRef.current) {
      groupRef.current.rotation.y = time.current * 0.003;
    }
  });

  return (
    <group ref={groupRef}>
      {clouds.map((cloud, i) => (
        <sprite
          key={i}
          position={cloud.pos}
          scale={[cloud.scale, cloud.scale, 1]}
        >
          <spriteMaterial
            map={texture}
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  );
}

// Combat warning pulses
function CombatPulse() {
  const lightRef = useRef<THREE.PointLight>(null);
  const time = useRef(0);

  useFrame((_, delta) => {
    time.current += delta;
    if (lightRef.current) {
      lightRef.current.intensity = 1.5 + Math.sin(time.current * 4) * 1.5;
    }
  });

  return (
    <pointLight
      ref={lightRef}
      position={[0, 10, 0]}
      color="#f85149"
      intensity={1.5}
      distance={80}
    />
  );
}

// Warp speed lines
function WarpStreaks({ count = 60 }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return pos;
  }, [count]);

  useFrame(() => {
    if (!ref.current) return;
    const posAttr = ref.current.geometry.attributes
      .position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 2] += 1.5;
      if (arr[i * 3 + 2] > 40) arr[i * 3 + 2] = -40;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#a371f7"
        size={0.3}
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function AtmosphereEffects({ context, sectorType }: AtmosphereEffectsProps) {
  return (
    <>
      <NebulaClouds sectorType={sectorType} />
      {context === "combat" && <CombatPulse />}
      {context === "warp" && <WarpStreaks />}
    </>
  );
}

export default memo(AtmosphereEffects);
