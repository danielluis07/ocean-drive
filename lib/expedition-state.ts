import type { StationId } from "@/content/editorial";

export const EXPEDITION_STATE_VERSION = 1 as const;
export const EXPEDITION_STORAGE_KEY = "ocean-drive:expedition:v1";

export const evidenceStationIds: readonly StationId[] = [
  "pulso-de-calor",
  "corais-sob-estresse",
  "respostas-desiguais",
];

export const middleStationIds: readonly StationId[] = [
  "corais-sob-estresse",
  "respostas-desiguais",
];

export type ExpeditionPresentation = "editorial" | "three-dimensional";
export type ExpeditionPauseState = "paused" | "sailing";
export type ExpeditionQualityPreference = "automatic" | "reduced-3d" | "text";
export type ThreeDUnavailableReason =
  | "unsupported"
  | "refused"
  | "asset-failure"
  | "context-loss"
  | "unusable-quality";

export type VesselPose = {
  position: { x: number; z: number };
  heading: number;
};

export type ExpeditionState = {
  currentStation: StationId;
  bookmarks: Record<StationId, number>;
  completedStations: StationId[];
  middleOrder: StationId[];
  connected: boolean;
  vesselCheckpoints: Partial<Record<"current" | StationId, VesselPose>> & { current: VesselPose };
  presentation: ExpeditionPresentation;
  pauseState: ExpeditionPauseState;
  qualityPreference: ExpeditionQualityPreference;
  threeDAvailability:
    | { status: "available" }
    | { status: "unavailable"; reason: ThreeDUnavailableReason };
};

type ExpeditionStorage = Pick<Storage, "getItem" | "setItem">;

export type ExpeditionAction =
  | { type: "open-station"; station: StationId }
  | { type: "set-bookmark"; station: StationId; passage: number }
  | { type: "complete-station"; station: StationId }
  | { type: "connect-expedition" }
  | { type: "restart-expedition" }
  | { type: "set-presentation"; presentation: ExpeditionPresentation }
  | { type: "set-pause-state"; pauseState: ExpeditionPauseState }
  | { type: "set-quality-preference"; qualityPreference: ExpeditionQualityPreference }
  | { type: "checkpoint-vessel"; checkpoint: "current" | StationId; pose: VesselPose }
  | { type: "lock-three-d"; reason: ThreeDUnavailableReason };

const initialVesselPose: VesselPose = {
  position: { x: 0, z: 0 },
  heading: 0,
};

