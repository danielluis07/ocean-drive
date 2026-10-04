// Project-authored Boipeba reconstructions from retained licensed references.
// Palm: CC BY-SA 3.0; church and combined atlas: CC BY-SA 4.0. See README.md.
import sharp from "sharp";
import { BufferAttribute, BufferGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { featureModelBuilders } from "@/scripts/landmark-feature-models";
import { villageFacade, villageGeometry } from "@/data/landmarks/features/boipeba/village";

type Point = [number, number, number];
type UV = [number, number];
const root = "data/landmarks/features/boipeba";

function palmGeometry() {
  const positions: number[] = [], uvs: number[] = [], colours: number[] = [];
  const triangle = (points: Point[], texture: UV[], light = 1, reverse = false) => {
    for (const index of reverse ? [2, 1, 0] : [0, 1, 2]) {
      positions.push(...points[index]); uvs.push(...texture[index]);
      colours.push(light, light, light);
    }
  };
  const trunk = (level: number, side: number): Point => {
    const t = level / 4, angle = side / 6 * Math.PI * 2;
    const radius = .085 - t * .041;
    return [t * t * .24 + Math.cos(angle) * radius, -.18 + t * 1.9, Math.sin(angle) * radius];
  };
  for (let level = 0; level < 4; level++) for (let side = 0; side < 6; side++) {
    const a = trunk(level, side), b = trunk(level + 1, side), c = trunk(level + 1, side + 1), d = trunk(level, side + 1);
    const u = .02 + side / 6 * .20, v = .02 + level / 4 * .43;
    triangle([a, b, c], [[u, v], [u, v + .1075], [u + .0333, v + .1075]], .8 + level * .04);
    triangle([a, c, d], [[u, v], [u + .0333, v + .1075], [u + .0333, v]], .8 + level * .04);
  }
  // Close the trunk; its footing extends below the sampled terrain.
  for (let side = 1; side < 5; side++) {
    triangle([trunk(0, 0), trunk(0, side), trunk(0, side + 1)], [[.1, .1], [.1, .2], [.2, .2]], .7);
    triangle([trunk(4, 0), trunk(4, side + 1), trunk(4, side)], [[.1, .1], [.1, .2], [.2, .2]]);
  }
  for (let frond = 0; frond < 8; frond++) {
    const angle = frond * Math.PI / 4 + Math.sin(frond * 2.4) * .17;
    const length = .87 + Math.sin(frond * 4.2) * .17;
    const along = (t: number, lateral = 0): Point => [
      .24 + Math.cos(angle) * t * length - Math.sin(angle) * lateral,
      1.72 + Math.sin(t * Math.PI) * .25 - t * t * (.37 + (frond % 3) * .08),
      Math.sin(angle) * t * length + Math.cos(angle) * lateral,
    ];
    // Curved, ridged rachis and individually silhouetted leaflets. Both faces
    // are modelled; there is no transparent billboard or photographic cutout.
    for (let segment = 0; segment < 3; segment++) {
      const t = segment / 3, next = (segment + 1) / 3;
      const points = [along(t, -.016), along(next), along(t, .016)];
      const texture: UV[] = [[.28, .02], [.72, .42], [.73, .02]];
      triangle(points, texture); triangle(points, texture, .68, true);
    }
    for (let segment = 0; segment < 4; segment++) for (const side of [-1, 1]) {
      const t = .15 + segment * .18;
      const width = Math.sin(t * Math.PI) * .28;
      const points = [along(t), along(t + .21, side * width), along(t + .12)];
      const texture: UV[] = [[.28, .04], [.71, .43], [.72, .04]];
      triangle(points, texture, .85 + (frond % 3) * .075);
      triangle(points, texture, .62, true);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(colours), 3));
  geometry.computeVertexNormals();
  return geometry;
}

export async function buildBoipebaFeatureLibrary() {
  const pixels = new Uint8Array(1024 * 1024 * 3).fill(255);
  // Leaf tile: authored rib and vein pattern, colours interpreted from the
  // reference. The retained white sample preserves vertex-painted models.
  for (let y = 0; y < 480; y++) for (let x = 256; x < 768; x++) {
    const t = (x - 256) / 512, vein = Math.sin((y + t * 220) * .35) * .06;
    const ridge = Math.exp(-Math.abs(t - .5) * 20);
    const light = .78 + ridge * .32 + vein;
    pixels.set([91, 121, 44].map(value => Math.round(value * light)), (y * 1024 + x) * 3);
  }
  // New church tiles occupy the previously unused lower atlas area. The palm
  // regions and Abrolhos's white UV sample remain at their original locations.
  for (let y = 528; y < 768; y++) for (let x = 408; x < 752; x++) {
    const grain = Math.sin(x * 1.71 + y * 2.13) * .025 + Math.sin(x * .08 + y * .12) * .02;
    const base = x < 648 ? [67, 173, 208] : [161, 151, 130];
    pixels.set(base.map(value => Math.round(value * (1 + grain))), (y * 1024 + x) * 3);
  }
  for (let y = 784; y < 992; y++) for (let x = 408; x < 744; x++) {
    const course = Math.floor((y - 784) / 14);
    const rib = Math.sin((x - 408 + (course % 2) * 7) / 14 * Math.PI * 2);
    const seam = (y - 784) % 14 < 2 ? .73 : 1;
    const light = seam * (.93 + rib * .14 + Math.sin(x * 2.31 + y * .63) * .04);
    pixels.set([150, 91, 55].map(value => Math.round(value * light)), (y * 1024 + x) * 3);
  }
  const bark = await sharp(`${root}/references/palms.jpg`).extract({ left: 480, top: 1845, width: 24, height: 35 })
    .resize(256, 480).modulate({ brightness: 1.25, saturation: .65 }).toBuffer();
  const atlas = await sharp(pixels, { raw: { width: 1024, height: 1024, channels: 3 } })
    .composite([{ input: bark, left: 0, top: 0 }, { input: villageFacade, left: 8, top: 512 }]).png().toBuffer();
  await Bun.write(`${root}/atlas.png`, atlas);
  const jpeg = await sharp(atlas).jpeg({ quality: 85, chromaSubsampling: "4:4:4" }).toBuffer();
  const group = new Group();
  const material = new MeshStandardMaterial({ name: "features", vertexColors: true, roughness: .9, metalness: 0 });
  const placeholder = featureModelBuilders.placeholder();
  const uv = new Float32Array(placeholder.getAttribute("position").count * 2).fill(.9);
  placeholder.setAttribute("uv", new BufferAttribute(uv, 2));
  placeholder.computeVertexNormals();
  for (const [name, geometry] of [["placeholder", placeholder], ["boipeba-coconut-palm", palmGeometry()], ["boipeba-divino-church", villageGeometry()]] as const) {
    const mesh = new Mesh(geometry, material); mesh.name = name; group.add(mesh);
  }
  // Geometry export uses the pipeline's FileReader shim. Embed the encoded atlas
  // directly, avoiding browser canvas, network access, and nondeterministic tools.
  const glb = await new GLTFExporter().parseAsync(group, { binary: true }) as ArrayBuffer;
  const header = new DataView(glb), jsonLength = header.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(glb, 20, jsonLength)));
  const original = new Uint8Array(glb, 28 + jsonLength);
  const imageOffset = original.length;
  json.images = [{ bufferView: json.bufferViews.length, mimeType: "image/jpeg", name: "Boipeba Feature atlas; Ocean Drive after Panta LH, Waltson Campos and INPE; CC BY-SA 4.0" }];
  json.bufferViews.push({ buffer: 0, byteOffset: imageOffset, byteLength: jpeg.length });
  json.textures = [{ source: 0 }];
  json.materials[0].pbrMetallicRoughness.baseColorTexture = { index: 0 };
  json.buffers[0].byteLength = imageOffset + jpeg.length;
  json.asset.copyright = "Palm: Ocean Drive after Panta LH, CC BY-SA 3.0. Church and combined atlas: Ocean Drive after Waltson Campos, INPE and Marcio Filho/MTur, CC BY-SA 4.0. Existing placeholder: project source. See data/landmarks/features/boipeba/README.md";
  const encoded = new TextEncoder().encode(JSON.stringify(json));
  const textLength = Math.ceil(encoded.length / 4) * 4, binLength = Math.ceil(json.buffers[0].byteLength / 4) * 4;
  const result = new ArrayBuffer(28 + textLength + binLength), view = new DataView(result);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, result.byteLength, true);
  view.setUint32(12, textLength, true); view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(result, 20, textLength).fill(32); new Uint8Array(result, 20, encoded.length).set(encoded);
  view.setUint32(20 + textLength, binLength, true); view.setUint32(24 + textLength, 0x004e4942, true);
  new Uint8Array(result, 28 + textLength, original.length).set(original);
  new Uint8Array(result, 28 + textLength + imageOffset, jpeg.length).set(jpeg);
  await Bun.write(`${root}/library.glb`, result);
  for (const child of group.children) (child as Mesh).geometry.dispose(); material.dispose();
}
