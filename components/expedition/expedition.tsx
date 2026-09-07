"use client";

import { useEffect, useState } from "react";
import AllSources from "@/components/expedition/all-sources";
import Closing from "@/components/expedition/closing";
import Connected from "@/components/expedition/connected";
import EditorialIntro from "@/components/expedition/editorial-intro";
import Opening from "@/components/expedition/opening";
import RouteNavigation from "@/components/expedition/route-navigation";
import StationList from "@/components/expedition/station-list";
import OceanPresentation from "@/components/ocean/ocean-presentation";
import { stations, type Station, type StationId } from "@/content/editorial";
import {
  createInitialExpeditionState,
  isEvidenceComplete,
  isStationAvailable,
  loadExpeditionState,
  saveExpeditionState,
  transitionExpedition,
} from "@/lib/expedition-state";
import {
  focusAndScrollToElement,
  getAvailableStationIds,
} from "@/lib/expedition-view";
import { oceanConfiguration } from "@/lib/ocean-config";
import {
  ExpeditionProvider,
  useExpedition,
} from "@/providers/expedition-provider";

export default function Expedition() {
  return (
    <ExpeditionProvider>
      <ExpeditionContent />
    </ExpeditionProvider>
  );
}

function ExpeditionContent() {
  const {
    expedition,
    setExpedition,
    enhanced,
    setEnhanced,
    readerOpen,
    setReaderOpen,
  } = useExpedition();
  const [announcement, setAnnouncement] = useState("");
  const [showAllSources, setShowAllSources] = useState(false);
  const availableStationIds = getAvailableStationIds(
    expedition,
    stations,
    isStationAvailable,
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setExpedition(
          transitionExpedition(loadExpeditionState(sessionStorage), {
            type: "set-presentation",
            presentation: "editorial",
          }),
        );
      } catch {
        setExpedition(createInitialExpeditionState());
      }
      setEnhanced(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [setExpedition, setEnhanced]);

  useEffect(() => {
    if (!enhanced) return;
    try {
      saveExpeditionState(sessionStorage, expedition);
    } catch {
      /* Storage access itself may be refused. */
    }
  }, [enhanced, expedition]);

  useEffect(() => {
    function pauseAndPersist() {
      setExpedition((current) => {
        const paused = transitionExpedition(current, {
          type: "set-pause-state",
          pauseState: "paused",
        });
        try {
          saveExpeditionState(sessionStorage, paused);
        } catch {
          /* Keep in-memory reading usable. */
        }
        return paused;
      });
    }

    function pauseWhenHidden() {
      if (document.visibilityState === "hidden") pauseAndPersist();
    }

    document.addEventListener("visibilitychange", pauseWhenHidden);
    window.addEventListener("pagehide", pauseAndPersist);
    return () => {
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      window.removeEventListener("pagehide", pauseAndPersist);
    };
  }, [setExpedition]);

  function openStation(stationId: StationId) {
    if (!availableStationIds.has(stationId)) return;
    setReaderOpen(true);
    setExpedition((current) =>
      transitionExpedition(current, {
        type: "open-station",
        station: stationId,
      }),
    );
    setShowAllSources(false);
    setAnnouncement(
      `${stations.find((station) => station.id === stationId)!.name}, estação aberta.`,
    );
    focusAndScrollToElement(`${stationId}-title`);
  }

  function changeSignal(station: Station, signalIndex: number) {
    if (signalIndex < 0 || signalIndex >= station.signals.length) return;
    setReaderOpen(true);
    setExpedition((current) =>
      transitionExpedition(current, {
        type: "set-bookmark",
        station: station.id,
        passage: signalIndex,
      }),
    );
    setAnnouncement(
      `${station.name}. Sinal ${signalIndex + 1} de ${station.signals.length}: ${station.signals[signalIndex].title}`,
    );
    focusAndScrollToElement(`${station.id}-signal-${signalIndex + 1}`);
  }

  function completeStation(station: Station) {
    if (station.id === "convergencia") {
      setExpedition((current) =>
        transitionExpedition(current, { type: "connect-expedition" }),
      );
      setAnnouncement(
        "Expedição conectada. As ações finais estão disponíveis.",
      );
      focusAndScrollToElement("expedicao-conectada-title");
      return;
    }

    const nextState = transitionExpedition(expedition, {
      type: "complete-station",
      station: station.id,
    });
    if (nextState === expedition) return;

    const nextMiddleStation = nextState.middleOrder.find(
      (id) => !nextState.completedStations.includes(id),
    );
    setExpedition(nextState);

    if (station.id === "pulso-de-calor") {
      setAnnouncement(
        "Pulso de Calor concluída. Corais sob Estresse e Respostas Desiguais estão disponíveis; escolha a ordem da rota.",
      );
      focusAndScrollToElement("route-title");
    } else if (isEvidenceComplete(nextState)) {
      setAnnouncement(
        "Três estações de evidência concluídas. Convergência está disponível.",
      );
      focusAndScrollToElement("convergencia-title");
    } else if (nextMiddleStation) {
      const nextStation = stations.find(
        (item) => item.id === nextMiddleStation,
      )!;
      setAnnouncement(
        `${station.name} concluída. Próxima estação: ${nextStation.name}.`,
      );
      focusAndScrollToElement(`${nextMiddleStation}-title`);
    }
  }

  function restartExpedition() {
    setExpedition((current) =>
      transitionExpedition(current, { type: "restart-expedition" }),
    );
    setShowAllSources(false);
    setAnnouncement(
      "Expedição reiniciada. Pulso de Calor é a única estação disponível.",
    );
    focusAndScrollToElement("pulso-de-calor-title");
  }

  function showSources() {
    setShowAllSources(true);
    setAnnouncement("Caderno completo de fontes aberto.");
    focusAndScrollToElement("fontes-da-expedicao-title");
  }

  return (
    <div
      className="expedition"
      data-enhanced={enhanced}
      data-connected={expedition.connected}>
      <a className="skip-link" href="#conteudo-principal">
        Pular para o conteúdo
      </a>
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <main id="conteudo-principal">
        <OceanPresentation configuration={oceanConfiguration} />
        <div
          hidden={
            expedition.presentation === "three-dimensional" && !readerOpen
          }>
          <Opening />
          <EditorialIntro />
          <RouteNavigation
            availableStationIds={availableStationIds}
            enhanced={enhanced}
            expedition={expedition}
            onOpenStation={openStation}
          />
          <StationList
            availableStationIds={availableStationIds}
            enhanced={enhanced}
            expedition={expedition}
            onChangeSignal={changeSignal}
            onComplete={completeStation}
          />
          <Connected
            connected={expedition.connected}
            onRestart={restartExpedition}
            onReviewStations={() => focusAndScrollToElement("route-title")}
            onShowSources={showSources}
          />
          <AllSources visible={showAllSources} />
          <Closing />
        </div>
      </main>
    </div>
  );
}
