import { expect, test } from "bun:test";
import { CAMERA_FOV, frameRouteCamera } from "@/lib/route-camera";

type Vector = [number, number, number];
const subtract = (a: Vector, b: Vector): Vector => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vector, b: Vector): Vector => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a: Vector): Vector => {
  const length = Math.hypot(...a);
  return [a[0] / length, a[1] / length, a[2] / length];
};

// Project a world point to normalized device coordinates for a look-at camera.
function project(point: Vector, camera: { position: Vector; target: Vector }, aspect: number) {
  const forward = normalize(subtract(camera.target, camera.position));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const relative = subtract(point, camera.position);
  const depth = dot(relative, forward);
  const tangent = Math.tan((CAMERA_FOV * Math.PI) / 360);
  return { x: dot(relative, right) / (depth * tangent * aspect), y: dot(relative, up) / (depth * tangent) };
}

const ship = { x: 12, z: -140 };
const viewports = [
  { name: "desktop landscape", width: 1440, height: 1000 },
  { name: "phone landscape", width: 844, height: 390 },
  { name: "phone portrait", width: 390, height: 844 },
  { name: "narrow portrait", width: 320, height: 640 },
];

test.each(viewports)("$name: the camera looks down at 75–85°", (viewport) => {
  const camera = frameRouteCamera(ship, viewport);
  const [dx, dy, dz] = subtract(camera.target, camera.position);
  const pitch = (Math.atan2(-dy, Math.hypot(dx, dz)) * 180) / Math.PI;
  expect(pitch).toBeGreaterThanOrEqual(75);
  expect(pitch).toBeLessThanOrEqual(85);
});

test.each(viewports)("$name: the Ship is framed on screen with room beside it for a Stop Card", (viewport) => {
  const camera = frameRouteCamera(ship, viewport);
  const aspect = viewport.width / viewport.height;
  const { x, y } = project([ship.x, 0, ship.z], camera, aspect);
  expect(Math.abs(x)).toBeLessThan(0.8);
  expect(Math.abs(y)).toBeLessThan(0.8);
  if (aspect >= 1) {
    // Landscape: the Ship sits left of centre, leaving the right side free.
    expect(x).toBeLessThan(-0.2);
    expect(Math.abs(y)).toBeLessThan(0.1);
  } else {
    // Portrait: the Ship sits above centre, leaving the lower part free.
    expect(y).toBeGreaterThan(0.2);
    expect(Math.abs(x)).toBeLessThan(0.1);
  }
});

test("the camera follows the Ship without turning with it", () => {
  const viewport = { width: 1440, height: 1000 };
  const here = frameRouteCamera({ x: 0, z: 0 }, viewport);
  const there = frameRouteCamera({ x: 10, z: -30 }, viewport);
  expect(subtract(there.position, here.position)).toEqual([10, 0, -30]);
  expect(subtract(there.target, here.target)).toEqual([10, 0, -30]);
});
