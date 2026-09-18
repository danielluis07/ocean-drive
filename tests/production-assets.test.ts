import { expect, test } from "bun:test";
import { inspectModel } from "@/lib/asset-audit";
import { auditAssets } from "@/scripts/audit-assets";

test("production vessel variants preserve the same footprint within the approved geometry and material budgets", async () => {
  const balanced = inspectModel(await Bun.file("public/models/research-vessel-balanced.v2.glb").arrayBuffer());
  const low = inspectModel(await Bun.file("public/models/research-vessel-low.v2.glb").arrayBuffer());
  expect(balanced.triangles).toBeLessThanOrEqual(12_000);
  expect(low.triangles).toBeLessThanOrEqual(4_000);
  for (const vessel of [balanced, low]) {
    expect(vessel.materials).toBeLessThanOrEqual(2);
    expect(vessel.opaque).toBe(true);
    expect(vessel.externalResources).toEqual([]);
    expect(vessel.textures).toBe(0);
    expect(vessel.animations).toBe(0);
    expect(vessel.skins).toBe(0);
  }
  for (let axis = 0; axis < 3; axis++) {
    expect(low.min[axis]).toBeCloseTo(balanced.min[axis], 2);
    expect(low.max[axis]).toBeCloseTo(balanced.max[axis], 2);
  }
});

test("every production asset has matching bytes, retained rights evidence and an approved source", async () => {
  expect(await auditAssets()).toEqual([]);
});
