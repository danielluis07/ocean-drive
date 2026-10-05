// Append Ilha Grande to the retained Abrolhos/Boipeba library, offline.
import sharp from "sharp";
import type { BufferGeometry } from "three";
import {
  abraaoChurchGeometry,
  abraaoPierGeometry,
  papagaioGeometry,
  forestCanopyGeometry,
  ilhaGrandeTiles,
} from "@/data/landmarks/features/ilha-grande/geometry";

const root = "data/landmarks/features/ilha-grande";
const unpack = (buffer: ArrayBuffer) => {
  const length = new DataView(buffer).getUint32(12, true);
  return {
    json: JSON.parse(
      new TextDecoder().decode(new Uint8Array(buffer, 20, length)),
    ),
    binary: new Uint8Array(buffer, 28 + length),
  };
};

export async function buildIlhaGrandeFeatureLibrary() {
  const pixels = await sharp("data/landmarks/features/abrolhos/atlas.png")
    .removeAlpha()
    .raw()
    .toBuffer();
  for (const [name, [left, top, width, height]] of Object.entries(
    ilhaGrandeTiles,
  )) {
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const grain = Math.sin(x * 1.71 + y * 2.13) * 0.018;
        let base =
          name === "stucco"
            ? [233, 229, 216]
            : name === "stone"
              ? [135, 136, 127]
              : name === "dark"
                ? [35, 43, 39]
                : name === "wood"
                  ? [117, 91, 62]
                  : name === "roof"
                    ? [158, 91, 55]
                    : name === "canopy"
                      ? [64, 103, 51]
                      : [145, 143, 126];
        let light = 1 + grain;
        if (name === "roof")
          light *= (y % 5 < 1 ? 0.72 : 1) * (0.92 + Math.sin(x * 0.3) * 0.12);
        if (name === "wood")
          light *=
            (y % 4 < 1 ? 0.72 : 1) * (0.96 + Math.sin(x * 0.09 + y) * 0.05);
        if (name === "canopy") {
          const crown =
            Math.sin(x * 0.12 + Math.sin(y * 0.1)) *
            Math.sin(y * 0.15 + Math.cos(x * 0.1));
          light = 0.9 + crown * 0.19 + Math.sin(x * 0.8 + y * 0.47) * 0.04;
          base = [57, 99, 48];
        }
        pixels.set(
          base.map((value) => Math.round(value * light)),
          ((y + top) * 1024 + x + left) * 3,
        );
      }
  }
  // A surface-only granite crop; the mesh carries the peak's full silhouette.
  const granite = await sharp(`${root}/references/peak-profile.jpg`)
    .extract({ left: 1740, top: 1280, width: 380, height: 640 })
    .resize(200, 128)
    .modulate({ saturation: 0.35, brightness: 1.15 })
    .toBuffer();
  const atlas = await sharp(pixels, {
    raw: { width: 1024, height: 1024, channels: 3 },
  })
    .composite([
      {
        input: granite,
        left: ilhaGrandeTiles.granite[0],
        top: ilhaGrandeTiles.granite[1],
      },
    ])
    .png()
    .toBuffer();
  await Bun.write(`${root}/atlas.png`, atlas);
  // Preserve the lossless source pixels. Re-encode the single atlas with 4:2:0
  // chroma to leave room for full geometry within the unchanged 200 KiB cap.
  const jpeg = await sharp(atlas)
    .jpeg({ quality: 78, chromaSubsampling: "4:2:0" })
    .toBuffer();
  const original = unpack(
    await Bun.file(
      "data/landmarks/features/abrolhos/library.glb",
    ).arrayBuffer(),
  );
  const { json } = original;
  const imageView = json.bufferViews[json.images[0].bufferView];
  const retained = original.binary.slice(0, imageView.byteOffset);
  const chunks: Uint8Array[] = [retained];
  let cursor = retained.length;
  const append = (
    data: ArrayBufferView,
    target?: number,
    byteStride?: number,
  ) => {
    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const chunk = new Uint8Array(Math.ceil(bytes.length / 4) * 4);
    chunk.set(bytes);
    const index = json.bufferViews.length;
    json.bufferViews.push({
      buffer: 0,
      byteOffset: cursor,
      byteLength: bytes.length,
      ...(target ? { target } : {}),
      ...(byteStride ? { byteStride } : {}),
    });
    chunks.push(chunk);
    cursor += chunk.length;
    return index;
  };
  const add = (name: string, geometry: BufferGeometry) => {
    const position = geometry.getAttribute("position"),
      normal = geometry.getAttribute("normal"),
      uv = geometry.getAttribute("uv");
    const range = Math.max(...Array.from(position.array, Math.abs)),
      scale = range / 32767;
    const packedPosition = new Int16Array(position.count * 4),
      packedNormal = new Int8Array(position.count * 4);
    const packedUV = new Uint16Array(position.count * 2);
    const minimum = [Infinity, Infinity, Infinity],
      maximum = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < position.count; i++) {
      const values = [position.getX(i), position.getY(i), position.getZ(i)];
      const normals = [normal.getX(i), normal.getY(i), normal.getZ(i)];
      for (let axis = 0; axis < 3; axis++) {
        const value = Math.round(values[axis] / scale);
        packedPosition[i * 4 + axis] = value;
        minimum[axis] = Math.min(minimum[axis], value);
        maximum[axis] = Math.max(maximum[axis], value);
        packedNormal[i * 4 + axis] = Math.round(
          Math.max(-1, Math.min(1, normals[axis])) * 127,
        );
      }
      packedUV.set(
        [uv.getX(i), uv.getY(i)].map((value) => Math.round(value * 65535)),
        i * 2,
      );
    }
    const accessor = json.accessors.length;
    json.accessors.push(
      {
        bufferView: append(packedPosition, 34962, 8),
        componentType: 5122,
        count: position.count,
        type: "VEC3",
        min: minimum,
        max: maximum,
      },
      {
        bufferView: append(packedNormal, 34962, 4),
        componentType: 5120,
        normalized: true,
        count: position.count,
        type: "VEC3",
      },
      {
        bufferView: append(packedUV, 34962),
        componentType: 5123,
        normalized: true,
        count: position.count,
        type: "VEC2",
      },
      {
        bufferView: append(new Uint16Array(geometry.index!.array), 34963),
        componentType: 5123,
        count: geometry.index!.count,
        type: "SCALAR",
      },
    );
    const node = json.nodes.length,
      mesh = json.meshes.length;
    json.nodes.push({ name, mesh, scale: [scale, scale, scale] });
    json.scenes[json.scene ?? 0].nodes.push(node);
    json.meshes.push({
      name,
      primitives: [
        {
          attributes: {
            POSITION: accessor,
            NORMAL: accessor + 1,
            TEXCOORD_0: accessor + 2,
          },
          indices: accessor + 3,
          material: 0,
        },
      ],
    });
    geometry.dispose();
  };
  add("ilha-grande-sao-sebastiao", abraaoChurchGeometry());
  add("ilha-grande-abraao-pier", abraaoPierGeometry());
  add("ilha-grande-papagaio", papagaioGeometry());
  add("ilha-grande-forest-canopy", forestCanopyGeometry());
  imageView.byteOffset = cursor;
  imageView.byteLength = jpeg.length;
  chunks.push(jpeg);
  cursor += jpeg.length;
  json.buffers[0].byteLength = cursor;
  for (const key of ["extensionsUsed", "extensionsRequired"])
    json[key] = [...new Set([...(json[key] ?? []), "KHR_mesh_quantization"])];
  json.images[0].name =
    "Shared Feature atlas; Ocean Drive reconstructions; CC BY-SA 4.0";
  json.asset.copyright +=
    " Ilha Grande: Ocean Drive reconstructions after Fulviusbsas, LíviaBuhring, Vihgaby, José Carlos B Fialho, MBelu and Glauco Umbelino; CC BY-SA 4.0; data/landmarks/features/ilha-grande/README.md.";
  const encoded = new TextEncoder().encode(JSON.stringify(json)),
    textLength = Math.ceil(encoded.length / 4) * 4,
    binLength = Math.ceil(cursor / 4) * 4;
  const result = new ArrayBuffer(28 + textLength + binLength),
    header = new DataView(result);
  for (const [offset, value] of [
    [0, 0x46546c67],
    [4, 2],
    [8, result.byteLength],
    [12, textLength],
    [16, 0x4e4f534a],
    [20 + textLength, binLength],
    [24 + textLength, 0x004e4942],
  ])
    header.setUint32(offset, value, true);
  new Uint8Array(result, 20, textLength).fill(32);
  new Uint8Array(result, 20, encoded.length).set(encoded);
  let offset = 28 + textLength;
  for (const chunk of chunks) {
    new Uint8Array(result, offset, chunk.length).set(chunk);
    offset += chunk.length;
  }
  await Bun.write(`${root}/library.glb`, result);
}
