"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { directions, stations, type Variant } from "@/app/_prototype/directions";
import PrototypeSwitcher from "@/app/_prototype/prototype-switcher";
import "@/app/_prototype/prototype.css";

const OceanScene = dynamic(() => import("@/app/_prototype/ocean-scene"), { ssr: false, loading: () => <div className="scene-loading">Preparando o oceano…</div> });
type StudyProps = { station: number; paused: boolean; onStation: (index: number) => void; onRead: () => void };

function Identity() {
  return <div className="identity"><svg aria-hidden="true" viewBox="0 0 40 40"><path d="M4 24c7-13 12 13 20 0s12 0 12 0M4 15c7-13 12 13 20 0s12 0 12 0" fill="none" stroke="currentColor" strokeWidth="2" /></svg><span>Instituto<br /><strong>Maré Aberta</strong></span></div>;
}

function StationIndex({ station, onStation }: Pick<StudyProps, "station" | "onStation">) {
  return <nav className="station-index" aria-label="Estações da expedição">{stations.map((item, index) => <button key={item.name} onClick={() => onStation(index)} aria-pressed={station === index}><span className="index-dot" /><span><small>{item.theme}</small>{item.name}</span><span className="index-arrow" aria-hidden="true">↗</span></button>)}</nav>;
}

export function VariantA(props: StudyProps) {
  return <main className="study study-a">
    <OceanScene variant="A" {...props} />
    <div className="a-shade" />
    <header className="study-header"><Identity /><span className="utility">OBSERVATÓRIO ATLÂNTICO VIVO</span><span className="location">Abrolhos, Brasil<br /><small>Um olhar sobre 2019</small></span></header>
    <section className="a-intro"><p className="eyebrow">UM OCEANO. MUITOS SINAIS.</p><h1>O que o mar<br /><em>nos conta.</em></h1><p>Conduza a expedição e conecte os sinais<br className="desktop-break" /> de um oceano em mudança.</p></section>
    <div className="a-bottom"><div className="a-station"><p className="eyebrow">EM DIREÇÃO A</p><h2>{stations[props.station].name}</h2><button className="text-button" onClick={props.onRead}>Conhecer esta estação <span>↗</span></button></div><StationIndex {...props} /></div>
    <p className="schematic">Percurso ilustrativo · posições sem escala geográfica</p>
  </main>;
}

export function VariantB(props: StudyProps) {
  return <main className="study study-b">
    <aside className="chart-sidebar"><Identity /><p className="eyebrow">OBSERVATÓRIO ATLÂNTICO VIVO</p><h1>Um mar de<br />conexões.</h1><p className="chart-intro">Conduza a expedição e conecte os sinais de um oceano em mudança.</p><StationIndex {...props} /><div className="chart-note"><span>ABROLHOS / 2019</span><p>Uma expedição para revisitar evidências, estação por estação.</p></div></aside>
    <section className="chart-world" aria-label="Carta esquemática da expedição"><OceanScene variant="B" {...props} /><div className="chart-grid" /><div className="chart-caption"><span>CARTA DA EXPEDIÇÃO</span><span aria-hidden="true">N ↑</span></div><div className="chart-selected"><p className="eyebrow">ESTAÇÃO EM FOCO</p><h2>{stations[props.station].name}</h2><button className="text-button" onClick={props.onRead}>Abrir caderno da estação ↗</button></div><p className="schematic">Carta conceitual · não representa coordenadas ou medições</p></section>
  </main>;
}

