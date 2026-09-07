"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  sourceRecords,
  stations,
  wrapperDisclosure,
  type SourceId,
  type Station,
  type StationId,
} from "@/content/editorial";

const evidenceStationIds: StationId[] = ["pulso-de-calor", "corais-sob-estresse", "respostas-desiguais"];
const middleStationIds: StationId[] = ["corais-sob-estresse", "respostas-desiguais"];
const storageKey = "ocean-drive:expedition:v1";

type ExpeditionState = {
  currentStation: StationId;
  bookmarks: Record<StationId, number>;
  completedStations: StationId[];
  middleOrder: StationId[];
  connected: boolean;
};

const initialExpeditionState: ExpeditionState = {
  currentStation: "pulso-de-calor",
  bookmarks: { "pulso-de-calor": 0, "corais-sob-estresse": 0, "respostas-desiguais": 0, convergencia: 0 },
  completedStations: [],
  middleOrder: [],
  connected: false,
};

const scientificNameValues = ["Mussismilia braziliensis", "Millepora alcicornis", "M. braziliensis", "M. alcicornis"] as const;
const scientificNameSet = new Set<string>(scientificNameValues);
const scientificNames = new RegExp(`(${scientificNameValues.map((name) => name.replace(".", "\\.")).join("|")})`, "g");

function formatScientificNames(text: string): ReactNode {
  return text.split(scientificNames).map((part, index) => scientificNameSet.has(part) ? <i key={`${part}-${index}`}>{part}</i> : part);
}

function uniqueSources(sourceIds: SourceId[]): SourceId[] {
  return [...new Set(sourceIds)];
}

function isStationId(value: unknown): value is StationId {
  return stations.some((station) => station.id === value);
}

function restoreExpeditionState(value: string | null): ExpeditionState {
  if (!value) return initialExpeditionState;
  try {
    const candidate = JSON.parse(value) as Partial<ExpeditionState>;
    const completedStations = Array.isArray(candidate.completedStations) ? candidate.completedStations.filter(isStationId) : [];
    const restoredMiddleOrder = Array.isArray(candidate.middleOrder) ? candidate.middleOrder.filter((id) => middleStationIds.includes(id)) : [];
    const middleOrder = restoredMiddleOrder.length === 2 && new Set(restoredMiddleOrder).size === 2
      ? restoredMiddleOrder
      : [];
    const bookmarks = { ...initialExpeditionState.bookmarks };
    if (candidate.bookmarks && typeof candidate.bookmarks === "object") {
      for (const station of stations) {
        const bookmark = candidate.bookmarks[station.id];
        if (Number.isInteger(bookmark) && bookmark! >= 0 && bookmark! < station.signals.length) bookmarks[station.id] = bookmark!;
      }
    }
    const evidenceComplete = evidenceStationIds.every((id) => completedStations.includes(id));
    const currentStation = isStationId(candidate.currentStation) && (candidate.currentStation !== "convergencia" || evidenceComplete)
      ? candidate.currentStation
      : "pulso-de-calor";
    return {
      currentStation,
      bookmarks,
      completedStations: [...new Set(completedStations)],
      middleOrder: [...new Set(middleOrder)],
      connected: candidate.connected === true && evidenceComplete,
    };
  } catch {
    return initialExpeditionState;
  }
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
      <div className="source-card__heading"><p>{source.kind}</p><h4>{source.credit}</h4></div>
      <p className="source-card__title"><cite>{source.title}</cite><span>{source.publication}</span></p>
      <dl>
        <div><dt>Localizador exato</dt><dd>{formatScientificNames(source.locator)}</dd></div>
        <div><dt>O que sustenta</dt><dd>{formatScientificNames(source.support)}</dd></div>
        <div><dt>Limite da evidência</dt><dd>{formatScientificNames(source.boundary)}</dd></div>
      </dl>
      <a href={source.href} target="_blank" rel="noreferrer">
        Acessar fonte<span className="visually-hidden"> (abre em uma nova aba)</span>
        <svg aria-hidden="true" viewBox="0 0 16 16"><path d="M6 3h7v7M13 3 5.5 10.5M11 9v4H3V5h4" /></svg>
      </a>
    </article>
  );
}

