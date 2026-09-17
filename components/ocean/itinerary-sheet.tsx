"use client";

import VoyageSheet from "@/components/ocean/voyage-sheet";
import Itinerary from "@/components/voyage/itinerary";
import { brand } from "@/content/editorial";

type ItinerarySheetProps = {
  open: boolean;
  onClose: () => void;
  returnFocus: () => HTMLElement | null;
};

// “Ver roteiro completo” on the Arrival's closing card.
export default function ItinerarySheet({ open, onClose, returnFocus }: ItinerarySheetProps) {
  return (
    <VoyageSheet open={open} onClose={onClose} eyebrow={brand.nextDeparture} title="Roteiro completo" returnFocus={returnFocus}>
      <p className="mb-6 text-lg leading-relaxed">
        Catorze dias a bordo do {brand.ship}, de Recife a Angra dos Reis.
      </p>
      <Itinerary />
      <p className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">{brand.disclosure}</p>
    </VoyageSheet>
  );
}
