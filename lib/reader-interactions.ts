// Focuses the first of the given elements that exists by the next frame.
export function focusOceanTarget(...ids: string[]): void {
  requestAnimationFrame(() => {
    const element = ids.map((id) => document.getElementById(id)).find((candidate) => candidate);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "nearest", behavior: "instant" });
  });
}

export function closeDisclosures(): void {
  document.querySelectorAll<HTMLDetailsElement>("main details.logbook[open]").forEach((details) => {
    details.open = false;
  });
}

// Escape layering: an open logbook (Caderno de bordo) closes first and returns
// focus to its signal. The reader is a single focused context, so it may close
// the visible logbook; the editorial page only closes the one holding focus.
export function closeOpenLogbook(root: ParentNode | null, { focusedOnly = false } = {}): boolean {
  if (!root) return false;
  const open = [...root.querySelectorAll<HTMLDetailsElement>("details.logbook[open]")];
  const logbook = open.find((details) => details.contains(document.activeElement))
    ?? (focusedOnly ? undefined : open.find((details) => details.checkVisibility()));
  if (!logbook) return false;
  returnToSignal(logbook);
  return true;
}

export function returnToSignal(element: HTMLElement): void {
  const details = element.closest("details");
  if (details) details.open = false;
  const heading = element.closest(".signal")?.querySelector<HTMLElement>("h3");
  if (heading) focusOceanTarget(heading.id);
}
