import type { VesselPose } from "@/lib/expedition-state";

// Calibration values, not a claim about real vessel dynamics.
const SPEED = 3;
const MAX_TURN_RATE = Math.PI / 5;
const DRAG_DEAD_ZONE = 8;
const DRAG_RANGE = 100;

export function dragSteering(horizontalDistance: number): number {
  const distance = Math.abs(horizontalDistance);
  if (distance <= DRAG_DEAD_ZONE) return 0;
  return Math.sign(horizontalDistance) * Math.min(1, (distance - DRAG_DEAD_ZONE) / DRAG_RANGE);
}

export function advanceHelm(pose: VesselPose, steering: number, seconds: number, sailing: boolean, targetHeading: number | null = null): VesselPose {
  if (!sailing) return pose;
  // A stalled frame must never become a travel jump on return.
  const delta = Math.max(0, Math.min(seconds, 0.05));
  const maximumTurn = MAX_TURN_RATE * delta;
  const requestedTurn = targetHeading !== null && steering === 0
    ? targetHeading - pose.heading
    : steering * maximumTurn;
  const heading = pose.heading + Math.max(-maximumTurn, Math.min(maximumTurn, requestedTurn));
  return {
    heading,
    position: {
      x: pose.position.x + Math.sin(heading) * SPEED * delta,
      z: pose.position.z - Math.cos(heading) * SPEED * delta,
    },
  };
}
