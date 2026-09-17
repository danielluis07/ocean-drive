"use client";

import { useCallback, useSyncExternalStore } from "react";

export const SCROLL_CUE_STORAGE_KEY = "ocean-drive:scroll-cue:v1";

const listeners = new Set<() => void>();
// Remembered in memory too, so the cue stays dismissed when storage is refused.
let dismissedInMemory = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isDismissed() {
  if (dismissedInMemory) return true;
  try {
    return sessionStorage.getItem(SCROLL_CUE_STORAGE_KEY) === "dismissed";
  } catch {
    return false;
  }
}

// The opening's “Role para navegar” cue disappears after the first navigation and
// does not return in the same tab, not even after “Recomeçar viagem”.
export function useScrollCue() {
  // The server never renders the cue, so it cannot flash for a returning Visitor.
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true);
  const dismiss = useCallback(() => {
    if (isDismissed()) return;
    dismissedInMemory = true;
    try {
      sessionStorage.setItem(SCROLL_CUE_STORAGE_KEY, "dismissed");
    } catch {
      /* Storage access itself may be refused. */
    }
    listeners.forEach((listener) => listener());
  }, []);
  return { cueVisible: !dismissed, dismissCue: dismiss };
}
