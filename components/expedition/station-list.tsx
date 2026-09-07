import Station from "@/components/expedition/station";
import {
  stations,
  type Station as StationRecord,
  type StationId,
} from "@/content/editorial";
import type { ExpeditionState } from "@/lib/expedition-state";

type StationListProps = {
  availableStationIds: Set<StationId>;
  enhanced: boolean;
  expedition: ExpeditionState;
  onChangeSignal: (station: StationRecord, signalIndex: number) => void;
  onComplete: (station: StationRecord) => void;
};

export default function StationList({
  availableStationIds,
  enhanced,
  expedition,
  onChangeSignal,
  onComplete,
}: StationListProps) {
  return (
    <div className="stations">
      {stations.map((station, index) => (
        <Station
          key={station.id}
          activeSignalIndex={expedition.bookmarks[station.id]}
          available={availableStationIds.has(station.id)}
          connected={expedition.connected}
          current={expedition.currentStation === station.id}
          enhanced={enhanced}
          index={index}
          onChangeSignal={onChangeSignal}
          onComplete={onComplete}
          station={station}
          stationCompleted={expedition.completedStations.includes(station.id)}
        />
      ))}
    </div>
  );
}
