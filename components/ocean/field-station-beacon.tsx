import { useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei/web/Html";
import type { OceanStation } from "@/lib/ocean-config";
import type { VesselPose } from "@/lib/expedition-state";
import { APPROACH_RADIUS, ARRIVAL_RADIUS, stationDistance } from "@/lib/station-approach";

type BeaconProps = {
  station: OceanStation;
  available: boolean;
  completed: boolean;
  active: boolean;
  reading: boolean;
  livePose: RefObject<VesselPose>;
  onStation: (station: OceanStation) => void;
  onLabel?: (label: HTMLButtonElement | null) => void;
};

export default function FieldStationBeacon({ station, available, completed, active, reading, livePose, onStation, onLabel }: BeaconProps) {
  const [near, setNear] = useState(false);
  useFrame(() => {
    const withinReadingDistance = stationDistance(livePose.current, station) <= ARRIVAL_RADIUS + 0.2;
    if (near !== withinReadingDistance) setNear(withinReadingDistance);
  });
  return (
    <group position={station.position}>
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
        <meshBasicMaterial color={available ? station.color : "#657d79"} />
      </mesh>
      {available ? (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
            <ringGeometry args={[APPROACH_RADIUS - 0.15, APPROACH_RADIUS, 64]} />
            <meshBasicMaterial color={station.color} transparent opacity={0.75} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.27, 0]}>
            <circleGeometry args={[APPROACH_RADIUS, 48]} />
            <meshBasicMaterial color={station.color} transparent opacity={completed ? 0.07 : 0.16} depthWrite={false} />
          </mesh>
          <mesh position={[0, 8, 0]}>
            <cylinderGeometry args={[0.12, 0.55, 9, 8, 1, true]} />
            <meshBasicMaterial color={station.color} transparent opacity={completed ? 0.12 : 0.3} depthWrite={false} />
          </mesh>
          {!reading || near ? <Html position={[0, reading ? 8 : 13, 0]} center zIndexRange={[5, 0]}>
            <button
              ref={onLabel}
              className="beacon-label"
              data-station={station.id}
              data-reading={reading}
              type="button"
              disabled={!near || reading || !active}
              onClick={() => onStation(station)}
              tabIndex={active && !reading ? 0 : -1}>
              <span>{completed ? "Concluída · revisite" : station.id === "pulso-de-calor" ? "Primeira estação" : station.id === "convergencia" ? "Síntese da expedição" : "Escolha seu percurso"}</span>
              {station.name}
              <small>{near ? "Ler estação" : "Conduza até o círculo de luz"}</small>
            </button>
          </Html> : null}
        </>
      ) : null}
    </group>
  );
}
