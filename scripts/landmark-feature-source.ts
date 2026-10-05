import { BufferGeometry, Mesh, type Group } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { inspectModel } from "@/lib/asset-audit";
import { transformFeatureGeometry } from "@/lib/landmark-feature-geometry";

export type FeatureSource = { path: string; creator: string; source: string; rights: string; proof: string; retrieved: string; sourceKind?: "project-source" | "licensed-model" };

// Rewrite only the JSON chunk. Keep the artist's embedded atlas and binary
// attributes intact, while adding the pipeline's deterministic placement record.
export function featureSourceRecord(buffer: ArrayBuffer, extras: Record<string, unknown>, geometryOnly = false) {
  const view = new DataView(buffer);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)));
  if (geometryOnly) {
    delete json.images;
    delete json.textures;
    json.materials = [{ pbrMetallicRoughness: { metallicFactor: 0, roughnessFactor: .9 } }];
    for (const mesh of json.meshes) for (const primitive of mesh.primitives) primitive.material = 0;
  } else {
    for (const node of json.nodes) if (node.extras?.placements) {
      delete node.extras.placements;
      delete node.extras.models;
    }
    const root = json.nodes.length;
    const active = json.scenes[json.scene ?? 0];
    json.nodes.push({ name: "Travessia Landmark Features", children: active.nodes, extras });
    active.nodes = [root];
  }
  const text = new TextEncoder().encode(JSON.stringify(json));
  const padded = Math.ceil(text.length / 4) * 4;
  const binary = new Uint8Array(buffer, 20 + jsonLength);
  const result = new ArrayBuffer(20 + padded + binary.length);
  const target = new DataView(result);
  target.setUint32(0, 0x46546c67, true);
  target.setUint32(4, 2, true);
  target.setUint32(8, result.byteLength, true);
  target.setUint32(12, padded, true);
  target.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(result, 20, padded).fill(32);
  new Uint8Array(result, 20, text.length).set(text);
  new Uint8Array(result, 20 + padded).set(binary);
  return result;
}

export async function readFeatureSource(source: FeatureSource, names: readonly string[], bytes: number, textureSize: number) {
  for (const field of ["creator", "source", "rights", "proof", "retrieved"] as const) {
    if (!source[field]) throw new Error(`Feature source missing ${field}`);
  }
  if (!source.path.startsWith("data/landmarks/features/") || !await Bun.file(source.proof).exists())
    throw new Error("Feature source and retained rights evidence must be recorded");
  const buffer = await Bun.file(source.path).arrayBuffer();
  const model = inspectModel(buffer);
  if (buffer.byteLength > bytes || !model.opaque || model.externalResources.length || model.animations || model.skins || model.materials !== 1 || model.textures > 1 || model.imageSizes.length > 1
    || model.imageSizes.some((image) => image.width !== textureSize || image.height !== textureSize))
    throw new Error("Feature source must use one opaque material and at most one embedded 1024 px atlas within 200 KiB");
  const asset = await new Promise<{ scene: Group }>((resolve, reject) =>
    new GLTFLoader().parse(featureSourceRecord(buffer, {}, true), "", resolve, reject));
  asset.scene.updateMatrixWorld(true);
  const geometries = new Map<string, BufferGeometry>();
  asset.scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    if (geometries.has(object.name)) throw new Error(`Duplicate Feature model: ${object.name}`);
    const transformed = transformFeatureGeometry(object.geometry, object.matrixWorld);
    const geometry = transformed.index ? transformed.toNonIndexed() : transformed;
    if (geometry !== transformed) transformed.dispose();
    if (model.textures && !geometry.getAttribute("uv")) throw new Error(`Feature model missing atlas UVs: ${object.name}`);
    geometries.set(object.name, geometry);
  });
  if (geometries.size !== names.length || names.some((name) => !geometries.has(name))) throw new Error("Feature source model names must match featureModels");
  return { buffer, models: names.map((id) => ({ id, geometry: geometries.get(id)! })) };
}
