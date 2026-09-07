import type { VesselPose } from "@/lib/expedition-state";
import type { OceanStation } from "@/lib/ocean-config";
import type { StationId } from "@/content/editorial";
import { advanceHelm } from "@/lib/guided-helm";

// Scene distances are compressed for the fictional route, not geographic measurements.
export const APPROACH_RADIUS = 10;
export const ARRIVAL_RADIUS = 6;

export type StationNavigation = {
  departedStation: StationId | null;
  arrivalPending: boolean;
};

type JourneyFrame = {
  stations: OceanStation[];
  availableStations: StationId[];
  sailing: boolean;
  steering: number;
  targetHeading: number | null;
  seconds: number;
};

function stationBearing(pose: VesselPose, station: OceanStation): number {
  return Math.atan2(station.position[0] - pose.position.x, pose.position.z - station.position[2]);
}

function headingDifference(bearing: number, heading: number): number {
  return Math.atan2(Math.sin(bearing - heading), Math.cos(bearing - heading));
}

export function stationDistance(pose: VesselPose, station: OceanStation): number {
  return Math.hypot(station.position[0] - pose.position.x, station.position[2] - pose.position.z);
}

export function approachStation(pose: VesselPose, station: OceanStation, seconds: number): VesselPose {
  const delta = Math.max(0, Math.min(seconds, 0.05));
  const distance = stationDistance(pose, station);
  const bearing = stationBearing(pose, station);
  const turn = headingDifference(bearing, pose.heading);
  const heading = pose.heading + Math.max(-delta * Math.PI / 5, Math.min(delta * Math.PI / 5, turn));
  const speed = 1.2 + 1.8 * Math.max(0, Math.min(1, (distance - ARRIVAL_RADIUS) / (APPROACH_RADIUS - ARRIVAL_RADIUS)));
  // Drift inward while aligning, so even a tangential approach needs no precise docking.
  const travel = Math.min(Math.max(0, distance - ARRIVAL_RADIUS), speed * delta);
  return {
    heading,
    position: {
      x: pose.position.x + Math.sin(bearing) * travel,
      z: pose.position.z - Math.cos(bearing) * travel,
    },
  };
}

export function advanceStationJourney(pose: VesselPose, previous: StationNavigation, frame: JourneyFrame) {
  const navigation = { ...previous, arrivalPending: frame.sailing && previous.arrivalPending };
  const sailing = frame.sailing && !navigation.arrivalPending;
  const departed = frame.stations.find((station) => station.id === navigation.departedStation);
  // Allow a full course reversal on departure without bouncing back into the reader.
  if (departed && stationDistance(pose, departed) > APPROACH_RADIUS + ARRIVAL_RADIUS) navigation.departedStation = null;
  const approaching = sailing ? frame.stations.find((station) =>
    frame.availableStations.includes(station.id)
    && station.id !== navigation.departedStation
    && stationDistance(pose, station) <= APPROACH_RADIUS,
  ) : undefined;
  const nextPose = approaching
    ? approachStation(pose, approaching, frame.seconds)
    : advanceHelm(pose, frame.steering, frame.seconds, sailing, frame.targetHeading);
  const arrived = approaching
    && stationDistance(nextPose, approaching) <= ARRIVAL_RADIUS + 0.01
    && Math.abs(headingDifference(stationBearing(nextPose, approaching), nextPose.heading)) < 0.04
    ? approaching : undefined;
  if (arrived) {
    navigation.arrivalPending = true;
    navigation.departedStation = arrived.id;
  }
  return { pose: nextPose, navigation, arrived, sailing };
}
