// What stands on a Landmark besides its own surface: vegetation scattered by
// terrain rules and named Features at their real coordinates. The build decides
// where every instance goes and records it; the scene expands those records
// into one mesh per Landmark, so any number of models costs a single draw.
import { BufferAttribute, BufferGeometry, Matrix3, Matrix4, Quaternion, Vector3 } from "three";
import { boundsOf, insideRings, type PlanarPoint } from "@/lib/landmark-geometry";

export type TerrainRange = [lowest: number, highest: number];

export type TerrainRule = {
  // Metres of real elevation.
  elevation?: TerrainRange;
  // The sine of the ground's real angle: 0 flat, 0.5 at 30°, 1 vertical.
  slope?: TerrainRange;
  // World units inland from the shoreline.
  inland?: TerrainRange;
};

export type Terrain = { metres: number; slope: number; inland: number };

export type ScatterSite = PlanarPoint & {
  // Degrees clockwise from north the model's front faces.
  heading: number;
  // Multiples of the model's authored size.
  scale: number;
};

// The same deterministic hash the surface grain uses, so a record always
// scatters the same instances and CI can rebuild the Feature file byte for byte.
function hash(column: number, row: number, salt: number) {
  const value = Math.sin(column * 127.1 + row * 311.7 + salt * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

const within = (value: number, range: TerrainRange | undefined) =>
  !range || (value >= range[0] && value <= range[1]);

// Candidate sites lie on a jittered grid `spacing` world units apart, so
// instances neither line up nor crowd, and a site carries one wherever it is on
// land and its terrain satisfies the rule. `seed` separates rules that share a
// Landmark, so two kinds of vegetation do not land on the same sites.
export function scatterSites(
  rings: PlanarPoint[][],
  rule: TerrainRule & { spacing: number; scale: TerrainRange },
  terrainAt: (point: PlanarPoint) => Terrain,
  seed = 0,
): ScatterSite[] {
  const bounds = boundsOf(rings);
  const sites: ScatterSite[] = [];
  for (let row = 0; bounds.minZ + row * rule.spacing <= bounds.maxZ; row++) {
    for (let column = 0; bounds.minX + column * rule.spacing <= bounds.maxX; column++) {
      const point = {
        x: bounds.minX + (column + 0.1 + hash(column, row, seed) * 0.8) * rule.spacing,
        z: bounds.minZ + (row + 0.1 + hash(column, row, seed + 1) * 0.8) * rule.spacing,
      };
      if (!insideRings(point, rings)) continue;
      const terrain = terrainAt(point);
      if (!within(terrain.metres, rule.elevation) || !within(terrain.slope, rule.slope) || !within(terrain.inland, rule.inland)) continue;
      sites.push({
        ...point,
        heading: hash(column, row, seed + 2) * 360,
        scale: rule.scale[0] + (rule.scale[1] - rule.scale[0]) * hash(column, row, seed + 3),
      });
    }
  }
  return sites;
}

// One instance in the Feature file's record: the index of its model, then its
// position in hundredths of a world unit, its heading in whole degrees and its
// scale in percent. Whole numbers keep a Landmark's placements to a few bytes
// each, and a hundredth of a unit is far below a pixel from the route camera.
export const PLACEMENT_FIELDS = 6;

export type Placement = { model: number; position: [number, number, number]; heading: number; scale: number };

export function encodePlacements(placements: Placement[]) {
  return placements.flatMap(({ model, position, heading, scale }) => [
    model,
    ...position.map((value) => Math.round(value * 100)),
    ((Math.round(heading) % 360) + 360) % 360,
    Math.round(scale * 100),
  ]);
}

export function decodePlacements(record: readonly number[]): Placement[] {
  const placements: Placement[] = [];
  for (let offset = 0; offset + PLACEMENT_FIELDS <= record.length; offset += PLACEMENT_FIELDS) {
    placements.push({
      model: record[offset],
      position: [record[offset + 1] / 100, record[offset + 2] / 100, record[offset + 3] / 100],
      heading: record[offset + 4],
      scale: record[offset + 5] / 100,
    });
  }
  return placements;
}

// Every instance on one Landmark as a single draw, retaining authored atlas
// UVs and normals. Procedural models without normals receive flat shading.
export function expandFeatures(models: readonly BufferGeometry[], record: readonly number[]) {
  const placements = decodePlacements(record).filter((placement) => models[placement.model]);
  const vertices = placements.reduce((total, placement) => total + (models[placement.model].getIndex()?.count ?? models[placement.model].getAttribute("position").count), 0);
  const positions = new Float32Array(vertices * 3);
  const uvs = models.some((model) => model.getAttribute("uv")) ? new Float32Array(vertices * 2) : null;
  const normals = models.every((model) => model.getAttribute("normal")) ? new Float32Array(vertices * 3) : null;
  const colours = new Uint8Array(vertices * 4);
  const matrix = new Matrix4();
  const turn = new Quaternion();
  const normalMatrix = new Matrix3();
  const point = new Vector3();
  const up = new Vector3(0, 1, 0);
  let vertex = 0;
  for (const placement of placements) {
    const original = models[placement.model];
    const model = original.index ? original.toNonIndexed() : original;
    const position = model.getAttribute("position");
    const colour = model.getAttribute("color");
    // Heading runs clockwise from north, which is -Z: the Ship's convention.
    turn.setFromAxisAngle(up, (-placement.heading * Math.PI) / 180);
    matrix.compose(point.set(...placement.position), turn, new Vector3().setScalar(placement.scale));
    normalMatrix.getNormalMatrix(matrix);
    for (let index = 0; index < position.count; index++, vertex++) {
      point.fromBufferAttribute(position, index).applyMatrix4(matrix).toArray(positions, vertex * 3);
      if (normals) point.fromBufferAttribute(model.getAttribute("normal"), index).applyNormalMatrix(normalMatrix).toArray(normals, vertex * 3);
      if (uvs) {
        const uv = model.getAttribute("uv");
        uvs.set(uv ? [uv.getX(index), uv.getY(index)] : [0, 0], vertex * 2);
      }
      for (let channel = 0; channel < 4; channel++) {
        colours[vertex * 4 + channel] = colour && channel < colour.itemSize ? Math.round(colour.getComponent(index, channel) * 255) : 255;
      }
    }
    if (model !== original) model.dispose();
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colours, 4, true));
  if (uvs) geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  if (normals) geometry.setAttribute("normal", new BufferAttribute(normals, 3));
  else geometry.computeVertexNormals();
  return geometry;
}
