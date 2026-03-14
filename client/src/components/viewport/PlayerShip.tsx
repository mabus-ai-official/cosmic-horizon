import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { SHIP_SCALES } from "./constants";
interface PlayerShipProps {
  shipTypeId: string;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3 | null;
  onArrival?: () => void;
}

export default function PlayerShip({
  shipTypeId,
  position,
  targetPosition,
  onArrival,
}: PlayerShipProps) {
  const groupRef = useRef<THREE.Group>(null);
  const time = useRef(0);
  const currentPos = useRef(position.clone());
  const isFlying = useRef(false);
  const arrived = useRef(false);

  const modelPath = `/models/ships/${shipTypeId}.glb`;
  const { scene } = useGLTF(modelPath);

  const scale = SHIP_SCALES[shipTypeId] || 1.0;

  // Reset position when sector changes
  useEffect(() => {
    currentPos.current.copy(position);
    arrived.current = false;
    isFlying.current = false;
  }, [position]);

  // Detect new flight target
  useEffect(() => {
    if (targetPosition) {
      isFlying.current = true;
      arrived.current = false;
    }
  }, [targetPosition]);

  useFrame((_, delta) => {
    time.current += delta;
    if (!groupRef.current) return;

    // Cosmetic flight toward target
    if (isFlying.current && targetPosition && !arrived.current) {
      const dir = targetPosition.clone().sub(currentPos.current);
      const dist = dir.length();

      if (dist < 2) {
        arrived.current = true;
        isFlying.current = false;
        onArrival?.();
      } else {
        // Smooth acceleration/deceleration
        const speed = Math.min(15, Math.max(3, dist * 0.5)) * delta;
        dir.normalize().multiplyScalar(speed);
        currentPos.current.add(dir);

        // Tilt ship in direction of movement
        const tiltX = THREE.MathUtils.clamp(dir.y * 2, -0.3, 0.3);
        const tiltZ = THREE.MathUtils.clamp(-dir.x * 0.5, -0.4, 0.4);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(
          groupRef.current.rotation.x,
          tiltX,
          0.05,
        );
        groupRef.current.rotation.z = THREE.MathUtils.lerp(
          groupRef.current.rotation.z,
          tiltZ,
          0.05,
        );

        // Face direction of travel
        const angle = Math.atan2(dir.x, dir.z);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          groupRef.current.rotation.y,
          angle,
          0.05,
        );
      }
    } else {
      // Idle animation
      groupRef.current.rotation.z = Math.sin(time.current * 0.3) * 0.015;
      groupRef.current.position.y =
        currentPos.current.y + Math.sin(time.current * 0.5) * 0.08;
    }

    groupRef.current.position.x = currentPos.current.x;
    groupRef.current.position.z = currentPos.current.z;
    if (!isFlying.current) {
      groupRef.current.position.y =
        currentPos.current.y + Math.sin(time.current * 0.5) * 0.08;
    } else {
      groupRef.current.position.y = currentPos.current.y;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene.clone()} scale={[scale, scale, scale]} />
    </group>
  );
}
