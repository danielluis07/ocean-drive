import { useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei/web/Html";
import type { OceanStation } from "@/lib/ocean-config";
import type { VesselPose } from "@/lib/expedition-state";
import { APPROACH_RADIUS, ARRIVAL_RADIUS, stationDistance } from "@/lib/station-approach";
import { keepBeaconLabelInView } from "@/lib/beacon-label-position";
import BeaconBody from "@/components/ocean/beacon-body";

type BeaconProps = {
  station: OceanStation;
  index: number;
  reducedMotion: boolean;
  available: boolean;
  completed: boolean;
  active: boolean;
  reading: boolean;
  assisted: boolean;
  low: boolean;
  livePose: RefObject<VesselPose>;
  onStation: (station: OceanStation) => void;
  onLabel?: (label: HTMLButtonElement | null) => void;
};

export default function FieldStationBeacon({ station, index, reducedMotion, available, completed, active, reading, assisted, low, livePose, onStation, onLabel }: BeaconProps) {
  const [near, setNear] = useState(false);
  useFrame(() => {
    const withinReadingDistance = stationDistance(livePose.current, station) <= ARRIVAL_RADIUS + 0.2;
    if (near !== withinReadingDistance) setNear(withinReadingDistance);
  });
  const body = { index, color: station.color, available, completed, animated: active && !reading && !reducedMotion && available && !completed };
  return (
    <group position={station.position}>
      {station.id === "convergencia" && available ? [-1, 1].map((side) => (
        <group key={side} position={[side * 2.6, 0, 0]}>
          <BeaconBody {...body} />
        </group>
      )) : null}
      <BeaconBody {...body} />
      {available ? (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
            <ringGeometry args={[APPROACH_RADIUS - (assisted ? 0.6 : 0.15), APPROACH_RADIUS, low ? 24 : 64]} />
            <meshBasicMaterial color={completed ? "#657d79" : station.color} transparent={!low} opacity={low ? 1 : 0.75} />
          </mesh>
          {!low ? <><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.27, 0]}>
            <circleGeometry args={[APPROACH_RADIUS, 48]} />
            <meshBasicMaterial color={station.color} transparent opacity={assisted ? 0.3 : completed ? 0.07 : 0.16} depthWrite={false} />
          </mesh>
          <mesh position={[0, 8, 0]}>
            <cylinderGeometry args={[0.12, 0.55, 9, 8, 1, true]} />
            <meshBasicMaterial color={station.color} transparent opacity={assisted ? 0.7 : completed ? 0.12 : 0.3} depthWrite={false} />
          </mesh></> : null}
          {!reading || near ? <Html position={[0, reading ? 8 : 13, 0]} center calculatePosition={keepBeaconLabelInView} zIndexRange={[5, 0]}>
            <button
              ref={onLabel}
              className="beacon-label"
              data-station={station.id}
              data-reading={reading}
              data-assisted={assisted}
              type="button"
              disabled={!near || reading || !active}
              onClick={() => onStation(station)}
              tabIndex={active && !reading ? 0 : -1}>
              <span>{completed ? "Concluída · revisite" : station.id === "pulso-de-calor" ? "Primeira estação" : station.id === "convergencia" ? "Síntese da expedição" : "Escolha seu percurso"}</span>
              {station.name}
              <small>{String(index).padStart(2, "0")} · {near ? "Ler estação" : "Conduza até o círculo de luz"}</small>
            </button>
          </Html> : null}
        </>
      ) : null}
    </group>
  );
}
