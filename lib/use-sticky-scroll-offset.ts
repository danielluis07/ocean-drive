"use client";

import { useEffect, type RefObject } from "react";

// Focus and in-page scrolling must never land beneath sticky UI (WCAG 2.4.11).
// The presentation bar wraps at narrow widths and zoom, so its height is measured.
export function useStickyScrollOffset(element: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const target = element.current;
    if (!target) return;
    const root = document.documentElement;
    const measure = () => {
      const sticky = getComputedStyle(target).position === "sticky";
      root.style.setProperty("--sticky-offset", `${sticky ? target.getBoundingClientRect().height : 0}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      root.style.removeProperty("--sticky-offset");
    };
  }, [element]);
}
