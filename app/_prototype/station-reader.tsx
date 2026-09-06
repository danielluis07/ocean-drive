"use client";

/* eslint-disable react-hooks/immutability -- This throwaway reader samples the existing external expedition model. */
// Three claim-to-source treatments on /?variant=A|B|C inside the selected Voz da estação composition.
// A: inline numbered signals; B: always-open evidence sheet; C: a dedicated source logbook.
import { useEffect, useRef, useState } from "react";
import {
  continueExpedition,
  event,
  stations,
  type Expedition,
  type Variant,
} from "@/app/_prototype/expedition";
import {
  readingVariants,
  sourceRecords,
  stationContent,
  wrapperDisclosure,
  type SourceId,
} from "@/app/_prototype/station-content";
import "@/app/_prototype/station-reader.css";

type Passage = (typeof stationContent)[number]["passages"][number];

export function ReadingSwitcher({
  variant,
  onChange,
}: {
  variant: Variant;
  onChange: (direction: number) => void;
}) {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <nav
      className="reading-switcher"
      aria-label="Comparar tratamentos de fontes"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          onChange(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <button aria-label="Tratamento anterior" onClick={() => onChange(-1)}>
        <Arrow reverse />
      </button>
      <span>
        <small>PROTÓTIPO · FONTES {variant}</small>
        {readingVariants[variant]}
      </span>
      <button aria-label="Próximo tratamento" onClick={() => onChange(1)}>
        <Arrow />
      </button>
    </nav>
  );
}

