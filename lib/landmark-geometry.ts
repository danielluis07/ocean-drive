// Pure geometry for the Landmark pipeline: coastline rings recorded in degrees
// become simplified, north-up outlines in Voyage Waters units, and those
// outlines become a triangulated island surface. Nothing here reads a file or
// touches Three, so `bun test` can check the conversions on their own.

export type Ring = [number, number][];
export type PlanarPoint = { x: number; z: number };

// Signed shoelace area. OSM draws coastline with the land on its left, so an
// island ring is positive and an inner water body is negative.
export function ringArea(ring: Ring) {
  let area = 0;
  for (let index = 0; index < ring.length; index++) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[(index + 1) % ring.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

const METRES_PER_DEGREE = 111_320;

// Degrees to metres east and south of the rings' own centre, so the Landmark
// keeps true north up and only its scale is compressed. An equirectangular
// projection is exact enough across an island a few kilometres wide.
export function projectToMetres(rings: Ring[]) {
  const all = rings.flat();
  const lat = all.reduce((sum, [, value]) => sum + value, 0) / all.length;
  const lon = all.reduce((sum, [value]) => sum + value, 0) / all.length;
  const perLon = METRES_PER_DEGREE * Math.cos((lat * Math.PI) / 180);
  return {
    origin: { lon, lat },
    perLon,
    rings: rings.map((ring) =>
      ring.map(([east, north]) => ({ x: (east - lon) * perLon, z: -(north - lat) * METRES_PER_DEGREE })),
    ),
  };
}

export type PlanarBounds = { minX: number; maxX: number; minZ: number; maxZ: number };

export function boundsOf(rings: PlanarPoint[][]): PlanarBounds {
  const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const ring of rings) {
    for (const point of ring) {
      bounds.minX = Math.min(bounds.minX, point.x);
      bounds.maxX = Math.max(bounds.maxX, point.x);
      bounds.minZ = Math.min(bounds.minZ, point.z);
      bounds.maxZ = Math.max(bounds.maxZ, point.z);
    }
  }
  return bounds;
}

// Scale the outlines so the longest axis spans `span` world units and centre
// them on the Landmark's own origin. The same factor applies to both axes, so
// the shape stays true; only the size is compressed.
export function fitToSpan(rings: PlanarPoint[][], span: number) {
  const bounds = boundsOf(rings);
  const scale = span / Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
  const centreX = (bounds.minX + bounds.maxX) / 2;
  const centreZ = (bounds.minZ + bounds.maxZ) / 2;
  return {
    scale,
    centre: { x: centreX, z: centreZ },
    rings: rings.map((ring) =>
      ring.map((point) => ({ x: (point.x - centreX) * scale, z: (point.z - centreZ) * scale })),
    ),
  };
}

// One Landmark's outlines in Voyage Waters units, with the inverse that takes a
// world point back to the degrees its recorded elevation grid is indexed by.
export function projectLandmark(rings: Ring[], span: number) {
  const projected = projectToMetres(rings);
  const fitted = fitToSpan(projected.rings, span);
  return {
    rings: fitted.rings,
    // World units per metre of real ground.
    scale: fitted.scale,
    toDegrees: (point: PlanarPoint) => ({
      lon: projected.origin.lon + (point.x / fitted.scale + fitted.centre.x) / projected.perLon,
      lat: projected.origin.lat - (point.z / fitted.scale + fitted.centre.z) / METRES_PER_DEGREE,
    }),
  };
}

function segmentDistance(point: PlanarPoint, from: PlanarPoint, to: PlanarPoint) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const span = dx * dx + dz * dz;
  const along = span > 0 ? Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.z - from.z) * dz) / span)) : 0;
  return Math.hypot(point.x - from.x - dx * along, point.z - from.z - dz * along);
}

// Ramer-Douglas-Peucker over an open run of points.
function simplifyRun(points: PlanarPoint[], tolerance: number): PlanarPoint[] {
  if (points.length < 3) return points;
  let worst = 0;
  let at = 0;
  for (let index = 1; index < points.length - 1; index++) {
    const distance = segmentDistance(points[index], points[0], points[points.length - 1]);
    if (distance > worst) {
      worst = distance;
      at = index;
    }
  }
  if (worst <= tolerance) return [points[0], points[points.length - 1]];
  return [...simplifyRun(points.slice(0, at + 1), tolerance).slice(0, -1), ...simplifyRun(points.slice(at), tolerance)];
}

// Simplify a closed ring while keeping it closed and keeping its winding. The
// ring is split at its two most distant vertices so neither is discarded and
// the result does not depend on where the recorded way happens to start.
export function simplifyRing(ring: PlanarPoint[], tolerance: number): PlanarPoint[] {
  if (ring.length < 4) return ring;
  let anchor = 0;
  let far = 0;
  for (let index = 1; index < ring.length; index++) {
    const distance = Math.hypot(ring[index].x - ring[0].x, ring[index].z - ring[0].z);
    if (distance > far) {
      far = distance;
      anchor = index;
    }
  }
  const front = simplifyRun(ring.slice(0, anchor + 1), tolerance);
  const back = simplifyRun([...ring.slice(anchor), ring[0]], tolerance);
  const closed = [...front.slice(0, -1), ...back.slice(0, -1)];
  return closed.length >= 3 ? closed : ring;
}

