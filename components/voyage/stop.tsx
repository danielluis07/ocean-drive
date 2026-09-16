import Signal from "@/components/voyage/signal";
import type { Stop as StopRecord } from "@/content/editorial";
import { arrivalStopId } from "@/lib/voyage-state";
import { focusAndScrollToElement, stopNumber } from "@/lib/voyage-view";

type StopProps = {
  activeSignalIndex: number;
  current: boolean;
  enhanced: boolean;
  onChangeSignal: (stop: StopRecord, signalIndex: number) => void;
  stop: StopRecord;
  visited: boolean;
};

export default function Stop({
  activeSignalIndex,
  current,
  enhanced,
  onChangeSignal,
  stop,
  visited,
}: StopProps) {
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
          <p>{stop.context}</p>
          {enhanced ? (
            <span className="station__state">
              {visited
                ? "Visitada"
                : `${activeSignalIndex + 1} de ${stop.signals.length} sinais`}
            </span>
          ) : null}
        </div>
        <p className="station__introduction">{stop.introduction}</p>
      </header>
      <div className="signals page-shell">
        {stop.signals.map((signal, signalIndex) => (
          <Signal
            key={signal.title}
            active={activeSignalIndex === signalIndex}
            index={signalIndex}
            onChange={onChangeSignal}
            signal={signal}
            stop={stop}
          />
        ))}
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
