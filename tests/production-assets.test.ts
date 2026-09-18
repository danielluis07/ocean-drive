import { expect, test } from "bun:test";
import { landmarkBudget, landmarkSources } from "@/content/landmark-sources";
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

test("every island Landmark stays within its tier's triangle, transfer, draw and texture budgets", async () => {
  for (const source of landmarkSources) {
    for (const tier of ["balanced", "low"] as const) {
      const buffer = await Bun.file(`public/models/landmark-${source.id}-${tier}.v1.glb`).arrayBuffer();
      const landmark = inspectModel(buffer);
      expect(landmark.triangles).toBeLessThanOrEqual(landmarkBudget[tier].triangles);
      expect(buffer.byteLength).toBeLessThanOrEqual(landmarkBudget[tier].bytes);
      expect(landmark.draws).toBeLessThanOrEqual(landmarkBudget[tier].draws);
      expect(landmark.textures).toBe(0);
    }
  }
});

test("every production asset has matching bytes, retained rights evidence and an approved source", async () => {
  expect(await auditAssets()).toEqual([]);
});
