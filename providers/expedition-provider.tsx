"use client";

import { createContext, useCallback, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { createInitialExpeditionState, type ExpeditionState } from "@/lib/expedition-state";
import { nextAnnouncement } from "@/lib/expedition-view";

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
  const announce = useCallback((text: string) => setAnnouncement((previous) => nextAnnouncement(previous, text)), []);
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
