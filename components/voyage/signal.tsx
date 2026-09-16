import ScientificNames from "@/components/voyage/scientific-names";
import SourceCard from "@/components/voyage/source-card";
import type { Signal as SignalRecord, Stop } from "@/content/editorial";
import { stopNumber, uniqueSources } from "@/lib/voyage-view";
import { returnToSignal } from "@/lib/reader-interactions";

type SignalProps = {
  active: boolean;
  index: number;
  onChange: (stop: Stop, signalIndex: number) => void;
  signal: SignalRecord;
  stop: Stop;
};

export default function Signal({
  active,
  index,
  onChange,
  signal,
  stop,
}: SignalProps) {
  const sources = uniqueSources(
    signal.claims.flatMap((claim) => claim.sources),
  );
  const isLastSignal = index === stop.signals.length - 1;

  return (
    <section
      className="signal"
      data-active={active}
      aria-labelledby={`${stop.id}-signal-${index + 1}`}>
      <div className="signal__marker" aria-hidden="true">
        <span>
          {Number(stopNumber(stop))}.{index + 1}
        </span>
      </div>
      <div className="signal__body">
        <p className="signal__position">
          Sinal {index + 1} de {stop.signals.length}
        </p>
        <h3 id={`${stop.id}-signal-${index + 1}`} tabIndex={-1}>
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
          role="group"
          aria-label={`Navegação dos sinais de ${stop.name}`}>
          <button
            type="button"
            onClick={() => onChange(stop, index - 1)}
            disabled={index === 0}>
            Sinal anterior
          </button>
          <p aria-hidden="true">
            {String(index + 1).padStart(2, "0")} / 03
          </p>
          <button
            type="button"
            onClick={() => onChange(stop, index + 1)}
            disabled={isLastSignal}>
            Próximo sinal
          </button>
        </div>
      </div>
    </section>
  );
}
