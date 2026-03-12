import { memo, useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { PLANET_CLASSES } from "./constants";

interface SectorPlanetProps {
  planetId: string;
  name: string;
  planetClass: string;
  position: THREE.Vector3;
  owned: boolean;
  onClick?: () => void;
}

// Generate a simple procedural texture for a planet class
function generatePlanetTexture(planetClass: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const config = PLANET_CLASSES[planetClass] || PLANET_CLASSES.H;
  const base = new THREE.Color(config.baseColor);

  // Fill base
  ctx.fillStyle = config.baseColor;
  ctx.fillRect(0, 0, 256, 256);

  // Add noise bands for visual interest
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x += 4) {
      const noise =
        Math.sin(y * 0.08 + x * 0.02) * 0.15 +
        Math.sin(y * 0.03 - x * 0.05) * 0.1 +
        Math.sin((x + y) * 0.04) * 0.08;
      const r = Math.max(0, Math.min(255, base.r * 255 + noise * 60));
      const g = Math.max(0, Math.min(255, base.g * 255 + noise * 60));
      const b = Math.max(0, Math.min(255, base.b * 255 + noise * 60));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 4, 1);
    }
  }

  // Class-specific features
  if (planetClass === "G") {
    // Gas giant bands
    for (let i = 0; i < 8; i++) {
      const y = 20 + i * 30 + Math.sin(i * 1.5) * 10;
      ctx.fillStyle = `rgba(180,140,80,${0.15 + Math.random() * 0.15})`;
      ctx.fillRect(0, y, 256, 12 + Math.random() * 8);
    }
  } else if (planetClass === "V") {
    // Volcanic glow cracks
    for (let i = 0; i < 20; i++) {
      ctx.strokeStyle = `rgba(255,${60 + Math.random() * 40},0,${0.4 + Math.random() * 0.3})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 256, Math.random() * 256);
      ctx.lineTo(Math.random() * 256, Math.random() * 256);
      ctx.stroke();
    }
  } else if (planetClass === "O") {
    // Ocean with small continents
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = `rgba(60,130,60,${0.3 + Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * 256,
        Math.random() * 256,
        15 + Math.random() * 25,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  } else if (planetClass === "F") {
    // Ice crystal patches
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = `rgba(220,240,255,${0.2 + Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * 256,
        Math.random() * 256,
        8 + Math.random() * 15,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Cache textures per class
const textureCache = new Map<string, THREE.CanvasTexture>();
function getPlanetTexture(planetClass: string): THREE.CanvasTexture {
  if (!textureCache.has(planetClass)) {
    textureCache.set(planetClass, generatePlanetTexture(planetClass));
  }
  return textureCache.get(planetClass)!;
}

function SectorPlanet({
  name,
  planetClass,
  position,
  owned,
  onClick,
}: SectorPlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const config = PLANET_CLASSES[planetClass] || PLANET_CLASSES.H;
  const texture = useMemo(() => getPlanetTexture(planetClass), [planetClass]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <group position={position.toArray()}>
      {/* Planet sphere */}
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[config.scale, 32, 32]} />
        <meshStandardMaterial
          map={texture}
          emissive={config.emissive}
          emissiveIntensity={0.3}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Atmosphere glow */}
      <mesh scale={[1.08, 1.08, 1.08]}>
        <sphereGeometry args={[config.scale, 24, 24]} />
        <meshBasicMaterial
          color={config.atmosphereColor}
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Ownership ring */}
      {owned && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[config.scale + 1, 0.08, 8, 48]} />
          <meshBasicMaterial color="#56d4dd" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Label */}
      <Html
        position={[0, config.scale + 1.5, 0]}
        center
        style={{
          color: "#8899bb",
          fontSize: "10px",
          fontFamily: "'Share Tech Mono', monospace",
          textTransform: "uppercase",
          letterSpacing: "1px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          textShadow: "0 0 4px rgba(0,0,0,0.8)",
        }}
      >
        {name}{" "}
        <span style={{ color: "#56d4dd", fontSize: "8px" }}>
          [{planetClass}]
        </span>
      </Html>
    </group>
  );
}

export default memo(SectorPlanet);
