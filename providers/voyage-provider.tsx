"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { StopId } from "@/content/editorial";
import { createChartedRoute, type ChartedRoute } from "@/lib/charted-route";
import { oceanConfiguration } from "@/lib/ocean-config";
import { createRouteMotion, type RouteMotion } from "@/lib/route-motion";
import { createInitialVoyageState, stopIndex, transitionVoyage, type VoyageState } from "@/lib/voyage-state";

// The white Sheets read over the paused ocean: the settled Stop's Stop Account,
// the “Capítulos” menu, and the Arrival's complete itinerary.
export type VoyageSheet = "account" | "chapters" | "itinerary";

type VoyageContextValue = {
  voyage: VoyageState;
  setVoyage: Dispatch<SetStateAction<VoyageState>>;
  enhanced: boolean;
  setEnhanced: Dispatch<SetStateAction<boolean>>;
  // The open Sheet, if any; not Voyage State, and only shown in the ocean scene.
  sheet: VoyageSheet | null;
  setSheet: Dispatch<SetStateAction<VoyageSheet | null>>;
  chartedRoute: ChartedRoute;
  // One Ship's motion for the whole visit; the object itself never changes.
  route: RouteMotion;
  // Move the Ship to a Stop: it sails there in 3D and arrives at once elsewhere.
  goToStop: (stop: StopId) => void;
  // Clear the Voyage and cut back to Stop 00; callers place focus.
  restartVoyage: () => void;
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
  const [sheet, setSheet] = useState<VoyageSheet | null>(null);
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
  const goToStop = useCallback((stop: StopId) => {
    const sailing = presentation.current === "three-dimensional";
    route.goTo(stopIndex(stop), { cut: !sailing });
    // The 3D scene records the arrival when the Ship settles there.
    if (!sailing) setVoyage((current) => transitionVoyage(current, { type: "arrive-at-stop", stop }));
  }, [route]);
  const restartVoyage = useCallback(() => {
    setSheet(null);
    route.goTo(0, { cut: true });
    setVoyage((current) => transitionVoyage(current, { type: "restart-voyage" }));
    announce("Viagem reiniciada. De volta ao início.");
  }, [route, announce]);
  return (
    <VoyageContext value={{ voyage, setVoyage, enhanced, setEnhanced, sheet, setSheet, chartedRoute, route, goToStop, restartVoyage, announcement, announce }}>
      {children}
    </VoyageContext>
  );
}

export function useVoyage() {
  const value = useContext(VoyageContext);
  if (!value) throw new Error("VoyageProvider is required");
  return value;
}
