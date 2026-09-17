"use client";

import { Check, RotateCcw } from "lucide-react";
import VoyageSheet, { sheetAction, sheetFocus } from "@/components/ocean/voyage-sheet";
import { stops, type StopId } from "@/content/editorial";
import { stopNumber } from "@/lib/voyage-view";

type ChaptersSheetProps = {
  open: boolean;
  currentStop: StopId;
  visitedStops: StopId[];
  onClose: () => void;
  onChoose: (stop: StopId) => void;
  onReadingMode: () => void;
  onRestart: () => void;
  returnFocus: () => HTMLElement | null;
};

// “Capítulos” lists every Stop on the route. Choosing one closes the Sheet and
// moves the Ship there; nothing is gated by what has been visited.
export default function ChaptersSheet({
  open,
  currentStop,
  visitedStops,
  onClose,
  onChoose,
  onReadingMode,
  onRestart,
  returnFocus,
}: ChaptersSheetProps) {
  return (
    <VoyageSheet open={open} onClose={onClose} eyebrow="Travessia" title="Capítulos" returnFocus={returnFocus}>
      <nav aria-label="Paradas da viagem">
        <ol className="flex flex-col gap-1">
          {stops.map((stop) => {
            const current = stop.id === currentStop;
            const visited = visitedStops.includes(stop.id);
            return (
              <li key={stop.id}>
                <button
                  type="button"
                  aria-current={current ? "step" : undefined}
                  data-visited={visited}
                  onClick={() => onChoose(stop.id)}
                  className={`grid min-h-16 w-full grid-cols-[2.5rem_minmax(0,1fr)_1.75rem] items-center gap-x-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-secondary aria-[current=step]:bg-secondary ${sheetFocus}`}>
                  <span className="font-mono text-sm text-muted-foreground">{stopNumber(stop)}</span>
                  <span className="min-w-0">
                    <span className="block text-lg leading-snug font-semibold">{stop.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {stop.context}
                      {current ? (
                        <>
                          {" · "}
                          <span className="font-semibold text-card-foreground">Parada atual</span>
                        </>
                      ) : null}
                    </span>
                  </span>
                  {visited ? (
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-card-foreground text-card">
                      <Check aria-hidden="true" className="size-4" strokeWidth={3} />
                      <span className="sr-only">Visitada</span>
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
        <button type="button" onClick={onReadingMode} className={sheetAction}>
          Modo leitura
        </button>
        <button type="button" onClick={onRestart} className={sheetAction}>
          <RotateCcw aria-hidden="true" className="size-4" />
          Recomeçar viagem
        </button>
      </div>
    </VoyageSheet>
  );
}
