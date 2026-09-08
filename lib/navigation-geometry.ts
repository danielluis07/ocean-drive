import type { VesselPose } from "@/lib/expedition-state";
import type { OceanStation } from "@/lib/ocean-config";

export function stationBearing(pose: VesselPose, station: OceanStation): number {
  return Math.atan2(station.position[0] - pose.position.x, pose.position.z - station.position[2]);
}

export function headingDifference(bearing: number, heading: number): number {
  return Math.atan2(Math.sin(bearing - heading), Math.cos(bearing - heading));
}

export function stationDistance(pose: VesselPose, station: OceanStation): number {
  return Math.hypot(station.position[0] - pose.position.x, station.position[2] - pose.position.z);
}