export function VariantC(props: StudyProps) {
  return <main className="study study-c">
    <header className="study-header"><Identity /><span className="utility">OBSERVATÓRIO ATLÂNTICO VIVO</span><span className="location">Caderno de campo<br /><small>Abrolhos · 2019</small></span></header>
    <div className="journal-layout"><article className="journal-copy"><p className="eyebrow">A EXPEDIÇÃO</p><h1>Aprender<br />a olhar<br /><em>o oceano.</em></h1><p className="journal-promise">Conduza a expedição e conecte os sinais de um oceano em mudança.</p><p className="journal-description">Do convés às observações de campo, um percurso por diferentes formas de compreender o mar.</p><button className="journal-link" onClick={props.onRead}>Ler: {stations[props.station].name}<span>↗</span></button></article><section className="journal-plate" aria-label="Vista próxima da embarcação"><OceanScene variant="C" {...props} /><div className="plate-caption"><span>OBSERVAR É CONECTAR</span><p>Embarcação de pesquisa<br /><small>Representação da expedição fictícia</small></p></div></section></div>
    <footer className="journal-footer"><p>Três olhares.<br /><strong>Uma história conectada.</strong></p><StationIndex {...props} /></footer><p className="schematic">Percurso ilustrativo · posições sem escala geográfica</p>
  </main>;
}

export default function OceanVisualPrototype() {
  const params = useSearchParams();
  const value = params.get("variant");
  const variant: Variant = value === "B" || value === "C" ? value : "A";
  const [station, setStation] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reading, setReading] = useState(false);
  const [notes, setNotes] = useState(false);
  const direction = directions[variant];
  useEffect(() => {
    console.info("Ocean visual prototype", { variant, direction, station: stations[station].name, paused, reading });
  }, [variant, direction, station, paused, reading]);
  const props = { station, paused: paused || reading, onStation: setStation, onRead: () => setReading(true) };
  return <div className={`prototype-root variant-${variant.toLowerCase()}`}>
    {variant === "A" ? <VariantA {...props} /> : variant === "B" ? <VariantB {...props} /> : <VariantC {...props} />}
    <div className="study-tools"><button onClick={() => setPaused(value => !value)} aria-pressed={paused}>{paused ? "Retomar movimento" : "Pausar movimento"}</button><button aria-expanded={notes} onClick={() => setNotes(value => !value)}>Notas do estudo {notes ? "−" : "+"}</button></div>
    {notes ? <aside className="direction-notes" aria-label="Notas do estudo"><button className="notes-close" onClick={() => setNotes(false)} aria-label="Fechar notas">×</button><p className="eyebrow">ESTUDO {variant} · {direction.name}</p><h2>O que muda aqui</h2><dl><dt>Câmera</dt><dd>{direction.camera}</dd><dt>Oceano</dt><dd>{direction.ocean}</dd><dt>Embarcação</dt><dd>{direction.vessel}</dd><dt>Estações</dt><dd>{direction.stations}</dd><dt>Tipografia</dt><dd>{direction.type}</dd><dt>Atmosfera</dt><dd>{direction.atmosphere}</dd></dl><div className="palette">{direction.colors.map(color => <span key={color} style={{ background: color }} title={color} />)}</div><p>{direction.tradeoff}</p><p className="notes-status">Estação: {stations[station].name} · movimento: {paused ? "pausado" : "ativo, salvo preferência por movimento reduzido"}.</p><small>Protótipo para comparar direção de arte. Navegação demonstrativa; conteúdo e desempenho final ainda não validados.</small></aside> : null}
    {reading ? <div className="reading-overlay"><section className="reading-panel" role="dialog" aria-modal="true" aria-labelledby="reading-title" onKeyDown={event => { if (event.key === "Escape") setReading(false); if (event.key === "Tab") { const controls = event.currentTarget.querySelectorAll<HTMLElement>("button, a[href]"); const first = controls[0], last = controls[controls.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } }}><button autoFocus className="reading-close" onClick={() => setReading(false)}>Voltar ao oceano ×</button><p className="eyebrow">{stations[station].name}</p><h2 id="reading-title">{stations[station].title}</h2><p>{stations[station].text}</p><a href="https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2020.00179/full" target="_blank" rel="noreferrer">Consultar a pesquisa de Duarte e colaboradores ↗</a><hr /><small>O Instituto Maré Aberta e este percurso são fictícios. O evento científico é real. Os nomes, a ordem e o texto das estações são provisórios neste estudo visual.</small></section></div> : null}
    <PrototypeSwitcher variant={variant} />
  </div>;
}
