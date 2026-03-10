import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";

interface OtherShipProps {
  username: string;
  shipTypeId?: string;
  position: THREE.Vector3;
}

export default function OtherShip({
  username,
  shipTypeId = "scout",
  position,
}: OtherShipProps) {
  const groupRef = useRef<THREE.Group>(null);
  const time = useRef(Math.random() * 100); // stagger animations

  const modelPath = `/models/ships/${shipTypeId}.glb`;
  let scene: THREE.Group;
  try {
    const result = useGLTF(modelPath);
    scene = result.scene;
  } catch {
    // Fallback to scout if model not found
    const result = useGLTF("/models/ships/scout.glb");
    scene = result.scene;
  }

  useFrame((_, delta) => {
    time.current += delta;
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(time.current * 0.25) * 0.02;
      groupRef.current.position.y =
        position.y + Math.sin(time.current * 0.4) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position.toArray()}>
      <primitive
        object={scene.clone()}
        scale={[0.8, 0.8, 0.8]}
        rotation={[0, Math.PI * Math.random(), 0]}
      />
      {/* Engine glow */}
      <pointLight
        position={[0, 0, 0.6]}
        color="#e847a0"
        intensity={0.8}
        distance={5}
      />
      {/* Username label */}
      <Html
        position={[0, 1.5, 0]}
        center
        style={{
          color: "#6e7681",
          fontSize: "9px",
          fontFamily: "'Share Tech Mono', monospace",
          textTransform: "uppercase",
          letterSpacing: "1px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          textShadow: "0 0 4px rgba(0,0,0,0.8)",
        }}
      >
        {username}
      </Html>
    </group>
  );
}