function Arrow({ reverse = false }: { reverse?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      style={{ transform: reverse ? "rotate(180deg)" : undefined }}
    >
      <path
        d="M4 12h15m-6-6 6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function passageSources(passage: Passage) {
  return Array.from(
    new Set(passage.claims.flatMap((claim) => claim.sources)),
  ) as SourceId[];
}

function SourceCard({
  id,
  number,
  compact = false,
}: {
  id: SourceId;
  number: number;
  compact?: boolean;
}) {
  const source = sourceRecords[id];

  return (
    <article className="source-card" data-compact={compact} id={`source-${id}`}>
      <p className="source-card-label">
        <span>{String(number).padStart(2, "0")}</span>
        {source.kind}
      </p>
      <h4>{source.credit}</h4>
      <cite>{source.title}</cite>
      <p>{source.publication}</p>
      <p className="source-locator">{source.locator}</p>
      <p>{source.support}</p>
      <p className="source-boundary">Limite da evidência · {source.boundary}</p>
      <a href={source.href} target="_blank" rel="noreferrer">
        Abrir fonte em nova aba ↗
      </a>
    </article>
  );
}

function ClaimCopy({
  passage,
  showMarkers,
  onOpenSources,
}: {
  passage: Passage;
  showMarkers: boolean;
  onOpenSources: () => void;
}) {
  const ids = passageSources(passage);

  return (
    <p className="reader-claims">
      {passage.claims.map((claim, claimIndex) => (
        <span className="reader-claim" key={claim.text}>
          {claim.text}
          {showMarkers ? (
            <sup aria-label="Fontes desta afirmação">
              {claim.sources.map((id) => {
                const number = ids.indexOf(id) + 1;
                return (
                  <button
                    key={id}
                    aria-label={`Abrir fonte ${number} desta afirmação`}
                    onClick={onOpenSources}
                  >
                    {number}
                  </button>
                );
              })}
            </sup>
          ) : null}
          {claimIndex < passage.claims.length - 1 ? " " : null}
        </span>
      ))}
    </p>
  );
}

function SourceList({ passage, compact = false }: { passage: Passage; compact?: boolean }) {
  return (
    <div className="source-list">
      {passageSources(passage).map((id, index) => (
        <SourceCard key={id} id={id} number={index + 1} compact={compact} />
      ))}
    </div>
  );
}

export default function StationReader({
  s,
  variant,
  onChange,
  onClose,
}: {
  s: Expedition;
  variant: Variant;
  onChange: (direction: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [sources, setSources] = useState(false);
  const [inspect, setInspect] = useState(false);
  const [, redraw] = useState(0);
  const station = s.reading ?? 0;
  const content = stationContent[station];
  const passage = content.passages[s.page];
  const sourceCount = passageSources(passage).length;
  const complete = s.coreReached.includes(station);

  useEffect(() => {
    dialog.current?.showModal();
    heading.current?.focus({ preventScroll: true });
  }, []);

  const leave = (finish: boolean) => {
    s.readingPages[station] = s.page;
    if (finish) continueExpedition(s);
    else {
      s.departing = station;
      s.reading = null;
      s.grace = 1.2;
      s.input = 0;
      s.turn = 0;
      s.noProgress = 0;
      s.assistance = 0;
      event(s, "Leitura interrompida. Seu trecho fica guardado nesta visita.");
    }
    dialog.current?.close();
    onClose();
  };

  const movePage = (page: number) => {
    s.page = page;
    s.readingPages[station] = page;
    if (page === content.passages.length - 1 && !complete) {
      s.coreReached.push(station);
    }
    setSources(false);
    redraw((count) => count + 1);
    body.current?.scrollTo({ top: 0 });
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  };

  const top = (
    <div className="reader-top-stack">
      <header className="reader-top">
        <span>{stations[station].name}</span>
        <button className="reader-quiet" onClick={() => leave(false)}>
          Voltar ao mar
        </button>
      </header>
      <details className="reader-disclosure">
        <summary>Pesquisa histórica · expedição fictícia</summary>
        <p>{wrapperDisclosure}</p>
      </details>
    </div>
  );

  const progress = (
    <div
      className="reader-progress"
      aria-label={`Trecho ${s.page + 1} de ${content.passages.length}`}
    >
      <span>
        Sinal {s.page + 1} de {content.passages.length}
      </span>
      <div aria-hidden="true">
        {content.passages.map((item, index) => (
          <i key={item.title} data-reached={index <= s.page} />
        ))}
      </div>
    </div>
  );

  const passageHeading = (
    <h2 ref={heading} tabIndex={-1} id="reader-title">
      {passage.title}
    </h2>
  );

  const inlinePassage = (
    <div className="reader-passage">
      {passageHeading}
      <ClaimCopy
        passage={passage}
        showMarkers
        onOpenSources={() => setSources(true)}
      />
      <button
        className="reader-citation"
        aria-expanded={sources}
        aria-controls="reader-sources"
        onClick={() => setSources((visible) => !visible)}
      >
        {sources ? "Ocultar fontes" : `Ler ${sourceCount === 1 ? "a fonte" : `as ${sourceCount} fontes`} deste sinal`}
      </button>
    </div>
  );

  const inlineSources = sources ? (
    <aside id="reader-sources" className="reader-sources" aria-label="Fontes deste sinal">
      <h3>De onde vem este sinal</h3>
      <SourceList passage={passage} compact />
    </aside>
  ) : null;

  const evidenceSheet = (
    <div className="reader-evidence-grid">
      <div className="reader-passage">
        {passageHeading}
        <ClaimCopy passage={passage} showMarkers={false} onOpenSources={() => {}} />
      </div>
      <aside className="reader-evidence-sheet" aria-label="Ficha de evidência deste sinal">
        <p className="reader-kicker">FICHA DE EVIDÊNCIA · SEMPRE ABERTA</p>
        <ol>
          {passage.claims.map((claim) => (
            <li key={claim.text}>
              <span>{claim.text}</span>
              <small>
                {claim.sources.map((id) => sourceRecords[id].credit).join(" · ")}
              </small>
            </li>
          ))}
        </ol>
        <SourceList passage={passage} compact />
      </aside>
    </div>
  );

  const logbook = sources ? (
    <aside id="reader-sources" className="reader-logbook" aria-label="Caderno de fontes deste sinal">
      <button className="reader-logbook-back" onClick={() => setSources(false)}>
        <Arrow reverse /> Voltar ao sinal
      </button>
      <p className="reader-kicker">CADERNO DE BORDO · SINAL {s.page + 1}</p>
      <h3 id="reader-title">Fontes e limites</h3>
      <p className="reader-logbook-intro">
        Cada registro diz o que a fonte sustenta e onde esta experiência para de interpretar.
      </p>
      <SourceList passage={passage} />
    </aside>
  ) : (
    <div className="reader-passage reader-logbook-passage">
      {passageHeading}
      <ClaimCopy passage={passage} showMarkers={false} onOpenSources={() => {}} />
      <button className="reader-logbook-open" onClick={() => setSources(true)}>
        <span>
          <small>CADERNO DE BORDO</small>
          {sourceCount === 1 ? "1 registro para este sinal" : `${sourceCount} registros para este sinal`}
        </span>
        <Arrow />
      </button>
    </div>
  );

  const footer = (
    <footer className="reader-footer">
      <div className="reader-actions">
        <button
          className="reader-back"
          disabled={s.page === 0}
          onClick={() => movePage(s.page - 1)}
        >
          <Arrow reverse />
          <span>Anterior</span>
        </button>
        {s.page < content.passages.length - 1 ? (
          <button className="reader-primary" onClick={() => movePage(s.page + 1)}>
            Seguir leitura <Arrow />
          </button>
        ) : (
          <button className="reader-primary" onClick={() => leave(true)}>
            {station === 3 ? "Conectar expedição" : "Continuar expedição"}
            <Arrow />
          </button>
        )}
      </div>
      <p>
        {s.completed.includes(station)
          ? "Estação já concluída · releia no seu ritmo."
          : complete
            ? "O sinal está completo. Continuar confirma sua visita."
            : "Você pode sair e retomar este sinal depois."}
        {" "}Consultar fontes nunca altera seu progresso.
      </p>
    </footer>
  );

  return (
    <dialog
      ref={dialog}
      className={`reader-overlay reader-${variant}`}
      aria-labelledby="reader-title"
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        if (event.currentTarget.querySelector("#reader-sources")) setSources(false);
        else leave(false);
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.nativeEvent.preventDefault();
      }}
    >
      <div className="reader-location" aria-hidden="true">
        <span>Embarcação em espera</span>
        <strong>{stations[station].name}</strong>
      </div>
      <section className="reader-panel">
        {top}
        <div className="reader-body" ref={body}>
          {progress}
          {variant === "A" ? (
            <>
              {inlinePassage}
              {inlineSources}
            </>
          ) : null}
          {variant === "B" ? evidenceSheet : null}
          {variant === "C" ? logbook : null}
        </div>
        {sources && variant === "C" ? null : footer}
      </section>
      <ReadingSwitcher variant={variant} onChange={onChange} />
      {process.env.NODE_ENV !== "production" ? (
        <details
          className="reading-state"
          open={inspect}
          onToggle={(event) => setInspect(event.currentTarget.open)}
        >
          <summary>Estado do protótipo</summary>
          <pre>
            {JSON.stringify(
              {
                citationTreatment: variant,
                station: stations[station].name,
                passage: s.page + 1,
                sourcesOpen: variant === "B" || sources,
                coreReached: complete,
                completed: s.completed.map((index) => stations[index].name),
                position: [Number(s.x.toFixed(2)), Number(s.z.toFixed(2))],
                heading: Number(s.heading.toFixed(3)),
                readingPages: s.readingPages,
                motion: "paused",
              },
              null,
              2,
            )}
          </pre>
        </details>
      ) : null}
    </dialog>
  );
}
