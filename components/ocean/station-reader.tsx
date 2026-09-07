import { useEffect, useRef, type ReactNode } from "react";
import { closeDisclosures, returnToSignal } from "@/lib/reader-interactions";

export default function StationReader({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const reader = useRef<HTMLElement>(null);
  const sourceFocus = useRef<HTMLAnchorElement | null>(null);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const disclosure = reader.current?.querySelector<HTMLDetailsElement>("details[open]");
      event.preventDefault();
      if (disclosure) returnToSignal(disclosure);
      else onClose();
    };
    const rememberSource = () => {
      const focused = document.activeElement;
      if (focused instanceof HTMLAnchorElement && reader.current?.contains(focused) && focused.target === "_blank") sourceFocus.current = focused;
    };
    const restoreSource = () => {
      sourceFocus.current?.focus({ preventScroll: true });
      sourceFocus.current = null;
    };
    document.addEventListener("keydown", escape);
    window.addEventListener("blur", rememberSource);
    window.addEventListener("focus", restoreSource);
    return () => {
      document.removeEventListener("keydown", escape);
      window.removeEventListener("blur", rememberSource);
      window.removeEventListener("focus", restoreSource);
    };
  }, [onClose]);
  return (
    <section ref={reader} className="station-reader" aria-label="Voz da estação">
      <header className="station-reader__bar">
        <p>Voz da estação</p>
        <button type="button" onClick={() => { closeDisclosures(); onClose(); }}>Voltar ao mar</button>
      </header>
      {children}
    </section>
  );
}
