import { Check } from "lucide-react";
import { editorialHeading, editorialLabel, editorialShell } from "@/components/voyage/editorial-styles";
import type { StopId } from "@/content/editorial";
import type { VoyageState } from "@/lib/voyage-state";
import { cn } from "@/lib/utils";
import { accountStops, getStopStatus, getVisitedProgress, stopNumber } from "@/lib/voyage-view";

type RouteNavigationProps = {
  enhanced: boolean;
  voyage: VoyageState;
  onOpenStop: (stopId: StopId) => void;
};

// The focus ring sits inside each entry, since neighbours share its edges.
const entry =
  "flex h-full w-full flex-col gap-y-3 bg-card p-5 text-left no-underline transition-colors hover:bg-secondary focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-card-foreground aria-[current=step]:bg-secondary sm:p-6";

// The route's table of contents. Choosing a Stop opens its account, the same
// act that records a Visited Stop in the ocean scene.
export default function RouteNavigation({ enhanced, voyage, onOpenStop }: RouteNavigationProps) {
  const visitedCount = accountStops.filter((stop) => voyage.visitedStops.includes(stop.id)).length;

  return (
    <nav id="rota" aria-labelledby="route-title" className={cn(editorialShell, "scroll-mt-6 pb-20")}>
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-t border-card-foreground pt-6">
        <div>
          <p className={editorialLabel}>A rota</p>
          <h2
            id="route-title"
            tabIndex={-1}
            className={cn(editorialHeading, "mt-3 text-3xl font-semibold tracking-tight sm:text-4xl")}>
            Quatro paradas. Uma travessia.
          </h2>
        </div>
        {enhanced ? (
          <div className="flex w-full max-w-64 flex-col gap-2">
            <p id="route-progress" className="text-sm font-semibold">
              {getVisitedProgress(voyage)}
            </p>
            <progress
              max={accountStops.length}
              value={visitedCount}
              aria-labelledby="route-progress"
              className="h-1 w-full appearance-none overflow-hidden rounded-full bg-secondary [&::-moz-progress-bar]:bg-card-foreground [&::-webkit-progress-bar]:bg-secondary [&::-webkit-progress-value]:bg-card-foreground">
              {visitedCount} de {accountStops.length}
            </progress>
          </div>
        ) : null}
      </div>
      <ol className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {accountStops.map((stop) => {
          const visited = voyage.visitedStops.includes(stop.id);
          const current = voyage.currentStop === stop.id;
          const content = (
            <>
              <span className="block font-mono text-sm text-muted-foreground">{stopNumber(stop)}</span>{" "}
              <span className="block text-xl leading-snug font-semibold">{stop.name}</span>{" "}
              <span className="block text-sm text-muted-foreground">{stop.context}</span>
              {enhanced ? (
                <>
                  {" "}
                  <span
                    className={cn(
                      // The status line pins to the bottom, so it lines up across tiles.
                      "mt-auto flex items-center gap-2 pt-3 text-sm",
                      current ? "font-semibold" : "text-muted-foreground",
                    )}>
                    {visited ? <Check aria-hidden="true" className="size-4 shrink-0" strokeWidth={3} /> : null}
                    {current && !visited ? (
                      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-primary" />
                    ) : null}
                    {getStopStatus(current, visited)}
                  </span>
                </>
              ) : null}
            </>
          );

          return (
            <li key={stop.id} data-status={visited ? "completed" : "available"} className="bg-card">
              {enhanced ? (
                <button
                  type="button"
                  onClick={() => onOpenStop(stop.id)}
                  aria-current={current ? "step" : undefined}
                  className={entry}>
                  {content}
                </button>
              ) : (
                <a href={`#${stop.id}`} className={entry}>
                  {content}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
