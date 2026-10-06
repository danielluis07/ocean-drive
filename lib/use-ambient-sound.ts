"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createAmbientSound, SOUND_STORAGE_KEY } from "@/lib/ambient-sound";

export function useAmbientSound(oceanActive: boolean, announce: (message: string) => void) {
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(false);
  const controller = useRef<ReturnType<typeof createAmbientSound> | null>(null);
  const activeRef = useRef(oceanActive);

  useEffect(() => {
    const sound = createAmbientSound(() => {
      enabledRef.current = false;
      setEnabled(false);
      try { sessionStorage.setItem(SOUND_STORAGE_KEY, "off"); } catch { /* Storage may be refused. */ }
      announce("Não foi possível iniciar o som ambiente. Tente novamente.");
    });
    controller.current = sound;
    const frame = requestAnimationFrame(() => {
      try { enabledRef.current = sessionStorage.getItem(SOUND_STORAGE_KEY) === "on"; } catch { /* Storage may be refused. */ }
      setEnabled(enabledRef.current);
      sound.setActive(enabledRef.current && activeRef.current && !document.hidden);
    });
    function visibilityChanged() {
      sound.setActive(enabledRef.current && activeRef.current && !document.hidden);
    }
    function pageHidden() { sound.setActive(false); }
    // A restored preference may need a fresh gesture after reload on browsers
    // that suspend AudioContext. Retrying does not fetch a second buffer.
    function unlock() {
      if (enabledRef.current) visibilityChanged();
    }
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("pagehide", pageHidden);
    window.addEventListener("pageshow", visibilityChanged);
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("pagehide", pageHidden);
      window.removeEventListener("pageshow", visibilityChanged);
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
      sound.dispose();
      controller.current = null;
    };
  }, [announce]);

  useEffect(() => {
    activeRef.current = oceanActive;
    controller.current?.setActive(enabledRef.current && oceanActive && !document.hidden);
  }, [oceanActive]);

  const toggle = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    setEnabled(enabledRef.current);
    try { sessionStorage.setItem(SOUND_STORAGE_KEY, enabledRef.current ? "on" : "off"); } catch { /* Storage may be refused. */ }
    controller.current?.setActive(enabledRef.current && activeRef.current && !document.hidden);
  }, []);

  return { soundEnabled: enabled, toggleSound: toggle };
}
