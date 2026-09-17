"use client";

import { useEffect } from "react";
import AllSources from "@/components/voyage/all-sources";
import Closing from "@/components/voyage/closing";
import Connected from "@/components/voyage/connected";
import EditorialIntro from "@/components/voyage/editorial-intro";
import Opening from "@/components/voyage/opening";
import RouteNavigation from "@/components/voyage/route-navigation";
import StopList from "@/components/voyage/stop-list";
import OceanPresentation from "@/components/ocean/ocean-presentation";
import StopReader from "@/components/ocean/stop-reader";
import {
  closeDisclosures,
  closeOpenLogbook,
  focusOceanTarget,
} from "@/lib/reader-interactions";
import { stops, type Stop, type StopId } from "@/content/editorial";
import { nearestStopIndex } from "@/lib/charted-route";
import {
  createInitialVoyageState,
  loadVoyageState,
  saveVoyageState,
  stopIds,
  transitionVoyage,
} from "@/lib/voyage-state";
import { focusAndScrollToElement } from "@/lib/voyage-view";
import { oceanConfiguration } from "@/lib/ocean-config";
import { VoyageProvider, useVoyage } from "@/providers/voyage-provider";

export default function Voyage() {
  return (
    <VoyageProvider>
      <VoyageContent />
    </VoyageProvider>
  );
}

function VoyageContent() {
  const {
    voyage,
    setVoyage,
    enhanced,
    setEnhanced,
    readerOpen,
    setReaderOpen,
    allSourcesOpen,
    setAllSourcesOpen,
    signalPages,
    setSignalPage,
    chartedRoute,
    route,
    goToStop,
    announcement,
    announce,
  } = useVoyage();
  // Server rendering and no-JavaScript visits always carry the editorial content.
  const threeD = enhanced && voyage.presentation === "three-dimensional";

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      // The chosen presentation is restored too: a Visitor in “Modo leitura” stays there.
      let restored = createInitialVoyageState();
      try {
        restored = loadVoyageState(sessionStorage);
      } catch {
        /* Storage access itself may be refused. */
      }
      // The Ship never rests between Stops, including after a reload mid-passage.
      const stop = nearestStopIndex(chartedRoute, restored.routeProgress);
      route.goTo(stop, { cut: true });
      setVoyage(transitionVoyage(restored, { type: "arrive-at-stop", stop: stopIds[stop] }));
      setEnhanced(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [chartedRoute, route, setVoyage, setEnhanced]);

  useEffect(() => {
    if (!enhanced) return;
    try {
      saveVoyageState(sessionStorage, voyage);
    } catch {
      /* Storage access itself may be refused. */
    }
  }, [enhanced, voyage]);

  useEffect(() => {
    if (threeD) return;
    // The 3D reader owns its own Escape layering; editorial Escape only closes the
    // Caderno holding focus, so it never pulls focus from elsewhere on the page.
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (
        closeOpenLogbook(document.querySelector("main"), { focusedOnly: true })
      )
        event.preventDefault();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [threeD]);

  function openStop(stopId: StopId) {
    const stop = stops.find((item) => item.id === stopId)!;
    setReaderOpen(true);
    goToStop(stopId);
    setVoyage((current) =>
      transitionVoyage(current, { type: "visit-stop", stop: stopId }),
    );
    setAllSourcesOpen(false);
    announce(`${stop.name}, parada aberta.`);
    if (threeD)
      focusOceanTarget(`${stopId}-signal-${(signalPages[stopId] ?? 0) + 1}`);
    else focusAndScrollToElement(`${stopId}-title`);
  }

  function changeSignal(stop: Stop, signalIndex: number) {
    if (signalIndex < 0 || signalIndex >= stop.signals.length) return;
    setReaderOpen(true);
    closeDisclosures();
    setSignalPage(stop.id, signalIndex);
    announce(
      `${stop.name}. Sinal ${signalIndex + 1} de ${stop.signals.length}: ${stop.signals[signalIndex].title}`,
    );
    (threeD ? focusOceanTarget : focusAndScrollToElement)(
      `${stop.id}-signal-${signalIndex + 1}`,
    );
  }

  function restartVoyage() {
    route.goTo(0, { cut: true });
    setVoyage((current) =>
      transitionVoyage(current, { type: "restart-voyage" }),
    );
    setAllSourcesOpen(false);
    if (threeD) closeReader();
    announce("Viagem reiniciada. De volta ao início.");
    if (!threeD) focusAndScrollToElement("voyage-editorial-heading");
  }

  function closeReader() {
    closeDisclosures();
    setReaderOpen(false);
    setAllSourcesOpen(false);
    // Return to the Stop Card's “Saiba mais”, which reappears as the reader closes.
    focusOceanTarget("stop-card-action", "voyage-ocean");
  }

  function showSources() {
    setAllSourcesOpen(true);
    announce("Caderno completo de fontes aberto.");
    focusAndScrollToElement("fontes-da-expedicao-title");
  }

  const stopContent = (
    <>
      <StopList
        enhanced={enhanced}
        signalPages={signalPages}
        voyage={voyage}
        onChangeSignal={changeSignal}
      />
      <Connected
        connected={voyage.complete}
        onRestart={restartVoyage}
        onReviewStops={() =>
          threeD ? closeReader() : focusAndScrollToElement("route-title")
        }
        onShowSources={showSources}
      />
      <AllSources visible={allSourcesOpen} />
    </>
  );

  return (
    <div
      className="voyage"
      data-enhanced={enhanced}
      data-presentation={voyage.presentation}
      data-reading={readerOpen}
      data-complete={voyage.complete}>
      <a className="skip-link" href="#conteudo-principal">
        Pular para o conteúdo
      </a>
      <p
        id="voyage-announcer"
        className="visually-hidden"
        aria-live="polite"
        aria-atomic="true">
        {announcement}
      </p>
      <main id="conteudo-principal">
        <OceanPresentation
          configuration={oceanConfiguration}
          onOpenStop={openStop}
        />
        {threeD ? (
          readerOpen ? (
            <StopReader onClose={closeReader}>{stopContent}</StopReader>
          ) : null
        ) : (
          <div>
            <Opening />
            <EditorialIntro />
            <RouteNavigation
              enhanced={enhanced}
              voyage={voyage}
              onOpenStop={openStop}
            />
            {stopContent}
            <Closing />
          </div>
        )}
      </main>
    </div>
  );
}
