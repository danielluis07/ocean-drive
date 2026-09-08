import type { VesselPose } from "@/lib/expedition-state";
import { headingDifference } from "@/lib/navigation-geometry";

// Fictional Expedition Waters; the visible water bands use these same bounds.
export const boundaryCurrent = { centerX: 0, centerZ: -56, radius: 110, releaseRadius: 102 };

export function inBoundaryCurrent(pose: VesselPose, returning: boolean): boolean {
  const distance = Math.hypot(pose.position.x - boundaryCurrent.centerX, pose.position.z - boundaryCurrent.centerZ);
  return distance >= (returning ? boundaryCurrent.releaseRadius : boundaryCurrent.radius);
}

export function curveBoundaryHeading(pose: VesselPose, steering: number, seconds: number): number {
  const inward = Math.atan2(boundaryCurrent.centerX - pose.position.x, pose.position.z - boundaryCurrent.centerZ);
  const delta = Math.max(0, Math.min(seconds, 0.05));
  const turn = headingDifference(inward, pose.heading);
  // A bounded turn, with small manual influence, guarantees inward recovery even
  // with held outward input. Translation still follows the bow at cruising pace.
  return pose.heading + Math.max(-0.85 * delta, Math.min(0.85 * delta, turn)) + steering * 0.1 * delta;
}
