"use client";

import { useEffect, useRef, useState } from "react";

export function useOceanLifecycle(onSuspend: () => void) {
  const suspended = useRef(false);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const suspend = () => {
      suspended.current = true;
      setVisible(false);
      onSuspend();
    };
    const show = () => {
      if (document.hidden) return;
      suspended.current = false;
      setVisible(true);
    };
    const visibility = () => document.hidden ? suspend() : show();
    window.addEventListener("blur", suspend);
    window.addEventListener("pagehide", suspend);
    window.addEventListener("focus", show);
    window.addEventListener("pageshow", show);
    document.addEventListener("visibilitychange", visibility);
    if (document.hidden) suspend();
    return () => {
      window.removeEventListener("blur", suspend);
      window.removeEventListener("pagehide", suspend);
      window.removeEventListener("focus", show);
      window.removeEventListener("pageshow", show);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [onSuspend]);
  return { visible, suspended };
}
