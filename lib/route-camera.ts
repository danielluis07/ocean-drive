import type { RoutePoint } from "@/lib/charted-route";

// Near top-down, like an aerial chart: steep enough to read the route and the
// Landmarks from above, with a little perspective left in the water.
export const CAMERA_PITCH = (80 * Math.PI) / 180;
export const CAMERA_FOV = 42;

export type CameraFrame = {
  position: [number, number, number];
  target: [number, number, number];
};

// How far above the water the camera rides. Portrait is narrower than the
// widest Landmark at the landscape height, so it rides higher to hold it whole.
const LANDSCAPE_HEIGHT = 64;
const PORTRAIT_HEIGHT = 114;
// Where the Ship rests, as a share of the half-frame away from its centre. The
// Landmark lies north of the Ship, so on landscape the Ship sits below centre
// as well as left of it, leaving the upper frame to the island.
const LANDSCAPE_ASIDE = 0.42;
const LANDSCAPE_BELOW = 0.34;
const PORTRAIT_ABOVE = 0.32;

// Portrait framing leaves room below the Ship; landscape framing, beside it.
export function isPortraitViewport(viewport: { width: number; height: number }) {
  return viewport.width > 0 && viewport.height > 0 && viewport.width < viewport.height;
}

// The Ship sits off-centre so a Stop Card can stand beside it: left of and below
// centre on landscape viewports (card to the right, Landmark above), above
// centre on portrait (card below). The camera keeps a fixed north-up
// orientation; only the Ship turns.
export function frameRouteCamera(ship: RoutePoint, viewport: { width: number; height: number }): CameraFrame {
  const aspect = viewport.width > 0 && viewport.height > 0 ? viewport.width / viewport.height : 1;
  const portrait = isPortraitViewport(viewport);
  const height = portrait ? PORTRAIT_HEIGHT : LANDSCAPE_HEIGHT;
  const halfHeight = height * Math.tan((CAMERA_FOV * Math.PI) / 360);
  const halfWidth = halfHeight * aspect;
  const target: [number, number, number] = portrait
    ? [ship.x, 0, ship.z + halfHeight * PORTRAIT_ABOVE]
    : [ship.x + halfWidth * LANDSCAPE_ASIDE, 0, ship.z - halfHeight * LANDSCAPE_BELOW];
  return {
    target,
    position: [target[0], height, target[2] + height / Math.tan(CAMERA_PITCH)],
  };
}
