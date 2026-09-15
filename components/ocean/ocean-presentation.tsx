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
import { connectHelmInput } from "@/lib/helm-input";
import { createQualityController, type OceanQuality } from "@/lib/ocean-quality";
import { useOceanLifecycle } from "@/lib/use-ocean-lifecycle";
import { useOceanRecovery } from "@/lib/use-ocean-recovery";
import { getAssistanceDestinations, reorientVessel, type AssistanceStage } from "@/lib/assisted-return";
import {
  isStationAvailable,
  transitionExpedition,
  type ThreeDUnavailableReason,
  type ExpeditionQualityPreference,
} from "@/lib/expedition-state";
import type { OceanConfiguration, OceanStation } from "@/lib/ocean-config";
import { ARRIVAL_RADIUS, stationDistance } from "@/lib/station-approach";
import { closeDisclosures, focusOceanTarget as focusTarget } from "@/lib/reader-interactions";
import { getEvidenceProgress } from "@/lib/expedition-view";
import { useStickyScrollOffset } from "@/lib/use-sticky-scroll-offset";
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

export default function OceanPresentation({
  configuration,
}: {
  configuration: OceanConfiguration;
}) {
  const { expedition, setExpedition, enhanced, readerOpen, setReaderOpen, announce } =
    useExpedition();
  const [stage, setStage] = useState<PreparationStage>("checking");
  const [eligible, setEligible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [quality, setQuality] = useState<OceanQuality>({ tier: "balanced", dpr: 1.25, fallback: false });
  const qualityController = useRef<ReturnType<typeof createQualityController> | null>(null);
  const [recoveryGeneration, setRecoveryGeneration] = useState(0);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [started, setStarted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [assistance, setAssistance] = useState<{ stage: AssistanceStage; boundaryReturning: boolean }>({ stage: "none", boundaryReturning: false });
  const reorientation = useRef(false);
  const livePose = useRef(expedition.vesselCheckpoints.current);
  const steering = useRef(0);
  const targetHeading = useRef<number | null>(null);
  const controlsConnected = useRef(false);
  const active = expedition.presentation === "three-dimensional";
  const sailing = active && expedition.pauseState === "sailing" && !readerOpen;
  const unavailable = expedition.threeDAvailability.status === "unavailable";
  const restoring = expedition.threeDAvailability.status === "restoring";
  const passageId = `${expedition.currentStation}-signal-${expedition.bookmarks[expedition.currentStation] + 1}`;
  const savedPose = expedition.vesselCheckpoints.current;
  const availableStations = configuration.stations.filter((station) => isStationAvailable(expedition, station.id)).map((station) => station.id);
  const previouslyActive = useRef(false);
  const presentationBar = useRef<HTMLElement>(null);
  useStickyScrollOffset(presentationBar);

  useEffect(() => {
    if (previouslyActive.current && (unavailable || restoring)) {
      closeDisclosures();
      focusTarget(readerOpen ? passageId : "expedition-editorial-heading");
    }
    previouslyActive.current = active;
  }, [active, unavailable, restoring, passageId, readerOpen]);

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
          { type: "lock-three-d", reason: current.threeDAvailability.status === "restoring" ? "context-loss" : reason },
        );
      });
    },
    [setExpedition],
  );
  const failAsset = useCallback(() => fail("asset-failure"), [fail]);
  const suspend = useCallback(() => {
    steering.current = 0;
    targetHeading.current = null;
    qualityController.current?.suspend();
    checkpoint();
    setExpedition((current) => transitionExpedition(current, { type: "set-pause-state", pauseState: "paused" }));
  }, [checkpoint, setExpedition]);
  const { visible, suspended } = useOceanLifecycle(suspend);
  const loseContext = useCallback(() => {
    suspend();
    setStage("preparing");
    setExpedition((current) => transitionExpedition(current, { type: "lose-context" }));
  }, [suspend, setExpedition]);
  useOceanRecovery(unavailable ? null : canvas, {
    onLost: loseContext,
    onRestored: () => setRecoveryGeneration((generation) => generation + 1),
    onFailed: () => fail("context-loss"),
    canRestore: expedition.contextLosses === 0,
  }, restoring);
  const onStage = useCallback((next: PreparationStage) => {
    setStage(next);
    if (next === "ready") setExpedition((current) => transitionExpedition(current, { type: "restore-context" }));
  }, [setExpedition]);
  const measureFrame = useCallback((milliseconds: number | null) => {
    const controller = qualityController.current;
    if (!controller) return;
    if (milliseconds === null) { controller.suspend(); return; }
    const previous = controller.current();
    const next = controller.frame(milliseconds);
    if (next.fallback) { fail("unusable-quality"); return; }
    if (previous.tier !== next.tier || previous.dpr !== next.dpr) setQuality(next);
  }, [fail]);

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
      setQuality(controller.choose(expedition.qualityPreference));
      setStage("loading");
      setEligible(true);
    } catch {
      fail("refused");
    }
  }, [fail, expedition.qualityPreference, unavailable, restoring, eligible]);

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
    qualityController.current?.suspend();
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
    canvas.setAttribute("tabindex", active ? "0" : "-1");
    canvas.setAttribute("aria-label", "Navegação da embarcação. Use A e D, setas ou arraste na horizontal.");
    canvas.setAttribute("role", "group");
    const disconnect = connectHelmInput(canvas, {
      sailing: sailing && visible && !restoring, steering, targetHeading,
      onSuspend: suspend,
    });
    controlsConnected.current = true;
    return () => { controlsConnected.current = false; disconnect(); };
  }, [canvas, active, sailing, visible, restoring, suspend]);

  function chooseQuality(preference: ExpeditionQualityPreference) {
    const next = qualityController.current?.choose(preference);
    if (next) setQuality(next);
    if (preference === "text") switchPresentation(false);
    setExpedition((current) => transitionExpedition(current, { type: "set-quality-preference", qualityPreference: preference }));
  }

  function switchPresentation(threeD: boolean) {
    if (threeD && (stage !== "ready" || unavailable || restoring)) return;
    if (threeD && expedition.qualityPreference === "text") qualityController.current?.choose("automatic");
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
    announce(threeD
      ? "Expedição em 3D. A navegação está pausada."
      : "Versão em texto. Seu lugar na expedição está preservado.");
    focusTarget(readerOpen ? passageId : threeD ? "expedition-movement" : "expedition-editorial-heading");
  }

  function toggleSailing() {
    if (stage !== "ready" || unavailable || restoring || readerOpen || suspended.current) return;
    checkpoint();
    steering.current = 0;
    setStarted(true);
    announce(sailing ? "Expedição pausada." : "Expedição em movimento.");
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

  function reorient() {
    if (!sailing || assistance.stage !== "reorient") return;
    const destinations = getAssistanceDestinations(configuration.stations, availableStations, expedition.completedStations);
    steering.current = 0;
    targetHeading.current = null;
    livePose.current = reorientVessel(livePose.current, destinations);
    reorientation.current = true;
    checkpoint();
    canvas?.focus({ preventScroll: true });
  }

  function openStation(station: OceanStation) {
    if (!active || readerOpen || !isStationAvailable(expedition, station.id)
      || stationDistance(livePose.current, station) > ARRIVAL_RADIUS + 0.2) return;
    steering.current = 0;
    targetHeading.current = null;
    const arrivalPose = livePose.current;
    setReaderOpen(true);
    setExpedition((current) => {
      const checkpointed = transitionExpedition(current, { type: "checkpoint-vessel", checkpoint: "current", pose: arrivalPose });
      const arrived = transitionExpedition(checkpointed, { type: "checkpoint-vessel", checkpoint: station.id, pose: arrivalPose });
      return transitionExpedition(arrived, { type: "open-station", station: station.id });
    });
    closeDisclosures();
    announce(`${station.name}, estação aberta.`);
    focusTarget(`${station.id}-signal-${expedition.bookmarks[station.id] + 1}`);
  }

  const resumed =
    started ||
    expedition.vesselCheckpoints.current.position.x !== 0 ||
    expedition.vesselCheckpoints.current.position.z !== 0;
  return (
    <>
      <section
        ref={presentationBar}
        className="presentation-bar"
        aria-label="Apresentação da expedição">
        <p role="status" aria-atomic="true">
          {!enhanced
            ? "A expedição está disponível em texto."
            : unavailable &&
                expedition.threeDAvailability.status === "unavailable"
              ? `${failureCopy[expedition.threeDAvailability.reason]} Continue pela versão em texto; seu lugar está preservado.`
              : restoring
                ? "A conexão gráfica com o oceano foi interrompida. Tentando restaurar o 3D; continue pela versão em texto."
              : !eligible && reducedMotion
                ? "A versão em texto respeita sua preferência por movimento reduzido."
                : !eligible && expedition.qualityPreference === "text"
                  ? "Versão em texto selecionada."
                  : preparationCopy[stage]}
        </p>
        <div>
          {enhanced ? <label className="quality-choice">
            Qualidade
            <select value={expedition.qualityPreference} onChange={(event) => chooseQuality(event.target.value as ExpeditionQualityPreference)}>
              <option value="automatic">Automático</option>
              <option value="reduced-3d">3D reduzido</option>
              <option value="text">Versão em texto</option>
            </select>
          </label> : null}
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
          className="ocean-world"
          data-active={active}
          data-reading={readerOpen}
          data-quality={quality.tier}
          data-dpr={quality.dpr}
          aria-label="Expedição em Mar aberto"
          aria-hidden={!active}
          inert={!active}>
          <RuntimeErrorBoundary onFailure={failAsset}>
            <OceanRuntime
              configuration={configuration}
              vesselUrl={
                quality.tier === "low" ? configuration.vessels.low : configuration.vessels.balanced
              }
              quality={quality}
              visible={visible}
              suspended={suspended}
              recoveryGeneration={recoveryGeneration}
              onFrame={measureFrame}
              reducedMotion={reducedMotion}
              active={active}
              sailing={sailing}
              reading={readerOpen}
              availableStations={availableStations}
              completedStations={expedition.connected ? [...expedition.completedStations, "convergencia"] : expedition.completedStations}
              livePose={livePose}
              steering={steering}
              targetHeading={targetHeading}
              reorientation={reorientation}
              assistance={assistance}
              onAssistance={setAssistance}
              controlsConnected={controlsConnected}
              onStage={onStage}
              onFailure={failAsset}
              onCanvas={setCanvas}
              onStation={openStation}
            />
          </RuntimeErrorBoundary>
          <div className="ocean-caption">
            <p>Observatório Atlântico Vivo</p>
            <h1>
              Mar <em>aberto</em>
            </h1>
          </div>
          <div className="helm-controls" role="group" aria-label="Controles da embarcação" hidden={readerOpen}>
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
            {assistance.stage === "reorient" ? (
              <button type="button" onClick={reorient} disabled={!sailing}>Reorientar rota</button>
            ) : null}
            <p role="status" aria-live="polite" aria-atomic="true" hidden={assistance.stage === "none" && !assistance.boundaryReturning}>
              {assistance.boundaryReturning
                ? "A corrente na borda curva a embarcação de volta às águas da expedição."
                : assistance.stage === "reorient"
                  ? "Se precisar, reoriente a direção para uma estação. Você continua no comando."
                  : "A luz das estações está mais forte para ajudar a reconhecer o caminho."}
            </p>
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
            <p className="helm-progress">{getEvidenceProgress(expedition)}</p>
            <p className="ocean-disclosure">
              Pesquisa histórica · expedição fictícia
            </p>
          </div>
        </section>
      ) : null}
    </>
  );
}
