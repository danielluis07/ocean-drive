// Builds every island Landmark from the source data recorded under
// `data/landmarks/`. This step never touches the network: the same records
// always produce the same GLBs, so CI can rebuild them and compare bytes.
//
// Each Landmark is one glTF with two meshes. `island` is the land itself,
// triangulated to follow its real coastline, lifted by its real elevation and
// shaded by height and slope. `surf` is the band of water around the shoreline
// the surf line is drawn on; the runtime gives it the ocean's own swell.
import { mkdir } from "node:fs/promises";
import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { landmarkBudget, landmarkSources, type LandmarkSource } from "@/content/landmark-sources";
import {
  distanceToRings,
  islandSurface,
  offsetRing,
  projectLandmark,
  resampleRing,
  simplifyRing,
  boundsOf,
  type PlanarPoint,
  type Ring,
} from "@/lib/landmark-geometry";
import { mottle, sampleElevation, shadeSurface, type ElevationGrid } from "@/lib/landmark-surface";

// GLTFExporter writes a Blob through FileReader, which Bun does not provide.
globalThis.FileReader = class {
  result: ArrayBuffer | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(blob: Blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
} as unknown as typeof FileReader;

type LandmarkRecord = {
  id: string;
  place: string;
  coastline: { islands: { name?: string; ring: Ring }[] };
  elevation: { grid: number; metres: string; bounds: ElevationGrid["bounds"] };
};

type Tier = keyof typeof landmarkBudget;

// The island dips below the waterline at its shore, so the swell never uncovers
// a seam between the land and the water, and its skirt hangs below that.
const SHORE_DIP = 0.6;
const SKIRT_DEPTH = 3.2;
// World units over which the land climbs out of the water behind its shoreline.
const SHORE_RAMP = 0.5;

// The Landmark's outlines in world units, for the first spacing estimate.
function coastline(record: LandmarkRecord, source: LandmarkSource) {
  return projectLandmark(record.coastline.islands.map((island) => island.ring), source.span).rings;
}

// The sine of the ground's real angle, from a mesh normal whose relief has
// been exaggerated by `relief`.
function trueSlope(up: number, relief: number) {
  const clamped = Math.min(1, Math.max(1e-4, Math.abs(up)));
  const tangent = Math.sqrt(1 - clamped * clamped) / clamped / Math.max(relief, 1e-4);
  return tangent / Math.hypot(1, tangent);
}

function polygonArea(rings: PlanarPoint[][]) {
  return rings.reduce(
    (total, ring) =>
      total +
      Math.abs(
        ring.reduce((sum, point, index) => {
          const next = ring[(index + 1) % ring.length];
          return sum + point.x * next.z - next.x * point.z;
        }, 0) / 2,
      ),
    0,
  );
}

function buildIsland(source: LandmarkSource, record: LandmarkRecord, spacing: number) {
  const elevation: ElevationGrid = {
    bounds: record.elevation.bounds,
    grid: record.elevation.grid,
    metres: new Int16Array(Buffer.from(record.elevation.metres, "base64").buffer.slice(0)),
  };
  const { rings, toDegrees, scale } = projectLandmark(
    record.coastline.islands.map((island) => island.ring),
    source.span,
  );
  // Drop coastline detail the camera could not resolve anyway, then triangulate
  // what is left, so the outline keeps its real shape at a fraction of the cost.
  const outline = rings.map((ring) => simplifyRing(ring, spacing * 0.33)).filter((ring) => ring.length >= 3);
  const surface = islandSurface(outline, spacing);

  const summit = Math.max(...elevation.metres);
  const positions = new Float32Array(surface.points.length * 3);
  const colours = new Uint8Array(surface.points.length * 4);
  const metresAt = surface.points.map((point) => {
    const { lon, lat } = toDegrees(point);
    return Math.max(0, sampleElevation(elevation, lon, lat));
  });
  const shoreAt = surface.points.map((point, index) =>
    index < surface.shoreCount ? 0 : distanceToRings(point, outline),
  );
  for (let index = 0; index < surface.points.length; index++) {
    const point = surface.points[index];
    // Behind the shoreline the land climbs to its recorded height; at the
    // shoreline it sits below the water, where the surf line covers the join.
    const seat = Math.min(1, shoreAt[index] / SHORE_RAMP);
    const height = (metresAt[index] / Math.max(summit, 1)) * source.height;
    positions.set([point.x, height * seat * seat - SHORE_DIP * (1 - seat), point.z], index * 3);
  }

  // Voyage Waters compresses an island's footprint far harder than its height,
  // so the mesh's own slopes are several times the real ones. Shading reads the
  // real steepness, or every hillside would come out as bare rock.
  const relief = source.height / Math.max(summit, 1) / scale;
  const indices: number[] = [];
  for (const [a, b, c] of surface.triangles) indices.push(a, c, b);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const normals = geometry.getAttribute("normal");
  for (let index = 0; index < surface.points.length; index++) {
    const point = surface.points[index];
    const colour = shadeSurface(
      {
        metres: metresAt[index],
        slope: trueSlope(normals.getY(index), relief),
        shoreHeight: source.shoreHeight,
        summit,
        grain: mottle(point.x * 0.9, point.z * 0.9),
      },
      source.palette,
    );
    colours.set([...colour.map((value) => Math.round(value * 255)), 255], index * 4);
  }

  // A skirt below the shoreline, so the camera's remaining perspective never
  // looks under the island's edge.
  const skirtPositions: number[] = [];
  const skirtColours: number[] = [];
  const skirtIndices: number[] = [];
  const rockColour = shadeSurface(
    { metres: 0, slope: 1, shoreHeight: source.shoreHeight, summit, grain: 0.35 },
    source.palette,
  ).map((value) => Math.round(value * 255 * 0.55));
  for (const ring of surface.outlines) {
    const first = skirtPositions.length / 3;
    for (const point of ring) {
      skirtPositions.push(point.x, -SHORE_DIP, point.z, point.x, -SKIRT_DEPTH, point.z);
      skirtColours.push(...rockColour, 255, ...rockColour, 255);
    }
    for (let index = 0; index < ring.length; index++) {
      const a = first + index * 2;
      const b = first + ((index + 1) % ring.length) * 2;
      skirtIndices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return {
    geometry,
    colours,
    outlines: surface.outlines,
    skirt: { positions: skirtPositions, colours: skirtColours, indices: skirtIndices },
    summit,
    triangles: surface.triangles.length + skirtIndices.length / 3,
  };
}

// The surf band: a ring of water hugging the shoreline, carrying the distance
// from shore in its UVs so the runtime shader can break the foam on it.
function buildSurf(outlines: PlanarPoint[][], width: number, spacing: number) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  // The inner ring tucks a little under the land's edge; the outer two carry the
  // band out across the water, and `v` runs 0 at the shore to 1 at its edge.
  const bands: [number, number][] = [[-0.35, 0], [width * 0.38, 0.38], [width, 1]];
  let triangles = 0;
  for (const outline of outlines) {
    const island = boundsOf([outline]);
    const across = Math.min(island.maxX - island.minX, island.maxZ - island.minZ);
    // A band cannot follow a cove narrower than itself, so the shoreline it is
    // laid along is simplified — but never past what the island itself is.
    const ring = simplifyRing(outline, Math.min(width * 0.45, across * 0.08));
    // Enough of a walk to carry the band's shape around even a small island.
    const perimeter = ring.reduce((sum, point, index) => {
      const next = ring[(index + 1) % ring.length];
      return sum + Math.hypot(next.x - point.x, next.z - point.z);
    }, 0);
    const walk = resampleRing(ring, Math.min(Math.max(spacing * 1.6, width * 0.85), perimeter / 28));
    if (walk.length < 3) continue;
    const first = positions.length / 3;
    // Arc length around the shore, so the foam keeps one scale on every island.
    let travelled = 0;
    const along = walk.map((point, index) => {
      if (index > 0) travelled += Math.hypot(point.x - walk[index - 1].x, point.z - walk[index - 1].z);
      return travelled;
    });
    for (const [offset, v] of bands) {
      const pushed = offsetRing(walk, offset);
      for (const [index, point] of pushed.entries()) {
        positions.push(point.x, 0, point.z);
        uvs.push(along[index], v);
      }
    }
    for (let band = 0; band < bands.length - 1; band++) {
      for (let index = 0; index < walk.length; index++) {
        const next = (index + 1) % walk.length;
        const inner = first + band * walk.length;
        const outer = inner + walk.length;
        indices.push(inner + index, inner + next, outer + index, inner + next, outer + next, outer + index);
        triangles += 2;
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  return { geometry, triangles };
}

await mkdir("public/models", { recursive: true });
const manifest: Record<string, unknown>[] = [];
for (const source of landmarkSources) {
  const record: LandmarkRecord = await Bun.file(`data/landmarks/${source.id}.json`).json();
  const variants: Record<string, unknown> = {};
  let extent = { x: 0, z: 0 };
  let radius = 0;
  let islands = 0;
  let scale = 0;
  for (const tier of Object.keys(landmarkBudget) as Tier[]) {
    const budget = landmarkBudget[tier];
    // The surface, its skirt and its surf line all follow from one sample
    // spacing, so the budget is met by drawing the island more coarsely until
    // it fits rather than by hand-tuning each island.
    let spacing = Math.sqrt(polygonArea(coastline(record, source)) / (0.433 * budget.triangles * 0.68));
    let island = buildIsland(source, record, spacing);
    let surf = buildSurf(island.outlines, source.surfWidth, spacing);
    for (let attempt = 0; attempt < 8 && island.triangles + surf.triangles > budget.triangles; attempt++) {
      spacing *= Math.sqrt((island.triangles + surf.triangles) / (budget.triangles * 0.92));
      island = buildIsland(source, record, spacing);
      surf = buildSurf(island.outlines, source.surfWidth, spacing);
    }

    // One mesh for the land and its skirt, one for the surf band.
    const land = island.geometry;
    const landPositions = land.getAttribute("position").array as Float32Array;
    const landIndices = Array.from(land.getIndex()!.array);
    const vertices = landPositions.length / 3;
    const merged = new BufferGeometry();
    merged.setAttribute(
      "position",
      new BufferAttribute(new Float32Array([...landPositions, ...island.skirt.positions]), 3),
    );
    const colour = new BufferAttribute(
      new Uint8Array([...island.colours, ...island.skirt.colours]),
      4,
      true,
    );
    merged.setAttribute("color", colour);
    merged.setIndex([...landIndices, ...island.skirt.indices.map((index) => index + vertices)]);
    merged.computeVertexNormals();
    merged.deleteAttribute("normal");

    const landmark = new Group();
    landmark.name = `Travessia Landmark ${source.id} ${tier}`;
    landmark.userData = {
      place: source.place,
      span: source.span,
      surfWidth: source.surfWidth,
      master: "scripts/generate-landmarks.ts",
      sources: "data/landmarks",
    };
    const shore = new Mesh(
      merged,
      new MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }),
    );
    shore.name = "island";
    const foam = new Mesh(surf.geometry, new MeshStandardMaterial({ name: "surf" }));
    foam.name = "surf";
    landmark.add(shore, foam);

    const glb = (await new GLTFExporter().parseAsync(landmark, { binary: true })) as ArrayBuffer;
    const url = `/models/landmark-${source.id}-${tier}.v1.glb`;
    await Bun.write(`public${url}`, glb);
    const triangles = island.triangles + surf.triangles;
    variants[tier] = { url, triangles, bytes: glb.byteLength };
    if (triangles > landmarkBudget[tier].triangles || glb.byteLength > landmarkBudget[tier].bytes)
      throw new Error(
        `${source.id} ${tier} exceeds its budget: ${triangles} triangles, ${glb.byteLength} bytes`,
      );
    if (tier === "balanced") {
      merged.computeBoundingBox();
      const size = merged.boundingBox!.getSize(new Vector3());
      const bounds = boundsOf(island.outlines);
      extent = { x: Number((size.x / 2).toFixed(3)), z: Number((size.z / 2).toFixed(3)) };
      // The Stop Card reads this as a square about the centre, so the larger
      // half-extent is enough to hold the whole island; the surf beyond it is
      // water the card may stand over.
      radius = Number(
        (Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) / 2 + 0.5).toFixed(3),
      );
      islands = island.outlines.length;
      scale = island.summit;
    }
    console.log(
      `${source.id} ${tier}: ${triangles} triangles, ${(glb.byteLength / 1024).toFixed(1)} KiB, ` +
        `${island.outlines.length} outlines at ${spacing.toFixed(2)} units`,
    );
  }
  manifest.push({
    id: source.id,
    place: source.place,
    span: source.span,
    // Everything the scene needs to place the Landmark and keep the Stop Card
    // clear of it, derived from the mesh that was actually written.
    extent,
    radius,
    islands,
    summitMetres: scale,
    surfWidth: source.surfWidth,
    variants,
  });
}
await Bun.write("content/landmarks.json", JSON.stringify({ schema: 1, landmarks: manifest }, null, 2) + "\n");
console.log(`Recorded ${manifest.length} Landmarks in content/landmarks.json.`);
