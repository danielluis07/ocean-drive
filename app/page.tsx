import type { ReactNode } from "react";

import {
  sourceRecords,
  stations,
  wrapperDisclosure,
  type SourceId,
} from "@/content/editorial";

const scientificNameValues = [
  "Mussismilia braziliensis",
  "Millepora alcicornis",
  "M. braziliensis",
  "M. alcicornis",
] as const;
const scientificNameSet = new Set<string>(scientificNameValues);
const scientificNames = new RegExp(
  `(${scientificNameValues.map((name) => name.replace(".", "\\.")).join("|")})`,
  "g",
);

function formatScientificNames(text: string): ReactNode {
  return text.split(scientificNames).map((part, index) =>
    scientificNameSet.has(part) ? <i key={`${part}-${index}`}>{part}</i> : part,
  );
}

function uniqueSources(sourceIds: SourceId[]): SourceId[] {
  return [...new Set(sourceIds)];
}

function InstituteMark() {
  return (
    <svg aria-hidden="true" className="institute-mark" viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="24.5" stroke="currentColor" />
      <path d="M8 30c6-7 12-7 18 0s12 7 18 0" stroke="currentColor" />
      <path d="M8 22c6-7 12-7 18 0s12 7 18 0" stroke="currentColor" />
      <circle cx="26" cy="26" r="2.5" fill="currentColor" />
    </svg>
  );
}

function SourceCard({ sourceId }: { sourceId: SourceId }) {
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
          <dd>{formatScientificNames(source.locator)}</dd>
        </div>
        <div>
          <dt>O que sustenta</dt>
          <dd>{formatScientificNames(source.support)}</dd>
        </div>
        <div>
          <dt>Limite da evidência</dt>
          <dd>{formatScientificNames(source.boundary)}</dd>
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

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>

      <main id="conteudo-principal">
        <header className="ocean-opening">
          <div className="ocean-opening__wash" aria-hidden="true">
            <span className="current current--one" />
            <span className="current current--two" />
            <span className="current current--three" />
          </div>

          <div className="topline page-shell">
            <a className="identity" href="#conteudo-principal" aria-label="Instituto Maré Aberta, início">
              <InstituteMark />
              <span>Instituto<strong>Maré Aberta</strong></span>
            </a>
            <p>Observatório<strong>Atlântico Vivo</strong></p>
          </div>

          <div className="opening-copy page-shell">
            <h1>
              Conduza a expedição e <em>conecte os sinais</em> de um oceano em mudança.
            </h1>
            <div className="opening-note">
              <p>
                <strong>Banco dos Abrolhos · 2019</strong>
                Do calor acumulado às respostas dos corais, percorra doze sinais construídos a partir de observações históricas.
              </p>
              <a href="#rota">Iniciar leitura</a>
            </div>
          </div>

          <div className="horizon-note page-shell">
            <span aria-hidden="true" />
            <p>Pesquisa histórica · expedição fictícia</p>
          </div>
        </header>

        <section className="editorial-intro page-shell" aria-labelledby="sobre-a-expedicao">
          <div>
            <h2 id="sobre-a-expedicao">Uma rota composta para aproximar evidências que aconteceram em tempos, lugares e escalas diferentes.</h2>
          </div>
          <div className="editorial-intro__copy">
            <p>O Instituto Maré Aberta e o Observatório Atlântico Vivo dão forma a uma comissão ficcional. A pesquisa é real, e cada afirmação conduz aos registros que sustentam — e limitam — sua leitura.</p>
            <details className="disclosure" open>
              <summary>Pesquisa histórica · expedição fictícia</summary>
              <p>{wrapperDisclosure}</p>
            </details>
          </div>
        </section>

        <nav id="rota" className="route page-shell" aria-label="Rota editorial">
          <div className="route__heading">
            <h2>Quatro estações. Doze sinais.</h2>
          </div>
          <ol>
            {stations.map((station, index) => (
              <li key={station.id}>
                <a href={`#${station.id}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{station.name}</strong>
                  <small>{station.role}</small>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="stations">
          {stations.map((station, stationIndex) => (
            <article
              className={`station ${station.id === "convergencia" ? "station--convergence" : ""}`}
              id={station.id}
              key={station.id}
              aria-labelledby={`${station.id}-title`}>
              <header className="station__header page-shell">
                <div className="station__number" aria-hidden="true">{String(stationIndex + 1).padStart(2, "0")}</div>
                <div className="station__identity">
                  <h2 id={`${station.id}-title`}>{station.name}</h2>
                  <p>{station.role}</p>
                </div>
                <p className="station__introduction">{station.introduction}</p>
              </header>

              <div className="signals page-shell">
                {station.signals.map((signal, signalIndex) => {
                  const sources = uniqueSources(signal.claims.flatMap((claim) => claim.sources));

                  return (
                    <section className="signal" key={signal.title}>
                      <div className="signal__marker" aria-hidden="true"><span>{stationIndex + 1}.{signalIndex + 1}</span></div>
                      <div className="signal__body">
                        <h3>{signal.title}</h3>
                        <div className="signal__claims">
                          {signal.claims.map((claim) => (
                            <p key={claim.text}>{formatScientificNames(claim.text)}</p>
                          ))}
                        </div>
                        <details className="logbook">
                          <summary>
                            <span>Caderno de bordo<small>{sources.length} {sources.length === 1 ? "registro" : "registros"}</small></span>
                            <span className="logbook__action">Fontes e limites</span>
                          </summary>
                          <div className="source-list">
                            {sources.map((sourceId) => <SourceCard key={sourceId} sourceId={sourceId} />)}
                          </div>
                        </details>
                      </div>
                    </section>
                  );
                })}
              </div>

              <footer className="station__footer page-shell">
                <p>Pesquisa histórica · expedição fictícia</p>
                <a href="#rota">Voltar à rota</a>
              </footer>
            </article>
          ))}
        </div>

        <footer className="closing">
          <div className="closing__inner page-shell">
            <div className="identity identity--closing">
              <InstituteMark />
              <span>Instituto<strong>Maré Aberta</strong></span>
            </div>
            <p>Observatório Atlântico Vivo<span>Uma composição retrospectiva sobre Abrolhos em 2019.</span></p>
            <a href="#conteudo-principal">Voltar ao início</a>
          </div>
        </footer>
      </main>
    </>
  );
}
