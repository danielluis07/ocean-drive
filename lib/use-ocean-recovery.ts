"use client";

import { useEffect, useRef } from "react";

export const RESTORATION_TIMEOUT_MS = 8000;

// Keep the original canvas alive: Three rebuilds its resources on contextrestored.
// Readiness, including shader compilation and a controlled frame, ends recovery.
export function useOceanRecovery(canvas: HTMLCanvasElement | null, callbacks: {
  onLost: () => void;
  onRestored: () => void;
  onFailed: () => void;
  canRestore: boolean;
}, restoring: boolean) {
  const latest = useRef(callbacks);
  useEffect(() => { latest.current = callbacks; });
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false);
  useEffect(() => {
    if (!restoring) {
      if (timeout.current !== null) clearTimeout(timeout.current);
      timeout.current = null;
      pending.current = false;
    }
  }, [restoring]);
  useEffect(() => {
    if (!canvas) return;
    const lossExtension = canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context");
    let attempt: ReturnType<typeof setTimeout> | null = null;
    let remaining = RESTORATION_TIMEOUT_MS;
    let startedAt = 0;
    const armDeadline = () => {
      if (!pending.current || timeout.current !== null || document.hidden) return;
      startedAt = performance.now();
      timeout.current = setTimeout(() => latest.current.onFailed(), remaining);
    };
    const pauseDeadline = () => {
      if (timeout.current === null) return;
      remaining = Math.max(0, remaining - (performance.now() - startedAt));
      clearTimeout(timeout.current);
      timeout.current = null;
    };
    const visibility = () => document.hidden ? pauseDeadline() : armDeadline();
    const lost = (event: Event) => {
      event.preventDefault();
      latest.current.onLost();
      if (pending.current || !latest.current.canRestore) return;
      pending.current = true;
      remaining = RESTORATION_TIMEOUT_MS;
      armDeadline();
      // Native losses restore through the browser. The extension covers losses
      // induced by WEBGL_lose_context; it is invoked once, never in a retry loop.
      attempt = setTimeout(() => {
        try { lossExtension?.restoreContext(); }
        catch { latest.current.onFailed(); }
      }, 100);
    };
    const restored = () => {
      if (pending.current) latest.current.onRestored();
    };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", pauseDeadline);
    window.addEventListener("focus", armDeadline);
    window.addEventListener("pagehide", pauseDeadline);
    window.addEventListener("pageshow", armDeadline);
    return () => {
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", pauseDeadline);
      window.removeEventListener("focus", armDeadline);
      window.removeEventListener("pagehide", pauseDeadline);
      window.removeEventListener("pageshow", armDeadline);
      if (attempt !== null) clearTimeout(attempt);
      if (timeout.current !== null) clearTimeout(timeout.current);
      timeout.current = null;
      pending.current = false;
    };
  }, [canvas]);
}
