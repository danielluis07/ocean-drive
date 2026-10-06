import { expect, test } from "bun:test";
import { affectsGeneratedAssets } from "@/scripts/asset-change-check";

test("asset regeneration includes sources, outputs, helpers and toolchain changes", () => {
  for (const path of ["data/earth/surface.png", "public/images/earth-globe.v1.webp", "content/earth-approach.ts", "scripts/build-earth.ts", "scripts/fetch-earth-sources.ts"]) {
    expect(affectsGeneratedAssets(path), path).toBe(true);
  }
  for (const path of ["data/ship/cruise-ship.glb", "data/landmarks/abrolhos.json", "public/models/del-mar-low.v1.glb", "content/ship-art.ts", "content/landmarks.json", "scripts/asset-bake.ts", "scripts/ship-texture-bake.ts", "scripts/build-ship.ts", "scripts/generate-landmarks.ts", "scripts/landmark-feature-models.ts", "lib/landmark-surface.ts", "lib/landmark-geometry.ts", "lib/landmark-features.ts", "public/models/landmark-features.v1.glb", "bun.lock", "package.json", "tsconfig.json", ".github/workflows/development.yml"]) {
    expect(affectsGeneratedAssets(path), path).toBe(true);
  }
});

test("editorial, UI and documentation changes do not rebuild model assets", () => {
  for (const path of ["", "docs/ship.md", "content/editorial.ts", "app/page.tsx", "components/ocean/ship.tsx", "lib/landmark-material.ts", "tests/browser/smoke.e2e.ts"]) {
    expect(affectsGeneratedAssets(path), path).toBe(false);
  }
});
