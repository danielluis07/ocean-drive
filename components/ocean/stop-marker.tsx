import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { MeshBasicMaterial } from "three";

type StopMarkerProps = {
  position: [number, number];
  color: string;
  visited: boolean;
  animated: boolean;
};

// A placeholder Landmark until island meshes replace it.
export default function StopMarker({ position, color, visited, animated }: StopMarkerProps) {
  const light = useRef<MeshBasicMaterial>(null);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    if (animated) elapsed.current += Math.min(delta, 0.05);
    if (!light.current) return;
    // Slow, shallow brightness changes retain a visible lamp throughout the cycle.
    const brightness = visited ? 0.6 : animated ? 0.85 + 0.15 * Math.sin(elapsed.current * Math.PI * 2 / 4) : 1;
    light.current.color.set(color).multiplyScalar(brightness);
  });
  return (
    <group position={[position[0], 0, position[1]]}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[2.2, 3.4, 1.3, 16]} />
        <meshStandardMaterial color="#dbaa59" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.1, 0]}>
        <cylinderGeometry args={[0.1, 0.14, 2.5, 8]} />
        <meshStandardMaterial color="#f0ead6" />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <sphereGeometry args={[0.6, 12, 8]} />
        <meshBasicMaterial ref={light} color={color} />
      </mesh>
    </group>
  );
}
