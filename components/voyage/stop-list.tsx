import Stop from "@/components/voyage/stop";
import type { Stop as StopRecord, StopId } from "@/content/editorial";
import type { VoyageState } from "@/lib/voyage-state";
import { accountStops } from "@/lib/voyage-view";

type StopListProps = {
  enhanced: boolean;
  signalPages: Partial<Record<StopId, number>>;
  voyage: VoyageState;
  onChangeSignal: (stop: StopRecord, signalIndex: number) => void;
};

export default function StopList({
  enhanced,
  signalPages,
  voyage,
  onChangeSignal,
}: StopListProps) {
  return (
    <div className="stations">
      {accountStops.map((stop) => (
        <Stop
          key={stop.id}
          activeSignalIndex={signalPages[stop.id] ?? 0}
          current={voyage.currentStop === stop.id}
          enhanced={enhanced}
          onChangeSignal={onChangeSignal}
          stop={stop}
          visited={voyage.visitedStops.includes(stop.id)}
        />
      ))}
    </div>
  );
}
