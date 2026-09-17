import StopAccount from "@/components/voyage/stop-account";
import { arrivalStopId } from "@/lib/voyage-state";
import { focusAndScrollToElement, stopNumber, type AccountStop } from "@/lib/voyage-view";

type StopProps = {
  current: boolean;
  enhanced: boolean;
  stop: AccountStop;
  visited: boolean;
};

export default function Stop({ current, enhanced, stop, visited }: StopProps) {
  return (
    <article
      className={`station ${stop.id === arrivalStopId ? "station--convergence" : ""}`}
      id={stop.id}
      aria-labelledby={`${stop.id}-title`}
      data-current={current}>
      <header className="station__header page-shell">
        <div className="station__number" aria-hidden="true">
          {stopNumber(stop)}
        </div>
        <div className="station__identity">
          <h2 id={`${stop.id}-title`} tabIndex={-1}>
            {stop.name}
          </h2>
          <p>
            {stop.context} · {stop.account.day}
          </p>
          {enhanced && visited ? <span className="station__state">Visitada</span> : null}
        </div>
        <p className="station__introduction">{stop.introduction}</p>
      </header>
      <div className="page-shell">
        <div className="max-w-[46rem] rounded-2xl bg-card p-6 text-card-foreground sm:p-10">
          <StopAccount id={stop.id} account={stop.account} />
        </div>
      </div>
      <footer className="station__footer page-shell">
        <p>Travessia · viagem fictícia</p>
        <button
          type="button"
          onClick={() => focusAndScrollToElement("route-title")}>
          Voltar à rota
        </button>
      </footer>
    </article>
  );
}
