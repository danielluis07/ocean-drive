import { expect, test } from "bun:test";
import { landmarkBudget, landmarkSources } from "@/content/landmark-sources";
import { inspectModel } from "@/lib/asset-audit";
import { auditAssets } from "@/scripts/audit-assets";
import ship from "@/content/ship.json";
import { shipBudget } from "@/content/ship-source";

test("production vessel variants preserve the same footprint within the approved geometry and material budgets", async () => {
  const balanced = inspectModel(await Bun.file(`public${ship.variants.balanced.url}`).arrayBuffer());
  const low = inspectModel(await Bun.file(`public${ship.variants.low.url}`).arrayBuffer());
  expect(balanced.triangles).toBeLessThanOrEqual(12_000);
  expect(low.triangles).toBeLessThanOrEqual(4_000);
  for (const vessel of [balanced, low]) {
    expect(vessel.materials).toBeLessThanOrEqual(2);
    expect(vessel.opaque).toBe(true);
    expect(vessel.externalResources).toEqual([]);
    expect(vessel.textures).toBe(1);
    expect(vessel.parts).toContain("Del Mar");
    expect(vessel.placement).toMatchObject({ forwardAxis: "-Z", origin: "waterline" });
    expect(vessel.animations).toBe(0);
    expect(vessel.skins).toBe(0);
  }
  expect(balanced.max[2] - balanced.min[2]).toBeCloseTo(6.4, 2);
  expect(balanced.max[0] - balanced.min[0]).toBeCloseTo(2.65, 2);
  expect(balanced.min[1]).toBeLessThan(0);
  expect(balanced.max[1]).toBeGreaterThan(1);
  expect(low.triangles).toBeLessThan(balanced.triangles);
  for (const [tier, model] of [["balanced", balanced], ["low", low]] as const) {
    expect(model.imageSizes).toEqual([{ width: shipBudget[tier].textureSize, height: shipBudget[tier].textureSize }]);
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
