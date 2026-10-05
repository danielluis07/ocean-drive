import { expect, test } from "bun:test";
import sharp from "sharp";
import {
  landmarkSources,
  featureFile,
  featureModels,
} from "@/content/landmark-sources";
import { terrainMasks, authoredRelief } from "@/scripts/terrain-treatment";
import { createBeachSampler } from "@/scripts/terrain-regions";
import { projectLandmark, distanceToRings, type Ring } from "@/lib/landmark-geometry";
import { inspectModel } from "@/lib/asset-audit";
import { readFeatureSource } from "@/scripts/landmark-feature-source";
import { ilhaGrandeTiles } from "@/data/landmarks/features/ilha-grande/geometry";
import { Mesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { decodePlacements } from "@/lib/landmark-features";

const source = landmarkSources.find((source) => source.id === "ilha-grande")!;
const record: { coastline: { islands: { ring: Ring }[] } } = await Bun.file(
  "data/landmarks/ilha-grande.json",
).json();
const projection = projectLandmark(
  record.coastline.islands.map((island) => island.ring),
  source.span,
);
const beachAt = createBeachSampler(source, projection.toWorld);

test("Ilha Grande keeps forest on ordinary coastal hills and reserves granite for steep ridges", () => {
  expect(terrainMasks(80, 0.35, 0.12, source).scrub).toBe(1);
  expect(terrainMasks(650, 0.35, 2, source).scrub).toBe(1);
  expect(terrainMasks(900, 0.86, 2, source).rock).toBe(1);
  expect(terrainMasks(2, 0.05, 0.1, source).beach).toBe(0);
  expect(terrainMasks(2, 0.05, 0.1, source, 0, 1).beach).toBeGreaterThan(0.9);
  for (let i = 0; i < 50; i++) {
    expect(
      Math.abs(authoredRelief(i * 0.13, i * 0.27, 850, 0.7, 2, source)),
    ).toBeLessThanOrEqual(0.08);
    expect(Math.abs(authoredRelief(i, i, 850, 0.7, 0, source))).toBe(0);
  }
});

test("Lopes Mendes mask follows retained mapped beach points and leaves inland forest unsanded", () => {
  const beach = source.beaches!.find(
    (beach) => beach.name === "Praia de Lopes Mendes",
  )!;
  for (const [lon, lat] of beach.path)
    expect(beachAt(projection.toWorld({ lon, lat }))).toBe(1);
  const pico = projection.toWorld({ lon: -44.1968058, lat: -23.1550619 });
  expect(beachAt(pico)).toBe(0);
  expect(terrainMasks(900, 0.2, 4, source, pico.x, beachAt(pico)).beach).toBe(
    0,
  );
});

test("Ilha Grande library preserves completed models and all previously occupied atlas pixels", async () => {
  const originalBuffer = await Bun.file(
    "data/landmarks/features/abrolhos/library.glb",
  ).arrayBuffer();
  const originalNames = Object.keys(inspectModel(originalBuffer).partTriangles);
  const before = await readFeatureSource(
    {
      ...featureFile.source,
      path: "data/landmarks/features/abrolhos/library.glb",
    },
    originalNames,
    featureFile.bytes,
    featureFile.textureSize,
  );
  const after = await readFeatureSource(
    featureFile.source,
    featureModels,
    featureFile.bytes,
    featureFile.textureSize,
  );
  for (const model of before.models) {
    const retained = after.models.find(
      (entry) => entry.id === model.id,
    )!.geometry;
    for (const name of ["position", "normal", "color", "uv"]) {
      const attribute = model.geometry.getAttribute(name);
      if (attribute)
        expect(Array.from(retained.getAttribute(name).array)).toEqual(
          Array.from(attribute.array),
        );
    }
  }
  const original = await sharp("data/landmarks/features/abrolhos/atlas.png")
    .removeAlpha()
    .raw()
    .toBuffer();
  const combined = await sharp("data/landmarks/features/ilha-grande/atlas.png")
    .removeAlpha()
    .raw()
    .toBuffer();
  let changed = 0;
  for (let y = 0; y < 1024; y++)
    for (let x = 0; x < 1024; x++) {
      if (
        Object.values(ilhaGrandeTiles).some(
          ([left, top, width, height]) =>
            x >= left && x < left + width && y >= top && y < top + height,
        )
      )
        continue;
      for (let channel = 0; channel < 3; channel++) {
        const offset = (y * 1024 + x) * 3 + channel;
        if (original[offset] !== combined[offset]) changed++;
      }
    }
  expect(changed).toBe(0);
  for (const model of [...before.models, ...after.models])
    model.geometry.dispose();
});

test("packed Ilha Grande reconstructions retain volumetric sides, footings, valid normals and atlas coordinates", async () => {
  const library = await readFeatureSource(featureFile.source, featureModels, featureFile.bytes, featureFile.textureSize);
  for (const { id, geometry } of library.models) {
    if (!id.startsWith("ilha-grande-")) { geometry.dispose(); continue; }
    const position = geometry.getAttribute("position"), normal = geometry.getAttribute("normal"), uv = geometry.getAttribute("uv");
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox!, size = bounds.getSize(new Vector3());
    expect(Math.min(size.x, size.y, size.z)).toBeGreaterThan(.5);
    expect(bounds.min.y).toBeLessThan(0);
    const directions = new Set<string>();
    const a = new Vector3(), b = new Vector3(), c = new Vector3(), facing = new Vector3();
    for (let index = 0; index < position.count; index += 3) {
      a.fromBufferAttribute(position, index); b.fromBufferAttribute(position, index + 1); c.fromBufferAttribute(position, index + 2);
      facing.crossVectors(b.sub(a), c.sub(a));
      expect(facing.length(), `${id}: no collapsed quantized face`).toBeGreaterThan(1e-8);
      facing.normalize();
      for (const axis of ["x", "y", "z"] as const) {
        if (Math.abs(facing[axis]) > .5) directions.add(`${axis}:${Math.sign(facing[axis])}`);
      }
    }
    expect(directions.size, `${id}: sides, top and underside`).toBe(6);
    for (let index = 0; index < position.count; index++) {
      expect(new Vector3().fromBufferAttribute(normal, index).length()).toBeCloseTo(1, 1);
      expect(uv.getX(index)).toBeGreaterThanOrEqual(0); expect(uv.getX(index)).toBeLessThanOrEqual(1);
      expect(uv.getY(index)).toBeGreaterThanOrEqual(0); expect(uv.getY(index)).toBeLessThanOrEqual(1);
    }
    geometry.dispose();
  }
});

test("the mapped pier deck clears the swell while its pilings reach below water", async () => {
  const file = inspectModel(await Bun.file(`public${featureFile.url}`).arrayBuffer());
  const placements = decodePlacements(file.features!.placements![source.id]);
  const pier = placements.find(entry => featureModels[entry.model] === "ilha-grande-abraao-pier")!;
  expect(pier.position[1]).toBeGreaterThanOrEqual(.44);
  const library = await readFeatureSource(featureFile.source, featureModels, featureFile.bytes, featureFile.textureSize);
  const model = library.models.find(entry => entry.id === "ilha-grande-abraao-pier")!.geometry;
  model.computeBoundingBox();
  expect(pier.position[1] + model.boundingBox!.min.y * pier.scale).toBeLessThan(-.395);
  for (const { geometry } of library.models) geometry.dispose();
});

test("Low supports the mapped Lopes Mendes strip above the swell without Feature geometry", async () => {
  const buffer = await Bun.file("public/models/landmark-ilha-grande-low.v1.glb").arrayBuffer();
  const asset = await new Promise<{ scene: import("three").Group }>((resolve, reject) => new GLTFLoader().parse(buffer, "", resolve, reject));
  let visibleSandVertices = 0;
  const lopes = source.beaches!.find(beach => beach.supportLow)!;
  const sandAt = createBeachSampler({ ...source, beaches: [lopes] }, projection.toWorld);
  asset.scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    if (object.name === "island") {
      const position = object.geometry.getAttribute("position");
      for (let index = 0; index < position.count; index++) {
        const point = { x: position.getX(index), z: position.getZ(index) };
        if (position.getY(index) > .395 && sandAt(point) > .4 && distanceToRings(point, projection.rings) < .6) visibleSandVertices++;
      }
    }
    object.geometry.dispose();
  });
  expect(visibleSandVertices).toBeGreaterThanOrEqual(4);
  expect(inspectModel(buffer).features).toBeUndefined();
});
