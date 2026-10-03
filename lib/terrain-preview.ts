import { frameRouteCamera, type CameraFrame } from "@/lib/route-camera";
import type { RoutePoint } from "@/lib/charted-route";

// Capture-only preview for #77, not the Close View interaction in #72.
// Read once outside the render loop, with the existing diagnostics opt-in.
export function terrainPreviewEnabled() {
  try {
    return typeof window !== "undefined" && sessionStorage.getItem("ocean-drive:diagnostics") === "enabled"
      && sessionStorage.getItem("ocean-drive:terrain-preview") === "close";
  } catch { return false; }
}

export function frameTerrainPreview(ship: RoutePoint, viewport: { width: number; height: number }, landmark: [number, number]): CameraFrame {
  const aerial = frameRouteCamera(ship, viewport);
  const distance = Math.hypot(...aerial.position.map((value, index) => value - aerial.target[index])) * .5;
  const pitch = 48 * Math.PI / 180;
  return { target: [landmark[0], 1, landmark[1]],
    position: [landmark[0], 1 + Math.sin(pitch) * distance, landmark[1] + Math.cos(pitch) * distance] };
}
