"use client";

import VoyageSheet from "@/components/ocean/voyage-sheet";
import Itinerary from "@/components/voyage/itinerary";
import { nextDeparture } from "@/content/editorial";

type ItinerarySheetProps = {
  open: boolean;
  onClose: () => void;
  returnFocus: () => HTMLElement | null;
};

// “Ver roteiro completo” on the Arrival's closing card.
export default function ItinerarySheet({ open, onClose, returnFocus }: ItinerarySheetProps) {
  return (
    <VoyageSheet open={open} onClose={onClose} eyebrow={nextDeparture} title="Roteiro completo" returnFocus={returnFocus}>
      <p className="mb-6 text-lg leading-relaxed">
        Catorze dias a bordo do Maré Mansa, de Recife a Angra dos Reis.
      </p>
      <Itinerary />
    </VoyageSheet>
  );
}
