import { stops, type StopId } from "@/content/editorial";

export const VOYAGE_STATE_VERSION = 1 as const;
export const VOYAGE_STORAGE_KEY = "ocean-drive:voyage:v1";

export const stopIds: readonly StopId[] = stops.map((stop) => stop.id);
export const arrivalStopId: StopId = stopIds[stopIds.length - 1];

export type VoyagePresentation = "editorial" | "three-dimensional";
export type VoyageQualityPreference = "automatic" | "reduced-3d" | "text";
export type ThreeDUnavailableReason =
  | "unsupported"
  | "refused"
  | "asset-failure"
  | "context-loss"
  | "unusable-quality";

export type VoyageState = {
  currentStop: StopId;
  visitedStops: StopId[];
  complete: boolean;
  // The Ship's place on the Charted Route, in Stops (see lib/charted-route.ts).
  routeProgress: number;
  presentation: VoyagePresentation;
  qualityPreference: VoyageQualityPreference;
  contextLosses: number;
  threeDAvailability:
    | { status: "available" }
    | { status: "restoring" }
    | { status: "unavailable"; reason: ThreeDUnavailableReason };
};

type VoyageStorage = Pick<Storage, "getItem" | "setItem">;

export type VoyageAction =
  | { type: "arrive-at-stop"; stop: StopId }
  | { type: "visit-stop"; stop: StopId }
  | { type: "set-route-progress"; progress: number }
  | { type: "restart-voyage" }
  | { type: "set-presentation"; presentation: VoyagePresentation }
  | { type: "set-quality-preference"; qualityPreference: VoyageQualityPreference }
  | { type: "lose-context" }
  | { type: "restore-context" }
  | { type: "lock-three-d"; reason: ThreeDUnavailableReason };

export function createInitialVoyageState(): VoyageState {
  return {
    currentStop: stopIds[0],
    visitedStops: [],
    complete: false,
    routeProgress: 0,
    // The ocean scene is the default; the editorial presentation is chosen or a fallback.
    presentation: "three-dimensional",
    qualityPreference: "automatic",
    contextLosses: 0,
    threeDAvailability: { status: "available" },
  };
}

