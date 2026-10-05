// Append a reconstruction without changing the retained Boipeba attributes/UVs.
import sharp from "sharp";
import { Mesh, MeshStandardMaterial } from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { lighthouseGeometry, lighthouseTiles } from "@/data/landmarks/features/abrolhos/lighthouse";

const root = "data/landmarks/features/abrolhos";
const unpack = (buffer: ArrayBuffer) => {
  const header = new DataView(buffer), length = header.getUint32(12, true);
  return { json: JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, length))),
    binary: new Uint8Array(buffer, 28 + length) };
};

export async function buildAbrolhosFeatureLibrary() {
  const atlas = await sharp("data/landmarks/features/boipeba/atlas.png").removeAlpha().raw().toBuffer();
  for (const [name, tile] of Object.entries(lighthouseTiles)) {
    const [left, top, width, height] = tile;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const grain = Math.sin(x * 1.63 + y * 2.17) * .018 + Math.sin(x * .13 + y * .09) * .018;
      let base = name === "black" ? [29, 36, 41] : name === "stone" ? [123, 119, 107] : [229, 227, 211];
      if (name === "lantern") {
        const frame = x % 50 < 5 || y % 48 < 5;
        base = frame ? [221, 226, 219] : [101, 128, 138];
      }
      const seam = name === "stone" && y % 32 < 2 ? .7 : 1;
      atlas.set(base.map(value => Math.round(value * (1 + grain) * seam)), ((y + top) * 1024 + x + left) * 3);
    }
  }
  const png = await sharp(atlas, { raw: { width: 1024, height: 1024, channels: 3 } }).png().toBuffer();
  await Bun.write(`${root}/atlas.png`, png);
  const jpeg = await sharp(png).jpeg({ quality: 85, chromaSubsampling: "4:4:4" }).toBuffer();
  const geometry = lighthouseGeometry(), material = new MeshStandardMaterial({ vertexColors: true, roughness: .9 });
  const mesh = new Mesh(geometry, material); mesh.name = "abrolhos-lighthouse";
  const added = unpack(await new GLTFExporter().parseAsync(mesh, { binary: true }) as ArrayBuffer);
  // Pack only the new model's normals. glTF's quantization extension decodes
  // signed normalized bytes; positions remain full precision in world units.
  const normalAccessor = added.json.accessors[added.json.meshes[0].primitives[0].attributes.NORMAL];
  const normalView = added.json.bufferViews[normalAccessor.bufferView];
  if (normalAccessor.componentType !== 5126 || normalAccessor.byteOffset || (normalView.byteStride && normalView.byteStride !== 12))
    throw new Error("Expected standalone Float32 lighthouse normals");
  const normalValues = new Float32Array(added.binary.buffer, added.binary.byteOffset + normalView.byteOffset, normalAccessor.count * 3);
  const packedNormals = new Int8Array(Array.from(normalValues, value => Math.round(Math.max(-1, Math.min(1, value)) * 127)));
  const alignedNormals = new Int8Array(normalAccessor.count * 4);
  for (let i = 0; i < normalAccessor.count; i++) alignedNormals.set(packedNormals.subarray(i * 3, i * 3 + 3), i * 4);
  normalView.byteStride = 4;
  normalAccessor.componentType = 5120; normalAccessor.normalized = true;
  normalAccessor.min = [0, 1, 2].map(channel => Math.min(...Array.from(packedNormals).filter((_, i) => i % 3 === channel)));
  normalAccessor.max = [0, 1, 2].map(channel => Math.max(...Array.from(packedNormals).filter((_, i) => i % 3 === channel)));
  const chunks: Uint8Array[] = [];
  let packedLength = 0;
  for (const [index, view] of added.json.bufferViews.entries()) {
    const data = index === normalAccessor.bufferView ? new Uint8Array(alignedNormals.buffer)
      : added.binary.slice(view.byteOffset, view.byteOffset + view.byteLength);
    const chunk = new Uint8Array(Math.ceil(data.length / 4) * 4); chunk.set(data);
    view.byteOffset = packedLength; view.byteLength = data.length;
    chunks.push(chunk); packedLength += chunk.length;
  }
  added.binary = new Uint8Array(packedLength);
  let cursor = 0;
  for (const chunk of chunks) { added.binary.set(chunk, cursor); cursor += chunk.length; }
  added.json.extensionsUsed = ["KHR_mesh_quantization"];
  added.json.extensionsRequired = ["KHR_mesh_quantization"];
  const original = unpack(await Bun.file("data/landmarks/features/boipeba/library.glb").arrayBuffer());
  const { json } = original;
  const placeholderNode = json.nodes.find((node: { name?: string }) => node.name === "placeholder");
  if (!placeholderNode) throw new Error("Expected the retained library's placeholder slot");
  const placeholderMesh = json.meshes[placeholderNode.mesh];
  const removedAccessors = [...new Set<number>(placeholderMesh.primitives.flatMap((primitive: { attributes: Record<string, number>; indices?: number }) =>
    [...Object.values(primitive.attributes), ...(primitive.indices === undefined ? [] : [primitive.indices])]))].sort((a, b) => a - b);
  const removedViews = [...new Set<number>(removedAccessors.map(index => json.accessors[index].bufferView))].sort((a, b) => a - b);
  if (removedAccessors.some((index, i) => index !== i) || removedViews.some((index, i) => index !== i))
    throw new Error("Retained placeholder attributes must occupy the library prefix");
  const prefix = Math.ceil(Math.max(...removedViews.map(index => json.bufferViews[index].byteOffset + json.bufferViews[index].byteLength)) / 4) * 4;
  const originalImageOffset = json.bufferViews[json.images[0].bufferView].byteOffset;
  json.accessors.splice(0, removedAccessors.length);
  json.bufferViews.splice(0, removedViews.length);
  for (const accessor of json.accessors) accessor.bufferView -= removedViews.length;
  for (const view of json.bufferViews) view.byteOffset -= prefix;
  json.images[0].bufferView -= removedViews.length;
  for (const [index, oldMesh] of json.meshes.entries()) if (index !== placeholderNode.mesh) {
    for (const primitive of oldMesh.primitives) {
      if (primitive.indices !== undefined) primitive.indices -= removedAccessors.length;
      for (const attribute of Object.keys(primitive.attributes)) primitive.attributes[attribute] -= removedAccessors.length;
    }
  }
  // The retained exporter appends its JPEG after all geometry attributes.
  // Replace that image instead of retaining two copies of the atlas payload.
  const binary = original.binary.slice(prefix, originalImageOffset);
  const viewOffset = json.bufferViews.length, accessorOffset = json.accessors.length;
  const geometryOffset = binary.length;
  json.bufferViews.push(...added.json.bufferViews.map((view: { byteOffset?: number }) => ({ ...view, byteOffset: geometryOffset + (view.byteOffset ?? 0) })));
  json.accessors.push(...added.json.accessors.map((accessor: { bufferView: number }) => ({ ...accessor, bufferView: accessor.bufferView + viewOffset })));
  const lighthouse = added.json.meshes[0];
  for (const primitive of lighthouse.primitives) {
    primitive.material = 0;
    if (primitive.indices !== undefined) primitive.indices += accessorOffset;
    for (const attribute of Object.keys(primitive.attributes)) primitive.attributes[attribute] += accessorOffset;
  }
  placeholderNode.name = "abrolhos-lighthouse";
  json.meshes[placeholderNode.mesh] = lighthouse;
  for (const key of ["extensionsUsed", "extensionsRequired"]) {
    json[key] = [...new Set([...(json[key] ?? []), ...(added.json[key] ?? [])])];
  }
  // Reuse model slot zero. Boipeba's model slots and attribute values stay intact.
  const imageOffset = geometryOffset + added.binary.length;
  const imageView = json.bufferViews[json.images[0].bufferView];
  imageView.byteOffset = imageOffset; imageView.byteLength = jpeg.length;
  json.images[0].name = "Shared Feature atlas; Ocean Drive reconstructions; CC BY-SA 4.0";
  json.buffers[0].byteLength = imageOffset + jpeg.length;
  json.asset.copyright = json.asset.copyright.replace("Existing placeholder: project source.", "")
    + " Abrolhos lighthouse: Ocean Drive after Munique Bassoli, Alicedaraujo and Gabi Carrera / Marinha do Brasil, CC BY-SA 4.0; data/landmarks/features/abrolhos/README.md.";
  const encoded = new TextEncoder().encode(JSON.stringify(json));
  const textLength = Math.ceil(encoded.length / 4) * 4, binLength = Math.ceil(json.buffers[0].byteLength / 4) * 4;
  const result = new ArrayBuffer(28 + textLength + binLength), header = new DataView(result);
  header.setUint32(0, 0x46546c67, true); header.setUint32(4, 2, true); header.setUint32(8, result.byteLength, true);
  header.setUint32(12, textLength, true); header.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(result, 20, textLength).fill(32); new Uint8Array(result, 20, encoded.length).set(encoded);
  header.setUint32(20 + textLength, binLength, true); header.setUint32(24 + textLength, 0x004e4942, true);
  new Uint8Array(result, 28 + textLength, binary.length).set(binary);
  new Uint8Array(result, 28 + textLength + geometryOffset, added.binary.length).set(added.binary);
  new Uint8Array(result, 28 + textLength + imageOffset, jpeg.length).set(jpeg);
  await Bun.write(`${root}/library.glb`, result);
  geometry.dispose(); material.dispose();
}
