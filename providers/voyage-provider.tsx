"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { StopId } from "@/content/editorial";
import { createChartedRoute, type ChartedRoute } from "@/lib/charted-route";
import { oceanConfiguration } from "@/lib/ocean-config";
import { createRouteMotion, type RouteMotion } from "@/lib/route-motion";
import { createInitialVoyageState, stopIndex, transitionVoyage, type VoyageState } from "@/lib/voyage-state";

type VoyageContextValue = {
  voyage: VoyageState;
  setVoyage: Dispatch<SetStateAction<VoyageState>>;
  enhanced: boolean;
  setEnhanced: Dispatch<SetStateAction<boolean>>;
  readerOpen: boolean;
  setReaderOpen: Dispatch<SetStateAction<boolean>>;
  // The complete source list is an optional disclosure; switching presentation closes it.
  allSourcesOpen: boolean;
  setAllSourcesOpen: Dispatch<SetStateAction<boolean>>;
  // Placeholder signal pagination for the current Stop Accounts; not Voyage State.
  signalPages: Partial<Record<StopId, number>>;
  setSignalPage: (stop: StopId, page: number) => void;
  chartedRoute: ChartedRoute;
  // One Ship's motion for the whole visit; the object itself never changes.
  route: RouteMotion;
  // Move the Ship to a Stop: it sails there in 3D and arrives at once elsewhere.
  goToStop: (stop: StopId) => void;
  // One polite live region serves both presentations.
  announcement: string;
  announce: (text: string) => void;
};

const VoyageContext = createContext<VoyageContextValue | null>(null);

const chartedRoute = createChartedRoute(
  oceanConfiguration.stops.map((stop) => ({ x: stop.anchorage[0], z: stop.anchorage[1] })),
);

export function VoyageProvider({ children }: { children: ReactNode }) {
  const [voyage, setVoyage] = useState(createInitialVoyageState);
  const [enhanced, setEnhanced] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const [allSourcesOpen, setAllSourcesOpen] = useState(false);
  const [signalPages, setSignalPages] = useState<Partial<Record<StopId, number>>>({});
  const [announcement, setAnnouncement] = useState("");
  const [route] = useState(() => createRouteMotion(chartedRoute));
  const presentation = useRef(voyage.presentation);
  const pendingAnnouncement = useRef<number | null>(null);
  useEffect(() => {
    presentation.current = voyage.presentation;
  }, [voyage.presentation]);
  useEffect(() => () => {
    if (pendingAnnouncement.current !== null) cancelAnimationFrame(pendingAnnouncement.current);
  }, []);
  // Assistive technology can ignore a live region whose text does not change or
  // changes only in whitespace, so clear it and restore the message next frame.
  // A newer message replaces a pending one.
  const announce = useCallback((text: string) => {
    if (pendingAnnouncement.current !== null) cancelAnimationFrame(pendingAnnouncement.current);
    setAnnouncement("");
    pendingAnnouncement.current = requestAnimationFrame(() => {
      pendingAnnouncement.current = null;
      setAnnouncement(text);
    });
  }, []);
  const setSignalPage = useCallback((stop: StopId, page: number) => {
    setSignalPages((current) => ({ ...current, [stop]: page }));
  }, []);
  const goToStop = useCallback((stop: StopId) => {
    const sailing = presentation.current === "three-dimensional";
    route.goTo(stopIndex(stop), { cut: !sailing });
    // The 3D scene records the arrival when the Ship settles there.
    if (!sailing) setVoyage((current) => transitionVoyage(current, { type: "arrive-at-stop", stop }));
  }, [route]);
  return (
    <VoyageContext value={{ voyage, setVoyage, enhanced, setEnhanced, readerOpen, setReaderOpen, allSourcesOpen, setAllSourcesOpen, signalPages, setSignalPage, chartedRoute, route, goToStop, announcement, announce }}>
      {children}
    </VoyageContext>
  );
}

export function useVoyage() {
  const value = useContext(VoyageContext);
  if (!value) throw new Error("VoyageProvider is required");
  return value;
}
