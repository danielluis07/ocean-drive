import { expect, test } from "bun:test";
import { CALM_WAVE_RATE, CALM_WAVE_STRENGTH } from "@/lib/ocean-daylight";
import { PlaneGeometry, Triangle, Vector3 } from "three";
import { qualityEnvelope } from "@/lib/ocean-quality";
import { OCEAN_SIZE, sampleOceanHeight, sampleOceanSheet } from "@/lib/ocean-surface";

test("reduced-motion buoyancy lowers displacement and vertical speed across the route", () => {
  let normalTravel = 0;
  let calmTravel = 0;
  let normalPeak = 0;
  let calmPeak = 0;
  for (const [x, z] of [[0, 0], [-112, -12], [-224, 10], [-336, -8], [-448, 12]]) {
    for (let frame = 1; frame <= 1200; frame++) {
      const time = frame / 60;
      const previous = (frame - 1) / 60;
      const normal = sampleOceanHeight(x, z, time);
      const calm = sampleOceanHeight(x, z, time * CALM_WAVE_RATE, CALM_WAVE_STRENGTH);
      normalTravel += Math.abs(normal - sampleOceanHeight(x, z, previous));
      calmTravel += Math.abs(calm - sampleOceanHeight(x, z, previous * CALM_WAVE_RATE, CALM_WAVE_STRENGTH));
      normalPeak = Math.max(normalPeak, Math.abs(normal));
      calmPeak = Math.max(calmPeak, Math.abs(calm));
    }
  }
  expect(calmPeak).toBeLessThan(normalPeak * .5);
  expect(calmTravel).toBeLessThan(normalTravel * .2);
});

// The shallows band takes its depth from the surface the water draws, so the
// sheet has to be that surface exactly: the water's own triangles, vertex for
// vertex, at every tier's grid.
test.each(["high", "balanced", "low"] as const)("%s: the ocean sheet is the surface the water's grid draws", (tier) => {
  const { segments } = qualityEnvelope[tier];
  const vessel = { x: -112.3, z: -12.7 };
  const time = 3.3;
  const plane = new PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE, segments, segments).rotateX(-Math.PI / 2);
  const grid = plane.getAttribute("position");
  // The vertex shader's squeeze toward the Ship, then its swell.
  const drawn = Array.from({ length: grid.count }, (_, index) => {
    const squeeze = (value: number) => (Math.sign(value) * value * value) / (OCEAN_SIZE / 2);
    const x = squeeze(grid.getX(index)) + vessel.x;
    const z = squeeze(grid.getZ(index)) + vessel.z;
    return new Vector3(x, sampleOceanHeight(x, z, time), z);
  });
  const faces = plane.getIndex()!;
  const triangle = new Triangle();
  let checked = 0;
  let furthest = 0;
  let offSwell = 0;
  for (let face = 0; face < faces.count; face += 3) {
    triangle.set(drawn[faces.getX(face)], drawn[faces.getX(face + 1)], drawn[faces.getX(face + 2)]);
    // A Landmark's shallows lie within this reach of the Ship.
    if (Math.hypot(triangle.a.x - vessel.x, triangle.a.z - vessel.z) > 60) continue;
    for (const [a, b] of [[0.2, 0.3], [0.6, 0.1], [0.05, 0.9]]) {
      const point = new Vector3().addScaledVector(triangle.a, a).addScaledVector(triangle.b, b).addScaledVector(triangle.c, 1 - a - b);
      furthest = Math.max(furthest, Math.abs(point.y - sampleOceanSheet(point.x, point.z, time, 1, vessel, OCEAN_SIZE / segments)));
      offSwell = Math.max(offSwell, Math.abs(point.y - sampleOceanHeight(point.x, point.z, time)));
      checked++;
    }
  }
  expect(checked).toBeGreaterThan(1000);
  expect(furthest).toBeLessThan(1e-9);
  // Which the swell alone is not: a coarse grid leaves it by more than the
  // band's clearance over the water.
  if (tier === "low") expect(offSwell).toBeGreaterThan(0.04);
});
