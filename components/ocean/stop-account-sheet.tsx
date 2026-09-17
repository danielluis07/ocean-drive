"use client";

import VoyageSheet from "@/components/ocean/voyage-sheet";
import StopAccount from "@/components/voyage/stop-account";
import { stopNumber, type AccountStop } from "@/lib/voyage-view";

type StopAccountSheetProps = {
  stop: AccountStop | null;
  open: boolean;
  onClose: () => void;
  returnFocus: () => HTMLElement | null;
};

// “Saiba mais” opens the settled Stop's full account over the paused ocean.
export default function StopAccountSheet({ stop, open, onClose, returnFocus }: StopAccountSheetProps) {
  if (!stop) return null;
  return (
    <VoyageSheet
      open={open}
      onClose={onClose}
      eyebrow={`Parada ${stopNumber(stop)} · ${stop.account.day}`}
      title={stop.name}
      returnFocus={returnFocus}>
      <div data-slot="stop-account">
        <StopAccount id={`${stop.id}-account`} account={stop.account} />
      </div>
    </VoyageSheet>
  );
}
