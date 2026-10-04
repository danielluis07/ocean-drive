import { frameRouteCamera, type CameraFrame } from "@/lib/route-camera";
import type { RoutePoint } from "@/lib/charted-route";
import type { LandmarkCloseView } from "@/content/landmark-close-views";

// Capture-only preview for #77, not the Close View interaction in #72.
// Read once outside the render loop, with the existing diagnostics opt-in.
export function terrainPreviewEnabled() {
  try {
    return typeof window !== "undefined" && sessionStorage.getItem("ocean-drive:diagnostics") === "enabled"
      && sessionStorage.getItem("ocean-drive:terrain-preview") === "close";
  } catch { return false; }
}

export function frameTerrainPreview(ship: RoutePoint, viewport: { width: number; height: number }, landmark: [number, number], view: LandmarkCloseView): CameraFrame {
  const aerial = frameRouteCamera(ship, viewport);
  const distance = Math.hypot(...aerial.position.map((value, index) => value - aerial.target[index])) * view.distance;
  const pitch = view.pitch * Math.PI / 180;
  const bearing = view.bearing * Math.PI / 180;
  return { target: [landmark[0], view.targetHeight, landmark[1]],
    position: [landmark[0] - Math.sin(bearing) * Math.cos(pitch) * distance,
      view.targetHeight + Math.sin(pitch) * distance, landmark[1] + Math.cos(bearing) * Math.cos(pitch) * distance] };
}
