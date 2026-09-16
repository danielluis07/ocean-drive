import { stops, type SourceId, type Stop } from "@/content/editorial";
import type { VoyageState } from "@/lib/voyage-state";

const scientificNameValues = [
  "Mussismilia braziliensis",
  "Millepora alcicornis",
  "M. braziliensis",
  "M. alcicornis",
] as const;

const scientificNameSet = new Set<string>(scientificNameValues);
const scientificNames = new RegExp(
  `(${scientificNameValues.map((name) => name.replace(".", "\\.")).join("|")})`,
  "g",
);

export type ScientificNamePart = {
  scientific: boolean;
  text: string;
};

export function splitScientificNames(text: string): ScientificNamePart[] {
  return text.split(scientificNames).map((part) => ({
    scientific: scientificNameSet.has(part),
    text: part,
  }));
}

export function uniqueSources(sourceIds: SourceId[]): SourceId[] {
  return [...new Set(sourceIds)];
}

// Stops with a Stop Account; Stop 00 is the opening.
export const accountStops: Stop[] = stops.filter((stop) => stop.signals.length > 0);

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
