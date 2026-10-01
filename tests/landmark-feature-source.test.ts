import { expect, test } from "bun:test";
import { BufferAttribute, BufferGeometry } from "three";
import { expandFeatures, encodePlacements } from "@/lib/landmark-features";
import { featureSourceRecord, readFeatureSource } from "@/scripts/landmark-feature-source";
import { inspectModel } from "@/lib/asset-audit";
import { featureFile } from "@/content/landmark-sources";
import sharp from "sharp";
import { mkdir, unlink, rmdir } from "node:fs/promises";

test("human Feature geometry retains indexed atlas UVs and authored normals in one draw", () => {
  const model = new BufferGeometry();
  model.setAttribute("position", new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 0, 1]), 3));
  model.setAttribute("normal", new BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
  model.setAttribute("uv", new BufferAttribute(new Float32Array([.1, .2, .3, .4, .5, .6]), 2));
  model.setIndex([0, 1, 2]);
  const output = expandFeatures([model], encodePlacements([{ model: 0, position: [2, 3, 4], heading: 90, scale: 2 }]));
  expect(output.getAttribute("uv").array).toEqual(model.getAttribute("uv").array);
  expect(output.getAttribute("normal").array).toEqual(model.getAttribute("normal").array);
  expect(Array.from(output.getAttribute("color").array)).toEqual(Array(12).fill(255));
  expect(output.getAttribute("position").count).toBe(3);
  expect(output.getIndex()).toBeNull();
  model.dispose(); output.dispose();
});

test("adding deterministic placement metadata preserves the artist's binary chunk", async () => {
  const source = await Bun.file(`public${featureFile.url}`).arrayBuffer();
  const extras = { models: ["placeholder"], placements: { abrolhos: [0, 0, 0, 0, 0, 100] } };
  const first = featureSourceRecord(source, extras);
  expect(first).toEqual(featureSourceRecord(source, extras));
  const binary = (buffer: ArrayBuffer) => new Uint8Array(buffer, 20 + new DataView(buffer).getUint32(12, true));
  expect(binary(first)).toEqual(binary(source));
  expect(inspectModel(first).triangles).toBe(inspectModel(source).triangles);
  // The outer root's placement record is the one the runtime finds first.
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(first, 20, new DataView(first).getUint32(12, true))));
  expect(json.nodes[json.scenes[json.scene ?? 0].nodes[0]].extras).toEqual(extras);
});

test("the offline importer accepts a textured human GLB without decoding its atlas", async () => {
  const atlas = await sharp({ create: { width: 1024, height: 1024, channels: 3, background: "#657747" } }).png().toBuffer();
  const attributes = new Float32Array([0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1]);
  const binaryLength = Math.ceil((attributes.byteLength + atlas.length) / 4) * 4;
  const json = new TextEncoder().encode(JSON.stringify({ asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ name: "tower", mesh: 0, translation: [2, 3, 4] }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, material: 0 }] }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 0, 1] },
      { bufferView: 1, componentType: 5126, count: 3, type: "VEC3" }, { bufferView: 2, componentType: 5126, count: 3, type: "VEC2" }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }, { buffer: 0, byteOffset: 36, byteLength: 36 },
      { buffer: 0, byteOffset: 72, byteLength: 24 }, { buffer: 0, byteOffset: 96, byteLength: atlas.length }],
    buffers: [{ byteLength: binaryLength }], images: [{ mimeType: "image/png", bufferView: 3 }], textures: [{ source: 0 }],
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: .9 } }],
  }));
  const jsonLength = Math.ceil(json.length / 4) * 4;
  const buffer = new ArrayBuffer(28 + jsonLength + binaryLength);
  const view = new DataView(buffer);
  for (const [offset, value] of [[0, 0x46546c67], [4, 2], [8, buffer.byteLength], [12, jsonLength], [16, 0x4e4f534a],
    [20 + jsonLength, binaryLength], [24 + jsonLength, 0x004e4942]]) view.setUint32(offset, value, true);
  new Uint8Array(buffer, 20, jsonLength).fill(32);
  new Uint8Array(buffer, 20, json.length).set(json);
  new Uint8Array(buffer, 28 + jsonLength, attributes.byteLength).set(new Uint8Array(attributes.buffer));
  new Uint8Array(buffer, 28 + jsonLength + 96, atlas.length).set(atlas);
  const directory = `data/landmarks/features/test-${crypto.randomUUID()}`;
  const path = `${directory}/source.glb`;
  await mkdir(directory, { recursive: true });
  try {
    await Bun.write(path, buffer);
    const source = { path, creator: "Test fixture", source: "Test-authored GLB", rights: "Project source", proof: "docs/third-party/project-assets.md", retrieved: "2026-10-01" };
    const imported = await readFeatureSource(source, ["tower"], featureFile.bytes, featureFile.textureSize);
    expect(imported.models[0].geometry.getAttribute("position").getX(0)).toBe(2);
    expect(imported.models[0].geometry.getAttribute("uv").count).toBe(3);
    const output = inspectModel(featureSourceRecord(imported.buffer, { models: ["tower"], placements: {} }));
    expect(output.textures).toBe(1);
    expect(output.imageSizes).toEqual([{ width: 1024, height: 1024 }]);
    expect(output.features?.models).toEqual(["tower"]);
    imported.models[0].geometry.dispose();
    await expect(readFeatureSource(source, ["missing"], featureFile.bytes, featureFile.textureSize)).rejects.toThrow("model names");
  } finally { await unlink(path); await rmdir(directory); }
});
