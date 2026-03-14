import { memo, useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

function DustParticles({ count = 300 }) {
  const ref = useRef<THREE.Points>(null);
  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
      spd[i] = 0.003 + Math.random() * 0.008;
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
        color="#aabbcc"
        size={0.08}
        transparent
        opacity={0.35}
        sizeAttenuation
      />
    </points>
  );
}

function SectorSkybox() {
  return (
    <>
      <Stars
        radius={150}
        depth={80}
        count={5000}
        factor={4}
        saturation={0.3}
        fade
        speed={0.3}
      />
      <DustParticles />
    </>
  );
}

export default memo(SectorSkybox);
