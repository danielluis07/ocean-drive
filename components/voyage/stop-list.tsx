import Stop from "@/components/voyage/stop";
import type { VoyageState } from "@/lib/voyage-state";
import { accountStops } from "@/lib/voyage-view";

type StopListProps = {
  enhanced: boolean;
  voyage: VoyageState;
};

export default function StopList({ enhanced, voyage }: StopListProps) {
  return (
    <div className="stations">
      {accountStops.map((stop) => (
        <Stop
          key={stop.id}
          current={voyage.currentStop === stop.id}
          enhanced={enhanced}
          stop={stop}
          visited={voyage.visitedStops.includes(stop.id)}
        />
      ))}
    </div>
  );
}
