import type { SourceId, Station, StationId } from "@/content/editorial";
import { evidenceStationIds, type ExpeditionState } from "@/lib/expedition-state";

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

export function getAvailableStationIds(
  expedition: ExpeditionState,
  stations: Station[],
  isAvailable: (state: ExpeditionState, stationId: StationId) => boolean,
): Set<StationId> {
  return new Set(
    stations
      .filter((station) => isAvailable(expedition, station.id))
      .map((station) => station.id),
  );
}

export function getCompletedEvidenceCount(expedition: ExpeditionState): number {
  return expedition.completedStations.filter((id) => evidenceStationIds.includes(id)).length;
}

export function getEvidenceProgress(expedition: ExpeditionState): string {
  return `${getCompletedEvidenceCount(expedition)} de ${evidenceStationIds.length} estações de evidência concluídas`;
}

// Live regions stay silent when their text does not change. Repeating a message
// (reopening the same station) alternates a trailing no-break space instead.
export function nextAnnouncement(previous: string, text: string): string {
  return previous === text ? `${text} ` : text;
}

export function getStationStatus(
  station: Station,
  available: boolean,
  completed: boolean,
  current: boolean,
): string {
  if (current && completed) return "Estação atual · concluída";
  if (current) return "Estação atual";
  if (completed) return "Concluída · disponível para revisita";
  if (available) return "Disponível";
  if (station.id === "convergencia") {
    return "Bloqueada · conclua as três estações de evidência";
  }
  return "Bloqueada · conclua Pulso de Calor";
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
