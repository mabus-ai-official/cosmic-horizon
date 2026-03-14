import { memo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";

interface SectorOutpostProps {
  outpostId: string;
  name: string;
  isStarMall: boolean;
  position: THREE.Vector3;
  onClick?: () => void;
}

function SectorOutpost({
  name,
  isStarMall,
  position,
  onClick,
}: SectorOutpostProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const time = useRef(0);

  const modelPath = isStarMall
    ? "/models/stations/starmall.glb"
    : "/models/stations/outpost.glb";
  const { scene } = useGLTF(modelPath);

  const scale = isStarMall ? 5.0 : 3.5;
  const accentColor = isStarMall ? "#d29922" : "#56d4dd";

  useFrame((_, delta) => {
    time.current += delta;
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
    }
    if (lightRef.current) {
      // Pulsing dock lights
      lightRef.current.intensity = 1.5 + Math.sin(time.current * 2) * 0.5;
    }
  });

  return (
    <group position={position.toArray()}>
      <group
        ref={groupRef}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <primitive object={scene.clone()} scale={[scale, scale, scale]} />
      </group>

      {/* Station beacon light */}
      <pointLight
        ref={lightRef}
        position={[0, scale + 1, 0]}
        color={accentColor}
        intensity={1.5}
        distance={15}
      />

      {/* Docking ring glow */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <torusGeometry args={[scale + 0.5, 0.05, 8, 32]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.3} />
      </mesh>

      {/* Label */}
      <Html
        position={[0, scale + 3, 0]}
        center
        style={{
          color: isStarMall ? "#d29922" : "#56d4dd",
          fontSize: "11px",
          fontFamily: "'Share Tech Mono', monospace",
          fontWeight: "bold",
          textTransform: "uppercase",
          letterSpacing: "1px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          textShadow: `0 0 6px ${accentColor}40`,
        }}
      >
        {isStarMall ? "★ " : ""}
        {name}
      </Html>
    </group>
  );
}

export default memo(SectorOutpost);
