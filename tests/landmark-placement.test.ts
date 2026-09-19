import { describe, expect, test } from "bun:test";
import { landmarkSources } from "@/content/landmark-sources";
import { oceanConfiguration } from "@/lib/ocean-config";
import { createChartedRoute, poseAtProgress } from "@/lib/charted-route";
import { CAMERA_FOV, frameRouteCamera, isPortraitViewport } from "@/lib/route-camera";
import { distanceToRings, insideRings, projectLandmark, type PlanarPoint, type Ring } from "@/lib/landmark-geometry";

// Every Landmark's true outline, read back from the source data it was built
// from, so the placement is checked against the island and not against a
// summary of it.
const outlines = new Map<string, PlanarPoint[][]>();
for (const source of landmarkSources) {
  const record: { coastline: { islands: { ring: Ring }[] } } = await Bun.file(`data/landmarks/${source.id}.json`).json();
  outlines.set(source.id, projectLandmark(record.coastline.islands.map((island) => island.ring), source.span).rings);
}

const anchorages = oceanConfiguration.stops.map((stop) => ({ x: stop.anchorage[0], z: stop.anchorage[1] }));
const route = createChartedRoute(anchorages);
const placed = oceanConfiguration.stops.flatMap((stop) =>
  stop.landmark ? [{ stop, centre: { x: stop.landmark[0], z: stop.landmark[1] } }] : [],
);

// The production viewports the Stop Card layout is checked at.
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "landscape phone", width: 844, height: 390 },
  { name: "small landscape phone", width: 568, height: 320 },
  { name: "portrait phone", width: 390, height: 844 },
  { name: "narrow portrait phone", width: 320, height: 568 },
];

type Vector = [number, number, number];
const subtract = (a: Vector, b: Vector): Vector => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vector, b: Vector): Vector => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a: Vector): Vector => {
  const length = Math.hypot(...a);
  return [a[0] / length, a[1] / length, a[2] / length];
};

// The same look-at perspective projection the scene renders with, so a point on
// the water maps to the pixel the Visitor actually sees it at. The camera is
// north-up, and the Ship is framed by `lib/route-camera.ts`.
function toScreen(point: PlanarPoint, ship: PlanarPoint, viewport: { width: number; height: number }) {
  const camera = frameRouteCamera(ship, viewport);
  const forward = normalize(subtract(camera.target, camera.position));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const relative = subtract([point.x, 0, point.z], camera.position);
  const depth = dot(relative, forward);
  const tangent = Math.tan((CAMERA_FOV * Math.PI) / 360);
  const aspect = viewport.width / viewport.height;
  return {
    x: ((dot(relative, right) / (depth * tangent * aspect)) + 1) * (viewport.width / 2),
    y: (1 - dot(relative, up) / (depth * tangent)) * (viewport.height / 2),
  };
}

describe("Landmark placement in Voyage Waters", () => {
  test("every island Stop has a built Landmark and every Landmark is placed", () => {
    expect(oceanConfiguration.stops.filter((stop) => stop.landmark).map((stop) => stop.id)).toEqual(
      landmarkSources.map((source) => source.id),
    );
    for (const source of landmarkSources) expect(oceanConfiguration.landmarks[source.id]).toBeDefined();
  });

  test("the Ship passes beside each Landmark and never through one", () => {
    for (const { stop, centre } of placed) {
      const rings = outlines.get(stop.id)!.map((ring) => ring.map((point) => ({ x: point.x + centre.x, z: point.z + centre.z })));
      let clearance = Infinity;
      // About one sample every half world unit along the route.
      for (let progress = 0; progress <= anchorages.length - 1; progress += 0.004) {
        const { position } = poseAtProgress(route, progress);
        expect(insideRings(position, rings), `${stop.id}: the route crosses the island`).toBe(false);
        clearance = Math.min(clearance, distanceToRings(position, rings));
      }
      // Wide enough for the hull and its surf line, close enough to pass beside.
      expect(clearance, `${stop.id}: clearance from the shoreline`).toBeGreaterThan(3);
      expect(clearance, `${stop.id}: the Ship should come alongside`).toBeLessThan(12);
    }
  }, 30_000);

  test.each(viewports)("$name: the settled Ship sees the whole island, clear of the Stop Card", (viewport) => {
    for (const { stop, centre } of placed) {
      const ship = { x: stop.anchorage[0], z: stop.anchorage[1] };
      const landmark = oceanConfiguration.landmarks[stop.id];
      const corners = [
        { x: centre.x - landmark.extent.x, z: centre.z - landmark.extent.z },
        { x: centre.x + landmark.extent.x, z: centre.z + landmark.extent.z },
      ].map((point) => toScreen(point, ship, viewport));
      const label = `${stop.id} at ${viewport.name}`;
      expect(corners[0].x, `${label}: island cropped on the left`).toBeGreaterThanOrEqual(0);
      expect(corners[1].x, `${label}: island cropped on the right`).toBeLessThanOrEqual(viewport.width);
      expect(corners[0].y, `${label}: island cropped at the top`).toBeGreaterThanOrEqual(0);
      expect(corners[1].y, `${label}: island cropped at the bottom`).toBeLessThanOrEqual(viewport.height);

      // The Stop Card stands beside the Ship on landscape and below it on
      // portrait, past whichever of the Ship and the Landmark reaches further.
      const shipOnScreen = toScreen(ship, ship, viewport);
      const reach = toScreen({ x: centre.x + landmark.radius, z: centre.z + landmark.radius }, ship, viewport);
      const gap = 24;
      if (isPortraitViewport(viewport)) {
        expect(Math.max(reach.y, shipOnScreen.y + 42) + gap, `${label}: no room for the card below`).toBeLessThan(
          viewport.height - 120,
        );
      } else {
        expect(Math.max(reach.x, shipOnScreen.x + 64) + gap, `${label}: no room for the card beside`).toBeLessThan(
          viewport.width - 220,
        );
      }
    }
  });
});
