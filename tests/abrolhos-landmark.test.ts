import { expect, test } from "bun:test";
import sharp from "sharp";
import { featureFile, featureModels, landmarkSources } from "@/content/landmark-sources";
import { authoredRelief, terrainMasks, terrainPigment } from "@/scripts/terrain-treatment";
import { readFeatureSource } from "@/scripts/landmark-feature-source";
import { inspectModel } from "@/lib/asset-audit";
import { lighthouseGeometry, lighthouseTiles } from "@/data/landmarks/features/abrolhos/lighthouse";

const abrolhos = landmarkSources.find(source => source.id === "abrolhos")!;

test("lighthouse bands sample black and white paint in glTF's top-origin atlas space", async () => {
  const library = await readFeatureSource(featureFile.source, featureModels, featureFile.bytes, featureFile.textureSize);
  const geometry = library.models.find(model => model.id === "abrolhos-lighthouse")!.geometry;
  const position = geometry.getAttribute("position"), uv = geometry.getAttribute("uv");
  const atlas = await sharp("data/landmarks/features/abrolhos/atlas.png").removeAlpha().raw().toBuffer();
  for (const [from, to, black] of [[.06, .29, false], [.29, .52, true]] as const) {
    let samples = 0;
    for (let i = 0; i < position.count; i += 3) {
      const vertices = [i, i + 1, i + 2];
      if (!vertices.every(vertex => position.getY(vertex) >= from - 1e-5 && position.getY(vertex) <= to + 1e-5)) continue;
      if (Math.max(...vertices.map(vertex => position.getY(vertex))) - Math.min(...vertices.map(vertex => position.getY(vertex))) < .1) continue;
      const x = Math.floor(vertices.reduce((sum, vertex) => sum + uv.getX(vertex), 0) / 3 * 1024);
      const y = Math.floor(vertices.reduce((sum, vertex) => sum + uv.getY(vertex), 0) / 3 * 1024);
      const colour = Array.from(atlas.subarray((y * 1024 + x) * 3, (y * 1024 + x) * 3 + 3));
      expect(colour.every(value => black ? value < 70 : value > 150)).toBe(true);
      samples++;
    }
    expect(samples).toBeGreaterThan(12);
  }
  for (const model of library.models) model.geometry.dispose();
});

test("Abrolhos remains predominantly exposed rock with thin grass and little beach", () => {
  const interior = terrainMasks(15, .05, 2, abrolhos);
  expect(interior.rock).toBeGreaterThanOrEqual(.75);
  expect(interior.scrub).toBeLessThanOrEqual(.25);
  expect(interior.beach).toBe(0);
  const shore = terrainMasks(0, .05, 0, abrolhos);
  expect(shore.beach).toBeLessThanOrEqual(.16);
  expect(terrainMasks(15, .5, 2, abrolhos).rock).toBe(1);
  expect(abrolhos.scatter ?? []).toEqual([]);
  for (let i = 0; i < 40; i++) {
    const args = [i * .13, i * .37, 15, .6, .7, abrolhos] as const;
    expect(Math.abs(authoredRelief(...args))).toBeLessThanOrEqual(.045);
    expect(Math.abs(authoredRelief(i, i, 15, .6, 0, abrolhos))).toBe(0);
    const pigment = terrainPigment(i, i, 15, .05, 2, 39, abrolhos);
    expect(pigment.colour.every(value => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
    expect(pigment.bump).toBeLessThan(.02);
  }
});

test("lighthouse has an all-round body, roof, footing and valid shared-atlas UVs", () => {
  const geometry = lighthouseGeometry();
  geometry.computeBoundingBox();
  expect(geometry.boundingBox!.min.y).toBeCloseTo(-.28);
  expect(geometry.boundingBox!.max.y).toBeCloseTo(3.68);
  const normal = geometry.getAttribute("normal"), uv = geometry.getAttribute("uv");
  for (const axis of ["getX", "getY", "getZ"] as const) {
    const values = Array.from({ length: normal.count }, (_, i) => normal[axis](i));
    expect(Math.min(...values)).toBeLessThan(-.8);
    expect(Math.max(...values)).toBeGreaterThan(.8);
  }
  for (let i = 0; i < uv.count; i++) {
    expect(uv.getX(i)).toBeGreaterThanOrEqual(0); expect(uv.getX(i)).toBeLessThanOrEqual(1);
    expect(uv.getY(i)).toBeGreaterThanOrEqual(0); expect(uv.getY(i)).toBeLessThanOrEqual(1);
  }
  expect(geometry.index!.count / 3).toBeLessThanOrEqual(3000);
  geometry.dispose();
});

test("Abrolhos addition preserves Boipeba model attributes and occupied atlas pixels", async () => {
  const originalNames = Object.keys(inspectModel(await Bun.file("data/landmarks/features/boipeba/library.glb").arrayBuffer()).partTriangles);
  const before = await readFeatureSource({ ...featureFile.source, path: "data/landmarks/features/boipeba/library.glb" }, originalNames, featureFile.bytes, featureFile.textureSize);
  const after = await readFeatureSource(featureFile.source, featureModels, featureFile.bytes, featureFile.textureSize);
  for (const old of before.models) {
    if (old.id === "placeholder") continue;
    const retained = after.models.find(model => model.id === old.id)!.geometry;
    for (const name of ["position", "normal", "color", "uv"]) {
      expect(Array.from(retained.getAttribute(name).array)).toEqual(Array.from(old.geometry.getAttribute(name).array));
    }
  }
  const original = await sharp("data/landmarks/features/boipeba/atlas.png").removeAlpha().raw().toBuffer();
  const combined = await sharp("data/landmarks/features/abrolhos/atlas.png").removeAlpha().raw().toBuffer();
  let changedOccupiedPixels = 0;
  for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
    if (Object.values(lighthouseTiles).some(([left, top, width, height]) => x >= left && x < left + width && y >= top && y < top + height)) continue;
    for (let channel = 0; channel < 3; channel++) {
      const offset = (y * 1024 + x) * 3 + channel;
      if (original[offset] !== combined[offset]) changedOccupiedPixels++;
    }
  }
  expect(changedOccupiedPixels).toBe(0);
  const source = inspectModel(await Bun.file(featureFile.source.path).arrayBuffer());
  expect(source.materials).toBe(1); expect(source.textures).toBe(1); expect(source.opaque).toBe(true);
  expect(source.imageSizes).toEqual([{ width: 1024, height: 1024 }]);
  for (const model of [...before.models, ...after.models]) model.geometry.dispose();
});
