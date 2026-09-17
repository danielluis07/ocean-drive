"use client";

import type { ReactNode } from "react";
import { XIcon } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/lib/use-media-query";

// Focus rings on white Sheets use ink: coral on white falls below 3:1.
export const sheetFocus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-card-foreground";

// Pill actions inside a Sheet.
export const sheetAction =
  `inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full border border-border px-5 text-sm font-semibold text-card-foreground transition-colors hover:bg-secondary ${sheetFocus}`;

type VoyageSheetProps = {
  open: boolean;
  onClose: () => void;
  // A short mono line above the title.
  eyebrow: string;
  title: string;
  // Read once the Sheet has closed: the control focus returns to, or null when
  // the caller has already placed focus elsewhere.
  returnFocus: () => HTMLElement | null;
  children: ReactNode;
};

// A white Sheet over the paused ocean: from the right on wide viewports, from the
// bottom on narrow ones. X, Escape, and a press on the dimmed ocean close it;
// focus stays inside while it is open. Its content is one continuous scroll, so
// wheel, touch, and keys scroll the Sheet and never reach the route.
export default function VoyageSheet({ open, onClose, eyebrow, title, returnFocus, children }: VoyageSheetProps) {
  const narrow = useMediaQuery("(max-width: 47.9375rem)");
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}>
      <SheetContent
        side={narrow ? "bottom" : "right"}
        showCloseButton={false}
        finalFocus={() => returnFocus() ?? false}
        overlayClassName="bg-background/25 supports-backdrop-filter:backdrop-blur-none"
        className="gap-0 overflow-y-auto overscroll-contain bg-card text-base text-card-foreground outline-none data-[side=bottom]:h-[90svh] data-[side=bottom]:rounded-t-2xl data-[side=bottom]:border-t-0 data-[side=right]:w-full data-[side=right]:border-l-0 data-[side=right]:sm:max-w-[32.5rem]">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-card pt-5 pr-[max(1rem,env(safe-area-inset-right))] pb-4 pl-6 sm:pl-8">
          <div className="min-w-0 pt-1">
            <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">{eyebrow}</p>
            <SheetTitle className="mt-1.5 text-2xl leading-tight font-semibold tracking-tight text-card-foreground">
              {title}
            </SheetTitle>
          </div>
          <SheetClose
            className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full text-card-foreground transition-colors hover:bg-secondary ${sheetFocus}`}>
            <XIcon aria-hidden="true" className="size-5" />
            <span className="sr-only">Fechar</span>
          </SheetClose>
        </header>
        <div className="px-6 pt-2 pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.5rem))] sm:px-8">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
