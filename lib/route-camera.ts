import type { RoutePoint } from "@/lib/charted-route";

// Near top-down, like an aerial chart: steep enough to read the route and the
// Landmarks from above, with a little perspective left in the water.
export const CAMERA_PITCH = (80 * Math.PI) / 180;
export const CAMERA_FOV = 42;

export type CameraFrame = {
  position: [number, number, number];
  target: [number, number, number];
};

// The Ship sits off-centre so a Stop Card can stand beside it: left of centre on
// landscape viewports (card to the right), above centre on portrait (card below).
// The camera keeps a fixed north-up orientation; only the Ship turns.
export function frameRouteCamera(ship: RoutePoint, viewport: { width: number; height: number }): CameraFrame {
  const aspect = viewport.width > 0 && viewport.height > 0 ? viewport.width / viewport.height : 1;
  const portrait = aspect < 1;
  const height = portrait ? 92 : 64;
  const halfHeight = height * Math.tan((CAMERA_FOV * Math.PI) / 360);
  const halfWidth = halfHeight * aspect;
  const target: [number, number, number] = portrait
    ? [ship.x, 0, ship.z + halfHeight * 0.32]
    : [ship.x + halfWidth * 0.36, 0, ship.z];
  return {
    target,
    position: [target[0], height, target[2] + height / Math.tan(CAMERA_PITCH)],
  };
}
