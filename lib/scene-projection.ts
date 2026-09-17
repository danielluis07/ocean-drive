import type { Camera, Vector3 } from "three";
import type { ScreenCircle } from "@/lib/stage-layout";

// Generous world-space extents: the Ship's hull in any heading, and the
// placeholder Landmark's base.
export const SHIP_EXTENT = 3.5;
export const LANDMARK_EXTENT = 4;

// Project a circle on the water to CSS pixels. The camera keeps a north-up
// orientation, so an offset along world X measures the on-screen radius.
export function projectWaterCircle(
  camera: Camera,
  point: { x: number; z: number },
  extent: number,
  size: { width: number; height: number },
  scratch: Vector3,
): ScreenCircle {
  const toScreen = (ndc: Vector3) => ({
    x: ((ndc.x + 1) / 2) * size.width,
    y: ((1 - ndc.y) / 2) * size.height,
  });
  const centre = toScreen(scratch.set(point.x, 0, point.z).project(camera));
  const edge = toScreen(scratch.set(point.x + extent, 0, point.z).project(camera));
  return { ...centre, radius: Math.hypot(edge.x - centre.x, edge.y - centre.y) };
}
