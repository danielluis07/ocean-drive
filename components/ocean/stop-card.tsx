"use client";

import { useLayoutEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { nextDeparture, type Stop } from "@/content/editorial";
import { stopNumber } from "@/lib/voyage-view";

type StopCardProps = {
  stop: Stop;
  // Stop 00 opens the Voyage: brand and Core Promise, without an account.
  variant: "opening" | "stop" | "arrival";
  visible: boolean;
  cueVisible: boolean;
  // Which Sheet the card's controls have open, for their expanded state.
  accountOpen: boolean;
  itineraryOpen: boolean;
  onOpen: () => void;
  onItinerary: () => void;
  onRestart: () => void;
  // Called when the card hides while it holds focus, so focus is never lost.
  onYieldFocus: () => void;
};

// The card's band spans the free water beside the Ship (landscape) or below it
// (portrait), from the custom properties the scene writes on the ocean surface.
// Beside the Ship the band clears the top chrome; below it, the “Modo leitura”
// link. On extreme zoom the band scrolls, so keyboard focus still reaches the card.
const band =
  "pointer-events-none absolute z-10 flex overflow-y-auto [scrollbar-width:none] " +
  "group-data-[card-side=beside]/ocean:top-[max(4.75rem,calc(env(safe-area-inset-top)+3.75rem))] group-data-[card-side=beside]/ocean:right-[max(1rem,env(safe-area-inset-right))] group-data-[card-side=beside]/ocean:bottom-[max(1rem,env(safe-area-inset-bottom))] group-data-[card-side=beside]/ocean:left-[calc(var(--ship-x,35%)+var(--ship-radius,2rem)+1.5rem)] " +
  "group-data-[card-side=below]/ocean:top-[calc(var(--ship-y,35%)+var(--ship-radius,2rem)+1rem)] group-data-[card-side=below]/ocean:right-[max(1rem,env(safe-area-inset-right))] group-data-[card-side=below]/ocean:bottom-[max(3.5rem,calc(env(safe-area-inset-bottom)+2.5rem))] group-data-[card-side=below]/ocean:left-[max(1rem,env(safe-area-inset-left))] group-data-[card-side=below]/ocean:justify-center";

const pill =
  "inline-flex h-11 items-center gap-2.5 rounded-full bg-card px-5 text-sm font-semibold text-card-foreground text-shadow-none transition-colors hover:bg-secondary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring short:h-9";

// Secondary text actions on the closing card.
const quiet =
  "inline-flex min-h-9 items-center gap-2 rounded-sm px-1 text-sm text-foreground/85 underline underline-offset-4 decoration-foreground/40 hover:text-foreground hover:decoration-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring short:min-h-7";

export default function StopCard({
  stop,
  variant,
  visible,
  cueVisible,
  accountOpen,
  itineraryOpen,
  onOpen,
  onItinerary,
  onRestart,
  onYieldFocus,
}: StopCardProps) {
  const card = useRef<HTMLElement>(null);
  // Runs before the browser drops focus from the newly inert card. Visibility turns
  // on at once when shown, so the card can take focus, and off only after the fade.
  useLayoutEffect(() => {
    if (!visible && card.current?.contains(document.activeElement)) onYieldFocus();
  }, [visible, onYieldFocus]);

  const accountProps = {
    id: "stop-card-action",
    type: "button",
    "aria-describedby": "stop-card-title",
    "aria-haspopup": "dialog",
    "aria-expanded": accountOpen,
    onClick: onOpen,
  } as const;

  return (
    <div className={band}>
      <section
        ref={card}
        aria-labelledby="stop-card-title"
        data-visible={visible}
        data-variant={variant}
        aria-hidden={!visible}
        inert={!visible}
        data-slot="stop-card"
        className="pointer-events-auto invisible h-fit w-full max-w-[24rem] group-data-[card-side=beside]/ocean:my-auto translate-y-2 text-foreground opacity-0 [transition:opacity_500ms_ease-out,translate_500ms_ease-out,visibility_0s_linear_500ms] data-[visible=true]:[transition:opacity_500ms_ease-out,translate_500ms_ease-out,visibility_0s] text-shadow-md text-shadow-background/50 data-[visible=true]:visible data-[visible=true]:translate-y-0 data-[visible=true]:opacity-100 motion-reduce:translate-y-0">
        {variant === "opening" ? (
          <>
            <h2 id="stop-card-title" className="text-[clamp(2.5rem,3vw+1.75rem,4.5rem)] leading-none font-semibold tracking-tight short:text-4xl">
              {stop.name}
            </h2>
            <p className="mt-4 text-[clamp(1.125rem,0.5vw+1rem,1.5rem)] leading-snug short:mt-2 short:text-base">{stop.introduction}</p>
            {cueVisible ? (
              <p className="mt-8 inline-flex items-center gap-3 short:mt-4 font-mono text-xs tracking-[0.2em] text-foreground/85 uppercase">
                <span aria-hidden="true" className="h-px w-8 bg-foreground/70 motion-safe:animate-pulse" />
                Role para navegar
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="font-mono text-xs tracking-[0.2em] text-foreground/85 uppercase short:text-[0.6875rem]">
              Parada {stopNumber(stop)}
              {variant === "arrival" ? " · Chegada" : null}
            </p>
            <p className="mt-3 text-sm text-foreground/85 short:mt-1 short:text-xs">{stop.context}</p>
            <h2 id="stop-card-title" className="mt-1 text-[clamp(2rem,2vw+1.5rem,3.25rem)] leading-[1.05] font-semibold tracking-tight short:mt-0.5 short:text-2xl">
              {stop.name}
            </h2>
            {variant === "arrival" ? (
              // The closing card: the next departure takes the summary's place.
              <>
                <p className="mt-3 max-w-[34ch] text-base leading-relaxed short:mt-1.5 short:text-sm short:leading-snug">{nextDeparture}</p>
                <div className="mt-5 short:mt-3">
                  <button
                    id="stop-card-itinerary"
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={itineraryOpen}
                    onClick={onItinerary}
                    className={pill}>
                    <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
                    Ver roteiro completo
                  </button>
                </div>
                {/* The Arrival keeps its own account, so it can still be visited. */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 short:mt-1">
                  <button {...accountProps} className={quiet}>
                    Saiba mais
                  </button>
                  <button type="button" onClick={onRestart} className={quiet}>
                    <RotateCcw aria-hidden="true" className="size-4" />
                    Recomeçar viagem
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 max-w-[34ch] text-base leading-relaxed short:mt-1.5 short:text-sm short:leading-snug">{stop.introduction}</p>
                <div className="mt-5 short:mt-3">
                  <button {...accountProps} className={pill}>
                    <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
                    Saiba mais
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
