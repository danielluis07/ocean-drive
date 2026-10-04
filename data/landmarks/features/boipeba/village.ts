// Project-authored reconstruction of Igreja do Divino Espírito Santo, the
// named landmark of Velha Boipeba. Reference coverage and estimates: README.md.
import { BufferAttribute, BufferGeometry, ShapeUtils, Vector2 } from "three";

type Point = [number, number, number];
type Tile = [number, number, number, number];
const plaster: Tile = [408, 528, 240, 240];
const roof: Tile = [408, 784, 336, 208];
const white: Tile = [896, 896, 32, 32];
const footing: Tile = [664, 528, 88, 240];

export function villageGeometry() {
  const positions: number[] = [], uvs: number[] = [], colours: number[] = [];
  const triangle = (points: Point[], texture: [number, number][], light = 1) => {
    for (let i = 0; i < 3; i++) {
      positions.push(...points[i]); uvs.push(texture[i][0] / 1024, texture[i][1] / 1024);
      colours.push(light, light, light);
    }
  };
  const quad = (points: Point[], tile: Tile, light = 1) => {
    const [x, y, w, h] = tile;
    const uv: [number, number][] = [[x, y + h], [x + w, y + h], [x + w, y], [x, y]];
    triangle([points[0], points[1], points[2]], [uv[0], uv[1], uv[2]], light);
    triangle([points[0], points[2], points[3]], [uv[0], uv[2], uv[3]], light);
  };
  const box = (min: Point, max: Point, tile: Tile) => {
    const [x, y, z] = min, [xx, yy, zz] = max;
    quad([[xx, y, z], [x, y, z], [x, yy, z], [xx, yy, z]], tile);
    quad([[x, y, zz], [xx, y, zz], [xx, yy, zz], [x, yy, zz]], tile, .94);
    quad([[x, y, z], [x, y, zz], [x, yy, zz], [x, yy, z]], tile, .9);
    quad([[xx, y, zz], [xx, y, z], [xx, yy, z], [xx, yy, zz]], tile, .94);
    quad([[x, yy, z], [x, yy, zz], [xx, yy, zz], [xx, yy, z]], tile);
    quad([[x, y, zz], [x, y, z], [xx, y, z], [xx, y, zz]], tile, .7);
  };
  const profile = (outline: [number, number][], z: number, depth: number, tile: Tile, faceTile = tile, backTile = tile) => {
    if (!ShapeUtils.isClockWise(outline.map(([x, y]) => new Vector2(x, y)))) outline = outline.toReversed();
    const faceUv = ([x, y]: [number, number]): [number, number] => [
      faceTile[0] + (x + .64) / 1.28 * faceTile[2],
      faceTile[1] + (1.62 - y) / 1.8 * faceTile[3],
    ];
    for (const indices of ShapeUtils.triangulateShape(outline.map(([x, y]) => new Vector2(x, y)), [])) {
      const [a, b, c] = indices.map(i => outline[i]);
      const front = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 0 ? indices.toReversed() : indices;
      triangle(front.map(i => [outline[i][0], outline[i][1], z]), front.map(i => faceUv(outline[i])));
      triangle(front.toReversed().map(i => [outline[i][0], outline[i][1], z + depth]), front.toReversed().map(i => [
        backTile[0] + (outline[i][0] + .64) / 1.28 * backTile[2],
        backTile[1] + (1.62 - outline[i][1]) / 1.8 * backTile[3],
      ]), .96);
    }
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i], b = outline[(i + 1) % outline.length];
      quad([[b[0], b[1], z], [a[0], a[1], z], [a[0], a[1], z + depth], [b[0], b[1], z + depth]], tile);
    }
  };
  const pitchedRoof = (x: number, xx: number, z: number, zz: number, eave: number, ridge: number) => {
    const mid = (x + xx) / 2;
    quad([[mid, ridge, z], [x, eave, z], [x, eave, zz], [mid, ridge, zz]], roof);
    quad([[xx, eave, z], [mid, ridge, z], [mid, ridge, zz], [xx, eave, zz]], roof);
    triangle([[xx, eave, z], [x, eave, z], [mid, ridge, z]], [[.9 * 1024, .9 * 1024], [.91 * 1024, .9 * 1024], [.9 * 1024, .91 * 1024]]);
    triangle([[x, eave, zz], [xx, eave, zz], [mid, ridge, zz]], [[.9 * 1024, .9 * 1024], [.91 * 1024, .9 * 1024], [.9 * 1024, .91 * 1024]]);
    quad([[x, eave, z], [xx, eave, z], [xx, eave, zz], [x, eave, zz]], roof, .65);
  };

  // Nave and rear sanctuary, with the two lower lateral volumes of the Latin
  // cross plan. Obscured rear openings are deliberately left undecorated.
  box([-.58, -.18, -1], [.58, 1.02, 1.12], white);
  pitchedRoof(-.62, .62, -.99, 1.16, 1.04, 1.36);
  for (const side of [-1, 1]) {
    const x = side < 0 ? -.96 : .58, xx = side < 0 ? -.58 : .96;
    box([x, -.18, .15], [xx, .72, .95], side < 0 ? white : plaster);
    pitchedRoof(x - .03, xx + .03, .12, .99, .75, .86);
  }
  // The curved pediment is solid geometry, with a real thickness and back.
  // Clockwise contour makes the outward front point towards local -Z.
  profile([
    [-.64, -.18], [-.64, 1.05], [-.60, 1.28], [-.49, 1.37],
    [-.32, 1.36], [-.15, 1.43], [-.07, 1.62], [.07, 1.62],
    [.15, 1.43], [.32, 1.36], [.49, 1.37], [.60, 1.28],
    [.64, 1.05], [.64, -.18],
  ], -1.06, .075, plaster, [8, 512, 384, 512], white);
  // Raised masonry footing covers the compressed terrain under the complete
  // building, rather than a photographic cutout ending at its front edge.
  box([-1, -.24, -1.11], [1, -.02, 1.19], footing);
  // Open left-hand espadaña: two piers, a lintel and the bell inside the gap.
  box([-.91, -.18, -1.04], [-.84, 1.16, -.91], white);
  box([-.71, -.18, -1.04], [-.64, 1.16, -.91], white);
  box([-.94, 1.16, -1.06], [-.61, 1.24, -.89], white);
  profile([[-.84, 1.16], [-.84, 1.07], [-.795, 1.16]], -1.04, .13, white);
  profile([[-.755, 1.16], [-.71, 1.07], [-.71, 1.16]], -1.04, .13, white);
  // A four-sided hanging bell with a closed mouth, visible from either side.
  for (let side = 0; side < 4; side++) {
    const a = side * Math.PI / 2, b = (side + 1) * Math.PI / 2;
    triangle([[-.775, 1.08, -.975], [-.775 + Math.cos(b) * .065, .93, -.975 + Math.sin(b) * .065], [-.775 + Math.cos(a) * .065, .93, -.975 + Math.sin(a) * .065]], [[680, 560], [720, 600], [748, 560]], .8);
    triangle([[-.775, .93, -.975], [-.775 + Math.cos(a) * .065, .93, -.975 + Math.sin(a) * .065], [-.775 + Math.cos(b) * .065, .93, -.975 + Math.sin(b) * .065]], [[680, 560], [720, 600], [748, 560]], .6);
  }
  box([-.014, 1.61, -1.04], [.014, 1.85, -1.012], white);
  box([-.086, 1.745, -1.04], [.086, 1.77, -1.012], white);

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(colours), 3));
  geometry.computeVertexNormals();
  return geometry;
}

