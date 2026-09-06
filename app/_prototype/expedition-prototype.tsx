"use client";

/* eslint-disable react-hooks/immutability -- Disposable external simulation shared by two renderers; HTML samples it at 5 Hz. This object is not React view state. */

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  available,
  createExpedition,
  event,
  reorient,
  sourceUrl,
  stations,
  tiers,
  type Tier,
  type Variant,
} from "@/app/_prototype/expedition";
import "@/app/_prototype/prototype.css";
import StationReader from "@/app/_prototype/station-reader";
import {
  readingVariants,
  sourceRecords,
  stationContent,
  wrapperDisclosure,
} from "@/app/_prototype/station-content";

const OceanRenderer = dynamic(() => import("@/app/_prototype/ocean-renderer"), {
  ssr: false,
  loading: () => <p className="loading">Preparando as águas…</p>,
});

export default function ExpeditionPrototype() {
  const params = useSearchParams(),
    router = useRouter();
  const variant: Variant =
    params.get("variant") === "B"
      ? "B"
      : params.get("variant") === "C"
        ? "C"
        : "A";
  const engine = params.get("engine") === "three" ? "three" : "r3f";
  const [s] = useState(() => {
    const initial = createExpedition();
    if (params.get("sail") !== "1") {
      initial.z = -26; initial.elapsed = 20; initial.reading = 0;
    }
    return initial;
  });
  const [labels] = useState<(HTMLDivElement | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const [, refresh] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [controls, setControls] = useState(false);
  const [inspector, setInspector] = useState(false);
  const [accessible, setAccessible] = useState(false);
  const [editorial, setEditorial] = useState(false);
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);
  const fallbackActive = Boolean(s.fallback);
  const surface = useRef<HTMLDivElement>(null),
    controlDialog = useRef<HTMLDialogElement>(null);
  const clearInput = useRef<() => void>(() => {});
  const draw = () => refresh((n) => n + 1);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const respectMotion = () => {
      s.reduced = reduced.matches;
      if (reduced.matches)
        s.fallback =
          "Você prefere menos movimento. A expedição também pode ser lida.";
    };
    respectMotion();
    reduced.addEventListener("change", respectMotion);
    if (s.elapsed === 0 && navigator.maxTouchPoints > 0) s.modality = "touch";
    if (!reduced.matches) {
      const probe = document.createElement("canvas");
      const context = probe.getContext("webgl2");
      if (!context) s.fallback = "Este dispositivo não abriu o oceano. Continue pela leitura.";
      else context.getExtension("WEBGL_lose_context")?.loseContext();
    }
    // This mount flag gates the browser capability check before allocating WebGL.
    const timer = window.setInterval(() => {
      setMounted(true);
      refresh((n) => n + 1);
    }, 200);
    return () => {
      clearInterval(timer);
      reduced.removeEventListener("change", respectMotion);
    };
  }, [s]);
  useEffect(() => { s.variant = "A"; }, [s]);
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    let pointer: number | null = null,
      origin = 0,
      keys = new Set<string>();
    const clear = () => {
      if (pointer !== null && element.hasPointerCapture(pointer))
        element.releasePointerCapture(pointer);
      pointer = null;
      keys = new Set();
      s.input = 0;
      s.turn = 0;
    };
    clearInput.current = clear;
    const blocked = () =>
      s.paused ||
      s.hidden ||
      s.reading !== null ||
      Boolean(s.fallback) ||
      editorial ||
      controls;
    const down = (e: PointerEvent) => {
      if (blocked() || e.button !== 0 || pointer !== null) return;
      pointer = e.pointerId;
      origin = e.clientX;
      s.modality = e.pointerType === "touch" ? "touch" : "pointer";
      element.setPointerCapture(pointer);
      element.focus({ preventScroll: true });
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointer || blocked()) return;
      e.preventDefault();
      const distance = e.clientX - origin,
        deadZone = s.modality === "touch" ? 14 : 18;
      const amount =
        Math.max(0, Math.abs(distance) - deadZone) /
        (s.modality === "touch" ? 86 : 140);
      s.input = Math.sign(distance) * Math.min(1, Math.pow(amount, 1.25));
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === pointer) {
        pointer = null;
        s.input = 0;
        s.turn = 0;
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (!["a", "d", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      if (e.type === "keyup") {
        keys.delete(e.key);
        s.input =
          Number(keys.has("d") || keys.has("ArrowRight")) -
          Number(keys.has("a") || keys.has("ArrowLeft"));
        if (s.input === 0) s.turn = 0;
        return;
      }
      const target = e.target as HTMLElement;
      if (
        blocked() ||
        target.closest(
          "button, input, select, textarea, a, dialog, [contenteditable]",
        )
      )
        return;
      e.preventDefault();
      s.modality = "keyboard";
      keys.add(e.key);
      s.input =
        Number(keys.has("d") || keys.has("ArrowRight")) -
        Number(keys.has("a") || keys.has("ArrowLeft"));
    };
    const visibility = () => {
      clear();
      s.hidden = document.hidden;
      if (document.hidden) {
        s.paused = true;
        event(s, "Expedição pausada ao sair da página.");
      }
    };
    const resize = () => {
      clear();
      s.frameTimes = [];
      s.performanceTime = 0;
    };
    const blur = () => clear();
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointermove", move, { passive: false });
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", up);
    element.addEventListener("lostpointercapture", up);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", blur);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clear();
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
      element.removeEventListener("lostpointercapture", up);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", blur);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [s, mounted, editorial, controls, fallbackActive]);
  const reading = s.reading;
  useEffect(() => { if (reading !== null) clearInput.current(); }, [reading]);
  useEffect(() => {
    if (controls) {
      clearInput.current();
      controlDialog.current?.showModal();
    } else controlDialog.current?.close();
  }, [controls]);
  const changeVariant = (direction: number) => {
    clearInput.current();
    const choices: Variant[] = ["A", "B", "C"],
      value = choices[(choices.indexOf(variant) + direction + 3) % 3];
    const next = new URLSearchParams(params.toString());
    next.set("variant", value);
    router.replace(`?${next}`, { scroll: false });
    s.variant = "A";
    console.info("Field Station presentation prototype", {
      variant: value,
      engine,
      position: { x: s.x, z: s.z },
      heading: s.heading,
      completed: s.completed,
      quality: s.quality,
      tier: s.tier,
    });
  };
  const showEditorial = editorial || Boolean(s.fallback);
  const intro = s.elapsed < 16 && s.completed.length === 0;
  const instruction =
    s.modality === "keyboard"
      ? "Segure A / D ou ← / → para mudar o rumo."
      : s.modality === "touch"
        ? "Toque no mar e arraste para os lados para virar."
        : "Clique no mar e arraste para os lados para virar.";
  const closeControls = () => {
    setControls(false);
    s.paused = true;
    draw();
  };
  const restart = () => {
    clearInput.current();
    const mode = {
      variant: s.variant,
      tier: s.tier,
      quality: s.quality,
      ready: s.ready,
      reduced: s.reduced,
    };
    Object.assign(s, createExpedition(), mode);
    setCelebrationDismissed(false);
    draw();
  };
  const exportSession = () => {
    const record = {
      capturedAt: new Date().toISOString(),
      engine,
      variant,
      viewport: {
        width: innerWidth,
        height: innerHeight,
        dpr: devicePixelRatio,
      },
      userAgent: navigator.userAgent,
      state: { ...s, visitedWater: [...s.visitedWater] },
      note: "Development-browser observation. Physical-device qualification and human verdict remain required.",
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(record, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "ocean-drive-observation.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <main className="expedition" data-variant={variant} data-reading={reading !== null && !showEditorial}>
      {!showEditorial ? (
        <>
          <div className="ocean" aria-hidden="true">
            {mounted ? (
              <OceanRenderer
                key={engine}
                engine={engine}
                state={s}
                labels={labels}
              />
            ) : (
              <p className="loading">Preparando a expedição…</p>
            )}
          </div>
          <div
            ref={surface}
            className="steering-surface"
            tabIndex={0}
            role="region"
            aria-label="Águas da expedição. Use A e D ou as setas para conduzir a embarcação."
          />
          <div className="atmosphere" />
          <div className="station-labels" aria-hidden="true">
            {stations.map((station, i) => (
              <div
                className="station-label"
                key={station.name}
                ref={(node) => {
                  labels[i] = node;
                }}
              >
                <span>
                  {s.completed.includes(i)
                    ? "✓ VISITADA"
                    : i === 3
                      ? "SINAIS CONECTADOS"
                      : "ESTAÇÃO DE CAMPO"}
                </span>
                <strong>{station.name}</strong>
                <i />
              </div>
            ))}
          </div>
        </>
      ) : null}
      <header className="expedition-header">
        <a
          className="identity"
          href="?variant=A"
          aria-label="Instituto Maré Aberta — reiniciar o estudo"
        >
          <svg aria-hidden="true" viewBox="0 0 40 40">
            <path d="M3 15c8-14 13 14 21 0s13 0 13 0M3 25c8-14 13 14 21 0s13 0 13 0" />
          </svg>
          <span>
            Instituto
            <br />
            <strong>Maré Aberta</strong>
          </span>
        </a>
        <span className="program">OBSERVATÓRIO ATLÂNTICO VIVO</span>
        <nav aria-label="Opções da expedição">
          <button
            onClick={() => {
              s.paused = true;
              setControls(true);
            }}
          >
            Controles
          </button>
          <button
            onClick={() => {
              clearInput.current();
              s.paused = true;
              setEditorial(true);
            }}
          >
            Versão em texto
          </button>
        </nav>
      </header>
      {showEditorial ? (
        <article className="editorial">
          <p className="eyebrow">
            OBSERVATÓRIO ATLÂNTICO VIVO · ABROLHOS, 2019
          </p>
          <h1>
            O que o mar
            <br />
            <em>nos conta.</em>
          </h1>
          <p>{s.fallback || "A mesma história, no seu ritmo."}</p>
          <p>
            A mesma expedição em uma leitura sem movimento, com os mesmos
            sinais, fontes e limites da evidência.
          </p>
          <p className="boundary-copy">{wrapperDisclosure}</p>
          {stations.map((station, i) => (
            <section key={station.name}>
              <p className="eyebrow">{station.name}</p>
              <h2>{station.heading}</h2>
              {stationContent[i].passages.map((passage, passageIndex) => {
                const sourceIds = Array.from(
                  new Set(passage.claims.flatMap((claim) => claim.sources)),
                );

                return (
                  <div key={passage.title}>
                    <h3>{passage.title}</h3>
                    <p>
                      {passage.claims.map((claim) => claim.text).join(" ")}
                    </p>
                    <p>
                      Fontes do sinal {passageIndex + 1}:{" "}
                      {sourceIds.map((id, sourceIndex) => (
                        <span key={id}>
                          {sourceIndex > 0 ? " · " : null}
                          <a
                            href={sourceRecords[id].href}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {sourceRecords[id].credit} ↗
                          </a>
                        </span>
                      ))}
                    </p>
                  </div>
                );
              })}
              {s.completed.includes(i) ? (
                <small>Visitada na expedição</small>
              ) : null}
            </section>
          ))}
          <a href={sourceUrl} target="_blank" rel="noreferrer">
            Consultar a pesquisa de Duarte e colaboradores ↗
          </a>
          <p className="boundary-copy">{wrapperDisclosure}</p>
          {!s.reduced ? (
            <button
              className="primary"
              onClick={() => {
                s.fallback = "";
                s.paused = true;
                s.ready = false;
                s.frameTimes = [];
                s.performanceTime = 0;
                s.slowWindows = 0;
                setEditorial(false);
                draw();
              }}
            >
              Voltar ao oceano
            </button>
          ) : null}
        </article>
      ) : (
        <>
          {intro ? (
            <section className="opening">
              <p className="eyebrow">ABROLHOS · UM OLHAR SOBRE 2019</p>
              <h1>
                O que o mar
                <br />
                <em>nos conta.</em>
              </h1>
              <p>
                Conduza a expedição e conecte os sinais
                <br className="desktop-break" /> de um oceano em mudança.
              </p>
              <small>
                Instituto, embarcação e percurso fictícios. Evidências
                históricas de 2019.
              </small>
            </section>
          ) : null}
          {s.connected && !celebrationDismissed ? (
            <section className="connected">
              <p className="eyebrow">OS OLHARES SE ENCONTRAM</p>
              <h2>
                Expedição <em>conectada.</em>
              </h2>
              <button onClick={() => setCelebrationDismissed(true)}>
                Revisitar estações
              </button>
              <a href={sourceUrl} target="_blank" rel="noreferrer">
                Consultar fontes ↗
              </a>
              <button onClick={restart}>Recomeçar expedição</button>
            </section>
          ) : null}
          {s.paused && !controls ? (
            <div className="resume">
              <button
                className="primary"
                onClick={() => {
                  s.paused = false;
                  s.grace = 1.2;
                  clearInput.current();
                  draw();
                }}
              >
                Retomar expedição <span>↗</span>
              </button>
            </div>
          ) : null}
          <div className="guidance" aria-live="polite">
            {s.assistance >= 2 ? (
              <>
                <p>
                  {s.assistance === 3
                    ? "A corrente conduz de volta às águas da expedição."
                    : "As luzes das estações ajudam a reencontrar o caminho."}
                </p>
                <button
                  onClick={() => {
                    reorient(s);
                    draw();
                  }}
                >
                  Reorientar rota ↗
                </button>
              </>
            ) : intro ? (
              <p>
                {instruction}
                <br />
                <span>Ao soltar, a embarcação mantém o rumo.</span>
              </p>
            ) : null}
          </div>
          {accessible ? (
            <div className="accessible-helm" aria-label="Leme acessível">
              {[-1, 1].map((direction) => (
                <button
                  key={direction}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    s.input = direction;
                  }}
                  onPointerUp={() => {
                    s.input = 0;
                    s.turn = 0;
                  }}
                  onPointerCancel={() => {
                    s.input = 0;
                    s.turn = 0;
                  }}
                  onLostPointerCapture={() => {
                    s.input = 0;
                    s.turn = 0;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      s.input = direction;
                    }
                  }}
                  onKeyUp={() => {
                    s.input = 0;
                    s.turn = 0;
                  }}
                  onBlur={() => {
                    s.input = 0;
                    s.turn = 0;
                  }}
                  aria-label={
                    direction < 0
                      ? "Virar à esquerda enquanto pressionado"
                      : "Virar à direita enquanto pressionado"
                  }
                >
                  {direction < 0 ? "← Esquerda" : "Direita →"}
                </button>
              ))}
            </div>
          ) : null}
          <p className="schematic">
            Percurso ilustrativo · sem escala geográfica
          </p>
          <span className="sr-only" aria-live="polite">
            {s.lastEvent}
          </span>
        </>
      )}
      {reading !== null && !showEditorial ? <StationReader key={reading} s={s} variant={variant} onChange={changeVariant} onClose={() => { clearInput.current(); surface.current?.focus(); draw(); }} /> : null}
      <dialog
        ref={controlDialog}
        className="controls-dialog"
        aria-labelledby="controls-title"
        onCancel={closeControls}
      >
        <p className="eyebrow">O LEME ESTÁ COM VOCÊ</p>
        <h2 id="controls-title">Como conduzir</h2>
        <p>
          {instruction} Soltar preserva o rumo. A embarcação avança sozinha, em
          ritmo tranquilo.
        </p>
        <p>
          Você também pode segurar A / D ou ← / →. Entre no círculo de uma
          estação para ler. Depois do Pulso de Calor, escolha qual dos dois
          sinais visitar primeiro.
        </p>
        <label>
          <input
            type="checkbox"
            checked={accessible}
            onChange={(e) => setAccessible(e.target.checked)}
          />{" "}
          Mostrar botões de leme acessíveis
        </label>
        <button className="primary" onClick={closeControls}>
          Voltar à expedição
        </button>
      </dialog>
      {process.env.NODE_ENV !== "production" ? (
        <>
          <div
            className="prototype-switcher"
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                changeVariant(e.key === "ArrowLeft" ? -1 : 1);
              }
            }}
          >
            <button
              aria-label="Apresentação anterior"
              onClick={() => changeVariant(-1)}
            >
              ←
            </button>
            <span>
              <small>PROTÓTIPO · LEITURA {variant}</small>
              {readingVariants[variant]}
            </span>
            <button
              aria-label="Próxima apresentação"
              onClick={() => changeVariant(1)}
            >
              →
            </button>
            <button
              className="inspect-button"
              aria-expanded={inspector}
              onClick={() => setInspector((v) => !v)}
            >
              Inspecionar
            </button>
          </div>
          {inspector ? (
            <aside className="inspector">
              <button
                className="inspector-close"
                onClick={() => setInspector(false)}
              >
                Fechar ×
              </button>
              <h2>Estudo de navegação</h2>
              <p>
                Calibrações provisórias. Trocar a câmera preserva a expedição.
                As setas do teclado conduzem; com foco na barra, trocam a
                câmera.
              </p>
              <label>
                Renderização
                <select
                  value={engine}
                  onChange={(e) => {
                    const next = new URLSearchParams(params.toString());
                    next.set("engine", e.target.value);
                    s.ready = false;
                    s.frameTimes = [];
                    s.performanceTime = 0;
                    router.replace(`?${next}`, { scroll: false });
                  }}
                >
                  <option value="r3f">React Three Fiber</option>
                  <option value="three">Three.js direto</option>
                </select>
              </label>
              <label>
                Qualidade
                <select
                  value={s.quality}
                  onChange={(e) => {
                    s.quality = e.target.value as Tier | "auto";
                    if (s.quality !== "auto") s.tier = s.quality;
                    s.slowWindows = 0;
                    s.fastWindows = 0;
                    s.frameTimes = [];
                    s.performanceTime = 0;
                    draw();
                  }}
                >
                  <option value="auto">Adaptativa</option>
                  {Object.entries(tiers).map(([key, tier]) => (
                    <option key={key} value={key}>
                      {tier.name}
                    </option>
                  ))}
                </select>
              </label>
              <dl>
                <dt>Camada atual / DPR</dt>
                <dd>
                  {tiers[s.tier].name} / {s.dpr.toFixed(2)}
                </dd>
                <dt>FPS médio / p90</dt>
                <dd>
                  {s.fps.toFixed(1)} / {s.p90.toFixed(1)} ms
                </dd>
                <dt>Desenhos / triângulos</dt>
                <dd>
                  {s.drawCalls} / {s.triangles.toLocaleString("pt-BR")}
                </dd>
                <dt>Tempo navegando</dt>
                <dd>{Math.round(s.elapsed)} s</dd>
                <dt>Posição / rumo</dt>
                <dd>
                  {s.x.toFixed(1)}, {s.z.toFixed(1)} /{" "}
                  {(
                    ((((s.heading * 180) / Math.PI) % 360) + 360) %
                    360
                  ).toFixed(0)}
                  °
                </dd>
                <dt>Entrada / assistência</dt>
                <dd>
                  {s.input.toFixed(2)} / {s.assistance}
                </dd>
                <dt>Estado</dt>
                <dd>
                  {s.reading !== null
                    ? "leitura"
                    : s.paused
                      ? "pausa"
                      : "navegação"}
                </dd>
              </dl>
              <ul>
                {stations.map((station, i) => (
                  <li key={station.name}>
                    {station.name}:{" "}
                    {s.completed.includes(i)
                      ? "concluída"
                      : available(s, i)
                        ? "disponível"
                        : "não revelada"}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  s.paused = !s.paused;
                  clearInput.current();
                  draw();
                }}
              >
                {s.paused ? "Retomar" : "Pausar"}
              </button>
              <p>Atalhos de revisão: posicionam a embarcação na estação e preparam seus pré-requisitos. Não são navegação do visitante.</p>
              {stations.map((station, i) => <button key={station.name} onClick={() => {
                clearInput.current();
                s.completed = i === 0 ? s.completed : i === 3 ? [0, 1, 2] : [...new Set([...s.completed, 0])];
                s.x = station.x; s.z = station.z + 6; s.heading = 0; s.cameraHeading = 0;
                s.elapsed = 20; s.reading = i; s.page = s.readingPages[i]; s.paused = false;
                setInspector(false); draw();
              }}>Revisar {station.name}</button>)}
              <button onClick={exportSession}>Exportar observação</button>
              <button onClick={restart}>Recomeçar estudo</button>
              <p>
                Esta leitura não certifica desempenho em celulares reais. Janela
                de 5 s; duas janelas lentas reduzem a qualidade; seis rápidas
                permitem subir. Em Leve, lentidão sustentada abre o texto.
              </p>
            </aside>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