// Even-odd crossing test against every ring of a Landmark.
export function insideRings(point: PlanarPoint, rings: PlanarPoint[][]) {
  let inside = false;
  for (const ring of rings) {
    for (let index = 0; index < ring.length; index++) {
      const a = ring[index];
      const b = ring[(index + 1) % ring.length];
      if (a.z > point.z === b.z > point.z) continue;
      if (point.x < a.x + ((point.z - a.z) / (b.z - a.z)) * (b.x - a.x)) inside = !inside;
    }
  }
  return inside;
}

export function distanceToRings(point: PlanarPoint, rings: PlanarPoint[][]) {
  let nearest = Infinity;
  for (const ring of rings) {
    for (let index = 0; index < ring.length; index++) {
      nearest = Math.min(nearest, segmentDistance(point, ring[index], ring[(index + 1) % ring.length]));
    }
  }
  return nearest;
}

// Walk a closed ring at an even spacing, so the triangulation meets the
// shoreline in well-shaped triangles however unevenly the way was surveyed.
export function resampleRing(ring: PlanarPoint[], spacing: number): PlanarPoint[] {
  const edges = ring.map((point, index) => {
    const next = ring[(index + 1) % ring.length];
    return Math.hypot(next.x - point.x, next.z - point.z);
  });
  const perimeter = edges.reduce((sum, length) => sum + length, 0);
  const steps = Math.max(3, Math.round(perimeter / spacing));
  const walked: PlanarPoint[] = [];
  let edge = 0;
  let consumed = 0;
  for (let step = 0; step < steps; step++) {
    const distance = (perimeter * step) / steps;
    while (edge < edges.length - 1 && consumed + edges[edge] < distance) {
      consumed += edges[edge];
      edge++;
    }
    const from = ring[edge];
    const to = ring[(edge + 1) % ring.length];
    const blend = edges[edge] > 0 ? (distance - consumed) / edges[edge] : 0;
    walked.push({ x: from.x + (to.x - from.x) * blend, z: from.z + (to.z - from.z) * blend });
  }
  return walked;
}

export type Triangle = [number, number, number];

// Bowyer-Watson Delaunay triangulation. The Landmark's point set is its
// resampled shoreline plus an interior grid, and triangles whose centre falls
// in the water are dropped afterwards, which leaves a mesh that follows the
// coast and spans nothing between separate islands.
export function triangulate(points: PlanarPoint[]): Triangle[] {
  if (points.length < 3) return [];
  const bounds = boundsOf([points]);
  const reach = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 1) * 16;
  const centreX = (bounds.minX + bounds.maxX) / 2;
  const centreZ = (bounds.minZ + bounds.maxZ) / 2;
  const vertices = [
    ...points,
    { x: centreX - reach, z: centreZ - reach },
    { x: centreX + reach, z: centreZ - reach },
    { x: centreX, z: centreZ + reach },
  ];
  const first = points.length;
  type Circle = { x: number; z: number; radius: number } | null;
  const circumcircle = ([a, b, c]: Triangle): Circle => {
    const A = vertices[a];
    const B = vertices[b];
    const C = vertices[c];
    const determinant = 2 * (A.x * (B.z - C.z) + B.x * (C.z - A.z) + C.x * (A.z - B.z));
    if (Math.abs(determinant) < 1e-12) return null;
    const a2 = A.x * A.x + A.z * A.z;
    const b2 = B.x * B.x + B.z * B.z;
    const c2 = C.x * C.x + C.z * C.z;
    const x = (a2 * (B.z - C.z) + b2 * (C.z - A.z) + c2 * (A.z - B.z)) / determinant;
    const z = (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / determinant;
    return { x, z, radius: Math.hypot(A.x - x, A.z - z) };
  };
  let mesh: { triangle: Triangle; circle: Circle }[] = [
    { triangle: [first, first + 1, first + 2], circle: circumcircle([first, first + 1, first + 2]) },
  ];
  for (let index = 0; index < points.length; index++) {
    const point = vertices[index];
    const kept: typeof mesh = [];
    const edges = new Map<string, [number, number]>();
    for (const face of mesh) {
      const { circle } = face;
      if (!circle || Math.hypot(point.x - circle.x, point.z - circle.z) > circle.radius + 1e-9) {
        kept.push(face);
        continue;
      }
      // The cavity's boundary is every edge its removed triangles do not share.
      const [a, b, c] = face.triangle;
      for (const edge of [[a, b], [b, c], [c, a]] as [number, number][]) {
        const key = edge[0] < edge[1] ? `${edge[0]}:${edge[1]}` : `${edge[1]}:${edge[0]}`;
        if (edges.has(key)) edges.delete(key);
        else edges.set(key, edge);
      }
    }
    mesh = kept;
    for (const [a, b] of edges.values()) {
      const triangle: Triangle = [a, b, index];
      mesh.push({ triangle, circle: circumcircle(triangle) });
    }
  }
  return mesh.map((face) => face.triangle).filter((triangle) => triangle.every((vertex) => vertex < first));
}

