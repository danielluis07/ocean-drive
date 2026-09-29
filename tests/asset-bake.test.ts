import { expect, test } from "bun:test";
import { BufferAttribute, BufferGeometry } from "three";
import { bakeAccessibility, transferColours } from "@/scripts/asset-bake";

function surface(positions: number[], indices: number[]) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

test("an exposed plane remains unoccluded and a nearby ceiling darkens it deterministically", () => {
  const plane = surface([0, 0, 0, 0, 0, 1, 1, 0, 0], [0, 1, 2]);
  expect(Array.from(bakeAccessibility(plane, 1))).toEqual([1, 1, 1]);
  const covered = surface([0, 0, 0, 0, 0, 1, 1, 0, 0, -10, 0.1, -10, 10, 0.1, -10, 0, 0.1, 10], [0, 1, 2, 3, 4, 5]);
  const first = bakeAccessibility(covered, 1);
  expect(first[0]).toBeLessThan(0.7);
  expect(first[0]).toBeGreaterThanOrEqual(0.5);
  expect(bakeAccessibility(covered, 1)).toEqual(first);
});

test("surface projection interpolates Balanced colours and clamps a coastline miss", () => {
  const source = surface([0, 0, 0, 0, 0, 1, 1, 0, 0], [0, 1, 2]);
  const target = surface([0.25, 0.2, 0.25, -1, 0, 0], []);
  const colours = new Uint8Array([200, 0, 0, 255, 0, 200, 0, 255, 0, 0, 200, 255]);
  expect(Array.from(transferColours(source, colours, target))).toEqual([100, 50, 50, 255, 200, 0, 0, 255]);
});
