import { Matrix4, Quaternion, Vector3 } from "three";

type Accessor = { count: number; min?: number[]; max?: number[] };
type Gltf = {
  accessors: Accessor[];
  meshes: { primitives: { indices?: number; attributes: { POSITION: number }; mode?: number }[] }[];
  nodes?: { name?: string; mesh?: number; children?: number[]; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[]; extras?: { forwardAxis?: string; origin?: string } }[];
  scenes?: { nodes?: number[] }[];
  scene?: number;
  materials?: { alphaMode?: string }[];
  buffers?: { uri?: string }[];
  images?: { uri?: string; mimeType?: string; bufferView?: number }[];
  bufferViews?: { byteOffset?: number; byteLength: number }[];
  textures?: unknown[];
  animations?: unknown[];
  skins?: unknown[];
};

// Inspect the shipped GLB, not generator estimates or manifest declarations.
export function inspectModel(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2
    || view.getUint32(8, true) !== buffer.byteLength || view.getUint32(16, true) !== 0x4e4f534a) throw new Error("Invalid GLB");
  const gltf: Gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, view.getUint32(12, true))));
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let triangles = 0;
  // Three draws each primitive as its own mesh, so a primitive is one draw call.
  let draws = 0;
  const visit = (index: number, parent: Matrix4) => {
    const node = gltf.nodes![index];
    const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
      new Vector3().fromArray(node.translation ?? [0, 0, 0]),
      new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]),
      new Vector3().fromArray(node.scale ?? [1, 1, 1]),
    );
    const world = new Matrix4().multiplyMatrices(parent, local);
    if (node.mesh !== undefined) for (const primitive of gltf.meshes[node.mesh].primitives) {
      if (primitive.mode !== undefined && primitive.mode !== 4) throw new Error("Model must use triangles");
      draws++;
      const positions = gltf.accessors[primitive.attributes.POSITION];
      triangles += gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3;
      // Quantized positions carry their decode scale on the node. Bounds must
      // describe what Three renders, including every instance in the active scene.
      for (let corner = 0; corner < 8; corner++) {
        const point = new Vector3(...[0, 1, 2].map((axis) => (corner & (1 << axis)) ? positions.max![axis] : positions.min![axis])).applyMatrix4(world).toArray();
        for (let axis = 0; axis < 3; axis++) {
          min[axis] = Math.min(min[axis], point[axis]);
          max[axis] = Math.max(max[axis], point[axis]);
        }
      }
    }
    for (const child of node.children ?? []) visit(child, world);
  };
  for (const root of gltf.scenes?.[gltf.scene ?? 0]?.nodes ?? []) visit(root, new Matrix4());
  const binaryOffset = 28 + view.getUint32(12, true);
  const imageSizes = (gltf.images ?? []).map((image) => {
    if (image.bufferView === undefined) throw new Error("Model textures must be embedded");
    const imageView = gltf.bufferViews![image.bufferView];
    const offset = binaryOffset + (imageView.byteOffset ?? 0);
    const end = offset + imageView.byteLength;
    if (imageView.byteLength < 24 || end > buffer.byteLength) throw new Error("Invalid embedded image");
    if (image.mimeType === "image/png" && view.getUint32(offset) === 0x89504e47) {
      return { width: view.getUint32(offset + 16), height: view.getUint32(offset + 20) };
    }
    if (image.mimeType === "image/jpeg" && view.getUint16(offset) === 0xffd8) {
      // Read baseline/progressive JPEG's start-of-frame dimensions, not a
      // declaration in the asset ledger. Stop before entropy-coded scan data.
      for (let cursor = offset + 2; cursor + 8 < end;) {
        const marker = view.getUint16(cursor);
        const length = view.getUint16(cursor + 2);
        if (length < 2 || cursor + 2 + length > end || marker === 0xffda) break;
        if (marker === 0xffc0 || marker === 0xffc2) return { width: view.getUint16(cursor + 7), height: view.getUint16(cursor + 5) };
        cursor += 2 + length;
      }
    }
    throw new Error("Unsupported or invalid embedded texture");
  });
  return {
    // glTF names the node, not the mesh, and that is the name Three gives the
    // loaded object, so the parts a scene looks up by name are checked here.
    triangles, draws, min, max, parts: gltf.nodes?.flatMap((node) => node.name ? [node.name] : []) ?? [], materials: gltf.materials?.length ?? 0,
    opaque: gltf.materials?.every((material) => !material.alphaMode || material.alphaMode === "OPAQUE") ?? false,
    textures: gltf.textures?.length ?? 0, imageSizes, animations: gltf.animations?.length ?? 0, skins: gltf.skins?.length ?? 0,
    placement: gltf.nodes?.find((node) => node.extras?.forwardAxis)?.extras,
    externalResources: [...gltf.buffers ?? [], ...gltf.images ?? []].flatMap((resource) => resource.uri ? [resource.uri] : []),
  };
}
