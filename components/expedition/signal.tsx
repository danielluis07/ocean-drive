import ScientificNames from "@/components/expedition/scientific-names";
import SourceCard from "@/components/expedition/source-card";
import type { Signal as SignalRecord, Station } from "@/content/editorial";
import { uniqueSources } from "@/lib/expedition-view";
import { returnToSignal } from "@/lib/reader-interactions";

type SignalProps = {
  active: boolean;
  connected: boolean;
  index: number;
  onChange: (station: Station, signalIndex: number) => void;
  onComplete: (station: Station) => void;
  signal: SignalRecord;
  station: Station;
  stationCompleted: boolean;
  stationIndex: number;
};

export default function Signal({
  active,
  connected,
  index,
  onChange,
  onComplete,
  signal,
  station,
  stationCompleted,
  stationIndex,
}: SignalProps) {
  const sources = uniqueSources(
    signal.claims.flatMap((claim) => claim.sources),
  );
  const isLastSignal = index === station.signals.length - 1;

  return (
    <section
      className="signal"
      data-active={active}
      aria-labelledby={`${station.id}-signal-${index + 1}`}>
      <div className="signal__marker" aria-hidden="true">
        <span>
          {stationIndex + 1}.{index + 1}
        </span>
      </div>
      <div className="signal__body">
        <p className="signal__position">
          Sinal {index + 1} de {station.signals.length}
        </p>
        <h3 id={`${station.id}-signal-${index + 1}`} tabIndex={-1}>
          {signal.title}
        </h3>
        <div className="signal__claims">
          {signal.claims.map((claim) => (
            <p key={claim.text}>
              <ScientificNames text={claim.text} />
            </p>
          ))}
        </div>
        <details className="logbook">
          <summary>
            <span>
              Caderno de bordo
              <small>
                {sources.length} {sources.length === 1 ? "registro" : "registros"}
              </small>
            </span>
            <span className="logbook__action">Fontes e limites</span>
          </summary>
          <div className="source-list">
            {sources.map((sourceId) => (
              <SourceCard key={sourceId} sourceId={sourceId} />
            ))}
            <button className="logbook__return" type="button" onClick={(event) => returnToSignal(event.currentTarget)}>
              Voltar ao sinal
            </button>
          </div>
        </details>
        <div
          className="signal__controls"
          aria-label={`Navegação dos sinais de ${station.name}`}>
          <button
            type="button"
            onClick={() => onChange(station, index - 1)}
            disabled={index === 0}>
            Sinal anterior
          </button>
          <p aria-hidden="true">
            {String(index + 1).padStart(2, "0")} / 03
          </p>
          <button
            type="button"
            onClick={() => onChange(station, index + 1)}
            disabled={isLastSignal}>
            Próximo sinal
          </button>
        </div>
        {isLastSignal && !stationCompleted && !connected ? (
          <div className="station__completion">
            <p>
              {station.id === "convergencia"
                ? "Os três sinais estão conectados. Confirme para concluir a expedição."
                : "Os três sinais desta estação foram percorridos. A conclusão só acontece com sua confirmação."}
            </p>
            <button type="button" onClick={() => onComplete(station)}>
              {station.id === "convergencia"
                ? "Conectar expedição"
                : "Continuar expedição"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
