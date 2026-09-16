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
import { stops, type StopId } from "@/content/editorial";
import { useVoyage } from "@/providers/voyage-provider";
import { connectRouteInput } from "@/lib/route-input";
import {
  createQualityController,
  type OceanQuality,
} from "@/lib/ocean-quality";
import { useOceanLifecycle } from "@/lib/use-ocean-lifecycle";
import { useOceanRecovery } from "@/lib/use-ocean-recovery";
import {
  stopIds,
  stopIndex,
  transitionVoyage,
  type ThreeDUnavailableReason,
  type VoyageQualityPreference,
} from "@/lib/voyage-state";
import type { OceanConfiguration } from "@/lib/ocean-config";
import {
  closeDisclosures,
  focusOceanTarget as focusTarget,
} from "@/lib/reader-interactions";
import { useStickyScrollOffset } from "@/lib/use-sticky-scroll-offset";
import type { PreparationStage } from "@/components/ocean/ocean-runtime";
import {
  enableLocalDiagnostics,
  recordDiagnostic,
  recordFrame,
} from "@/lib/local-diagnostics";

// The only runtime import. Editorial code and the state model never import Three.
const OceanRuntime = dynamic(() => import("@/components/ocean/ocean-runtime"), {
  ssr: false,
});

const preparationCopy: Record<PreparationStage, string> = {
  checking: "Verificando a navegação em 3D…",
  loading: "Carregando o navio e a rota…",
  preparing: "Preparando o oceano…",
  frame: "Verificando a primeira imagem do oceano…",
  ready: "O oceano está pronto",
};

