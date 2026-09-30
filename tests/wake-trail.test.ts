import { expect, test } from "bun:test";
import { simplifyWakeTrail, type WakePoint } from "@/lib/wake-trail";

const straight = (): WakePoint[] => Array.from({ length: 32 }, (_, index) => ({
  x: index * 5, z: index * 2, birth: index * .09, speed: 60, thrust: 0, turn: 0, tail: 1,
}));
const simplify = (points: WakePoint[], expiredBefore?: number) => {
  const output: WakePoint[] = [];
  simplifyWakeTrail(points, output, expiredBefore);
  return output;
};

test("straight cruise reduces to its endpoints without changing linear age and forces", () => {
  const points = straight();
  points.forEach((point, index) => { point.speed += index * .01; point.tail = index / 31; });
  expect(simplify(points)).toEqual([points[0], points[31]]);
});

test("a bend, reversal, or force and birth discontinuity survives simplification", () => {
  for (const property of ["x", "birth", "speed", "thrust", "turn", "tail"] as const) {
    const points = straight();
    points[16][property] += 2;
    expect(simplify(points)).toContain(points[16]);
  }
  const reversed = straight();
  reversed[16].x = reversed[14].x;
  reversed[16].z = reversed[14].z;
  expect(simplify(reversed)).toContain(reversed[16]);
});

test("gentle curvature cannot accumulate into a shortcut", () => {
  const points = straight();
  points.forEach((point, index) => { point.z += Math.sin(index / 31 * Math.PI) * .2; });
  expect(simplify(points).length).toBeGreaterThan(2);
});

test("expiry retains the original adjacent samples at the live/spent boundary", () => {
  const points = straight();
  const output = simplify(points, points[16].birth);
  expect(output).toContain(points[16]);
  expect(output).toContain(points[17]);
});

test("empty, singleton and duplicate samples are safe and reuse the output", () => {
  const points = straight();
  const output = [points[0]];
  simplifyWakeTrail([], output);
  expect(output).toEqual([]);
  simplifyWakeTrail([points[0]], output);
  expect(output).toEqual([points[0]]);
  expect(simplify([points[0], points[0], points[1]])).toEqual([points[0], points[0], points[1]]);
});