export function createInitialExpeditionState(): ExpeditionState {
  return {
    currentStation: "pulso-de-calor",
    bookmarks: {
      "pulso-de-calor": 0,
      "corais-sob-estresse": 0,
      "respostas-desiguais": 0,
      convergencia: 0,
    },
    completedStations: [],
    middleOrder: [],
    connected: false,
    vesselCheckpoints: {
      current: { position: { ...initialVesselPose.position }, heading: initialVesselPose.heading },
    },
    presentation: "editorial",
    pauseState: "paused",
    qualityPreference: "automatic",
    threeDAvailability: { status: "available" },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStationId(value: unknown): value is StationId {
  return value === "pulso-de-calor"
    || value === "corais-sob-estresse"
    || value === "respostas-desiguais"
    || value === "convergencia";
}

function isVesselPose(value: unknown): value is VesselPose {
  if (!isRecord(value) || !isRecord(value.position)) return false;
  return typeof value.position.x === "number"
    && Number.isFinite(value.position.x)
    && typeof value.position.z === "number"
    && Number.isFinite(value.position.z)
    && typeof value.heading === "number"
    && Number.isFinite(value.heading);
}

function isExpeditionState(value: unknown): value is ExpeditionState {
  if (!isRecord(value) || !isStationId(value.currentStation)) return false;
  if (!isRecord(value.bookmarks)) return false;
  const bookmarks = value.bookmarks;
  if (!(["pulso-de-calor", "corais-sob-estresse", "respostas-desiguais", "convergencia"] as const)
    .every((station) => Number.isInteger(bookmarks[station]) && (bookmarks[station] as number) >= 0 && (bookmarks[station] as number) <= 2)) {
    return false;
  }

  if (!Array.isArray(value.completedStations)
    || !value.completedStations.every((station) => evidenceStationIds.includes(station))
    || new Set(value.completedStations).size !== value.completedStations.length) {
    return false;
  }
  if (!Array.isArray(value.middleOrder)
    || (value.middleOrder.length !== 0 && value.middleOrder.length !== 2)
    || !value.middleOrder.every((station) => middleStationIds.includes(station))
    || new Set(value.middleOrder).size !== value.middleOrder.length) {
    return false;
  }

  const completedStations = value.completedStations as StationId[];
  const middleOrder = value.middleOrder as StationId[];
  const pulsoComplete = completedStations.includes("pulso-de-calor");
  const completedMiddle = completedStations.filter((station) => middleStationIds.includes(station));
  if ((completedStations.length > 0 && completedStations[0] !== "pulso-de-calor")
    || (!pulsoComplete && (completedMiddle.length > 0 || middleOrder.length > 0))
    || (completedMiddle.length > 0 && middleOrder.length !== 2)
    || completedMiddle.some((station, index) => station !== middleOrder[index])) {
    return false;
  }

  const evidenceComplete = evidenceStationIds.every((station) => completedStations.includes(station));
  if (value.currentStation === "convergencia" && !evidenceComplete) return false;
  if (middleStationIds.includes(value.currentStation) && !pulsoComplete) return false;
  if (typeof value.connected !== "boolean" || (value.connected && (!evidenceComplete || value.bookmarks.convergencia !== 2))) return false;

  if (!isRecord(value.vesselCheckpoints)
    || !isVesselPose(value.vesselCheckpoints.current)
    || !Object.keys(value.vesselCheckpoints).every(isStationIdOrCurrent)
    || !Object.values(value.vesselCheckpoints).every(isVesselPose)) {
    return false;
  }
  if (value.presentation !== "editorial" && value.presentation !== "three-dimensional") return false;
  if (value.pauseState !== "paused" && value.pauseState !== "sailing") return false;
  if (value.qualityPreference !== "automatic" && value.qualityPreference !== "reduced-3d" && value.qualityPreference !== "text") return false;
  if (!isRecord(value.threeDAvailability)) return false;
  if (value.threeDAvailability.status === "available") {
    if (Object.keys(value.threeDAvailability).some((key) => key !== "status")) return false;
  } else if (value.threeDAvailability.status === "unavailable") {
    if (!["unsupported", "refused", "asset-failure", "context-loss", "unusable-quality"].includes(value.threeDAvailability.reason as string)) return false;
    if (value.presentation !== "editorial") return false;
  } else {
    return false;
  }
  if (value.qualityPreference === "text" && value.presentation !== "editorial") return false;

  return true;
}

function isStationIdOrCurrent(value: string): value is "current" | StationId {
  return value === "current" || isStationId(value);
}

export function isEvidenceComplete(state: ExpeditionState) {
  return evidenceStationIds.every((station) => state.completedStations.includes(station));
}

export function isStationAvailable(state: ExpeditionState, station: StationId) {
  if (station === "pulso-de-calor") return true;
  if (middleStationIds.includes(station)) {
    return state.completedStations.includes("pulso-de-calor");
  }
  return isEvidenceComplete(state);
}

export function transitionExpedition(state: ExpeditionState, action: ExpeditionAction): ExpeditionState {
  switch (action.type) {
    case "open-station": {
      if (!isStationAvailable(state, action.station)) return state;
      const choosingMiddle = state.middleOrder.length === 0
        && middleStationIds.includes(action.station);
      const otherMiddle = middleStationIds.find((station) => station !== action.station);
      return {
        ...state,
        currentStation: action.station,
        middleOrder: choosingMiddle && otherMiddle ? [action.station, otherMiddle] : state.middleOrder,
        pauseState: "paused",
      };
    }
    case "set-bookmark":
      if (action.station !== state.currentStation || !Number.isInteger(action.passage) || action.passage < 0 || action.passage > 2) {
        return state;
      }
      return { ...state, bookmarks: { ...state.bookmarks, [action.station]: action.passage } };
    case "complete-station":
      if (
        action.station !== state.currentStation
        || !evidenceStationIds.includes(action.station)
        || state.bookmarks[action.station] !== 2
        || !isStationAvailable(state, action.station)
        || state.completedStations.includes(action.station)
      ) {
        return state;
      }
      const completedStations = [...state.completedStations, action.station];
      const nextMiddle = state.middleOrder.find((station) => !completedStations.includes(station));
      const currentStation = state.presentation === "three-dimensional" || action.station === "pulso-de-calor"
        ? state.currentStation
        : nextMiddle ?? "convergencia";
      return { ...state, completedStations, currentStation, pauseState: "paused" };
    case "connect-expedition":
      if (
        state.connected
        || state.currentStation !== "convergencia"
        || state.bookmarks.convergencia !== 2
        || !isEvidenceComplete(state)
      ) {
        return state;
      }
      return { ...state, connected: true, pauseState: "paused" };
    case "restart-expedition": {
      const initial = createInitialExpeditionState();
      return {
        ...initial,
        presentation: state.presentation,
        qualityPreference: state.qualityPreference,
        threeDAvailability: state.threeDAvailability,
      };
    }
    case "set-presentation":
      if (action.presentation === "three-dimensional" && state.threeDAvailability.status === "unavailable") {
        return state;
      }
      return { ...state, presentation: action.presentation, pauseState: "paused" };
    case "set-pause-state":
      if (action.pauseState === "sailing"
        && (state.presentation !== "three-dimensional" || state.threeDAvailability.status !== "available")) {
        return state;
      }
      return { ...state, pauseState: action.pauseState };
    case "set-quality-preference":
      return {
        ...state,
        qualityPreference: action.qualityPreference,
        presentation: action.qualityPreference === "text" ? "editorial" : state.presentation,
        pauseState: action.qualityPreference === "text" ? "paused" : state.pauseState,
      };
    case "checkpoint-vessel":
      if (
        !Number.isFinite(action.pose.position.x)
        || !Number.isFinite(action.pose.position.z)
        || !Number.isFinite(action.pose.heading)
      ) {
        return state;
      }
      return {
        ...state,
        vesselCheckpoints: { ...state.vesselCheckpoints, [action.checkpoint]: action.pose },
      };
    case "lock-three-d":
      return {
        ...state,
        threeDAvailability: { status: "unavailable", reason: action.reason },
        presentation: "editorial",
        pauseState: "paused",
      };
    default:
      return state;
  }
}

export function restoreExpeditionState(value: string | null): ExpeditionState {
  if (!value) return createInitialExpeditionState();

  try {
    const candidate = JSON.parse(value) as { version?: unknown; state?: unknown };
    if (candidate.version !== EXPEDITION_STATE_VERSION || !isExpeditionState(candidate.state)) {
      return createInitialExpeditionState();
    }

    return { ...candidate.state, pauseState: "paused" };
  } catch {
    return createInitialExpeditionState();
  }
}

export function serializeExpeditionState(state: ExpeditionState): string {
  return JSON.stringify({ version: EXPEDITION_STATE_VERSION, state });
}

export function loadExpeditionState(storage: Pick<ExpeditionStorage, "getItem">): ExpeditionState {
  try {
    return restoreExpeditionState(storage.getItem(EXPEDITION_STORAGE_KEY));
  } catch {
    return createInitialExpeditionState();
  }
}

export function saveExpeditionState(
  storage: Pick<ExpeditionStorage, "setItem">,
  state: ExpeditionState,
): boolean {
  try {
    storage.setItem(EXPEDITION_STORAGE_KEY, serializeExpeditionState(state));
    return true;
  } catch {
    return false;
  }
}
