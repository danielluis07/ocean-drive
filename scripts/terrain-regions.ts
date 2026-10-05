import type { LandmarkSource } from "@/content/landmark-sources";
import type { PlanarPoint } from "@/lib/landmark-geometry";
import { insideRings, distanceToRings } from "@/lib/landmark-geometry";
import { smooth } from "@/scripts/terrain-treatment";

// Evaluate recorded beach paths against the same projection as both LODs.
// No fixed world-space mask can drift when the retained outline is updated.
export function createBeachSampler(
  source: LandmarkSource,
  toWorld: (point: { lon: number; lat: number }) => PlanarPoint,
) {
  const segments = (source.beaches ?? []).flatMap((beach) => {
    const path = beach.path.map(([lon, lat]) => toWorld({ lon, lat }));
    return path
      .slice(1)
      .map((b, index) => ({ a: path[index], b, width: beach.width }));
  });
  return ({ x, z }: PlanarPoint) => {
    let strength = 0;
    for (const { a, b, width } of segments) {
      const dx = b.x - a.x,
        dz = b.z - a.z;
      const length = dx * dx + dz * dz;
      const t = length
        ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length))
        : 0;
      const distance = Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
      strength = Math.max(strength, 1 - smooth(width * 0.45, width, distance));
    }
    return strength;
  };
}

// Support known narrow sand in Low without raising the submerged coast or
// inventing new shoreline/elevation. The normal direction is resolved against
// the actual simplified land ring; photograph coordinates never enter it.
export function beachSupportPoints(source: LandmarkSource, toWorld: (point: { lon: number; lat: number }) => PlanarPoint, rings: PlanarPoint[][], spacing: number) {
  const points: PlanarPoint[] = [];
  for (const beach of source.beaches ?? []) {
    if (!beach.supportLow) continue;
    const path = beach.path.map(([lon, lat]) => toWorld({ lon, lat }));
    for (let index = 1; index < path.length; index++) {
      const a = path[index - 1], b = path[index];
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      if (!length) continue;
      const steps = Math.max(1, Math.ceil(length / spacing));
      const offset = Math.min(.45, beach.width * .5);
      for (let step = 0; step < steps; step++) {
        const t = (step + .5) / steps;
        const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        const normal = { x: -(b.z - a.z) / length, z: (b.x - a.x) / length };
        const point = [1, -1].map(sign => ({ x: x + normal.x * offset * sign, z: z + normal.z * offset * sign }))
          .find(candidate => insideRings(candidate, rings) && distanceToRings(candidate, rings) >= .15);
        if (point) points.push(point);
      }
    }
  }
  return points;
}
