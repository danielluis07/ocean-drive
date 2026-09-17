// Focuses the first of the given elements that exists by the next frame.
export function focusOceanTarget(...ids: string[]): void {
  requestAnimationFrame(() => {
    const element = ids.map((id) => document.getElementById(id)).find((candidate) => candidate);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "nearest", behavior: "instant" });
  });
}
