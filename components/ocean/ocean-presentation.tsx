"use client";

import dynamic from "next/dynamic";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useExpedition } from "@/providers/expedition-provider";
import { dragSteering } from "@/lib/guided-helm";
import {
  transitionExpedition,
  type ThreeDUnavailableReason,
} from "@/lib/expedition-state";
import type { OceanConfiguration } from "@/lib/ocean-config";
import type { PreparationStage } from "@/components/ocean/ocean-runtime";

// The only runtime import. Editorial code and the state model never import Three.
const OceanRuntime = dynamic(() => import("@/components/ocean/ocean-runtime"), {
  ssr: false,
});

const preparationCopy: Record<PreparationStage, string> = {
  checking: "Verificando a navegação em 3D…",
  loading: "Carregando a embarcação e a navegação…",
  preparing: "Preparando o oceano e os controles…",
  frame: "Verificando a primeira imagem do oceano…",
  ready: "O oceano está pronto",
};

const failureCopy: Record<ThreeDUnavailableReason, string> = {
  unsupported:
    "Este navegador não oferece o recurso gráfico necessário para navegar em 3D.",
  refused: "O navegador não permitiu iniciar a navegação em 3D.",
  "asset-failure":
    "Não foi possível preparar a embarcação ou a imagem do oceano.",
  "context-loss": "A conexão gráfica com o oceano foi interrompida.",
  "unusable-quality": "A navegação em 3D não está estável neste dispositivo.",
};

class RuntimeErrorBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("Ocean startup failed", error);
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function focusTarget(id: string) {
  requestAnimationFrame(() => {
    const element = document.getElementById(id);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "nearest", behavior: "instant" });
  });
}

function closeDisclosures() {
  document
    .querySelectorAll<HTMLDetailsElement>("main details[open]")
    .forEach((details) => {
      details.open = false;
    });
}

