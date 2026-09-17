import Itinerary from "@/components/voyage/itinerary";
import { nextDeparture } from "@/content/editorial";

type ArrivalProps = {
  enhanced: boolean;
  onRestart: () => void;
};

// The editorial counterpart of the Arrival's closing card and itinerary Sheet.
export default function Arrival({ enhanced, onRestart }: ArrivalProps) {
  return (
    <section className="page-shell py-20" aria-labelledby="roteiro-completo-title">
      <div className="max-w-[46rem] rounded-2xl bg-card p-6 text-card-foreground sm:p-10">
        <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">{nextDeparture}</p>
        <h2 id="roteiro-completo-title" className="mt-2 mb-6 text-3xl font-semibold tracking-tight">
          Roteiro completo
        </h2>
        <Itinerary />
        {enhanced ? (
          <button
            type="button"
            onClick={onRestart}
            className="mt-8 inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-card-foreground">
            Recomeçar viagem
          </button>
        ) : null}
      </div>
    </section>
  );
}
