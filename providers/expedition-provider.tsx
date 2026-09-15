"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { createInitialExpeditionState, type ExpeditionState } from "@/lib/expedition-state";

type ExpeditionContextValue = {
  expedition: ExpeditionState;
  setExpedition: Dispatch<SetStateAction<ExpeditionState>>;
  enhanced: boolean;
  setEnhanced: Dispatch<SetStateAction<boolean>>;
  readerOpen: boolean;
  setReaderOpen: Dispatch<SetStateAction<boolean>>;
  // The complete source list is an optional disclosure; switching presentation closes it.
  allSourcesOpen: boolean;
  setAllSourcesOpen: Dispatch<SetStateAction<boolean>>;
  // One polite live region serves both presentations.
  announcement: string;
  announce: (text: string) => void;
};

const ExpeditionContext = createContext<ExpeditionContextValue | null>(null);

export function ExpeditionProvider({ children }: { children: ReactNode }) {
  const [expedition, setExpedition] = useState(createInitialExpeditionState);
  const [enhanced, setEnhanced] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const [allSourcesOpen, setAllSourcesOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const pendingAnnouncement = useRef<number | null>(null);
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
  return (
    <ExpeditionContext value={{ expedition, setExpedition, enhanced, setEnhanced, readerOpen, setReaderOpen, allSourcesOpen, setAllSourcesOpen, announcement, announce }}>
      {children}
    </ExpeditionContext>
  );
}

export function useExpedition() {
  const value = useContext(ExpeditionContext);
  if (!value) throw new Error("ExpeditionProvider is required");
  return value;
}
