import { Box3, BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Sphere, Triangle, Vector3 } from "three";

// Spatial leaves retain the original triangles, but reject most of them before
// ray intersection. Shared attributes do not need to be copied for each leaf.
function occluders(geometry: BufferGeometry, material: MeshBasicMaterial) {
  const position = geometry.getAttribute("position");
  const indices = Array.from(geometry.getIndex()!.array);
  const leaves: Mesh<BufferGeometry, MeshBasicMaterial>[] = [];
  const point = new Vector3();
  function partition(faces: number[]) {
    const bounds = new Box3();
    for (const index of faces) bounds.expandByPoint(point.fromBufferAttribute(position, index));
    if (faces.length <= 128 * 3) {
      const leaf = new BufferGeometry();
      leaf.setAttribute("position", position);
      leaf.setIndex(faces);
      leaf.boundingBox = bounds;
      leaf.boundingSphere = bounds.getBoundingSphere(new Sphere());
      leaves.push(new Mesh(leaf, material));
      return;
    }
    const extent = bounds.getSize(new Vector3());
    const axis = extent.x >= extent.y && extent.x >= extent.z ? 0 : extent.y >= extent.z ? 1 : 2;
    const triangles = Array.from({ length: faces.length / 3 }, (_, i) => faces.slice(i * 3, i * 3 + 3));
    const centre = (face: number[]) => face.reduce((sum, index) => sum + position.getComponent(index, axis), 0);
    triangles.sort((a, b) => centre(a) - centre(b));
    const middle = Math.floor(triangles.length / 2);
    partition(triangles.slice(0, middle).flat());
    partition(triangles.slice(middle).flat());
  }
  partition(indices);
  return leaves;
}

// Offline only. Fixed cosine-weighted hemisphere samples make the bake repeatable.
export function bakeAccessibility(geometry: BufferGeometry, radius: number) {
  const material = new MeshBasicMaterial({ side: DoubleSide });
  const meshes = occluders(geometry, material);
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const ray = new Raycaster();
  ray.far = radius;
  const result = new Float32Array(position.count);
  const origin = new Vector3(), up = new Vector3(), tangent = new Vector3(), bitangent = new Vector3();
  const direction = new Vector3();
  const cache = new Map<string, number>();
  for (let vertex = 0; vertex < position.count; vertex++) {
    up.fromBufferAttribute(normal, vertex).normalize();
    tangent.set(Math.abs(up.y) < 0.9 ? 0 : 1, Math.abs(up.y) < 0.9 ? 1 : 0, 0).cross(up).normalize();
    bitangent.crossVectors(up, tangent);
    origin.fromBufferAttribute(position, vertex).addScaledVector(up, radius * 0.002);
    const key = [...origin.toArray(), ...up.toArray()].join(",");
    const cached = cache.get(key);
    if (cached !== undefined) { result[vertex] = cached; continue; }
    let blocked = 0;
    for (let sample = 0; sample < 24; sample++) {
      const r = Math.sqrt((sample + 0.5) / 24);
      const angle = sample * 2.399963229728653;
      direction.copy(up).multiplyScalar(Math.sqrt(1 - r * r))
        .addScaledVector(tangent, r * Math.cos(angle)).addScaledVector(bitangent, r * Math.sin(angle));
      ray.set(origin, direction);
      const hit = ray.intersectObjects(meshes, false)[0];
      if (hit) blocked += 1 - hit.distance / radius;
    }
    result[vertex] = 1 - 0.5 * blocked / 24;
    cache.set(key, result[vertex]);
  }
  for (const mesh of meshes) mesh.geometry.dispose();
  material.dispose();
  return result;
}

// Transfer the Balanced slope palette and AO together, without adding attributes.
// Different coastline tessellations can miss the source; nearest surface point
// then supplies a bounded fallback instead of projecting across another island.
export function transferColours(source: BufferGeometry, colours: Uint8Array, target: BufferGeometry) {
  const mesh = new Mesh(source, new MeshBasicMaterial({ side: DoubleSide }));
  const ray = new Raycaster();
  const positions = source.getAttribute("position");
  const indices = source.getIndex()!;
  const targets = target.getAttribute("position");
  source.computeBoundingBox();
  const top = source.boundingBox!.max.y + 1;
  const point = new Vector3(), closest = new Vector3(), best = new Vector3(), weights = new Vector3();
  const triangle = new Triangle();
  const result = new Uint8Array(targets.count * 4);
  for (let vertex = 0; vertex < targets.count; vertex++) {
    point.fromBufferAttribute(targets, vertex);
    ray.set(new Vector3(point.x, top, point.z), new Vector3(0, -1, 0));
    const hit = ray.intersectObject(mesh, false)[0];
    let face = hit?.faceIndex ?? -1;
    if (hit) best.copy(hit.point);
    else {
      let distance = Infinity;
      for (let index = 0; index < indices.count; index += 3) {
        triangle.setFromAttributeAndIndices(positions, indices.getX(index), indices.getX(index + 1), indices.getX(index + 2));
        triangle.closestPointToPoint(point, closest);
        const candidate = closest.distanceToSquared(point);
        if (candidate < distance) { distance = candidate; face = index / 3; best.copy(closest); }
      }
    }
    if (face < 0) throw new Error("Cannot transfer an empty bake");
    const a = indices.getX(face * 3), b = indices.getX(face * 3 + 1), c = indices.getX(face * 3 + 2);
    triangle.setFromAttributeAndIndices(positions, a, b, c);
    triangle.getBarycoord(best, weights);
    for (let channel = 0; channel < 3; channel++) result[vertex * 4 + channel] = Math.round(
      colours[a * 4 + channel] * weights.x + colours[b * 4 + channel] * weights.y + colours[c * 4 + channel] * weights.z,
    );
    result[vertex * 4 + 3] = 255;
  }
  mesh.material.dispose();
  return result;
}

export function sourceGeometry(positions: Float32Array, normals: Float32Array, indices: Uint32Array) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(normals, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  return geometry;
}
