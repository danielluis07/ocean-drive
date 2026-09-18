type Accessor = { count: number; min?: number[]; max?: number[] };
type Gltf = {
  accessors: Accessor[];
  meshes: { primitives: { indices?: number; attributes: { POSITION: number }; mode?: number }[] }[];
  nodes?: { name?: string }[];
  materials?: { alphaMode?: string }[];
  buffers?: { uri?: string }[];
  images?: { uri?: string }[];
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
  for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
    if (primitive.mode !== undefined && primitive.mode !== 4) throw new Error("Model must use triangles");
    const positions = gltf.accessors[primitive.attributes.POSITION];
    triangles += gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3;
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], positions.min![axis]);
      max[axis] = Math.max(max[axis], positions.max![axis]);
    }
  }
  return {
    // glTF names the node, not the mesh, and that is the name Three gives the
    // loaded object, so the parts a scene looks up by name are checked here.
    triangles, min, max, parts: gltf.nodes?.flatMap((node) => node.name ? [node.name] : []) ?? [], materials: gltf.materials?.length ?? 0,
    opaque: gltf.materials?.every((material) => !material.alphaMode || material.alphaMode === "OPAQUE") ?? false,
    textures: gltf.textures?.length ?? 0, animations: gltf.animations?.length ?? 0, skins: gltf.skins?.length ?? 0,
    externalResources: [...gltf.buffers ?? [], ...gltf.images ?? []].flatMap((resource) => resource.uri ? [resource.uri] : []),
  };
}
