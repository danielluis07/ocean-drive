"use client";

import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import TravessiaLogo from "@/components/voyage/travessia-logo";

// Shared by every control that floats over the ocean.
export const oceanControl =
  "pointer-events-auto inline-flex h-11 items-center justify-center gap-2 rounded-full border border-foreground/25 bg-background/45 text-sm font-medium text-foreground backdrop-blur-md transition-colors hover:bg-background/70 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring";

// The persistent chrome over the ocean is this top bar (logo, sound toggle,
// “Capítulos”) and the “Modo leitura” link below. The Stop Card sits between
// them in focus order.
export default function VoyageChrome({ chaptersOpen, onChapters }: { chaptersOpen: boolean; onChapters: () => void }) {
  // The ambient loop is wired to this toggle in #42; sound stays off by default.
  const [sound, setSound] = useState(false);
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
      <h1 className="sr-only">Travessia — O Brasil visto do mar.</h1>
      <button
        type="button"
        className={`${oceanControl} w-11`}
        aria-pressed={sound}
        aria-label="Som ambiente"
        onClick={() => setSound((current) => !current)}>
        {sound ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
      </button>
      <span className="absolute left-1/2 -translate-x-1/2 text-sm text-shadow-sm text-shadow-background/60">
        <TravessiaLogo compact />
      </span>
      <button
        id="voyage-chapters"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={chaptersOpen}
        onClick={onChapters}
        className={`${oceanControl} px-4`}>
        Capítulos
      </button>
    </header>
  );
}

export function ReadingModeLink({ onReadingMode }: { onReadingMode: () => void }) {
  return (
    <a
      href="#voyage-editorial-heading"
      className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-10 rounded-sm px-1 py-2 font-mono text-xs tracking-wider text-foreground/80 uppercase underline-offset-4 text-shadow-sm text-shadow-background/60 hover:text-foreground hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
      onClick={(event) => {
        event.preventDefault();
        onReadingMode();
      }}>
      Modo leitura
    </a>
  );
}
