import Signal from "@/components/expedition/signal";
import type { Station as StationRecord } from "@/content/editorial";
import { focusAndScrollToElement } from "@/lib/expedition-view";

type StationProps = {
  activeSignalIndex: number;
  available: boolean;
  connected: boolean;
  current: boolean;
  enhanced: boolean;
  index: number;
  onChangeSignal: (station: StationRecord, signalIndex: number) => void;
  onComplete: (station: StationRecord) => void;
  station: StationRecord;
  stationCompleted: boolean;
};

export default function Station({
  activeSignalIndex,
  available,
  connected,
  current,
  enhanced,
  index,
  onChangeSignal,
  onComplete,
  station,
  stationCompleted,
}: StationProps) {
  return (
    <article
      className={`station ${station.id === "convergencia" ? "station--convergence" : ""}`}
      id={station.id}
      aria-labelledby={`${station.id}-title`}
      data-current={current}
      data-available={available}>
      <header className="station__header page-shell">
        <div className="station__number" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="station__identity">
          <h2 id={`${station.id}-title`} tabIndex={-1}>
            {station.name}
          </h2>
          <p>{station.role}</p>
          {enhanced ? (
            <span className="station__state">
              {stationCompleted ||
              (station.id === "convergencia" && connected)
                ? "Concluída"
                : `${activeSignalIndex + 1} de ${station.signals.length} sinais`}
            </span>
          ) : null}
        </div>
        <p className="station__introduction">{station.introduction}</p>
      </header>
      <div className="signals page-shell">
        {station.signals.map((signal, signalIndex) => (
          <Signal
            key={signal.title}
            active={activeSignalIndex === signalIndex}
            connected={connected}
            index={signalIndex}
            onChange={onChangeSignal}
            onComplete={onComplete}
            signal={signal}
            station={station}
            stationCompleted={stationCompleted}
            stationIndex={index}
          />
        ))}
      </div>
      <footer className="station__footer page-shell">
        <p>Pesquisa histórica · expedição fictícia</p>
        <button
          type="button"
          onClick={() => focusAndScrollToElement("route-title")}>
          Voltar à rota
        </button>
      </footer>
    </article>
  );
}
