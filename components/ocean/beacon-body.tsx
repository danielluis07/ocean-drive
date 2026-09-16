import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { MeshBasicMaterial } from "three";

export default function BeaconBody({ index, color, available, completed, animated }: {
  index: number;
  color: string;
  available: boolean;
  completed: boolean;
  animated: boolean;
}) {
  const light = useRef<MeshBasicMaterial>(null);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    if (animated) elapsed.current += Math.min(delta, 0.05);
    if (!light.current) return;
    // Slow, shallow brightness changes retain a visible lamp throughout the cycle.
    const brightness = completed ? 0.55 : animated ? 0.85 + 0.15 * Math.sin(elapsed.current * Math.PI * 2 / (3 + index)) : 1;
    light.current.color.set(available ? color : "#657d79").multiplyScalar(brightness);
  });
  return (
    <>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.7, 1.25, 1.3, 12]} />
        <meshStandardMaterial color={available ? "#dbaa59" : "#657d79"} roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.1, 0]}>
        <cylinderGeometry args={[0.1, 0.14, 2.5, 8]} />
        <meshStandardMaterial color="#f0ead6" />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <sphereGeometry args={[0.35, 8, 6]} />
        <meshBasicMaterial ref={light} color={available ? color : "#657d79"} />
      </mesh>
    </>
  );
}