function stationStatus(station: Station, available: boolean, completed: boolean, current: boolean) {
  if (current && completed) return "Estação atual · concluída";
  if (current) return "Estação atual";
  if (completed) return "Concluída · disponível para revisita";
  if (available) return "Disponível";
  if (station.id === "convergencia") return "Bloqueada · conclua as três estações de evidência";
  return "Bloqueada · conclua Pulso de Calor";
}

export default function Home() {
  const [expedition, setExpedition] = useState(initialExpeditionState);
  const [enhanced, setEnhanced] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [showAllSources, setShowAllSources] = useState(false);

  const evidenceComplete = evidenceStationIds.every((id) => expedition.completedStations.includes(id));
  const availableStationIds = useMemo(() => {
    const available = new Set<StationId>(["pulso-de-calor"]);
    if (expedition.completedStations.includes("pulso-de-calor")) middleStationIds.forEach((id) => available.add(id));
    if (evidenceComplete) available.add("convergencia");
    return available;
  }, [evidenceComplete, expedition.completedStations]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setExpedition(restoreExpeditionState(sessionStorage.getItem(storageKey)));
      } catch {
        setExpedition(initialExpeditionState);
      }
      setEnhanced(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!enhanced) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(expedition));
    } catch {
      // The Expedition stays usable when browser storage is unavailable.
    }
  }, [enhanced, expedition]);

  function focusElement(id: string) {
    requestAnimationFrame(() => {
      const element = document.getElementById(id);
      element?.focus({ preventScroll: true });
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openStation(stationId: StationId) {
    if (!availableStationIds.has(stationId)) return;
    setExpedition((current) => {
      const choosingMiddleStation = current.middleOrder.length === 0 && middleStationIds.includes(stationId);
      return {
        ...current,
        currentStation: stationId,
        middleOrder: choosingMiddleStation ? [stationId, middleStationIds.find((id) => id !== stationId)!] : current.middleOrder,
      };
    });
    setShowAllSources(false);
    setAnnouncement(`${stations.find((station) => station.id === stationId)!.name}, estação aberta.`);
    focusElement(`${stationId}-title`);
  }

  function changeSignal(station: Station, signalIndex: number) {
    if (signalIndex < 0 || signalIndex >= station.signals.length) return;
    setExpedition((current) => ({ ...current, bookmarks: { ...current.bookmarks, [station.id]: signalIndex } }));
    setAnnouncement(`${station.name}. Sinal ${signalIndex + 1} de ${station.signals.length}: ${station.signals[signalIndex].title}`);
    focusElement(`${station.id}-signal-${signalIndex + 1}`);
  }

  function completeStation(station: Station) {
    if (station.id === "convergencia") {
      setExpedition((current) => ({ ...current, connected: true }));
      setAnnouncement("Expedição conectada. As ações finais estão disponíveis.");
      focusElement("expedicao-conectada-title");
      return;
    }
    const completedStations = expedition.completedStations.includes(station.id)
      ? expedition.completedStations
      : [...expedition.completedStations, station.id];
    const nowEvidenceComplete = evidenceStationIds.every((id) => completedStations.includes(id));
    const nextMiddleStation = expedition.middleOrder.find((id) => !completedStations.includes(id));
    setExpedition((current) => ({ ...current, completedStations }));
    if (station.id === "pulso-de-calor") {
      setAnnouncement("Pulso de Calor concluída. Corais sob Estresse e Respostas Desiguais estão disponíveis; escolha a ordem da rota.");
      focusElement("route-title");
    } else if (nowEvidenceComplete) {
      setAnnouncement("Três estações de evidência concluídas. Convergência está disponível.");
      setExpedition((current) => ({ ...current, completedStations, currentStation: "convergencia" }));
      focusElement("convergencia-title");
    } else if (nextMiddleStation) {
      const nextStation = stations.find((item) => item.id === nextMiddleStation)!;
      setAnnouncement(`${station.name} concluída. Próxima estação: ${nextStation.name}.`);
      setExpedition((current) => ({ ...current, completedStations, currentStation: nextMiddleStation }));
      focusElement(`${nextMiddleStation}-title`);
    }
  }

  function restartExpedition() {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // State is still reset in memory when browser storage is unavailable.
    }
    setExpedition(initialExpeditionState);
    setShowAllSources(false);
    setAnnouncement("Expedição reiniciada. Pulso de Calor é a única estação disponível.");
    focusElement("pulso-de-calor-title");
  }

  function showSources() {
    setShowAllSources(true);
    setAnnouncement("Caderno completo de fontes aberto.");
    focusElement("fontes-da-expedicao-title");
  }

  return (
    <div className="expedition" data-enhanced={enhanced} data-connected={expedition.connected}>
      <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">{announcement}</p>
      <main id="conteudo-principal">
        <header className="ocean-opening">
          <div className="ocean-opening__wash" aria-hidden="true"><span className="current current--one" /><span className="current current--two" /><span className="current current--three" /></div>
          <div className="topline page-shell">
            <a className="identity" href="#conteudo-principal" aria-label="Instituto Maré Aberta, início"><InstituteMark /><span>Instituto<strong>Maré Aberta</strong></span></a>
            <p>Observatório<strong>Atlântico Vivo</strong></p>
          </div>
          <div className="opening-copy page-shell">
            <h1>Conduza a expedição e <em>conecte os sinais</em> de um oceano em mudança.</h1>
            <div className="opening-note">
              <p><strong>Banco dos Abrolhos · 2019</strong>Do calor acumulado às respostas dos corais, percorra doze sinais construídos a partir de observações históricas.</p>
              <a href="#rota">Iniciar leitura</a>
            </div>
          </div>
          <div className="horizon-note page-shell"><span aria-hidden="true" /><p>Pesquisa histórica · expedição fictícia</p></div>
        </header>

        <section className="editorial-intro page-shell" aria-labelledby="sobre-a-expedicao">
          <div><h2 id="sobre-a-expedicao">Uma rota composta para aproximar evidências que aconteceram em tempos, lugares e escalas diferentes.</h2></div>
          <div className="editorial-intro__copy">
            <p>O Instituto Maré Aberta e o Observatório Atlântico Vivo dão forma a uma comissão ficcional. A pesquisa é real, e cada afirmação conduz aos registros que sustentam — e limitam — sua leitura.</p>
            <details className="disclosure" open><summary>Pesquisa histórica · expedição fictícia</summary><p>{wrapperDisclosure}</p></details>
          </div>
        </section>

        <nav id="rota" className="route page-shell" aria-labelledby="route-title">
          <div className="route__heading">
            <div><h2 id="route-title" tabIndex={-1}>Quatro estações. Doze sinais.</h2><p>{expedition.completedStations.filter((id) => evidenceStationIds.includes(id)).length} de 3 estações de evidência concluídas</p></div>
            <progress max="3" value={expedition.completedStations.filter((id) => evidenceStationIds.includes(id)).length}>{expedition.completedStations.length} de 3</progress>
          </div>
          <ol>
            {stations.map((station, index) => {
              const available = availableStationIds.has(station.id);
              const completed = expedition.completedStations.includes(station.id) || (station.id === "convergencia" && expedition.connected);
              const current = expedition.currentStation === station.id;
              return (
                <li key={station.id} data-status={completed ? "completed" : available ? "available" : "locked"}>
                  {enhanced ? (
                    <button type="button" onClick={() => openStation(station.id)} disabled={!available} aria-current={current ? "step" : undefined}>
                      <span>{String(index + 1).padStart(2, "0")}</span><strong>{station.name}</strong><small>{station.role}</small><em>{stationStatus(station, available, completed, current)}</em>
                    </button>
                  ) : (
                    <a href={`#${station.id}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{station.name}</strong><small>{station.role}</small></a>
                  )}
                </li>
              );
            })}
          </ol>
          {expedition.middleOrder.length === 2 ? <p className="route__order">Ordem escolhida: {expedition.middleOrder.map((id) => stations.find((station) => station.id === id)!.name).join(" → ")}</p> : null}
        </nav>

        <div className="stations">
          {stations.map((station, stationIndex) => {
            const activeSignalIndex = expedition.bookmarks[station.id];
            const stationCompleted = expedition.completedStations.includes(station.id);
            const isCurrent = expedition.currentStation === station.id;
            return (
              <article className={`station ${station.id === "convergencia" ? "station--convergence" : ""}`} id={station.id} key={station.id} aria-labelledby={`${station.id}-title`} data-current={isCurrent} data-available={availableStationIds.has(station.id)}>
                <header className="station__header page-shell">
                  <div className="station__number" aria-hidden="true">{String(stationIndex + 1).padStart(2, "0")}</div>
                  <div className="station__identity">
                    <h2 id={`${station.id}-title`} tabIndex={-1}>{station.name}</h2><p>{station.role}</p>
                    {enhanced ? <span className="station__state">{stationCompleted || (station.id === "convergencia" && expedition.connected) ? "Concluída" : `${activeSignalIndex + 1} de ${station.signals.length} sinais`}</span> : null}
                  </div>
                  <p className="station__introduction">{station.introduction}</p>
                </header>
                <div className="signals page-shell">
                  {station.signals.map((signal, signalIndex) => {
                    const sources = uniqueSources(signal.claims.flatMap((claim) => claim.sources));
                    return (
                      <section className="signal" key={signal.title} data-active={activeSignalIndex === signalIndex} aria-labelledby={`${station.id}-signal-${signalIndex + 1}`}>
                        <div className="signal__marker" aria-hidden="true"><span>{stationIndex + 1}.{signalIndex + 1}</span></div>
                        <div className="signal__body">
                          <p className="signal__position">Sinal {signalIndex + 1} de {station.signals.length}</p>
                          <h3 id={`${station.id}-signal-${signalIndex + 1}`} tabIndex={-1}>{signal.title}</h3>
                          <div className="signal__claims">{signal.claims.map((claim) => <p key={claim.text}>{formatScientificNames(claim.text)}</p>)}</div>
                          <details className="logbook">
                            <summary><span>Caderno de bordo<small>{sources.length} {sources.length === 1 ? "registro" : "registros"}</small></span><span className="logbook__action">Fontes e limites</span></summary>
                            <div className="source-list">{sources.map((sourceId) => <SourceCard key={sourceId} sourceId={sourceId} />)}</div>
                          </details>
                          <div className="signal__controls" aria-label={`Navegação dos sinais de ${station.name}`}>
                            <button type="button" onClick={() => changeSignal(station, signalIndex - 1)} disabled={signalIndex === 0}>Sinal anterior</button>
                            <p aria-hidden="true">{String(signalIndex + 1).padStart(2, "0")} / 03</p>
                            <button type="button" onClick={() => changeSignal(station, signalIndex + 1)} disabled={signalIndex === station.signals.length - 1}>Próximo sinal</button>
                          </div>
                          {signalIndex === station.signals.length - 1 && !stationCompleted && !expedition.connected ? (
                            <div className="station__completion">
                              <p>{station.id === "convergencia" ? "Os três sinais estão conectados. Confirme para concluir a expedição." : "Os três sinais desta estação foram percorridos. A conclusão só acontece com sua confirmação."}</p>
                              <button type="button" onClick={() => completeStation(station)}>{station.id === "convergencia" ? "Conectar expedição" : "Continuar expedição"}</button>
                            </div>
                          ) : null}
                        </div>
                      </section>
                    );
                  })}
                </div>
                <footer className="station__footer page-shell"><p>Pesquisa histórica · expedição fictícia</p><button type="button" onClick={() => focusElement("route-title")}>Voltar à rota</button></footer>
              </article>
            );
          })}
        </div>

        <section className="connected page-shell" aria-labelledby="expedicao-conectada-title" hidden={!expedition.connected}>
          <div><h2 id="expedicao-conectada-title" tabIndex={-1}>Expedição conectada.</h2><p>Você aproximou doze sinais sem apagar as diferenças entre tempos, lugares, organismos e métodos.</p></div>
          <div className="connected__actions" aria-label="Ações da expedição conectada">
            <button type="button" onClick={() => focusElement("route-title")}>Revisitar estações</button>
            <button type="button" onClick={showSources}>Consultar fontes</button>
            <button type="button" onClick={restartExpedition}>Recomeçar expedição</button>
          </div>
        </section>

        <section className="all-sources page-shell" id="fontes-da-expedicao" aria-labelledby="fontes-da-expedicao-title" hidden={!showAllSources}>
          <header><h2 id="fontes-da-expedicao-title" tabIndex={-1}>Fontes da expedição</h2><p>Oito registros sustentam e delimitam os sinais percorridos.</p></header>
          <div className="source-list">{(Object.keys(sourceRecords) as SourceId[]).map((sourceId) => <SourceCard key={sourceId} sourceId={sourceId} />)}</div>
        </section>

        <footer className="closing">
          <div className="closing__inner page-shell">
            <div className="identity identity--closing"><InstituteMark /><span>Instituto<strong>Maré Aberta</strong></span></div>
            <p>Observatório Atlântico Vivo<span>Uma composição retrospectiva sobre Abrolhos em 2019.</span></p><a href="#conteudo-principal">Voltar ao início</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
