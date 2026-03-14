import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

interface BridgeView3DProps {
  context: "ambient" | "combat" | "docked" | "danger" | "warp";
  shipType?: string;
}

/** Geometric spaceship with visible hull lines and glowing accents */
function Ship({ shipType }: { shipType?: string }) {
  const group = useRef<THREE.Group>(null);
  const engineGlowL = useRef<THREE.Mesh>(null);
  const engineGlowR = useRef<THREE.Mesh>(null);
  const engineLight = useRef<THREE.PointLight>(null);
  const hullAccent = useRef<THREE.Mesh>(null);
  const time = useRef(0);

  useFrame((_, delta) => {
    time.current += delta;
    if (group.current) {
      group.current.rotation.z = Math.sin(time.current * 0.3) * 0.02;
      group.current.position.y = Math.sin(time.current * 0.5) * 0.08;
    }
    if (engineLight.current) {
      engineLight.current.intensity = 2.5 + Math.sin(time.current * 4) * 0.8;
    }
    // Pulse engine glows
    const enginePulse = 0.7 + Math.sin(time.current * 3) * 0.3;
    if (engineGlowL.current) {
      (engineGlowL.current.material as THREE.MeshBasicMaterial).opacity =
        enginePulse;
      engineGlowL.current.scale.setScalar(
        1 + Math.sin(time.current * 5) * 0.15,
      );
    }
    if (engineGlowR.current) {
      (engineGlowR.current.material as THREE.MeshBasicMaterial).opacity =
        enginePulse;
      engineGlowR.current.scale.setScalar(
        1 + Math.sin(time.current * 5 + 0.5) * 0.15,
      );
    }
    // Hull accent stripe pulse
    if (hullAccent.current) {
      (hullAccent.current.material as THREE.MeshBasicMaterial).opacity =
        0.4 + Math.sin(time.current * 1.5) * 0.15;
    }
  });

  const scale = shipType?.includes("dreadnought")
    ? 2.2
    : shipType?.includes("frigate")
      ? 1.8
      : shipType?.includes("fighter")
        ? 1.3
        : 1.6;

  return (
    <group ref={group} scale={scale} rotation={[0.3, 0, 0]}>
      {/* Main hull */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.45, 2.4, 8]} />
        <meshStandardMaterial
          color="#607080"
          emissive="#1a2a3a"
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.25}
        />
      </mesh>

      {/* Hull accent stripe */}
      <mesh ref={hullAccent} position={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.19, 0.46, 0.12, 8]} />
        <meshBasicMaterial color="#56d4dd" transparent opacity={0.4} />
      </mesh>

      {/* Nose cone */}
      <mesh position={[0, 1.4, 0]}>
        <coneGeometry args={[0.18, 0.6, 8]} />
        <meshStandardMaterial
          color="#8090a0"
          emissive="#202830"
          emissiveIntensity={0.2}
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>

      {/* Cockpit dome */}
      <mesh position={[0, 0.7, 0.16]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial
          color="#56d4dd"
          emissive="#56d4dd"
          emissiveIntensity={0.8}
          metalness={0.95}
          roughness={0.05}
        />
      </mesh>
      {/* Cockpit glow */}
      <pointLight
        position={[0, 0.7, 0.3]}
        color="#56d4dd"
        intensity={0.8}
        distance={2}
      />

      {/* Left wing */}
      <mesh position={[-0.8, -0.2, 0]} rotation={[0, 0, -0.25]}>
        <boxGeometry args={[1.2, 0.06, 0.35]} />
        <meshStandardMaterial
          color="#506070"
          emissive="#151f28"
          emissiveIntensity={0.2}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      {/* Left wingtip light */}
      <mesh position={[-1.35, -0.45, 0]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshBasicMaterial color="#f85149" />
      </mesh>

      {/* Right wing */}
      <mesh position={[0.8, -0.2, 0]} rotation={[0, 0, 0.25]}>
        <boxGeometry args={[1.2, 0.06, 0.35]} />
        <meshStandardMaterial
          color="#506070"
          emissive="#151f28"
          emissiveIntensity={0.2}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      {/* Right wingtip light */}
      <mesh position={[1.35, -0.45, 0]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshBasicMaterial color="#3fb950" />
      </mesh>

      {/* Left engine nacelle */}
      <mesh position={[-0.5, -1.0, 0]}>
        <cylinderGeometry args={[0.14, 0.18, 0.6, 8]} />
        <meshStandardMaterial
          color="#3a4858"
          metalness={0.85}
          roughness={0.15}
        />
      </mesh>
      {/* Left engine exhaust */}
      <mesh ref={engineGlowL} position={[-0.5, -1.35, 0]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshBasicMaterial color="#e847a0" transparent opacity={0.8} />
      </mesh>

      {/* Right engine nacelle */}
      <mesh position={[0.5, -1.0, 0]}>
        <cylinderGeometry args={[0.14, 0.18, 0.6, 8]} />
        <meshStandardMaterial
          color="#3a4858"
          metalness={0.85}
          roughness={0.15}
        />
      </mesh>
      {/* Right engine exhaust */}
      <mesh ref={engineGlowR} position={[0.5, -1.35, 0]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshBasicMaterial color="#e847a0" transparent opacity={0.8} />
      </mesh>

      {/* Engine exhaust light */}
      <pointLight
        ref={engineLight}
        position={[0, -1.5, 0]}
        color="#e847a0"
        intensity={2.5}
        distance={5}
      />

      {/* Rear engine glow haze */}
      <mesh position={[0, -1.6, 0]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial
          color="#e847a0"
          transparent
          opacity={0.06}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** Floating dust particles */
function DustParticles({ count = 200 }) {
  const ref = useRef<THREE.Points>(null);

  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      spd[i] = 0.005 + Math.random() * 0.01;
    }
    return [pos, spd];
  }, [count]);

  useFrame(() => {
    if (!ref.current) return;
    const posAttr = ref.current.geometry.attributes
      .position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 2] += speeds[i];
      if (arr[i * 3 + 2] > 10) arr[i * 3 + 2] = -10;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.02}
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

/** Scene lighting that reacts to context */
function SceneLighting({ context }: { context: BridgeView3DProps["context"] }) {
  const spotRef = useRef<THREE.SpotLight>(null);
  const time = useRef(0);

  const colors = {
    ambient: { main: "#2a2a5e", accent: "#56d4dd", intensity: 0.7 },
    combat: { main: "#5e2a2a", accent: "#f85149", intensity: 1.0 },
    docked: { main: "#3a3a2a", accent: "#d29922", intensity: 0.8 },
    danger: { main: "#5e3a2a", accent: "#f0883e", intensity: 0.9 },
    warp: { main: "#2a2a6e", accent: "#a371f7", intensity: 1.0 },
  };

  const c = colors[context];

  useFrame((_, delta) => {
    time.current += delta;
    if (spotRef.current) {
      if (context === "combat") {
        spotRef.current.intensity = 2 + Math.sin(time.current * 6) * 1.5;
      } else if (context === "warp") {
        spotRef.current.intensity = 3 + Math.sin(time.current * 3) * 1;
      } else {
        spotRef.current.intensity = 1.5 + Math.sin(time.current * 0.8) * 0.3;
      }
    }
  });

  return (
    <>
      <ambientLight color={c.main} intensity={c.intensity} />
      <spotLight
        ref={spotRef}
        position={[3, 5, 4]}
        color={c.accent}
        intensity={1.5}
        angle={0.5}
        penumbra={0.8}
        distance={15}
      />
      <pointLight
        position={[-3, -2, 2]}
        color="#e847a0"
        intensity={0.6}
        distance={10}
      />
      {/* Fill light from front-below to show hull detail */}
      <pointLight
        position={[0, -3, 3]}
        color="#8899bb"
        intensity={0.4}
        distance={10}
      />
    </>
  );
}

export default function BridgeView3D({ context, shipType }: BridgeView3DProps) {
  return (
    <Canvas
      camera={{ position: [0.5, -1.5, 3.5], fov: 50 }}
      style={{ background: "#080818" }}
      gl={{ antialias: true, alpha: false }}
    >
      <fog attach="fog" args={["#080818", 10, 30]} />
      <SceneLighting context={context} />
      <Stars
        radius={50}
        depth={60}
        count={2000}
        factor={3}
        saturation={0.2}
        fade
        speed={0.5}
      />
      <DustParticles />
      <Ship shipType={shipType} />
    </Canvas>
  );
}
