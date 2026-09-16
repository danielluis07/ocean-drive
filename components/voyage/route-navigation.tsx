import type { StopId } from "@/content/editorial";
import type { VoyageState } from "@/lib/voyage-state";
import { accountStops, getStopStatus, getVisitedProgress, stopNumber } from "@/lib/voyage-view";

type RouteNavigationProps = {
  enhanced: boolean;
  voyage: VoyageState;
  onOpenStop: (stopId: StopId) => void;
};

export default function RouteNavigation({
  enhanced,
  voyage,
  onOpenStop,
}: RouteNavigationProps) {
  const visitedCount = accountStops.filter((stop) =>
    voyage.visitedStops.includes(stop.id),
  ).length;

  return (
    <nav
      id="rota"
      className="route page-shell"
      aria-labelledby="route-title">
      <div className="route__heading">
        <div>
          <h2 id="route-title" tabIndex={-1}>
            Quatro paradas. Uma travessia.
          </h2>
          <p id="route-progress">{getVisitedProgress(voyage)}</p>
        </div>
        <progress max={accountStops.length} value={visitedCount} aria-labelledby="route-progress">
          {visitedCount} de {accountStops.length}
        </progress>
      </div>
      <ol>
        {accountStops.map((stop) => {
          const visited = voyage.visitedStops.includes(stop.id);
          const current = voyage.currentStop === stop.id;

          return (
            <li
              key={stop.id}
              data-status={visited ? "completed" : "available"}>
              {enhanced ? (
                <button
                  type="button"
                  onClick={() => onOpenStop(stop.id)}
                  aria-current={current ? "step" : undefined}>
                  <span>{stopNumber(stop)}</span>
                  <strong>{stop.name}</strong>
                  <small>{stop.context}</small>
                  <em>{getStopStatus(current, visited)}</em>
                </button>
              ) : (
                <a href={`#${stop.id}`}>
                  <span>{stopNumber(stop)}</span>
                  <strong>{stop.name}</strong>
                  <small>{stop.context}</small>
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