const failureCopy: Record<ThreeDUnavailableReason, string> = {
  unsupported:
    "Este navegador não oferece o recurso gráfico necessário para navegar em 3D.",
  refused: "O navegador não permitiu iniciar a navegação em 3D.",
  "asset-failure": "Não foi possível preparar o navio ou a imagem do oceano.",
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

export default function OceanPresentation({
  configuration,
  onOpenStop,
}: {
  configuration: OceanConfiguration;
  onOpenStop: (stop: StopId) => void;
}) {
  const {
    voyage,
    setVoyage,
    enhanced,
    readerOpen,
    setAllSourcesOpen,
    signalPages,
    chartedRoute,
    route,
    announce,
  } = useVoyage();
  const [stage, setStage] = useState<PreparationStage>("checking");
  const [eligible, setEligible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [quality, setQuality] = useState<OceanQuality>({
    tier: "balanced",
    dpr: 1.25,
    fallback: false,
  });
  const qualityController = useRef<ReturnType<
    typeof createQualityController
  > | null>(null);
  const [recoveryGeneration, setRecoveryGeneration] = useState(0);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [surface, setSurface] = useState<HTMLElement | null>(null);
  const [settledStop, setSettledStop] = useState<number | null>(null);
  const inputConnected = useRef(false);
  const inputEnabled = useRef(false);
  const active = voyage.presentation === "three-dimensional";
  const unavailable = voyage.threeDAvailability.status === "unavailable";
  const restoring = voyage.threeDAvailability.status === "restoring";
  const currentStop = useRef(voyage.currentStop);
  const passageId = `${voyage.currentStop}-signal-${(signalPages[voyage.currentStop] ?? 0) + 1}`;
  const previouslyActive = useRef(false);
  const presentationBar = useRef<HTMLElement>(null);
  useStickyScrollOffset(presentationBar);

  useEffect(() => {
    enableLocalDiagnostics();
    recordDiagnostic("readiness", "editorial-ready");
  }, []);
  useEffect(() => {
    recordDiagnostic("quality", quality);
  }, [quality]);
  useEffect(() => {
    recordDiagnostic("readiness", stage);
  }, [stage]);
  useEffect(() => {
    currentStop.current = voyage.currentStop;
  }, [voyage.currentStop]);

  useEffect(() => {
    if (previouslyActive.current && (unavailable || restoring)) {
      closeDisclosures();
      focusTarget(readerOpen ? passageId : "voyage-editorial-heading");
    }
    previouslyActive.current = active;
  }, [active, unavailable, restoring, passageId, readerOpen]);

  // Record the Ship's place on the route, including partway between Stops.
  const checkpoint = useCallback(() => {
    const { progress } = route.current.frame();
    setVoyage((current) =>
      transitionVoyage(current, { type: "set-route-progress", progress }),
    );
  }, [route, setVoyage]);

  const fail = useCallback(
    (reason: ThreeDUnavailableReason) => {
      recordDiagnostic("failure", reason);
      const { progress } = route.current.frame();
      setVoyage((current) => {
        // Canvas disposal can itself emit context loss. Preserve the original failure.
        if (current.threeDAvailability.status === "unavailable") return current;
        return transitionVoyage(
          transitionVoyage(current, { type: "set-route-progress", progress }),
          {
            type: "lock-three-d",
            reason:
              current.threeDAvailability.status === "restoring"
                ? "context-loss"
                : reason,
          },
        );
      });
    },
    [route, setVoyage],
  );
  const failAsset = useCallback(() => fail("asset-failure"), [fail]);
  const suspend = useCallback(() => {
    qualityController.current?.suspend();
    route.current.release();
    checkpoint();
  }, [route, checkpoint]);
  const { visible, suspended } = useOceanLifecycle(suspend);
  useEffect(() => {
    recordDiagnostic(
      "lifecycle",
      `${visible ? "visible" : "hidden"}:${active ? "3d" : "editorial"}:${readerOpen ? "reading" : "voyage"}`,
    );
  }, [visible, active, readerOpen]);
  const loseContext = useCallback(() => {
    recordDiagnostic("context", "lost");
    suspend();
    setStage("preparing");
    setVoyage((current) => transitionVoyage(current, { type: "lose-context" }));
  }, [suspend, setVoyage]);
  useOceanRecovery(
    unavailable ? null : canvas,
    {
      onLost: loseContext,
      onRestored: () => {
        recordDiagnostic("context", "restored");
        setRecoveryGeneration((generation) => generation + 1);
      },
      onFailed: () => fail("context-loss"),
      canRestore: voyage.contextLosses === 0,
    },
    restoring,
  );
  const onStage = useCallback(
    (next: PreparationStage) => {
      setStage(next);
      if (next === "ready")
        setVoyage((current) =>
          transitionVoyage(current, { type: "restore-context" }),
        );
    },
    [setVoyage],
  );
  const measureFrame = useCallback(
    (milliseconds: number | null) => {
      recordFrame(milliseconds);
      const controller = qualityController.current;
      if (!controller) return;
      if (milliseconds === null) {
        controller.suspend();
        return;
      }
      const previous = controller.current();
      const next = controller.frame(milliseconds);
      if (next.fallback) {
        recordDiagnostic("quality", next);
        fail("unusable-quality");
        return;
      }
      if (previous.tier !== next.tier || previous.dpr !== next.dpr)
        setQuality(next);
    },
    [fail],
  );
  // The scene reports each Stop the Ship comes to rest at, and null on departure.
  const settle = useCallback(
    (index: number | null) => {
      setSettledStop(index);
      if (index === null || !inputEnabled.current) return;
      const stop = stops[index];
      if (stop.id !== currentStop.current)
        announce(`Parada ${String(index).padStart(2, "0")} · ${stop.name}.`);
      setVoyage((current) =>
        transitionVoyage(current, { type: "arrive-at-stop", stop: stopIds[index] }),
      );
    },
    [announce, setVoyage],
  );

  const prepare = useCallback(() => {
    if (unavailable || restoring || eligible) return;
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
      const controller = createQualityController({
        coarsePointer: window.matchMedia("(pointer: coarse)").matches,
        smallScreen: window.innerWidth < 768,
        deviceDpr: window.devicePixelRatio,
      });
      qualityController.current = controller;
      setQuality(controller.choose(voyage.qualityPreference));
      setStage("loading");
      setEligible(true);
    } catch {
      fail("refused");
    }
  }, [fail, voyage.qualityPreference, unavailable, restoring, eligible]);

  // Reduced motion keeps the 3D voyage; the scene cuts between Stops instead.
  useEffect(() => {
    if (!enhanced || unavailable) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frame = requestAnimationFrame(() => {
      setReducedMotion(preference.matches);
      if (voyage.qualityPreference !== "text" && !eligible) prepare();
    });
    const onPreference = () => setReducedMotion(preference.matches);
    preference.addEventListener("change", onPreference);
    return () => {
      cancelAnimationFrame(frame);
      preference.removeEventListener("change", onPreference);
    };
  }, [enhanced, unavailable, eligible, voyage.qualityPreference, prepare]);

  const voyaging = active && visible && !readerOpen && !restoring && stage === "ready";
  useEffect(() => {
    inputEnabled.current = voyaging;
    if (!voyaging) {
      qualityController.current?.suspend();
      checkpoint();
      return;
    }
    const interval = window.setInterval(checkpoint, 1000);
    return () => clearInterval(interval);
  }, [voyaging, checkpoint]);

  useEffect(() => {
    if (!surface) return;
    const disconnect = connectRouteInput(surface, {
      route: () => route.current,
      enabled: () => inputEnabled.current,
    });
    inputConnected.current = true;
    return () => {
      inputConnected.current = false;
      disconnect();
    };
  }, [surface, route]);

  function chooseQuality(preference: VoyageQualityPreference) {
    recordDiagnostic("preference", preference);
    const next = qualityController.current?.choose(preference);
    if (next) setQuality(next);
    if (preference === "text") switchPresentation(false);
    setVoyage((current) =>
      transitionVoyage(current, {
        type: "set-quality-preference",
        qualityPreference: preference,
      }),
    );
  }

  function switchPresentation(threeD: boolean) {
    if (threeD && (stage !== "ready" || unavailable || restoring)) return;
    if (threeD && voyage.qualityPreference === "text")
      qualityController.current?.choose("automatic");
    checkpoint();
    closeDisclosures();
    setAllSourcesOpen(false);
    setVoyage((current) => {
      const selected =
        threeD && current.qualityPreference === "text"
          ? transitionVoyage(current, {
              type: "set-quality-preference",
              qualityPreference: "automatic",
            })
          : current;
      return transitionVoyage(selected, {
        type: "set-presentation",
        presentation: threeD ? "three-dimensional" : "editorial",
      });
    });
    announce(
      threeD
        ? "Viagem em 3D. Role ou use as setas para navegar entre as paradas."
        : "Versão em texto. Seu lugar na viagem está preservado.",
    );
    focusTarget(
      readerOpen
        ? passageId
        : threeD
          ? "voyage-ocean"
          : "voyage-editorial-heading",
    );
  }

  function openStop(stop: StopId) {
    if (!active || readerOpen || settledStop !== stopIndex(stop)) return;
    closeDisclosures();
    onOpenStop(stop);
  }

  return (
    <>
      <section
        ref={presentationBar}
        className="presentation-bar"
        aria-label="Apresentação da viagem">
        <p role="status" aria-atomic="true">
          {!enhanced
            ? "A viagem está disponível em texto."
            : unavailable && voyage.threeDAvailability.status === "unavailable"
              ? `${failureCopy[voyage.threeDAvailability.reason]} Continue pela versão em texto; seu lugar está preservado.`
              : restoring
                ? "A conexão gráfica com o oceano foi interrompida. Tentando restaurar o 3D; continue pela versão em texto."
                : !eligible && voyage.qualityPreference === "text"
                  ? "Versão em texto selecionada."
                  : preparationCopy[stage]}
        </p>
        <div>
          {enhanced ? (
            <label className="quality-choice">
              Qualidade
              <select
                value={voyage.qualityPreference}
                onChange={(event) =>
                  chooseQuality(event.target.value as VoyageQualityPreference)
                }>
                <option value="automatic">Automático</option>
                <option value="reduced-3d">3D reduzido</option>
                <option value="text">Versão em texto</option>
              </select>
            </label>
          ) : null}
          {!unavailable &&
          !eligible &&
          enhanced &&
          voyage.qualityPreference === "text" ? (
            <button type="button" onClick={prepare}>
              Preparar 3D
            </button>
          ) : null}
          {!active && !unavailable ? (
            <button
              type="button"
              disabled={stage !== "ready" || restoring}
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
          ref={setSurface}
          id="voyage-ocean"
          tabIndex={-1}
          className="ocean-world"
          data-active={active}
          data-reading={readerOpen}
          data-quality={quality.tier}
          data-dpr={quality.dpr}
          data-settled-stop={settledStop ?? undefined}
          aria-label="Viagem em 3D. Role, deslize ou use as setas e Page Up ou Page Down para navegar entre as paradas."
          aria-hidden={!active}
          inert={!active}>
          <RuntimeErrorBoundary onFailure={failAsset}>
            <OceanRuntime
              configuration={configuration}
              chartedRoute={chartedRoute}
              route={route}
              vesselUrl={
                quality.tier === "low"
                  ? configuration.vessels.low
                  : configuration.vessels.balanced
              }
              quality={quality}
              visible={visible}
              suspended={suspended}
              recoveryGeneration={recoveryGeneration}
              onFrame={measureFrame}
              reducedMotion={reducedMotion}
              active={active}
              reading={readerOpen}
              settledStop={settledStop}
              visitedStops={voyage.visitedStops}
              inputConnected={inputConnected}
              onStage={onStage}
              onFailure={failAsset}
              onCanvas={setCanvas}
              onSettle={settle}
              onOpenStop={openStop}
            />
          </RuntimeErrorBoundary>
          <div className="ocean-caption">
            <p>Travessia</p>
            <h1>
              Mar <em>aberto</em>
            </h1>
          </div>
        </section>
      ) : null}
    </>
  );
}
