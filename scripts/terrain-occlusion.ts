import type { BufferGeometry } from "three";
import type { PlanarBounds } from "@/lib/landmark-geometry";

// Rasterise the SAME scalar accessibility used by fallback vertex colours.
// No palette transfer, second AO pass, runtime texture or shader multiplication.
export function rasterizeAccessibility(geometry: BufferGeometry, accessibility: Float32Array, bounds: PlanarBounds, size: number) {
  const field = new Float32Array(size * size).fill(1);
  const position = geometry.getAttribute("position"), indices = geometry.getIndex()!;
  const x = (vertex: number) => (position.getX(vertex) - bounds.minX) / (bounds.maxX - bounds.minX) * size - .5;
  const z = (vertex: number) => (position.getZ(vertex) - bounds.minZ) / (bounds.maxZ - bounds.minZ) * size - .5;
  for (let face = 0; face < indices.count; face += 3) {
    const a = indices.getX(face), b = indices.getX(face + 1), c = indices.getX(face + 2);
    const ax = x(a), az = z(a), bx = x(b), bz = z(b), cx = x(c), cz = z(c);
    const denominator = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (Math.abs(denominator) < 1e-10) continue;
    for (let row = Math.max(0, Math.ceil(Math.min(az, bz, cz))); row <= Math.min(size - 1, Math.floor(Math.max(az, bz, cz))); row++) {
      for (let column = Math.max(0, Math.ceil(Math.min(ax, bx, cx))); column <= Math.min(size - 1, Math.floor(Math.max(ax, bx, cx))); column++) {
        const wa = ((bz - cz) * (column - cx) + (cx - bx) * (row - cz)) / denominator;
        const wb = ((cz - az) * (column - cx) + (ax - cx) * (row - cz)) / denominator;
        const wc = 1 - wa - wb;
        if (Math.min(wa, wb, wc) >= -1e-6) field[row * size + column] = wa * accessibility[a] + wb * accessibility[b] + wc * accessibility[c];
      }
    }
  }
  return field;
}