// The island surface: a shoreline-conforming point set and its triangles, with
// the shoreline points first so the height profile can pin them to sea level.
export function islandSurface(rings: PlanarPoint[][], spacing: number) {
  const outlines = rings.map((ring) => resampleRing(ring, spacing));
  const points: PlanarPoint[] = outlines.flat();
  const shoreCount = points.length;
  const bounds = boundsOf(rings);
  // Interior samples on a staggered grid, kept clear of the shoreline points so
  // the triangles along the coast stay well shaped.
  for (let row = 0; bounds.minZ + row * spacing * 0.866 <= bounds.maxZ; row++) {
    const z = bounds.minZ + row * spacing * 0.866;
    for (let column = 0; bounds.minX + column * spacing <= bounds.maxX; column++) {
      const point = { x: bounds.minX + column * spacing + (row % 2 ? spacing / 2 : 0), z };
      if (!insideRings(point, rings)) continue;
      if (distanceToRings(point, rings) < spacing * 0.62) continue;
      points.push(point);
    }
  }
  const triangles = triangulate(points).filter((triangle) =>
    insideRings(
      {
        x: (points[triangle[0]].x + points[triangle[1]].x + points[triangle[2]].x) / 3,
        z: (points[triangle[0]].z + points[triangle[1]].z + points[triangle[2]].z) / 3,
      },
      rings,
    ),
  );
  return { points, shoreCount, outlines, triangles };
}

// Round a closed ring off, keeping it closed. Each pass moves every vertex a
// share of the way toward the midpoint of its neighbours, then (Taubin's
// method) a slightly larger share back out, which rounds away spikes without
// the steady shrinking plain averaging causes on a headland.
export function smoothRing(ring: PlanarPoint[], passes: number): PlanarPoint[] {
  const relax = (points: PlanarPoint[], weight: number) =>
    points.map((point, index) => {
      const previous = points[(index - 1 + points.length) % points.length];
      const next = points[(index + 1) % points.length];
      return {
        x: point.x + ((previous.x + next.x) / 2 - point.x) * weight,
        z: point.z + ((previous.z + next.z) / 2 - point.z) * weight,
      };
    });
  let smoothed = ring;
  for (let pass = 0; pass < passes; pass++) smoothed = relax(relax(smoothed, 0.5), -0.53);
  return smoothed;
}

// Push a closed ring outward for the band of water the surf line occupies.
// Island rings run counter-clockwise on the map, so the outward normal of an
// edge is its direction turned to the right. The band's edge is where the
// water lies `distance` from the shore: each point walks out along its normal,
// averaged over a short run of edges, until it is that far from the ring. That
// gives a mitred edge in a cove and a plain offset on a headland; a light
// rounding then settles any points that crowd together in a tight cove.
export function offsetRing(ring: PlanarPoint[], distance: number): PlanarPoint[] {
  if (distance <= 0) {
    // Tucked under the land's own edge: a plain inward push is enough.
    return ring.map((point, index) => {
      const normal = averagedNormal(ring, index);
      return { x: point.x + normal.x * distance, z: point.z + normal.z * distance };
    });
  }
  const walked = ring.map((point, index) => {
    const normal = averagedNormal(ring, index);
    const at = (reach: number) => ({ x: point.x + normal.x * reach, z: point.z + normal.z * reach });
    // Distance to the shore grows along the walk until it reaches the band's
    // edge, so bisect for the first point that is far enough out.
    let near = 0;
    let far = distance * 3;
    if (distanceToRings(at(far), [ring]) < distance) return at(far);
    for (let step = 0; step < 24; step++) {
      const middle = (near + far) / 2;
      if (distanceToRings(at(middle), [ring]) < distance) near = middle;
      else far = middle;
    }
    return at(far);
  });
  return smoothRing(walked, 2);
}

function averagedNormal(ring: PlanarPoint[], index: number) {
  let x = 0;
  let z = 0;
  for (let edge = -2; edge <= 1; edge++) {
    const from = ring[(index + edge + ring.length * 2) % ring.length];
    const to = ring[(index + edge + 1 + ring.length * 2) % ring.length];
    const length = Math.hypot(to.x - from.x, to.z - from.z) || 1;
    x += -(to.z - from.z) / length;
    z += (to.x - from.x) / length;
  }
  const length = Math.hypot(x, z) || 1;
  return { x: x / length, z: z / length };
}