export default function OceanPresentation({
  configuration,
}: {
  configuration: OceanConfiguration;
}) {
  const { expedition, setExpedition, enhanced, readerOpen, setReaderOpen } =
    useExpedition();
  const [stage, setStage] = useState<PreparationStage>("checking");
  const [eligible, setEligible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [low, setLow] = useState(false);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [started, setStarted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const livePose = useRef(expedition.vesselCheckpoints.current);
  const steering = useRef(0);
  const targetHeading = useRef<number | null>(null);
  const controlsConnected = useRef(false);
  const active = expedition.presentation === "three-dimensional";
  const sailing = active && expedition.pauseState === "sailing" && !readerOpen;
  const unavailable = expedition.threeDAvailability.status === "unavailable";
  const passageId = `${expedition.currentStation}-signal-${expedition.bookmarks[expedition.currentStation] + 1}`;
  const savedPose = expedition.vesselCheckpoints.current;
  const previouslyActive = useRef(false);

  useEffect(() => {
    if (previouslyActive.current && unavailable) {
      closeDisclosures();
      focusTarget(passageId);
    }
    previouslyActive.current = active;
  }, [active, unavailable, passageId]);

  const checkpoint = useCallback(() => {
    setExpedition((current) =>
      transitionExpedition(current, {
        type: "checkpoint-vessel",
        checkpoint: "current",
        pose: livePose.current,
      }),
    );
  }, [setExpedition]);

  const fail = useCallback(
    (reason: ThreeDUnavailableReason) => {
      steering.current = 0;
      setExpedition((current) => {
        // Canvas disposal can itself emit context loss. Preserve the original failure.
        if (current.threeDAvailability.status === "unavailable") return current;
        return transitionExpedition(
          transitionExpedition(current, {
            type: "checkpoint-vessel",
            checkpoint: "current",
            pose: livePose.current,
          }),
          { type: "lock-three-d", reason },
        );
      });
    },
    [setExpedition],
  );
  const failAsset = useCallback(() => fail("asset-failure"), [fail]);

  const prepare = useCallback(() => {
    setStage("checking");
    if (!window.WebGL2RenderingContext) {
      fail("unsupported");
      return;
    }
    try {
      const probe = document.createElement("canvas");
      const context = probe.getContext("webgl2", {
        failIfMajorPerformanceCaveat: true,
      });
      if (!context) {
        fail("refused");
        return;
      }
      context.getExtension("WEBGL_lose_context")?.loseContext();
      setLow(
        expedition.qualityPreference === "reduced-3d" ||
          window.matchMedia("(pointer: coarse)").matches ||
          window.innerWidth < 768,
      );
      setStage("loading");
      setEligible(true);
    } catch {
      fail("refused");
    }
  }, [fail, expedition.qualityPreference]);

  useEffect(() => {
    if (!enhanced || unavailable) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frame = requestAnimationFrame(() => {
      setReducedMotion(preference.matches);
      if (
        !preference.matches &&
        expedition.qualityPreference !== "text" &&
        !eligible
      )
        prepare();
    });
    const onPreference = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) {
        steering.current = 0;
        checkpoint();
        setExpedition((current) =>
          transitionExpedition(current, {
            type: "set-presentation",
            presentation: "editorial",
          }),
        );
      }
    };
    preference.addEventListener("change", onPreference);
    return () => {
      cancelAnimationFrame(frame);
      preference.removeEventListener("change", onPreference);
    };
  }, [
    enhanced,
    unavailable,
    eligible,
    expedition.qualityPreference,
    prepare,
    checkpoint,
    setExpedition,
  ]);

  useEffect(() => {
    livePose.current = savedPose;
  }, [savedPose]);

  useEffect(() => {
    if (sailing) return;
    steering.current = 0;
    targetHeading.current = null;
    checkpoint();
  }, [sailing, checkpoint]);

  useEffect(() => {
    if (!sailing) return;
    const interval = window.setInterval(checkpoint, 1000);
    return () => clearInterval(interval);
  }, [sailing, checkpoint]);

  useEffect(() => {
    if (!canvas) return;
    let pointer: { id: number; startX: number } | null = null;
    const keys = new Set<string>();
    const reset = () => {
      const captured = pointer;
      pointer = null;
      if (captured && canvas.hasPointerCapture(captured.id))
        canvas.releasePointerCapture(captured.id);
      keys.clear();
      steering.current = 0;
      targetHeading.current = null;
    };
    const down = (event: PointerEvent) => {
      if (!sailing || event.button !== 0 || pointer) return;
      targetHeading.current = null;
      pointer = { id: event.pointerId, startX: event.clientX };
      canvas.setPointerCapture(event.pointerId);
      canvas.focus({ preventScroll: true });
      event.preventDefault();
    };
    const move = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId || !sailing) return;
      steering.current = dragSteering(event.clientX - pointer.startX);
      event.preventDefault();
    };
    const key = (event: KeyboardEvent) => {
      const name = event.key.toLowerCase();
      if (
        !["a", "d", "arrowleft", "arrowright"].includes(name) ||
        !sailing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      event.preventDefault();
      if (event.type === "keydown") keys.add(name);
      else keys.delete(name);
      targetHeading.current = null;
      steering.current =
        Number(keys.has("d") || keys.has("arrowright")) -
        Number(keys.has("a") || keys.has("arrowleft"));
    };
    const lost = (event: Event) => {
      event.preventDefault();
      reset();
      fail("context-loss");
    };
    const hidden = () => {
      if (document.hidden) {
        reset();
        checkpoint();
      }
    };
    canvas.setAttribute("tabindex", active ? "0" : "-1");
    canvas.setAttribute(
      "aria-label",
      "Navegação da embarcação. Use A e D, setas ou arraste na horizontal.",
    );
    canvas.setAttribute("role", "group");
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", reset);
    canvas.addEventListener("pointercancel", reset);
    canvas.addEventListener("lostpointercapture", reset);
    canvas.addEventListener("keydown", key);
    canvas.addEventListener("keyup", key);
    canvas.addEventListener("blur", reset);
    canvas.addEventListener("webglcontextlost", lost);
    window.addEventListener("blur", reset);
    window.addEventListener("pagehide", hidden);
    document.addEventListener("visibilitychange", hidden);
    controlsConnected.current = true;
    return () => {
      controlsConnected.current = false;
      reset();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", reset);
      canvas.removeEventListener("pointercancel", reset);
      canvas.removeEventListener("lostpointercapture", reset);
      canvas.removeEventListener("keydown", key);
      canvas.removeEventListener("keyup", key);
      canvas.removeEventListener("blur", reset);
      canvas.removeEventListener("webglcontextlost", lost);
      window.removeEventListener("blur", reset);
      window.removeEventListener("pagehide", hidden);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [canvas, active, sailing, fail, checkpoint]);

  function switchPresentation(threeD: boolean) {
    if (threeD && (stage !== "ready" || unavailable)) return;
    checkpoint();
    steering.current = 0;
    closeDisclosures();
    setExpedition((current) => {
      const selected =
        threeD && current.qualityPreference === "text"
          ? transitionExpedition(current, {
              type: "set-quality-preference",
              qualityPreference: "automatic",
            })
          : current;
      return transitionExpedition(selected, {
        type: "set-presentation",
        presentation: threeD ? "three-dimensional" : "editorial",
      });
    });
    focusTarget(threeD && !readerOpen ? "expedition-movement" : passageId);
  }

  function toggleSailing() {
    if (stage !== "ready" || unavailable || readerOpen) return;
    checkpoint();
    steering.current = 0;
    setStarted(true);
    setExpedition((current) =>
      transitionExpedition(current, {
        type: "set-pause-state",
        pauseState: sailing ? "paused" : "sailing",
      }),
    );
  }

  function steer(direction: number) {
    if (!sailing) return;
    steering.current = 0;
    targetHeading.current =
      livePose.current.heading + (direction * Math.PI) / 18;
  }

  function openFirstStation() {
    checkpoint();
    setReaderOpen(true);
    setExpedition((current) =>
      transitionExpedition(current, {
        type: "open-station",
        station: "pulso-de-calor",
      }),
    );
    closeDisclosures();
    focusTarget(
      `pulso-de-calor-signal-${expedition.bookmarks["pulso-de-calor"] + 1}`,
    );
  }

  const resumed =
    started ||
    expedition.vesselCheckpoints.current.position.x !== 0 ||
    expedition.vesselCheckpoints.current.position.z !== 0;
  return (
    <>
      <section
        className="presentation-bar"
        aria-label="Apresentação da expedição">
        <p role="status" aria-atomic="true">
          {!enhanced
            ? "A expedição está disponível em texto."
            : unavailable &&
                expedition.threeDAvailability.status === "unavailable"
              ? `${failureCopy[expedition.threeDAvailability.reason]} Continue pela versão em texto; seu lugar está preservado.`
              : !eligible && reducedMotion
                ? "A versão em texto respeita sua preferência por movimento reduzido."
                : !eligible && expedition.qualityPreference === "text"
                  ? "Versão em texto selecionada."
                  : preparationCopy[stage]}
        </p>
        <div>
          {!unavailable &&
          !eligible &&
          enhanced &&
          (reducedMotion || expedition.qualityPreference === "text") ? (
            <button type="button" onClick={prepare}>
              {reducedMotion
                ? "Preparar 3D com movimento reduzido"
                : "Preparar 3D"}
            </button>
          ) : null}
          {!active && !unavailable ? (
            <button
              type="button"
              disabled={stage !== "ready"}
              onClick={() => switchPresentation(true)}>
              Explorar em 3D
            </button>
          ) : null}
          <a
            href={`#${passageId}`}
            onClick={(event) => {
              event.preventDefault();
              switchPresentation(false);
            }}>
            Versão em texto
          </a>
        </div>
      </section>
      {eligible && !unavailable ? (
        <section
          className="ocean-world"
          data-active={active}
          data-reading={readerOpen}
          aria-label="Expedição em Mar aberto"
          aria-hidden={!active}
          inert={!active}>
          <RuntimeErrorBoundary onFailure={failAsset}>
            <OceanRuntime
              configuration={configuration}
              vesselUrl={
                low ? configuration.vessels.low : configuration.vessels.balanced
              }
              low={low}
              reducedMotion={reducedMotion}
              active={active}
              sailing={sailing}
              livePose={livePose}
              steering={steering}
              targetHeading={targetHeading}
              controlsConnected={controlsConnected}
              onStage={setStage}
              onFailure={failAsset}
              onCanvas={setCanvas}
              onStation={openFirstStation}
            />
          </RuntimeErrorBoundary>
          <div className="ocean-caption">
            <p>Observatório Atlântico Vivo</p>
            <h1>
              Mar <em>aberto</em>
            </h1>
          </div>
          <div className="helm-controls" aria-label="Controles da embarcação">
            {readerOpen ? (
              <button
                id="expedition-movement"
                type="button"
                onClick={() => {
                  setReaderOpen(false);
                  focusTarget("expedition-movement");
                }}>
                Voltar ao mar
              </button>
            ) : (
              <button
                id="expedition-movement"
                type="button"
                onClick={toggleSailing}>
                {sailing
                  ? "Pausar expedição"
                  : resumed
                    ? "Retomar expedição"
                    : "Iniciar expedição"}
              </button>
            )}
            <button type="button" onClick={() => steer(-1)} disabled={!sailing}>
              Virar à esquerda
            </button>
            <button type="button" onClick={() => steer(1)} disabled={!sailing}>
              Virar à direita
            </button>
            <button
              type="button"
              aria-expanded={showControls}
              aria-controls="helm-guidance"
              onClick={() => setShowControls(!showControls)}>
              Controles
            </button>
            <p id="helm-guidance" hidden={!showControls}>
              Arraste na horizontal sobre o oceano, ou focalize a navegação e
              use A/D ou as setas. Ao soltar, a direção é mantida. Os botões de
              direção também permitem conduzir sem arrastar.
            </p>
            {!started && !readerOpen ? (
              <p>
                Você conduz a direção. A embarcação mantém um ritmo tranquilo.
              </p>
            ) : null}
            <p className="ocean-disclosure">
              Pesquisa histórica · expedição fictícia
            </p>
          </div>
        </section>
      ) : null}
    </>
  );
}
