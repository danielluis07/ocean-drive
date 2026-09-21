import Stop from "@/components/voyage/stop";
import type { VoyageState } from "@/lib/voyage-state";
import { accountStops } from "@/lib/voyage-view";

type StopListProps = {
  enhanced: boolean;
  voyage: VoyageState;
};

// Stops 01–04 in route order, every account in full.
export default function StopList({ enhanced, voyage }: StopListProps) {
  return (
    <div>
      {accountStops.map((stop) => (
        <Stop key={stop.id} enhanced={enhanced} stop={stop} visited={voyage.visitedStops.includes(stop.id)} />
      ))}
    </div>
  );
}
