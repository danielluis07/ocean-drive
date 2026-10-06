"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

// Loading/decode never participates in ocean readiness. Lock the choice before
// the first animation paint; a late optional image cannot change a descent.
export function useApproachLayers(reveal: boolean) {
  const overlay = useRef<HTMLDivElement>(null);
  const decoded = useRef(new Set<HTMLImageElement>());
  useEffect(() => {
    const images = Array.from(overlay.current?.querySelectorAll<HTMLImageElement>("img[data-optional]") ?? []);
    let disposed = false;
    const decode = (image: HTMLImageElement) => {
      if (!image.complete || !image.naturalWidth) return;
      void image.decode().then(() => { if (!disposed) decoded.current.add(image); }).catch(() => {});
    };
    const listeners = images.map(image => {
      const listener = () => decode(image);
      image.addEventListener("load", listener);
      decode(image);
      return () => image.removeEventListener("load", listener);
    });
    return () => { disposed = true; listeners.forEach(remove => remove()); };
  }, []);
  useLayoutEffect(() => {
    const element = overlay.current;
    if (!element || !reveal) return;
    const images = Array.from(element.querySelectorAll<HTMLImageElement>("img[data-optional]"));
    element.dataset.descent = images.length === 2 && images.every(image => decoded.current.has(image)) ? "nested" : "fallback";
  }, [reveal]);
  return overlay;
}
