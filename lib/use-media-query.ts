"use client";

import { useCallback, useSyncExternalStore } from "react";

// Whether a CSS media query matches, following changes. The server snapshot is
// false, so markup that depends on it renders only once hydrated.
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => matchMedia(query).matches, () => false);
}
