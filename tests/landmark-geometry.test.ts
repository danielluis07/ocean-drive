import { describe, expect, test } from "bun:test";
import {
  boundsOf,
  distanceToRings,
  insideRings,
  islandSurface,
  offsetRing,
  projectLandmark,
  resampleRing,
  ringArea,
  shoreBand,
  simplifyRing,
  triangulate,
  type PlanarPoint,
  type Ring,
} from "@/lib/landmark-geometry";
import { sampleElevation, shadeSurface, type LandmarkPalette } from "@/lib/landmark-surface";

// Island rings run counter-clockwise on the map. World Z points south, so in
// x/z they have negative shoelace area; these fixtures are wound the same way.
const square: PlanarPoint[] = [
  { x: -5, z: 5 },
  { x: 5, z: 5 },
  { x: 5, z: -5 },
  { x: -5, z: -5 },
];
// An L-shaped island with a cove, to catch triangles spanning the water.
const cove: PlanarPoint[] = [
  { x: 0, z: 0 },
  { x: 10, z: 0 },
  { x: 10, z: -4 },
  { x: 4, z: -4 },
  { x: 4, z: -10 },
  { x: 0, z: -10 },
];

describe("Landmark coastline conversion", () => {
  test("OSM island rings, drawn with the land on their left, have positive area", () => {
    const island: Ring = [[0, 0], [1, 0], [1, 1], [0, 1]];
    expect(ringArea(island)).toBeGreaterThan(0);
    expect(ringArea([...island].reverse())).toBeLessThan(0);
  });

  test("projection keeps north up and scales the longest axis to the span", () => {
    // Two degrees of longitude on the equator is wider than one of latitude.
    const { rings, toDegrees } = projectLandmark([[[0, 0], [2, 0], [2, 1], [0, 1]]], 20);
    const bounds = boundsOf(rings);
    expect(bounds.maxX - bounds.minX).toBeCloseTo(20, 6);
    expect(bounds.maxZ - bounds.minZ).toBeCloseTo(10, 2);
    // North (higher latitude) is toward -Z.
    const north = rings[0].find((_, index) => index === 2)!;
    expect(north.z).toBeLessThan(0);
    // The inverse returns the recorded degrees, for sampling elevation.
    const back = toDegrees(rings[0][2]);
    expect(back.lon).toBeCloseTo(2, 6);
    expect(back.lat).toBeCloseTo(1, 6);
  });

  test("the fixtures are wound as projected island rings are", () => {
    const { rings } = projectLandmark([[[0, 0], [1, 0], [1, 1], [0, 1]]], 10);
    const area = (ring: PlanarPoint[]) =>
      ring.reduce((sum, point, index) => sum + point.x * ring[(index + 1) % ring.length].z - ring[(index + 1) % ring.length].x * point.z, 0);
    expect(Math.sign(area(rings[0]))).toBe(-1);
    expect(Math.sign(area(square))).toBe(-1);
    expect(Math.sign(area(cove))).toBe(-1);
  });

  test("simplification keeps a ring closed, wound the same way, and within tolerance", () => {
    const wobbly = resampleRing(square, 0.25).map((point, index) => ({
      x: point.x + (index % 2 ? 0.05 : -0.05),
      z: point.z,
    }));
    const simple = simplifyRing(wobbly, 0.2);
    expect(simple.length).toBeLessThan(wobbly.length / 4);
    expect(simple.length).toBeGreaterThanOrEqual(4);
    const area = (ring: PlanarPoint[]) =>
      ring.reduce((sum, point, index) => {
        const next = ring[(index + 1) % ring.length];
        return sum + point.x * next.z - next.x * point.z;
      }, 0);
    expect(Math.sign(area(simple))).toBe(Math.sign(area(square)));
    for (const point of wobbly) expect(distanceToRings(point, [simple])).toBeLessThanOrEqual(0.2 + 1e-9);
  });

  test("resampling walks the shoreline at an even spacing", () => {
    const walked = resampleRing(square, 1);
    expect(walked).toHaveLength(40);
    for (let index = 0; index < walked.length; index++) {
      const next = walked[(index + 1) % walked.length];
      expect(Math.hypot(next.x - walked[index].x, next.z - walked[index].z)).toBeCloseTo(1, 6);
    }
  });
});

describe("Landmark triangulation", () => {
  test("Delaunay covers a convex point set without overlap", () => {
    const points = resampleRing(square, 2);
    const triangles = triangulate(points);
    const area = triangles.reduce((sum, [a, b, c]) => {
      const [A, B, C] = [points[a], points[b], points[c]];
      return sum + Math.abs((B.x - A.x) * (C.z - A.z) - (C.x - A.x) * (B.z - A.z)) / 2;
    }, 0);
    expect(area).toBeCloseTo(100, 6);
  });

  test("an island surface follows its coast and never spans the water in a cove", () => {
    const surface = islandSurface([cove], 0.8);
    let area = 0;
    for (const [a, b, c] of surface.triangles) {
      const [A, B, C] = [surface.points[a], surface.points[b], surface.points[c]];
      expect(insideRings({ x: (A.x + B.x + C.x) / 3, z: (A.z + B.z + C.z) / 3 }, [cove])).toBe(true);
      area += Math.abs((B.x - A.x) * (C.z - A.z) - (C.x - A.x) * (B.z - A.z)) / 2;
    }
    // 10×4 plus 4×6 of land, and nothing of the 6×6 cove.
    expect(area).toBeCloseTo(64, 0);
    // Shoreline points come first, so the build can pin them to sea level.
    for (let index = 0; index < surface.shoreCount; index++)
      expect(distanceToRings(surface.points[index], [cove])).toBeLessThan(1e-6);
  });

  test("the surf band grows outward without folding back across the island", () => {
    const walked = resampleRing(cove, 0.5);
    const pushed = offsetRing(walked, 2);
    for (const point of pushed) {
      expect(insideRings(point, [cove])).toBe(false);
      expect(distanceToRings(point, [cove])).toBeGreaterThan(1);
    }
  });
});

