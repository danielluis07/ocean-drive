import { Vector3, type Camera, type Object3D } from "three";

// Half of the tallest centered beacon label plus a small gap, in CSS pixels.
const BEACON_LABEL_EDGE_MARGIN = 60;

const projected = new Vector3();

// Project the label like a scene anchor, but never let a destination's name leave
// the top or bottom of short or magnified ocean views. Horizontal position is
// untouched so labels never become screen-edge waypoint arrows.
export function keepBeaconLabelInView(anchor: Object3D, camera: Camera, size: { width: number; height: number }): [number, number] {
  projected.setFromMatrixPosition(anchor.matrixWorld).project(camera);
  const x = (projected.x + 1) / 2 * size.width;
  const y = (1 - projected.y) / 2 * size.height;
  const margin = Math.min(BEACON_LABEL_EDGE_MARGIN, size.height / 2);
  return [x, Math.min(Math.max(y, margin), size.height - margin)];
}
