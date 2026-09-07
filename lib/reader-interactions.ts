export function focusOceanTarget(id: string): void {
  requestAnimationFrame(() => {
    const element = document.getElementById(id);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "nearest", behavior: "instant" });
  });
}

export function closeDisclosures(): void {
  document.querySelectorAll<HTMLDetailsElement>("main details[open]").forEach((details) => {
    details.open = false;
  });
}

export function returnToSignal(element: HTMLElement): void {
  const details = element.closest("details");
  if (details) details.open = false;
  const heading = element.closest(".signal")?.querySelector<HTMLElement>("h3");
  if (heading) focusOceanTarget(heading.id);
}
