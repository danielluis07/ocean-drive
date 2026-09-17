"use client";

import { useEffect } from "react";
import Arrival from "@/components/voyage/arrival";
import Closing from "@/components/voyage/closing";
import EditorialIntro from "@/components/voyage/editorial-intro";
import Opening from "@/components/voyage/opening";
import RouteNavigation from "@/components/voyage/route-navigation";
import StopList from "@/components/voyage/stop-list";
import OceanPresentation from "@/components/ocean/ocean-presentation";
import { stops, type StopId } from "@/content/editorial";
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
    setSheet,
    chartedRoute,
    route,
    goToStop,
    restartVoyage,
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

  // Opening a Stop Account is what records a Visited Stop, in either presentation.
  function openStop(stopId: StopId) {
    const stop = stops.find((item) => item.id === stopId)!;
    goToStop(stopId);
    setVoyage((current) =>
      transitionVoyage(current, { type: "visit-stop", stop: stopId }),
    );
    if (threeD) {
      // The Sheet names itself as it takes focus.
      setSheet("account");
      return;
    }
    announce(`${stop.name}, parada aberta.`);
    focusAndScrollToElement(`${stopId}-title`);
  }

  function restartEditorial() {
    restartVoyage();
    focusAndScrollToElement("voyage-editorial-heading");
  }

  return (
    <div
      className="voyage"
      data-enhanced={enhanced}
      data-presentation={voyage.presentation}
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
        {threeD ? null : (
          <div>
            <Opening />
            <EditorialIntro />
            <RouteNavigation
              enhanced={enhanced}
              voyage={voyage}
              onOpenStop={openStop}
            />
            <StopList enhanced={enhanced} voyage={voyage} />
            <Arrival enhanced={enhanced} onRestart={restartEditorial} />
            <Closing />
          </div>
        )}
      </main>
    </div>
  );
}
