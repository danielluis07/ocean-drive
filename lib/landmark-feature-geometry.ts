import { BufferAttribute, type BufferGeometry, type Matrix4 } from "three";

// CPU transforms must write floating-point coordinates. Applying a glTF node
// decode scale in an integer attribute silently truncates the decoded model.
export function transformFeatureGeometry(source: BufferGeometry, matrix: Matrix4) {
  const geometry = source.clone();
  const position = geometry.getAttribute("position");
  if (!(position.array instanceof Float32Array)) {
    const decoded = new Float32Array(position.count * 3);
    for (let index = 0; index < position.count; index++) {
      decoded.set([position.getX(index), position.getY(index), position.getZ(index)], index * 3);
    }
    geometry.setAttribute("position", new BufferAttribute(decoded, 3));
  }
  return geometry.applyMatrix4(matrix);
}
