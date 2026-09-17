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
import { useScrollCue } from "@/lib/use-scroll-cue";
import {
  stopIds,
  stopIndex,
  transitionVoyage,
  type ThreeDUnavailableReason,
} from "@/lib/voyage-state";
import type { OceanConfiguration } from "@/lib/ocean-config";
import { focusOceanTarget as focusTarget } from "@/lib/focus-target";
import { accountStops } from "@/lib/voyage-view";
import {
  applyStageLayout,
  sameStageLayout,
  type StageLayout,
} from "@/lib/stage-layout";
import type { PreparationStage } from "@/components/ocean/ocean-runtime";
import OceanLoading from "@/components/ocean/ocean-loading";
import PresentationNotice from "@/components/ocean/presentation-notice";
import StopCard from "@/components/ocean/stop-card";
import StopAccountSheet from "@/components/ocean/stop-account-sheet";
import ChaptersSheet from "@/components/ocean/chapters-sheet";
import ItinerarySheet from "@/components/ocean/itinerary-sheet";
import VoyageChrome, { ReadingModeLink } from "@/components/ocean/voyage-chrome";
import {
  enableLocalDiagnostics,
  recordDiagnostic,
  recordFrame,
} from "@/lib/local-diagnostics";

// The only runtime import. Editorial code and the state model never import Three.
const OceanRuntime = dynamic(() => import("@/components/ocean/ocean-runtime"), {
  ssr: false,
});

