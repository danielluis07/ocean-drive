// Full 3D reconstruction after Munique Bassoli and Alicedaraujo, CC BY-SA 4.0.
// Proportions interpreted from retained photographs; see the reconstruction record.
import { BufferAttribute, BufferGeometry } from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

type Point = [number, number, number];
type Tile = [number, number, number, number];
export const lighthouseTiles = {
  white: [800, 16, 200, 160], black: [800, 192, 200, 144],
  lantern: [800, 352, 200, 144], stone: [800, 528, 200, 192],
} satisfies Record<string, Tile>;

export function lighthouseGeometry() {
  const positions: number[] = [], uvs: number[] = [];
  const face = (points: Point[], tile: Tile) => {
    const [x, y, width, height] = tile;
    const uv = [[x / 1024, (y + height) / 1024], [(x + width) / 1024, (y + height) / 1024],
      [(x + width) / 1024, y / 1024], [x / 1024, y / 1024]];
    for (let i = 1; i < points.length - 1; i++) for (const index of [0, i, i + 1]) {
      positions.push(...points[index]); uvs.push(...uv[index]);
    }
  };
  const ring = (y: number, radius: number, side: number): Point => {
    const angle = side / 12 * Math.PI * 2;
    return [Math.sin(angle) * radius, y, Math.cos(angle) * radius];
  };
  const band = (from: number, to: number, r0: number, r1: number, tile: Tile) => {
    for (let side = 0; side < 12; side++) {
      const strip: Tile = [tile[0] + tile[2] * side / 12, tile[1], tile[2] / 12, tile[3]];
      face([ring(from, r0, side), ring(from, r0, side + 1), ring(to, r1, side + 1), ring(to, r1, side)], strip);
    }
  };
  const cap = (y: number, radius: number, tile: Tile, down = false) => {
    for (let side = 0; side < 12; side++) {
      const points: Point[] = [[0, y, 0], ring(y, radius, side), ring(y, radius, side + 1)];
      face(down ? points.reverse() : points, tile);
    }
  };
  const { white, black, lantern, stone } = lighthouseTiles;
  band(-.28, .06, .34, .34, stone); cap(-.28, .34, stone, true); cap(.06, .34, stone);
  for (let stripe = 0; stripe < 12; stripe++) {
    const from = .06 + stripe * .23, to = from + .23;
    band(from, to, .29 - stripe * .004, .286 - stripe * .004, stripe % 2 ? black : white);
  }
  // Two projecting walkways, their overhanging undersides, and round guardrails.
  for (const y of [1.73, 2.56]) {
    band(y - .10, y - .025, .26, .39, black);
    band(y - .025, y + .015, .39, .39, black);
    band(y + .015, y + .015, .39, .245, white);
    for (const rail of [y + .13, y + .24]) {
      band(rail, rail + .014, .38, .38, white);
      band(rail + .014, rail + .014, .38, .362, white);
      band(rail + .014, rail, .362, .362, white);
      band(rail, rail, .362, .38, white);
    }
    for (let side = 0; side < 12; side++) {
      const angle = side / 12 * Math.PI * 2;
      const centre = ring(0, .37, side), half = .009;
      const dx = Math.cos(angle) * half, dz = -Math.sin(angle) * half;
      const a: Point = [centre[0] - dx, y, centre[2] - dz];
      const b: Point = [centre[0] + dx, y, centre[2] + dz];
      const c: Point = [b[0], y + .25, b[2]], d: Point = [a[0], y + .25, a[2]];
      const outward = (point: Point): Point => [point[0] + Math.sin(angle) * .012, point[1], point[2] + Math.cos(angle) * .012];
      const ao = outward(a), bo = outward(b), co = outward(c), dout = outward(d);
      face([a, d, c, b], white); face([bo, co, dout, ao], white);
      face([a, ao, dout, d], white); face([bo, b, c, co], white);
      face([d, dout, co, c], white); face([a, b, bo, ao], white);
    }
  }
  // Lantern glazing remains opaque per the shared Feature contract. Texture
  // carries the window subdivisions; silhouette, housing and roof are geometry.
  band(2.82, 2.91, .25, .33, black); cap(2.91, .33, black);
  band(2.91, 3.32, .285, .285, lantern);
  band(3.32, 3.35, .32, .32, white); cap(3.35, .32, white);
  band(3.35, 3.44, .32, .28, black);
  band(3.44, 3.54, .28, .18, black);
  band(3.54, 3.58, .18, .04, black);
  cap(3.58, .04, black);
  band(3.58, 3.68, .045, .015, black); cap(3.68, .015, black);
  const raw = new BufferGeometry();
  raw.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  raw.setAttribute("uv", new BufferAttribute(new Uint16Array(uvs.map(value => Math.round(value * 65535))), 2, true));
  const geometry = mergeVertices(raw, 1e-5); raw.dispose();
  geometry.computeVertexNormals();
  return geometry;
}