export function stopIndex(stop: StopId) {
  return stopIds.indexOf(stop);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStopId(value: unknown): value is StopId {
  return stopIds.includes(value as StopId);
}

function isVoyageState(value: unknown): value is VoyageState {
  if (!isRecord(value) || !isStopId(value.currentStop)) return false;
  if (!Array.isArray(value.visitedStops)
    || !value.visitedStops.every(isStopId)
    || new Set(value.visitedStops).size !== value.visitedStops.length) {
    return false;
  }
  if (typeof value.complete !== "boolean") return false;
  // Reaching the Arrival is what completes the Voyage.
  if (value.currentStop === arrivalStopId && !value.complete) return false;
  if (typeof value.routeProgress !== "number"
    || !Number.isFinite(value.routeProgress)
    || value.routeProgress < 0
    || value.routeProgress > stopIds.length - 1) {
    return false;
  }
  if (value.presentation !== "editorial" && value.presentation !== "three-dimensional") return false;
  if (value.qualityPreference !== "automatic" && value.qualityPreference !== "reduced-3d" && value.qualityPreference !== "text") return false;
  if (value.contextLosses !== 0 && value.contextLosses !== 1 && value.contextLosses !== 2) return false;
  if (!isRecord(value.threeDAvailability)) return false;
  if (value.threeDAvailability.status === "available" || value.threeDAvailability.status === "restoring") {
    if (Object.keys(value.threeDAvailability).some((key) => key !== "status")) return false;
    if (value.threeDAvailability.status === "restoring" && (value.contextLosses !== 1 || value.presentation !== "editorial")) return false;
  } else if (value.threeDAvailability.status === "unavailable") {
    if (!["unsupported", "refused", "asset-failure", "context-loss", "unusable-quality"].includes(value.threeDAvailability.reason as string)) return false;
    if (value.presentation !== "editorial") return false;
  } else {
    return false;
  }
  if (value.qualityPreference === "text" && value.presentation !== "editorial") return false;
  return true;
}

export function transitionVoyage(state: VoyageState, action: VoyageAction): VoyageState {
  switch (action.type) {
    case "arrive-at-stop": {
      if (!isStopId(action.stop)) return state;
      const routeProgress = stopIndex(action.stop);
      const complete = state.complete || action.stop === arrivalStopId;
      if (state.currentStop === action.stop && state.routeProgress === routeProgress && state.complete === complete) return state;
      return { ...state, currentStop: action.stop, routeProgress, complete };
    }
    case "visit-stop":
      if (!isStopId(action.stop) || state.visitedStops.includes(action.stop)) return state;
      return { ...state, visitedStops: [...state.visitedStops, action.stop] };
    case "set-route-progress": {
      if (!Number.isFinite(action.progress)) return state;
      const routeProgress = Math.min(stopIds.length - 1, Math.max(0, action.progress));
      return routeProgress === state.routeProgress ? state : { ...state, routeProgress };
    }
    case "restart-voyage": {
      const initial = createInitialVoyageState();
      return {
        ...initial,
        presentation: state.presentation,
        qualityPreference: state.qualityPreference,
        contextLosses: state.contextLosses,
        threeDAvailability: state.threeDAvailability,
      };
    }
    case "set-presentation":
      if (action.presentation === "three-dimensional" && state.threeDAvailability.status !== "available") {
        return state;
      }
      return { ...state, presentation: action.presentation };
    case "set-quality-preference":
      return {
        ...state,
        qualityPreference: action.qualityPreference,
        presentation: action.qualityPreference === "text" ? "editorial" : state.presentation,
      };
    case "lose-context":
      if (state.threeDAvailability.status === "unavailable") return state;
      return {
        ...state,
        contextLosses: Math.min(2, state.contextLosses + 1),
        threeDAvailability: state.contextLosses === 0 ? { status: "restoring" } : { status: "unavailable", reason: "context-loss" },
        presentation: "editorial",
      };
    case "restore-context":
      if (state.threeDAvailability.status !== "restoring") return state;
      return { ...state, threeDAvailability: { status: "available" } };
    case "lock-three-d":
      if (state.threeDAvailability.status === "unavailable") return state;
      return {
        ...state,
        threeDAvailability: { status: "unavailable", reason: action.reason },
        presentation: "editorial",
      };
    default:
      return state;
  }
}

export function restoreVoyageState(value: string | null): VoyageState {
  if (!value) return createInitialVoyageState();

  try {
    const candidate = JSON.parse(value) as { version?: unknown; state?: unknown };
    if (candidate.version !== VOYAGE_STATE_VERSION || !isVoyageState(candidate.state)) {
      return createInitialVoyageState();
    }
    const restored = candidate.state;
    // An interrupted recovery cannot resume after reload.
    return restored.threeDAvailability.status === "restoring"
      ? transitionVoyage(restored, { type: "lock-three-d", reason: "context-loss" })
      : restored;
  } catch {
    return createInitialVoyageState();
  }
}

export function serializeVoyageState(state: VoyageState): string {
  return JSON.stringify({ version: VOYAGE_STATE_VERSION, state });
}

export function loadVoyageState(storage: Pick<VoyageStorage, "getItem">): VoyageState {
  try {
    return restoreVoyageState(storage.getItem(VOYAGE_STORAGE_KEY));
  } catch {
    return createInitialVoyageState();
  }
}

export function saveVoyageState(storage: Pick<VoyageStorage, "setItem">, state: VoyageState): boolean {
  try {
    storage.setItem(VOYAGE_STORAGE_KEY, serializeVoyageState(state));
    return true;
  } catch {
    return false;
  }
}
