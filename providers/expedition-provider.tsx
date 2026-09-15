"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { createInitialExpeditionState, type ExpeditionState } from "@/lib/expedition-state";

type ExpeditionContextValue = {
  expedition: ExpeditionState;
  setExpedition: Dispatch<SetStateAction<ExpeditionState>>;
  enhanced: boolean;
  setEnhanced: Dispatch<SetStateAction<boolean>>;
  readerOpen: boolean;
  setReaderOpen: Dispatch<SetStateAction<boolean>>;
  // One polite live region serves both presentations.
  announcement: string;
  announce: Dispatch<SetStateAction<string>>;
};

const ExpeditionContext = createContext<ExpeditionContextValue | null>(null);

export function ExpeditionProvider({ children }: { children: ReactNode }) {
  const [expedition, setExpedition] = useState(createInitialExpeditionState);
  const [enhanced, setEnhanced] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const [announcement, announce] = useState("");
  return (
    <ExpeditionContext value={{ expedition, setExpedition, enhanced, setEnhanced, readerOpen, setReaderOpen, announcement, announce }}>
      {children}
    </ExpeditionContext>
  );
}

export function useExpedition() {
  const value = useContext(ExpeditionContext);
  if (!value) throw new Error("ExpeditionProvider is required");
  return value;
}
