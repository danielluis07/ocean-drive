import type { VesselPose } from "@/lib/expedition-state";
import type { OceanStation } from "@/lib/ocean-config";
import type { StationId } from "@/content/editorial";
import { headingDifference, stationBearing, stationDistance } from "@/lib/navigation-geometry";

export type AssistanceStage = "none" | "bearings" | "reorient";
export type AssistanceObservation = {
  stage: AssistanceStage;
  sample: VesselPose;
  sampleSeconds: number;
  nonProgressSeconds: number;
  destinations: string;
  course: { heading: number; turn: number; steadySeconds: number; circling: boolean };
};

export function getAssistanceDestinations(stations: OceanStation[], availableIds: StationId[], completedIds: StationId[], departedId: StationId | null = null): OceanStation[] {
  const available = stations.filter((station) => availableIds.includes(station.id) && station.id !== departedId);
  const unfinished = available.filter((station) => !completedIds.includes(station.id));
  return unfinished.length ? unfinished : available;
}

export function observeProgress(previous: AssistanceObservation | undefined, pose: VesselPose, stations: OceanStation[], seconds: number): AssistanceObservation {
  const destinations = stations.map((station) => station.id).join(",");
  const delta = Math.max(0, Math.min(seconds, 0.05));
  const initialCourse = { heading: pose.heading, turn: 0, steadySeconds: 0, circling: false };
  const fresh: AssistanceObservation = { stage: "none", sample: pose, sampleSeconds: 0, nonProgressSeconds: 0, destinations, course: initialCourse };
  if (!previous || previous.destinations !== destinations || !stations.length) return fresh;
  const turn = headingDifference(pose.heading, previous.course.heading);
  const steadySeconds = Math.abs(turn) < 0.001 ? previous.course.steadySeconds + delta : 0;
  // Retain full turns through momentary improvements, regardless of the circle's
  // radius. A steady corrected heading ends the loop; pauses do not consume it.
  const accumulatedTurn = previous.course.turn + turn;
  fresh.course = steadySeconds >= 1 ? initialCourse : {
    heading: pose.heading, turn: accumulatedTurn, steadySeconds,
    circling: previous.course.circling || Math.abs(accumulatedTurn) >= Math.PI * 2,
  };
  const correction = Math.abs(headingDifference(pose.heading, previous.sample.heading)) >= Math.PI / 6;
  const progressing = stations.some((station) =>
    stationDistance(previous.sample, station) - stationDistance(pose, station) >= 1
    || (correction && Math.abs(headingDifference(stationBearing(pose, station), pose.heading))
      < Math.abs(headingDifference(stationBearing(previous.sample, station), previous.sample.heading)) - Math.PI / 12));
  if (progressing && !fresh.course.circling) return fresh;
  const sampleSeconds = previous.sampleSeconds + delta;
  if (sampleSeconds < 2) return { ...previous, sampleSeconds, course: fresh.course };
  // Time qualifies an observation; it cannot establish non-progress by itself.
  const travelled = Math.hypot(pose.position.x - previous.sample.position.x, pose.position.z - previous.sample.position.z);
  if (travelled < 0.5) return { ...previous, sample: pose, sampleSeconds: 0, course: fresh.course };
  const nonProgressSeconds = previous.nonProgressSeconds + sampleSeconds;
  return {
    stage: nonProgressSeconds >= 14 ? "reorient" : nonProgressSeconds >= 6 ? "bearings" : "none",
    sample: pose, sampleSeconds: 0, nonProgressSeconds, destinations, course: fresh.course,
  };
}

export function reorientVessel(pose: VesselPose, stations: OceanStation[]): VesselPose {
  const nearest = stations.reduce<OceanStation | undefined>((selected, station) =>
    !selected || stationDistance(pose, station) < stationDistance(pose, selected) ? station : selected, undefined);
  // A single heading change: position and subsequent manual input are untouched.
  return nearest ? { position: pose.position, heading: pose.heading + headingDifference(stationBearing(pose, nearest), pose.heading) } : pose;
}
