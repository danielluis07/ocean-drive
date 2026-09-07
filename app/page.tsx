"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  sourceRecords,
  stations,
  wrapperDisclosure,
  type SourceId,
  type Station,
  type StationId,
} from "@/content/editorial";
import {
  createInitialExpeditionState,
  evidenceStationIds,
  isEvidenceComplete,
  isStationAvailable,
  loadExpeditionState,
  saveExpeditionState,
  transitionExpedition,
} from "@/lib/expedition-state";

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
  return text
    .split(scientificNames)
    .map((part, index) =>
      scientificNameSet.has(part) ? (
        <i key={`${part}-${index}`}>{part}</i>
      ) : (
        part
      ),
    );
}

function uniqueSources(sourceIds: SourceId[]): SourceId[] {
  return [...new Set(sourceIds)];
}

function InstituteMark() {
  return (
    <svg
      aria-hidden="true"
      className="institute-mark"
      viewBox="0 0 52 52"
      fill="none">
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

function stationStatus(
  station: Station,
  available: boolean,
  completed: boolean,
  current: boolean,
) {
  if (current && completed) return "Estação atual · concluída";
  if (current) return "Estação atual";
  if (completed) return "Concluída · disponível para revisita";
  if (available) return "Disponível";
  if (station.id === "convergencia")
    return "Bloqueada · conclua as três estações de evidência";
  return "Bloqueada · conclua Pulso de Calor";
}

export default function Home() {
  const [expedition, setExpedition] = useState(createInitialExpeditionState);
  const [enhanced, setEnhanced] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [showAllSources, setShowAllSources] = useState(false);

  const availableStationIds = new Set(
    stations
      .filter((station) => isStationAvailable(expedition, station.id))
      .map((station) => station.id),
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setExpedition(loadExpeditionState(sessionStorage));
      } catch {
        setExpedition(createInitialExpeditionState());
      }
      setEnhanced(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!enhanced) return;
    saveExpeditionState(sessionStorage, expedition);
  }, [enhanced, expedition]);

  useEffect(() => {
    function pauseAndPersist() {
      setExpedition((current) => {
        const paused = transitionExpedition(current, {
          type: "set-pause-state",
          pauseState: "paused",
        });
        saveExpeditionState(sessionStorage, paused);
        return paused;
      });
    }

    function pauseWhenHidden() {
      if (document.visibilityState === "hidden") pauseAndPersist();
    }

    document.addEventListener("visibilitychange", pauseWhenHidden);
    window.addEventListener("pagehide", pauseAndPersist);
    return () => {
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      window.removeEventListener("pagehide", pauseAndPersist);
    };
  }, []);

  function focusElement(id: string) {
    requestAnimationFrame(() => {
      const element = document.getElementById(id);
      element?.focus({ preventScroll: true });
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openStation(stationId: StationId) {
    if (!availableStationIds.has(stationId)) return;
    setExpedition((current) =>
      transitionExpedition(current, {
        type: "open-station",
        station: stationId,
      }),
    );
    setShowAllSources(false);
    setAnnouncement(
      `${stations.find((station) => station.id === stationId)!.name}, estação aberta.`,
    );
    focusElement(`${stationId}-title`);
  }

  function changeSignal(station: Station, signalIndex: number) {
    if (signalIndex < 0 || signalIndex >= station.signals.length) return;
    setExpedition((current) =>
      transitionExpedition(current, {
        type: "set-bookmark",
        station: station.id,
        passage: signalIndex,
      }),
    );
    setAnnouncement(
      `${station.name}. Sinal ${signalIndex + 1} de ${station.signals.length}: ${station.signals[signalIndex].title}`,
    );
    focusElement(`${station.id}-signal-${signalIndex + 1}`);
  }

  function completeStation(station: Station) {
    if (station.id === "convergencia") {
      setExpedition((current) =>
        transitionExpedition(current, { type: "connect-expedition" }),
      );
      setAnnouncement(
        "Expedição conectada. As ações finais estão disponíveis.",
      );
      focusElement("expedicao-conectada-title");
      return;
    }
    const nextState = transitionExpedition(expedition, {
      type: "complete-station",
      station: station.id,
    });
    if (nextState === expedition) return;
    const nowEvidenceComplete = isEvidenceComplete(nextState);
    const nextMiddleStation = nextState.middleOrder.find(
      (id) => !nextState.completedStations.includes(id),
    );
    setExpedition(nextState);
    if (station.id === "pulso-de-calor") {
      setAnnouncement(
        "Pulso de Calor concluída. Corais sob Estresse e Respostas Desiguais estão disponíveis; escolha a ordem da rota.",
      );
      focusElement("route-title");
    } else if (nowEvidenceComplete) {
      setAnnouncement(
        "Três estações de evidência concluídas. Convergência está disponível.",
      );
      focusElement("convergencia-title");
    } else if (nextMiddleStation) {
      const nextStation = stations.find(
        (item) => item.id === nextMiddleStation,
      )!;
      setAnnouncement(
        `${station.name} concluída. Próxima estação: ${nextStation.name}.`,
      );
      focusElement(`${nextMiddleStation}-title`);
    }
  }

  function restartExpedition() {
    setExpedition((current) =>
      transitionExpedition(current, { type: "restart-expedition" }),
    );
    setShowAllSources(false);
    setAnnouncement(
      "Expedição reiniciada. Pulso de Calor é a única estação disponível.",
    );
    focusElement("pulso-de-calor-title");
  }

  function showSources() {
    setShowAllSources(true);
    setAnnouncement("Caderno completo de fontes aberto.");
    focusElement("fontes-da-expedicao-title");
  }

  return (
    <div
      className="expedition"
      data-enhanced={enhanced}
      data-connected={expedition.connected}>
      <a className="skip-link" href="#conteudo-principal">
        Pular para o conteúdo
      </a>
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <main id="conteudo-principal">
        <header className="ocean-opening">
          <div className="ocean-opening__wash" aria-hidden="true">
            <span className="current current--one" />
            <span className="current current--two" />
            <span className="current current--three" />
          </div>
          <div className="topline page-shell">
            <a
              className="identity"
              href="#conteudo-principal"
              aria-label="Instituto Maré Aberta, início">
              <InstituteMark />
              <span>
                Instituto<strong>Maré Aberta</strong>
              </span>
            </a>
            <p>
              Observatório<strong>Atlântico Vivo</strong>
            </p>
          </div>
          <div className="opening-copy page-shell">
            <h1>
              Conduza a expedição e <em>conecte os sinais</em> de um oceano em
              mudança.
            </h1>
            <div className="opening-note">
              <p>
                <strong>Banco dos Abrolhos · 2019</strong>Do calor acumulado às
                respostas dos corais, percorra doze sinais construídos a partir
                de observações históricas.
              </p>
              <a href="#rota">Iniciar leitura</a>
            </div>
          </div>
          <div className="horizon-note page-shell">
            <span aria-hidden="true" />
            <p>Pesquisa histórica · expedição fictícia</p>
          </div>
        </header>

        <section
          className="editorial-intro page-shell"
          aria-labelledby="sobre-a-expedicao">
          <div>
            <h2 id="sobre-a-expedicao">
              Uma rota composta para aproximar evidências que aconteceram em
              tempos, lugares e escalas diferentes.
            </h2>
          </div>
          <div className="editorial-intro__copy">
            <p>
              O Instituto Maré Aberta e o Observatório Atlântico Vivo dão forma
              a uma comissão ficcional. A pesquisa é real, e cada afirmação
              conduz aos registros que sustentam — e limitam — sua leitura.
            </p>
            <details className="disclosure" open>
              <summary>Pesquisa histórica · expedição fictícia</summary>
              <p>{wrapperDisclosure}</p>
            </details>
          </div>
        </section>

        <nav
          id="rota"
          className="route page-shell"
          aria-labelledby="route-title">
          <div className="route__heading">
            <div>
              <h2 id="route-title" tabIndex={-1}>
                Quatro estações. Doze sinais.
              </h2>
              <p>
                {
                  expedition.completedStations.filter((id) =>
                    evidenceStationIds.includes(id),
                  ).length
                }{" "}
                de 3 estações de evidência concluídas
              </p>
            </div>
            <progress
              max="3"
              value={
                expedition.completedStations.filter((id) =>
                  evidenceStationIds.includes(id),
                ).length
              }>
              {expedition.completedStations.length} de 3
            </progress>
          </div>
          <ol>
            {stations.map((station, index) => {
              const available = availableStationIds.has(station.id);
              const completed =
                expedition.completedStations.includes(station.id) ||
                (station.id === "convergencia" && expedition.connected);
              const current = expedition.currentStation === station.id;
              return (
                <li
                  key={station.id}
                  data-status={
                    completed ? "completed" : available ? "available" : "locked"
                  }>
                  {enhanced ? (
                    <button
                      type="button"
                      onClick={() => openStation(station.id)}
                      disabled={!available}
                      aria-current={current ? "step" : undefined}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{station.name}</strong>
                      <small>{station.role}</small>
                      <em>
                        {stationStatus(station, available, completed, current)}
                      </em>
                    </button>
                  ) : (
                    <a href={`#${station.id}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{station.name}</strong>
                      <small>{station.role}</small>
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
          {expedition.middleOrder.length === 2 ? (
            <p className="route__order">
              Ordem escolhida:{" "}
              {expedition.middleOrder
                .map(
                  (id) => stations.find((station) => station.id === id)!.name,
                )
                .join(" → ")}
            </p>
          ) : null}
        </nav>

        <div className="stations">
          {stations.map((station, stationIndex) => {
            const activeSignalIndex = expedition.bookmarks[station.id];
            const stationCompleted = expedition.completedStations.includes(
              station.id,
            );
            const isCurrent = expedition.currentStation === station.id;
            return (
              <article
                className={`station ${station.id === "convergencia" ? "station--convergence" : ""}`}
                id={station.id}
                key={station.id}
                aria-labelledby={`${station.id}-title`}
                data-current={isCurrent}
                data-available={availableStationIds.has(station.id)}>
                <header className="station__header page-shell">
                  <div className="station__number" aria-hidden="true">
                    {String(stationIndex + 1).padStart(2, "0")}
                  </div>
                  <div className="station__identity">
                    <h2 id={`${station.id}-title`} tabIndex={-1}>
                      {station.name}
                    </h2>
                    <p>{station.role}</p>
                    {enhanced ? (
                      <span className="station__state">
                        {stationCompleted ||
                        (station.id === "convergencia" && expedition.connected)
                          ? "Concluída"
                          : `${activeSignalIndex + 1} de ${station.signals.length} sinais`}
                      </span>
                    ) : null}
                  </div>
                  <p className="station__introduction">
                    {station.introduction}
                  </p>
                </header>
                <div className="signals page-shell">
                  {station.signals.map((signal, signalIndex) => {
                    const sources = uniqueSources(
                      signal.claims.flatMap((claim) => claim.sources),
                    );
                    return (
                      <section
                        className="signal"
                        key={signal.title}
                        data-active={activeSignalIndex === signalIndex}
                        aria-labelledby={`${station.id}-signal-${signalIndex + 1}`}>
                        <div className="signal__marker" aria-hidden="true">
                          <span>
                            {stationIndex + 1}.{signalIndex + 1}
                          </span>
                        </div>
                        <div className="signal__body">
                          <p className="signal__position">
                            Sinal {signalIndex + 1} de {station.signals.length}
                          </p>
                          <h3
                            id={`${station.id}-signal-${signalIndex + 1}`}
                            tabIndex={-1}>
                            {signal.title}
                          </h3>
                          <div className="signal__claims">
                            {signal.claims.map((claim) => (
                              <p key={claim.text}>
                                {formatScientificNames(claim.text)}
                              </p>
                            ))}
                          </div>
                          <details className="logbook">
                            <summary>
                              <span>
                                Caderno de bordo
                                <small>
                                  {sources.length}{" "}
                                  {sources.length === 1
                                    ? "registro"
                                    : "registros"}
                                </small>
                              </span>
                              <span className="logbook__action">
                                Fontes e limites
                              </span>
                            </summary>
                            <div className="source-list">
                              {sources.map((sourceId) => (
                                <SourceCard
                                  key={sourceId}
                                  sourceId={sourceId}
                                />
                              ))}
                            </div>
                          </details>
                          <div
                            className="signal__controls"
                            aria-label={`Navegação dos sinais de ${station.name}`}>
                            <button
                              type="button"
                              onClick={() =>
                                changeSignal(station, signalIndex - 1)
                              }
                              disabled={signalIndex === 0}>
                              Sinal anterior
                            </button>
                            <p aria-hidden="true">
                              {String(signalIndex + 1).padStart(2, "0")} / 03
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                changeSignal(station, signalIndex + 1)
                              }
                              disabled={
                                signalIndex === station.signals.length - 1
                              }>
                              Próximo sinal
                            </button>
                          </div>
                          {signalIndex === station.signals.length - 1 &&
                          !stationCompleted &&
                          !expedition.connected ? (
                            <div className="station__completion">
                              <p>
                                {station.id === "convergencia"
                                  ? "Os três sinais estão conectados. Confirme para concluir a expedição."
                                  : "Os três sinais desta estação foram percorridos. A conclusão só acontece com sua confirmação."}
                              </p>
                              <button
                                type="button"
                                onClick={() => completeStation(station)}>
                                {station.id === "convergencia"
                                  ? "Conectar expedição"
                                  : "Continuar expedição"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </section>
                    );
                  })}
                </div>
                <footer className="station__footer page-shell">
                  <p>Pesquisa histórica · expedição fictícia</p>
                  <button
                    type="button"
                    onClick={() => focusElement("route-title")}>
                    Voltar à rota
                  </button>
                </footer>
              </article>
            );
          })}
        </div>

        <section
          className="connected page-shell"
          aria-labelledby="expedicao-conectada-title"
          hidden={!expedition.connected}>
          <div>
            <h2 id="expedicao-conectada-title" tabIndex={-1}>
              Expedição conectada.
            </h2>
            <p>
              Você aproximou doze sinais sem apagar as diferenças entre tempos,
              lugares, organismos e métodos.
            </p>
          </div>
          <div
            className="connected__actions"
            aria-label="Ações da expedição conectada">
            <button type="button" onClick={() => focusElement("route-title")}>
              Revisitar estações
            </button>
            <button type="button" onClick={showSources}>
              Consultar fontes
            </button>
            <button type="button" onClick={restartExpedition}>
              Recomeçar expedição
            </button>
          </div>
        </section>

        <section
          className="all-sources page-shell"
          id="fontes-da-expedicao"
          aria-labelledby="fontes-da-expedicao-title"
          hidden={!showAllSources}>
          <header>
            <h2 id="fontes-da-expedicao-title" tabIndex={-1}>
              Fontes da expedição
            </h2>
            <p>Oito registros sustentam e delimitam os sinais percorridos.</p>
          </header>
          <div className="source-list">
            {(Object.keys(sourceRecords) as SourceId[]).map((sourceId) => (
              <SourceCard key={sourceId} sourceId={sourceId} />
            ))}
          </div>
        </section>

        <footer className="closing">
          <div className="closing__inner page-shell">
            <div className="identity identity--closing">
              <InstituteMark />
              <span>
                Instituto<strong>Maré Aberta</strong>
              </span>
            </div>
            <p>
              Observatório Atlântico Vivo
              <span>Uma composição retrospectiva sobre Abrolhos em 2019.</span>
            </p>
            <a href="#conteudo-principal">Voltar ao início</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
