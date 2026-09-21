import sharp from "sharp";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { shipBudget, shipSource } from "@/content/ship-source";
import { inspectModel } from "@/lib/asset-audit";
import { gzipSync } from "node:zlib";

// Adapt the retained glTF, preserving the source's UV seams and deck details.
// No modelling primitives, browser globals, remote resources or runtime decoder.
const source = await Bun.file(shipSource.path).arrayBuffer();
const jsonLength = new DataView(source).getUint32(12, true);
const original = JSON.parse(new TextDecoder().decode(source.slice(20, 20 + jsonLength)));
const binary = source.slice(28 + jsonLength);
const primitive = original.meshes[0].primitives[0];
const read = (index: number) => {
  const accessor = original.accessors[index];
  const view = original.bufferViews[accessor.bufferView];
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const components = { SCALAR: 1, VEC2: 2, VEC3: 3 }[accessor.type as "SCALAR" | "VEC2" | "VEC3"];
  const Type = accessor.componentType === 5126 ? Float32Array : Uint16Array;
  return new Type(binary.slice(start, start + accessor.count * components * Type.BYTES_PER_ELEMENT));
};
const positions = new Float32Array(read(primitive.attributes.POSITION));
const normals = new Float32Array(read(primitive.attributes.NORMAL));
const uv = new Float32Array(read(primitive.attributes.TEXCOORD_0));
const indices = new Uint32Array(read(primitive.indices));
// The source bow faces +Z. Rotate 180 degrees and broaden the beam for the
// small expedition silhouette, lowering the superstructure at the waterline.
const scale = [2.65 / 9.364535808563232, 0.19, 6.4 / 37.70119857788086];
for (let vertex = 0; vertex < positions.length / 3; vertex++) {
  const i = vertex * 3;
  positions[i] = -(positions[i] + 0.0013558864593506) * scale[0];
  positions[i + 1] = positions[i + 1] * scale[1] - 0.22;
  positions[i + 2] *= -scale[2];
  const nx = -normals[i] / scale[0], ny = normals[i + 1] / scale[1], nz = -normals[i + 2] / scale[2];
  const length = Math.hypot(nx, ny, nz);
  normals.set([nx / length, ny / length, nz / length], i);
}
const imageView = original.bufferViews[original.images[0].bufferView];
const sourceTexture = Buffer.from(binary.slice(imageView.byteOffset, imageView.byteOffset + imageView.byteLength));
await MeshoptSimplifier.ready;
// Keep the exact extremities across tiers so substitutions never change the
// silhouette's footprint or its waterline registration.
const extrema = [0, 1, 2].map((axis) => {
  const values = positions.filter((_, index) => index % 3 === axis);
  return [Math.min(...values), Math.max(...values)];
});
const locked = new Uint8Array(positions.length / 3);
for (let vertex = 0; vertex < locked.length; vertex++) {
  if (extrema.some(([min, max], axis) => positions[vertex * 3 + axis] === min || positions[vertex * 3 + axis] === max)) locked[vertex] = 1;
}
const variants: Record<string, unknown> = {};
for (const tier of ["balanced", "low"] as const) {
  const budget = shipBudget[tier];
  // UV-aware simplification protects the windows, tenders, and observation deck.
  const selected = MeshoptSimplifier.simplifyWithAttributes(indices, positions, 3, uv, 2, [0.1, 0.1], locked, (tier === "low" ? 2800 : 4000) * 3, tier === "low" ? 0.02 : 0.004, ["Permissive"])[0];
  // Weld identical complete vertices, then discard every unreferenced vertex.
  const vertices = new Map<string, number>();
  const p: number[] = [], n: number[] = [], t: number[] = [], faces: number[] = [];
  for (const index of selected) {
    const values = [...positions.slice(index * 3, index * 3 + 3), ...normals.slice(index * 3, index * 3 + 3), ...uv.slice(index * 2, index * 2 + 2)];
    const key = values.map((value) => value.toFixed(6)).join(",");
    let vertex = vertices.get(key);
    if (vertex === undefined) {
      vertex = vertices.size;
      vertices.set(key, vertex);
      p.push(...values.slice(0, 3)); n.push(...values.slice(3, 6)); t.push(...values.slice(6));
    }
    faces.push(vertex);
  }
  const texture = await sharp(sourceTexture).resize(budget.textureSize, budget.textureSize).removeAlpha().jpeg({ quality: 85, chromaSubsampling: "4:4:4" }).toBuffer();
  const chunks: Buffer[] = [];
  const views: { buffer: number; byteOffset: number; byteLength: number; target?: number; byteStride?: number }[] = [];
  let offset = 0;
  const append = (data: Buffer, target?: number, byteStride?: number) => {
    const index = views.length;
    views.push({ buffer: 0, byteOffset: offset, byteLength: data.length, ...(target ? { target } : {}), ...(byteStride ? { byteStride } : {}) });
    chunks.push(data, Buffer.alloc((4 - data.length % 4) % 4));
    offset += data.length + (4 - data.length % 4) % 4;
    return index;
  };
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const quantizedPositions = new Int16Array(p.length / 3 * 4);
  const quantizedNormals = new Int8Array(n.length / 3 * 4);
  p.forEach((value, index) => {
    const quantized = Math.round(value * 8192);
    quantizedPositions[Math.floor(index / 3) * 4 + index % 3] = quantized;
    min[index % 3] = Math.min(min[index % 3], quantized); max[index % 3] = Math.max(max[index % 3], quantized);
    quantizedNormals[Math.floor(index / 3) * 4 + index % 3] = Math.round(n[index] * 127);
  });
  const accessors = [
    { bufferView: append(Buffer.from(quantizedPositions.buffer), 34962, 8), componentType: 5122, count: p.length / 3, type: "VEC3", min, max },
    { bufferView: append(Buffer.from(quantizedNormals.buffer), 34962, 4), componentType: 5120, normalized: true, count: n.length / 3, type: "VEC3" },
    { bufferView: append(Buffer.from(new Uint16Array(t.map((value) => Math.round(value * 65535))).buffer), 34962), componentType: 5123, normalized: true, count: t.length / 2, type: "VEC2" },
    { bufferView: append(Buffer.from(new Uint16Array(faces).buffer), 34963), componentType: 5123, count: faces.length, type: "SCALAR" },
  ];
  const imageIndex = append(texture);
  const gltf = {
    asset: { version: "2.0", generator: "Ocean Drive ship adaptation", copyright: `Cruise ship by ${shipSource.creator}, ${shipSource.license}; adapted as Del Mar. ${shipSource.url}` },
    extensionsUsed: ["KHR_mesh_quantization"], extensionsRequired: ["KHR_mesh_quantization"],
    scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ name: "Del Mar", mesh: 0, scale: [1 / 8192, 1 / 8192, 1 / 8192], extras: { forwardAxis: "-Z", origin: "waterline", source: shipSource.url, license: shipSource.licenseUrl } }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
    materials: [{ name: "Del Mar exterior", pbrMetallicRoughness: { baseColorTexture: { index: 0 }, roughnessFactor: 0.72, metallicFactor: 0 } }],
    textures: [{ source: 0, sampler: 0 }], samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
    images: [{ bufferView: imageIndex, mimeType: "image/jpeg" }],
    accessors, bufferViews: views, buffers: [{ byteLength: offset }],
  };
  const text = Buffer.from(JSON.stringify(gltf));
  const padded = Buffer.concat([text, Buffer.alloc((4 - text.length % 4) % 4, 32)]);
  const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + padded.length + offset, 8);
  header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  binHeader.writeUInt32LE(offset, 0); binHeader.writeUInt32LE(0x004e4942, 4);
  const glb = Buffer.concat([header, padded, binHeader, ...chunks]);
  const url = `/models/del-mar-${tier}.v1.glb`;
  const triangles = faces.length / 3;
  const transfer = gzipSync(glb).length;
  if (triangles > budget.triangles || glb.length > budget.bytes || transfer > budget.transfer) throw new Error(`${tier} exceeds budget: ${triangles} triangles, ${glb.length} bytes, ${transfer} gzip bytes`);
  inspectModel(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength));
  await Bun.write(`public${url}`, glb);
  variants[tier] = { url, triangles, bytes: glb.length, transfer, materials: 1, textures: 1, textureSize: budget.textureSize, draws: 1 };
  console.log(tier, variants[tier]);
}
await Bun.write("content/ship.json", JSON.stringify({ name: "Del Mar", variants }, null, 2) + "\n");
