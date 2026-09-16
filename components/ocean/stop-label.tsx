import { Html } from "@react-three/drei/web/Html";

type StopLabelProps = {
  anchorage: [number, number];
  number: string;
  name: string;
  onOpen: () => void;
};

// A placeholder opener for the Stop Account, standing where the camera leaves
// room for a Stop Card: beside the Ship on landscape, below it on portrait.
export default function StopLabel({ anchorage, number, name, onOpen }: StopLabelProps) {
  return (
    <Html position={[anchorage[0], 0, anchorage[1]]} zIndexRange={[5, 0]}>
      <button className="stop-label" type="button" onClick={onOpen}>
        <span>Parada {number}</span>
        {name}
        <small>Ler parada</small>
      </button>
    </Html>
  );
}
