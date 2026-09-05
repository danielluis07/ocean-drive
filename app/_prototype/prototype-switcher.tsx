"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { directions, type Variant } from "@/app/_prototype/directions";

export default function PrototypeSwitcher({ variant }: { variant: Variant }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const cycle = useCallback((step: number) => {
    const keys = Object.keys(directions) as Variant[];
    const next = keys[(keys.indexOf(variant) + step + keys.length) % keys.length];
    const search = new URLSearchParams(params.toString());
    search.set("variant", next);
    router.replace(`${pathname}?${search}`, { scroll: false });
  }, [params, pathname, router, variant]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable], [role=slider]")) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        cycle(event.key === "ArrowRight" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [cycle]);

  if (process.env.NODE_ENV === "production") return null;
  return (
    <nav className="prototype-switcher" aria-label="Comparar estudos visuais">
      <button onClick={() => cycle(-1)} aria-label="Estudo anterior">←</button>
      <div aria-live="polite"><small>PROTÓTIPO VISUAL</small><strong>{variant} · {directions[variant].name}</strong></div>
      <button onClick={() => cycle(1)} aria-label="Próximo estudo">→</button>
    </nav>
  );
}
