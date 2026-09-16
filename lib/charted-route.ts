// The Charted Route is the only path the Ship can take through Voyage Waters.
// Route progress is measured in Stops: 0 is Stop 00, 1 is Stop 01, and so on,
// so whole numbers are exactly the anchorages and fractions lie between them.

export type RoutePoint = { x: number; z: number };
export type RoutePose = { position: RoutePoint; heading: number };

type RouteSample = RoutePoint & { length: number; heading: number };

export type ChartedRoute = {
  anchorages: readonly RoutePoint[];
  segments: readonly RouteSample[][];
};

const SAMPLES_PER_SEGMENT = 64;

// Heading 0 faces -Z, matching the Ship model's forward direction.
function headingOf(dx: number, dz: number) {
  return Math.atan2(dx, -dz);
}

function shortestTurn(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

// A uniform Catmull-Rom spline passes through every anchorage, so Stops sit
// exactly on the route and the course between them has no corners.
function catmullRom(p0: RoutePoint, p1: RoutePoint, p2: RoutePoint, p3: RoutePoint, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  const axis = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  const tangent = (a: number, b: number, c: number, d: number) =>
    0.5 * ((-a + c) + 2 * (2 * a - 5 * b + 4 * c - d) * t + 3 * (-a + 3 * b - 3 * c + d) * t2);
  return {
    x: axis(p0.x, p1.x, p2.x, p3.x),
    z: axis(p0.z, p1.z, p2.z, p3.z),
    heading: headingOf(tangent(p0.x, p1.x, p2.x, p3.x), tangent(p0.z, p1.z, p2.z, p3.z)),
  };
}

export function createChartedRoute(anchorages: readonly RoutePoint[]): ChartedRoute {
  if (anchorages.length < 2) throw new Error("A Charted Route needs at least two Stops");
  const at = (index: number): RoutePoint => {
    // Mirror the ends so the first and last Stops keep a natural course.
    if (index < 0) return { x: 2 * anchorages[0].x - anchorages[1].x, z: 2 * anchorages[0].z - anchorages[1].z };
    const last = anchorages.length - 1;
    if (index > last) return { x: 2 * anchorages[last].x - anchorages[last - 1].x, z: 2 * anchorages[last].z - anchorages[last - 1].z };
    return anchorages[index];
  };
  const segments = anchorages.slice(0, -1).map((_, index) => {
    const samples: RouteSample[] = [];
    for (let step = 0; step <= SAMPLES_PER_SEGMENT; step++) {
      const point = catmullRom(at(index - 1), at(index), at(index + 1), at(index + 2), step / SAMPLES_PER_SEGMENT);
      const previous = samples[step - 1];
      const length = previous ? previous.length + Math.hypot(point.x - previous.x, point.z - previous.z) : 0;
      samples.push({ ...point, length });
    }
    return samples;
  });
  return { anchorages, segments };
}

export function lastStopIndex(route: ChartedRoute) {
  return route.anchorages.length - 1;
}

export function clampProgress(route: ChartedRoute, progress: number) {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(lastStopIndex(route), Math.max(0, progress));
}

// Progress within a segment is spread by distance, so the Ship keeps an even
// pace however long or curved the passage between two Stops is.
export function poseAtProgress(route: ChartedRoute, progress: number): RoutePose {
  const clamped = clampProgress(route, progress);
  const segmentIndex = Math.min(Math.floor(clamped), route.segments.length - 1);
  const samples = route.segments[segmentIndex];
  const distance = (clamped - segmentIndex) * samples[samples.length - 1].length;
  let low = 0;
  let high = samples.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (samples[middle].length <= distance) low = middle;
    else high = middle;
  }
  const from = samples[low];
  const to = samples[high];
  const span = to.length - from.length;
  const blend = span > 0 ? Math.min(1, Math.max(0, (distance - from.length) / span)) : 0;
  return {
    position: { x: from.x + (to.x - from.x) * blend, z: from.z + (to.z - from.z) * blend },
    heading: from.heading + shortestTurn(from.heading, to.heading) * blend,
  };
}

export function nearestStopIndex(route: ChartedRoute, progress: number) {
  return Math.round(clampProgress(route, progress));
}

// One Stop forward or back from wherever the Ship is: a Ship between Stops
// moves to the next Stop in that direction, never past it.
export function adjacentStopIndex(route: ChartedRoute, progress: number, direction: 1 | -1) {
  const clamped = clampProgress(route, progress);
  const next = direction > 0 ? Math.floor(clamped + 1e-6) + 1 : Math.ceil(clamped - 1e-6) - 1;
  return Math.min(lastStopIndex(route), Math.max(0, next));
}