// One short line each; the Accessible Editorial Presentation carries the rest.
const failureCopy: Record<ThreeDUnavailableReason, string> = {
  unsupported: "Este navegador não consegue exibir o oceano em 3D.",
  refused: "O navegador não permitiu exibir o oceano em 3D.",
  "asset-failure": "Não foi possível carregar o oceano em 3D.",
  "context-loss": "A exibição do oceano em 3D foi interrompida.",
  "unusable-quality": "O oceano em 3D não ficou estável neste dispositivo.",
};
const restoringCopy =
  "A exibição do oceano em 3D foi interrompida. Tentando restaurá-la…";

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
    sheet,
    setSheet,
    chartedRoute,
    route,
    goToStop,
    restartVoyage,
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
  // The card keeps its last Stop while it fades out under way.
  const [cardStop, setCardStop] = useState(0);
  const laidOut = useRef<{ surface: HTMLElement; layout: StageLayout } | null>(null);
  const { cueVisible, dismissCue } = useScrollCue();
  const inputConnected = useRef(false);
  const inputEnabled = useRef(false);
  // Until enhancement, the server-rendered editorial content stays under the loading fade.
  const active = enhanced && voyage.presentation === "three-dimensional";
  const unavailable = voyage.threeDAvailability.status === "unavailable";
  const restoring = voyage.threeDAvailability.status === "restoring";
  const currentStop = useRef(voyage.currentStop);
  // Sheets only show over the ocean scene; leaving it closes them.
  const sheetOpen = active && sheet !== null;
  const activeRef = useRef(active);
  const previouslyActive = useRef(false);
  const explanation =
    voyage.threeDAvailability.status === "unavailable"
      ? failureCopy[voyage.threeDAvailability.reason]
      : restoring
        ? restoringCopy
        : null;

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
    activeRef.current = active;
  }, [active]);

  // A failure opens the Accessible Editorial Presentation with its explanation.
  useEffect(() => {
    if (previouslyActive.current && (unavailable || restoring)) {
      if (explanation) announce(explanation);
      // An open Stop Account continues as the same Stop in the editorial text.
      focusTarget(sheet === "account" ? `${voyage.currentStop}-title` : "voyage-editorial-heading");
      setSheet(null);
    }
    previouslyActive.current = active;
  }, [active, unavailable, restoring, sheet, voyage.currentStop, explanation, announce, setSheet]);

  // Record the Ship's place on the route, including partway between Stops.
  const checkpoint = useCallback(() => {
    const { progress } = route.frame();
    setVoyage((current) =>
      transitionVoyage(current, { type: "set-route-progress", progress }),
    );
  }, [route, setVoyage]);

  const fail = useCallback(
    (reason: ThreeDUnavailableReason) => {
      recordDiagnostic("failure", reason);
      const { progress } = route.frame();
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
    route.release();
    checkpoint();
  }, [route, checkpoint]);
  const { visible, suspended } = useOceanLifecycle(suspend);
  useEffect(() => {
    recordDiagnostic(
      "lifecycle",
      `${visible ? "visible" : "hidden"}:${active ? "3d" : "editorial"}:${sheetOpen ? "reading" : "voyage"}`,
    );
  }, [visible, active, sheetOpen]);
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
      if (index === null) {
        if (inputEnabled.current) dismissCue();
        return;
      }
      setCardStop(index);
      if (!inputEnabled.current) return;
      const stop = stops[index];
      if (stop.id !== currentStop.current)
        announce(`Parada ${String(index).padStart(2, "0")} · ${stop.name}.`);
      setVoyage((current) =>
        transitionVoyage(current, { type: "arrive-at-stop", stop: stopIds[index] }),
      );
    },
    [announce, setVoyage, dismissCue],
  );
  const placeCard = useCallback(
    (layout: StageLayout) => {
      if (!surface) return;
      if (laidOut.current?.surface === surface && sameStageLayout(laidOut.current.layout, layout)) return;
      laidOut.current = { surface, layout };
      applyStageLayout(surface, layout);
    },
    [surface],
  );
  // A card hiding under way hands focus to the ocean.
  const yieldCardFocus = useCallback(() => {
    focusTarget("voyage-ocean");
  }, []);

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
      // Quality is automatic: device hints pick the starting tier, measurements adjust it.
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

  const ready = active && !restoring && stage === "ready";
  const voyaging = ready && visible && !sheetOpen;
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
      route: () => route,
      enabled: () => inputEnabled.current,
    });
    inputConnected.current = true;
    return () => {
      inputConnected.current = false;
      disconnect();
    };
  }, [surface, route]);

  function switchPresentation(threeD: boolean) {
    if (threeD && (unavailable || restoring)) return;
    // The ocean prepares on the way back if it was never started.
    if (threeD && voyage.qualityPreference === "text")
      qualityController.current?.choose("automatic");
    checkpoint();
    setSheet(null);
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
        ? "Oceano em 3D. Role, deslize ou use as setas para navegar entre as paradas."
        : "Modo leitura. Seu lugar na viagem está preservado.",
    );
    focusTarget(threeD ? "voyage-ocean" : "voyage-editorial-heading");
  }

  function openStop(stop: StopId) {
    if (!active || sheetOpen || settledStop !== stopIndex(stop)) return;
    onOpenStop(stop);
  }

  function chooseChapter(stop: StopId) {
    setSheet(null);
    goToStop(stop);
  }

  // Focus returns to the control that opened a Sheet, unless leaving the ocean
  // scene has already placed it in the editorial text.
  const returnTo = (id: string) => () => (activeRef.current ? document.getElementById(id) : null);
  const closeSheet = () => setSheet(null);
  const accountStop = accountStops.find((stop) => stop.id === stops[cardStop].id) ?? null;

  return (
    <>
      <OceanLoading loading={!enhanced || (active && !unavailable && stage !== "ready")} />
      {enhanced && !active ? (
        <PresentationNotice
          explanation={explanation}
          canReturn={!unavailable && !restoring}
          onReturn={() => switchPresentation(true)}
        />
      ) : null}
      {eligible && !unavailable ? (
        <section
          ref={setSurface}
          id="voyage-ocean"
          tabIndex={-1}
          className="ocean-world group/ocean relative isolate grid h-svh grid-rows-[minmax(0,1fr)] overflow-hidden bg-background text-foreground focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-ring data-[active=false]:pointer-events-none data-[active=false]:invisible data-[active=false]:fixed data-[active=false]:inset-0 data-[active=false]:-z-10 [&_canvas]:touch-none [&>div:first-child]:min-h-0"
          data-active={active}
          data-reading={sheetOpen}
          data-stage={stage}
          data-quality={quality.tier}
          data-dpr={quality.dpr}
          data-settled-stop={settledStop ?? undefined}
          aria-label="Oceano da viagem. Role, deslize ou use as setas e Page Up ou Page Down para navegar entre as paradas."
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
              reading={sheetOpen}
              visitedStops={voyage.visitedStops}
              inputConnected={inputConnected}
              onStage={onStage}
              onFailure={failAsset}
              onCanvas={setCanvas}
              onSettle={settle}
              onLayout={placeCard}
            />
          </RuntimeErrorBoundary>
          {ready ? (
            <VoyageChrome chaptersOpen={sheetOpen && sheet === "chapters"} onChapters={() => setSheet("chapters")} />
          ) : null}
          {ready ? (
            <StopCard
              stop={stops[cardStop]}
              variant={cardStop === 0 ? "opening" : cardStop === stops.length - 1 ? "arrival" : "stop"}
              visible={settledStop !== null}
              cueVisible={cueVisible}
              accountOpen={sheetOpen && sheet === "account"}
              itineraryOpen={sheetOpen && sheet === "itinerary"}
              onOpen={() => openStop(stops[cardStop].id)}
              onItinerary={() => setSheet("itinerary")}
              onRestart={() => {
                restartVoyage();
                focusTarget("voyage-ocean");
              }}
              onYieldFocus={yieldCardFocus}
            />
          ) : null}
          {ready ? (
            <ReadingModeLink onReadingMode={() => switchPresentation(false)} />
          ) : null}
        </section>
      ) : null}
      {eligible && !unavailable ? (
        <>
          <StopAccountSheet
            stop={accountStop}
            open={sheetOpen && sheet === "account"}
            onClose={closeSheet}
            returnFocus={returnTo("stop-card-action")}
          />
          <ChaptersSheet
            open={sheetOpen && sheet === "chapters"}
            currentStop={voyage.currentStop}
            visitedStops={voyage.visitedStops}
            onClose={closeSheet}
            onChoose={chooseChapter}
            onReadingMode={() => switchPresentation(false)}
            onRestart={restartVoyage}
            returnFocus={returnTo("voyage-chapters")}
          />
          <ItinerarySheet
            open={sheetOpen && sheet === "itinerary"}
            onClose={closeSheet}
            returnFocus={returnTo("stop-card-itinerary")}
          />
        </>
      ) : null}
    </>
  );
}