// Authored plaster, shutters, stone portal, crest and white trim after the
// retained front photograph; no people, vegetation or photographic silhouette.
export const villageFacade = Buffer.from(`<svg width="384" height="512" viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg">
  <path fill="#43add0" d="M0 0H384V512H0Z"/>
  <g fill="none" stroke="#f1eee3" stroke-width="5">
    <path d="M0 167L12 100Q22 58 64 74Q113 84 142 55L170 0H214L242 55Q271 84 320 74Q362 58 372 100L384 167"/>
    <path d="M5 180V492M379 180V492" stroke-width="10"/>
  </g>
  <g fill="#d9ddd5" stroke="#f4f0df" stroke-width="5">
    <path d="M53 287V199L66 199L82 188L98 199H111V287Z"/>
    <path d="M164 287V199L177 199L193 188L209 199H222V287Z"/>
    <path d="M275 287V199L288 199L304 188L320 199H333V287Z"/>
  </g>
  <g stroke="#bec6c4" stroke-width="2"><path d="M80 204V284M191 204V284M302 204V284"/></g>
  <g stroke="#ecebdd" stroke-width="1.5" opacity=".7"><path d="M65 205V282M71 205V282M88 205V282M94 205V282M176 205V282M182 205V282M199 205V282M205 205V282M287 205V282M293 205V282M310 205V282M316 205V282"/></g>
  <path fill="#e4ddc8" d="M136 337H250V501H136Z"/>
  <path fill="#242b2b" d="M151 346H235V501H151Z"/>
  <path fill="#516264" d="M155 351H190V497H155ZM196 351H231V497H196Z"/>
  <path stroke="#d0c9b6" stroke-width="3" fill="none" d="M158 367H187V410H158ZM158 422H187V489H158ZM199 367H228V410H199ZM199 422H228V489H199Z"/>
  <path stroke="#eee8d4" stroke-width="5" fill="none" d="M140 331H246M157 329A36 35 0 0 1 229 329"/>
  <circle cx="192" cy="134" r="14" fill="#eee8d4"/><circle cx="192" cy="134" r="9" fill="#328eb3"/>
  <path fill="none" stroke="#eee8d4" stroke-width="3" d="M170 158L181 171L192 174L203 171L214 158M184 309L192 315L200 309"/>
  <path fill="#ded8c4" d="M0 492H384V512H0Z"/>
</svg>`);
