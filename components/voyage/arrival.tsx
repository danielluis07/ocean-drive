import { RotateCcw } from "lucide-react";
import Itinerary from "@/components/voyage/itinerary";
import { editorialAction, editorialLabel, editorialShell } from "@/components/voyage/editorial-styles";
import { brand } from "@/content/editorial";
import { cn } from "@/lib/utils";

type ArrivalProps = {
  enhanced: boolean;
  onRestart: () => void;
};

// The editorial counterpart of the Arrival's closing card and itinerary Sheet.
export default function Arrival({ enhanced, onRestart }: ArrivalProps) {
  return (
    <section aria-labelledby="roteiro-completo-title" className="border-t border-border bg-secondary">
      <div
        className={cn(
          editorialShell,
          "grid gap-x-16 gap-y-10 py-16 sm:py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
        )}>
        <div>
          <p className={editorialLabel}>Chegada</p>
          <h2 id="roteiro-completo-title" className="mt-4 text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
            Roteiro completo
          </h2>
          <p className="mt-4 text-xl leading-snug">{brand.nextDeparture}</p>
          {enhanced ? (
            <button type="button" onClick={onRestart} className={cn(editorialAction, "mt-8 bg-card")}>
              <RotateCcw aria-hidden="true" className="size-4" />
              Recomeçar viagem
            </button>
          ) : null}
        </div>
        <div className="max-w-[42rem]">
          <Itinerary />
        </div>
      </div>
    </section>
  );
}
