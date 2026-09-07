import { stations, type StationId } from "@/content/editorial";
import {
  evidenceStationIds,
  type ExpeditionState,
} from "@/lib/expedition-state";
import { getStationStatus } from "@/lib/expedition-view";

type RouteNavigationProps = {
  availableStationIds: Set<StationId>;
  enhanced: boolean;
  expedition: ExpeditionState;
  onOpenStation: (stationId: StationId) => void;
};

export default function RouteNavigation({
  availableStationIds,
  enhanced,
  expedition,
  onOpenStation,
}: RouteNavigationProps) {
  const completedEvidenceCount = expedition.completedStations.filter((id) =>
    evidenceStationIds.includes(id),
  ).length;

  return (
    <nav
      id="rota"
      className="route page-shell"
      aria-labelledby="route-title">
      <div className="route__heading">
        <div>
          <h2 id="route-title" tabIndex={-1}>
            Quatro estações. Doze sinais.
          </h2>
          <p>{completedEvidenceCount} de 3 estações de evidência concluídas</p>
        </div>
        <progress max="3" value={completedEvidenceCount}>
          {completedEvidenceCount} de 3
        </progress>
      </div>
      <ol>
        {stations.map((station, index) => {
          const available = availableStationIds.has(station.id);
          const completed =
            expedition.completedStations.includes(station.id) ||
            (station.id === "convergencia" && expedition.connected);
          const current = expedition.currentStation === station.id;

          return (
            <li
              key={station.id}
              data-status={
                completed ? "completed" : available ? "available" : "locked"
              }>
              {enhanced ? (
                <button
                  type="button"
                  onClick={() => onOpenStation(station.id)}
                  disabled={!available}
                  aria-current={current ? "step" : undefined}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{station.name}</strong>
                  <small>{station.role}</small>
                  <em>
                    {getStationStatus(
                      station,
                      available,
                      completed,
                      current,
                    )}
                  </em>
                </button>
              ) : (
                <a href={`#${station.id}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{station.name}</strong>
                  <small>{station.role}</small>
                </a>
              )}
            </li>
          );
        })}
      </ol>
      {expedition.middleOrder.length === 2 ? (
        <p className="route__order">
          Ordem escolhida:{" "}
          {expedition.middleOrder
            .map((id) => stations.find((station) => station.id === id)!.name)
            .join(" → ")}
        </p>
      ) : null}
    </nav>
  );
}