describe("Landmark shallows band", () => {
  // The cove island and a rock a little way off its east shore, close enough
  // that their shallows meet.
  const rock: PlanarPoint[] = [
    { x: 13, z: -1 },
    { x: 14, z: -1 },
    { x: 14, z: -2 },
    { x: 13, z: -2 },
  ];
  const islands = [cove, rock];
  const band = shoreBand(islands, { tuck: 0.4, surf: 1, reach: 3, shore: 0.9, field: 1.4 });
  const inside = (point: PlanarPoint, [a, b, c]: PlanarPoint[]) => {
    const side = (p: PlanarPoint, q: PlanarPoint) => (q.x - p.x) * (point.z - p.z) - (q.z - p.z) * (point.x - p.x);
    const [u, v, w] = [side(a, b), side(b, c), side(c, a)];
    return (u >= 0 && v >= 0 && w >= 0) || (u <= 0 && v <= 0 && w <= 0);
  };
  const covering = (point: PlanarPoint) =>
    band.triangles.filter((triangle) => inside(point, triangle.map((vertex) => band.points[vertex]))).length;

  test("every point carries its true distance from the nearest shore of any island", () => {
    for (const [index, point] of band.points.entries()) {
      if (band.distance[index] < 0) {
        // The inner edge lies under the land, where the water meets it.
        expect(insideRings(point, islands)).toBe(true);
        expect(distanceToRings(point, islands)).toBeLessThan(0.6);
      } else {
        expect(insideRings(point, islands)).toBe(false);
        expect(band.distance[index]).toBeCloseTo(distanceToRings(point, islands), 9);
      }
    }
    expect(Math.max(...band.distance)).toBeGreaterThan(3);
  });

  test("the water out to the band's reach is covered once, coves and channels included", () => {
    // In the cove, off a headland, in the channel between the islands, and
    // beyond the rock: one sheet, with no band laid over another's.
    for (const point of [{ x: 7, z: -7 }, { x: 5, z: -5 }, { x: 11.5, z: -1.5 }, { x: 15.5, z: -1.3 }, { x: -1.7, z: 1.2 }, { x: 2.1, z: -12.3 }]) {
      expect(insideRings(point, islands)).toBe(false);
      expect(covering(point)).toBe(1);
    }
    for (let step = 0; step < 200; step++) {
      const point = { x: -3 + ((step * 7.31) % 20), z: -13 + ((step * 3.77) % 16) };
      if (insideRings(point, islands) || distanceToRings(point, islands) > 2.7) continue;
      expect(covering(point)).toBe(1);
    }
  });

  test("the sheet stops under the land's edge and past its reach", () => {
    // Deep inland, and well out to sea.
    expect(covering({ x: 2, z: -3 })).toBe(0);
    expect(covering({ x: 7, z: -2 })).toBe(0);
    expect(covering({ x: 22, z: -9 })).toBe(0);
    for (const triangle of band.triangles) expect(triangle.some((vertex) => band.distance[vertex] < 3)).toBe(true);
  });
});

describe("Landmark shading", () => {
  const palette: LandmarkPalette = { sand: "#ffffff", rock: "#000000", lowland: "#00ff00", highland: "#008000" };
  const at = (metres: number, slope: number) =>
    shadeSurface({ metres, slope, shoreHeight: 10, summit: 300, grain: 0.5, shoreDistance: 0, beachWidth: 1 }, palette);

  test("low, flat ground at the waterline is sand", () => {
    const [r, g, b] = at(0, 0);
    expect(Math.min(r, g, b)).toBeGreaterThan(0.9);
  });

  test("steep ground is bare rock, even at the shore", () => {
    for (const metres of [0, 150]) expect(Math.max(...at(metres, 0.95))).toBeLessThan(0.05);
  });

  test("gentle slopes above the beach carry vegetation", () => {
    const [r, g, b] = at(80, 0.1);
    expect(g).toBeGreaterThan(r + 0.3);
    expect(g).toBeGreaterThan(b + 0.3);
  });

  test("low inland ground stays vegetated instead of becoming an island-wide beach", () => {
    const [r, g, b] = shadeSurface({ metres: 0, slope: 0, shoreHeight: 10, summit: 300,
      grain: 0.5, shoreDistance: 2, beachWidth: 1 }, palette);
    expect(g).toBeGreaterThan(r + 0.3);
    expect(g).toBeGreaterThan(b + 0.3);
  });

  test("elevation is sampled bilinearly between recorded metres", () => {
    const elevation = {
      bounds: { west: 0, south: 0, east: 2, north: 2 },
      grid: 2,
      metres: new Int16Array([0, 100, 0, 100]),
    };
    expect(sampleElevation(elevation, 0.5, 1)).toBeCloseTo(0, 6);
    expect(sampleElevation(elevation, 1, 1)).toBeCloseTo(50, 6);
    expect(sampleElevation(elevation, 1.5, 1)).toBeCloseTo(100, 6);
  });
});
