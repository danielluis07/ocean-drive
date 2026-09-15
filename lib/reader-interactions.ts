export function focusOceanTarget(id: string): void {
  requestAnimationFrame(() => {
    const element = document.getElementById(id);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "nearest", behavior: "instant" });
  });
}

export function closeDisclosures(): void {
  document.querySelectorAll<HTMLDetailsElement>("main details.logbook[open]").forEach((details) => {
    details.open = false;
  });
}

// Escape layering: an open Caderno closes first and returns focus to its signal.
// Prefer the Caderno holding focus, then one the Visitor can see; hidden stations
// may keep an earlier Caderno open.
export function closeOpenCaderno(root: ParentNode | null): boolean {
  if (!root) return false;
  const open = [...root.querySelectorAll<HTMLDetailsElement>("details.logbook[open]")];
  const caderno = open.find((details) => details.contains(document.activeElement))
    ?? open.find((details) => details.checkVisibility());
  if (!caderno) return false;
  returnToSignal(caderno);
  return true;
}

export function returnToSignal(element: HTMLElement): void {
  const details = element.closest("details");
  if (details) details.open = false;
  const heading = element.closest(".signal")?.querySelector<HTMLElement>("h3");
  if (heading) focusOceanTarget(heading.id);
}
