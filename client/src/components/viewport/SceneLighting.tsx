import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CONTEXT_COLORS } from "./constants";

type Context = "ambient" | "combat" | "docked" | "danger" | "warp";

export default function SceneLighting({ context }: { context: Context }) {
  const spotRef = useRef<THREE.SpotLight>(null);
  const time = useRef(0);
  const c = CONTEXT_COLORS[context] || CONTEXT_COLORS.ambient;

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
      <ambientLight color={c.main} intensity={c.intensity * 1.5} />
      <directionalLight
        position={[30, 20, 15]}
        color="#fffbe8"
        intensity={1.2}
      />
      <spotLight
        ref={spotRef}
        position={[8, 12, 8]}
        color={c.accent}
        intensity={3}
        angle={0.7}
        penumbra={0.6}
        distance={60}
      />
      <pointLight
        position={[-15, -8, 8]}
        color="#e847a0"
        intensity={1.0}
        distance={40}
      />
      <pointLight
        position={[0, -10, 12]}
        color="#8899bb"
        intensity={0.8}
        distance={40}
      />
      {/* Fill light from below to illuminate ship underside */}
      <pointLight
        position={[0, -5, 0]}
        color="#334466"
        intensity={0.6}
        distance={30}
      />
    </>
  );
}
