import ScientificNames from "@/components/expedition/scientific-names";
import { sourceRecords, type SourceId } from "@/content/editorial";

export default function SourceCard({ sourceId }: { sourceId: SourceId }) {
  const source = sourceRecords[sourceId];

  return (
    <article className="source-card">
      <div className="source-card__heading">
        <p>{source.kind}</p>
        <h4>{source.credit}</h4>
      </div>
      <p className="source-card__title">
        <cite>{source.title}</cite>
        <span>{source.publication}</span>
      </p>
      <dl>
        <div>
          <dt>Localizador exato</dt>
          <dd>
            <ScientificNames text={source.locator} />
          </dd>
        </div>
        <div>
          <dt>O que sustenta</dt>
          <dd>
            <ScientificNames text={source.support} />
          </dd>
        </div>
        <div>
          <dt>Limite da evidência</dt>
          <dd>
            <ScientificNames text={source.boundary} />
          </dd>
        </div>
      </dl>
      <a href={source.href} target="_blank" rel="noreferrer">
        Acessar fonte
        <span className="visually-hidden"> (abre em uma nova aba)</span>
        <svg aria-hidden="true" viewBox="0 0 16 16">
          <path d="M6 3h7v7M13 3 5.5 10.5M11 9v4H3V5h4" />
        </svg>
      </a>
    </article>
  );
}
