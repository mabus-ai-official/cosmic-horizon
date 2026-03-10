import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface EngineTrailProps {
  color?: string;
  count?: number;
  speed?: number;
}

export default function EngineTrail({
  color = "#e847a0",
  count = 80,
  speed = 1,
}: EngineTrailProps) {
  const ref = useRef<THREE.Points>(null);
  const time = useRef(0);

  const [positions, lifetimes, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const life = new Float32Array(count);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Start clustered at origin (engine position)
      pos[i * 3] = (Math.random() - 0.5) * 0.4;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
      life[i] = Math.random(); // stagger initial lifetimes
      // Radial drift outward from center
      vel[i * 3] = (Math.random() - 0.5) * 0.03;
      vel[i * 3 + 1] = (Math.random() - 0.3) * 0.02; // slight upward bias
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.03;
    }
    return [pos, life, vel];
  }, [count]);

  const sizes = useMemo(() => {
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      s[i] = 0.1 + Math.random() * 0.15;
    }
    return s;
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    time.current += delta;
    const posAttr = ref.current.geometry.attributes
      .position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      lifetimes[i] += delta * speed * 0.8;
      if (lifetimes[i] > 1) {
        // Reset particle
        lifetimes[i] = 0;
        arr[i * 3] = (Math.random() - 0.5) * 0.3;
        arr[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
        arr[i * 3 + 2] = 0;
      } else {
        arr[i * 3] += velocities[i * 3] * speed;
        arr[i * 3 + 1] += velocities[i * 3 + 1] * speed;
        arr[i * 3 + 2] += velocities[i * 3 + 2] * speed;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.15}
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
