"use client";

/* eslint-disable react-hooks/immutability -- This throwaway reader samples the existing external expedition model. */
// Three structurally different Field Station readers on /?variant=A|B|C.
// Inherit Mar aberto: petroleum/jade water, salt reading ground, ochre actions,
// Geist text and restrained Georgia emphasis. Vessel/buoy continuity is the signature.
// A: right margin; B: bottom deck with separate context column; C: spatial short passages.
import { useEffect, useRef, useState } from "react";
import { continueExpedition, event, stations, sourceUrl, type Expedition, type Variant } from "@/app/_prototype/expedition";
import { readingVariants, stationContent } from "@/app/_prototype/station-content";
import "@/app/_prototype/station-reader.css";

export function ReadingSwitcher({ variant, onChange }: { variant: Variant; onChange: (direction: number) => void }) {
  if (process.env.NODE_ENV === "production") return null;
  return <nav className="reading-switcher" aria-label="Comparar apresentações" onKeyDown={(e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault(); e.stopPropagation(); onChange(e.key === "ArrowLeft" ? -1 : 1);
    }
  }}>
    <button aria-label="Apresentação anterior" onClick={() => onChange(-1)}><Arrow reverse /></button>
    <span><small>PROTÓTIPO · LEITURA {variant}</small>{readingVariants[variant]}</span>
    <button aria-label="Próxima apresentação" onClick={() => onChange(1)}><Arrow /></button>
  </nav>;
}

function Arrow({ reverse = false }: { reverse?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" style={{ transform: reverse ? "rotate(180deg)" : undefined }}><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

export default function StationReader({ s, variant, onChange, onClose }: {
  s: Expedition; variant: Variant; onChange: (direction: number) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [sources, setSources] = useState(false);
  const [inspect, setInspect] = useState(false);
  const [, redraw] = useState(0);
  const station = s.reading ?? 0;
  const content = stationContent[station];
  const complete = s.coreReached.includes(station);

  useEffect(() => {
    dialog.current?.showModal();
    heading.current?.focus({ preventScroll: true });
  }, []);

  const leave = (finish: boolean) => {
    s.readingPages[station] = s.page;
    if (finish) continueExpedition(s);
    else {
      s.departing = station; s.reading = null; s.grace = 1.2;
      s.input = 0; s.turn = 0; s.noProgress = 0; s.assistance = 0;
      event(s, "Leitura interrompida. Seu trecho fica guardado nesta visita.");
    }
    dialog.current?.close(); onClose();
  };
  const movePage = (page: number) => {
    s.page = page; s.readingPages[station] = page;
    if (page === 2 && !complete) s.coreReached.push(station);
    setSources(false); redraw(n => n + 1);
    body.current?.scrollTo({ top: 0 });
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  };
  const top = <header className="reader-top"><span>{stations[station].name}</span><button className="reader-quiet" onClick={() => leave(false)}>Voltar ao mar</button></header>;
  const progress = <div className="reader-progress" aria-label={`Trecho ${s.page + 1} de 3`}><span>Leitura {s.page + 1} de 3</span><div aria-hidden="true">{[0, 1, 2].map(i => <i key={i} data-reached={i <= s.page} />)}</div></div>;
  const passage = <div className="reader-passage"><h2 ref={heading} tabIndex={-1} id="reader-title">{content.titles[s.page]}</h2><p>{content.paragraphs[s.page]}</p><button className="reader-citation" aria-expanded={sources} aria-controls="reader-sources" onClick={() => setSources(v => !v)}>Fonte deste trecho · Duarte et al., 2020</button></div>;
  const relation = <figure className="reader-relation"><div>{content.relation.map((label, i) => <span key={label}>{i > 0 ? <span aria-hidden="true" className="relation-line" /> : null}{label}</span>)}</div><figcaption>Relação conceitual · sem escala de medida</figcaption></figure>;
  const sourcePanel = sources ? <aside id="reader-sources" className="reader-sources"><h3>De onde vem este sinal</h3><p>{content.evidence}</p><a href={sourceUrl} target="_blank" rel="noreferrer">Duarte e colaboradores (2020). <cite>Heat Waves Are a Major Threat to Turbid Coral Reefs in Brazil.</cite> Frontiers in Marine Science. Abrir artigo em nova aba.</a><p>DOI: 10.3389/fmars.2020.00179</p><p>O instituto, as estações e o percurso são fictícios. O episódio científico é real. Estas águas não representam um mapa de Abrolhos.</p><button className="reader-quiet" onClick={() => setSources(false)}>Fechar fontes</button></aside> : null;
  const footer = <footer className="reader-footer"><div className="reader-actions"><button className="reader-back" disabled={s.page === 0} onClick={() => movePage(s.page - 1)}><Arrow reverse /><span>Anterior</span></button>{s.page < 2 ? <button className="reader-primary" onClick={() => movePage(s.page + 1)}>Seguir leitura <Arrow /></button> : <button className="reader-primary" onClick={() => leave(true)}>{station === 3 ? "Conectar expedição" : "Continuar expedição"}<Arrow /></button>}</div><p>{s.completed.includes(station) ? "Estação já concluída · releia no seu ritmo." : complete ? "O sinal está completo. A saída confirma sua visita." : "Você pode sair e retomar este trecho depois."} Fontes são opcionais.</p></footer>;

  return <dialog ref={dialog} className={`reader-overlay reader-${variant}`} aria-labelledby="reader-title" onCancel={(e) => { e.preventDefault(); if (sources) setSources(false); else leave(false); }}>
    <div className="reader-location" aria-hidden="true"><span>Embarcação em espera</span><strong>{stations[station].name}</strong></div>
    <section className="reader-panel">
      {top}
      <div className="reader-body" ref={body}>
        {variant === "A" ? <>{progress}{passage}{relation}{sourcePanel}</> : null}
        {variant === "B" ? <div className="reader-deck"><div className="reader-context">{progress}<h3>Abrolhos,<br /><em>2019.</em></h3>{relation}</div><div>{passage}{sourcePanel}</div></div> : null}
        {variant === "C" ? <>{progress}{passage}{sourcePanel}</> : null}
      </div>
      {footer}
    </section>
    <ReadingSwitcher variant={variant} onChange={onChange} />
    {process.env.NODE_ENV !== "production" ? <details className="reading-state" open={inspect} onToggle={e => setInspect(e.currentTarget.open)}><summary>Estado do protótipo</summary><pre>{JSON.stringify({ presentation: variant, station: stations[station].name, passage: s.page + 1, sourcesOpen: sources, coreReached: complete, completed: s.completed.map(i => stations[i].name), position: [Number(s.x.toFixed(2)), Number(s.z.toFixed(2))], heading: Number(s.heading.toFixed(3)), readingPages: s.readingPages, motion: "paused" }, null, 2)}</pre></details> : null}
  </dialog>;
}
