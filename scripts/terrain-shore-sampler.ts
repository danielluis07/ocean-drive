import { boundsOf, type PlanarPoint } from "@/lib/landmark-geometry";

type Segment = { a: PlanarPoint; b: PlanarPoint };
type Node = { minX: number; maxX: number; minZ: number; maxZ: number; segments?: Segment[]; left?: Node; right?: Node };

// Exact nearest-segment queries over the retained coastline. Native-resolution
// bakes must not scan thousands of coastline segments for every texel.
export function createShoreSampler(rings: PlanarPoint[][]) {
  const segments = rings.flatMap(ring => ring.map((a, index) => ({ a, b: ring[(index + 1) % ring.length] })));
  const partition = (segments: Segment[]): Node => {
    const bounds = boundsOf([segments.flatMap(({ a, b }) => [a, b])]);
    if (segments.length <= 12) return { ...bounds, segments };
    const axis = bounds.maxX - bounds.minX > bounds.maxZ - bounds.minZ ? "x" : "z";
    segments.sort((a, b) => a.a[axis] + a.b[axis] - b.a[axis] - b.b[axis]);
    const middle = Math.floor(segments.length / 2);
    return { ...bounds, left: partition(segments.slice(0, middle)), right: partition(segments.slice(middle)) };
  };
  const root = partition([...segments]);
  const distance = ({ x, z }: PlanarPoint) => {
    let best = Infinity;
    const boxDistance = (node: Node) => Math.max(node.minX - x, 0, x - node.maxX) ** 2 + Math.max(node.minZ - z, 0, z - node.maxZ) ** 2;
    const visit = (node: Node) => {
      if (boxDistance(node) >= best) return;
      if (node.segments) {
        for (const { a, b } of node.segments) {
          const dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
          const t = length ? Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / length)) : 0;
          best = Math.min(best, (x - a.x - dx * t) ** 2 + (z - a.z - dz * t) ** 2);
        }
      } else {
        const left = node.left!, right = node.right!;
        if (boxDistance(left) < boxDistance(right)) { visit(left); visit(right); }
        else { visit(right); visit(left); }
      }
    };
    visit(root);
    return Math.sqrt(best);
  };
  const crossings = (z: number) => segments.flatMap(({ a, b }) => (a.z > z) === (b.z > z)
    ? [] : [a.x + (z - a.z) / (b.z - a.z) * (b.x - a.x)]).sort((a, b) => a - b);
  return { distance, crossings };
}
