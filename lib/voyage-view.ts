import { stops, type Stop, type StopAccount, type StopId } from "@/content/editorial";
import type { VoyageState } from "@/lib/voyage-state";

export type AccountStop = Stop & { account: StopAccount };

// Stops with a Stop Account; Stop 00 is the opening.
export const accountStops = stops.filter((stop): stop is AccountStop => stop.account !== null);

export function stopNumber(stop: Stop): string {
  return String(stops.indexOf(stop)).padStart(2, "0");
}

export function getVisitedProgress(voyage: VoyageState): string {
  const visited = accountStops.filter((stop) => voyage.visitedStops.includes(stop.id)).length;
  return `${visited} de ${accountStops.length} paradas visitadas`;
}

export function getStopStatus(current: boolean, visited: boolean): string {
  if (current && visited) return "Parada atual · visitada";
  if (current) return "Parada atual";
  if (visited) return "Visitada";
  return "Na rota";
}

export function focusAndScrollToElement(id: string): void {
  requestAnimationFrame(() => {
    const element = document.getElementById(id);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({
      // An explicit behavior overrides CSS, so honor reduced motion here too.
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start",
    });
  });
}

// Where the Accessible Editorial Presentation places the Visitor: the current
// Stop's passage, or the opening heading at Stop 00.
export function editorialTarget(stop: StopId): string {
  return stop === stops[0].id ? "voyage-editorial-heading" : `${stop}-title`;
}

// Switching into the editorial presentation lands on the current Stop at once;
// the page has just appeared, so there is nothing to animate from.
export function revealEditorialStop(stop: StopId): void {
  requestAnimationFrame(() => {
    const element = document.getElementById(editorialTarget(stop));
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "start", behavior: "instant" });
  });
}
