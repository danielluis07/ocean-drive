// Builds every island Landmark from the source data recorded under
// `data/landmarks/`. This step never touches the network: the same records
// always produce the same GLBs, so CI can rebuild them and compare bytes.
//
// Each Landmark is one glTF with two meshes. `island` is the land itself,
// triangulated to follow its real coastline, lifted by its real elevation and
// shaded by height and slope. `surf` is the band of water around the shoreline
// that its shallows and its surf line are drawn on; the runtime gives it the
// ocean's own swell.
//
// What stands on the islands ships apart from them, once: the shared Feature
// file holds every model generated in `scripts/landmark-feature-models.ts` and,
// per Landmark, where the build placed each instance.
import { featureSourceRecord, readFeatureSource } from "@/scripts/landmark-feature-source";
import { bakeLandmarkTextures } from "@/scripts/landmark-texture-bake";
import { mkdir } from "node:fs/promises";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Raycaster,
  Vector3,
} from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { featureFile, featureModels, landmarkBudget, landmarkSources, type LandmarkSource } from "@/content/landmark-sources";
import { encodePlacements, scatterSites, type Placement, type Terrain } from "@/lib/landmark-features";
import { featureModelBuilders } from "@/scripts/landmark-feature-models";
import {
  distanceToRings,
  insideRings,
  islandSurface,
  projectLandmark,
  shoreBand,
  simplifyRing,
  boundsOf,
  type PlanarPoint,
  type Ring,
} from "@/lib/landmark-geometry";
import { mottle, sampleElevation, shadeSurface, type ElevationGrid } from "@/lib/landmark-surface";
import { bakeAccessibility, transferColours } from "@/scripts/asset-bake";
import { productionBudgets } from "@/lib/production-budgets";

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
// World units inside the shoreline at which the land climbs through the water:
// where the shallows band's distances are measured from, so the wash breaks on
// the land's wet edge.
const WATERLINE = 0.35;
// Compressed lowlands must clear the 0.395-unit swell envelope. This display
// offset preserves their recorded relief instead of letting the sea erase it.
const LOWLAND_CLEARANCE = 0.44;

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

function elevationOf(record: LandmarkRecord): ElevationGrid {
  return {
    bounds: record.elevation.bounds,
    grid: record.elevation.grid,
    metres: new Int16Array(Buffer.from(record.elevation.metres, "base64").buffer.slice(0)),
  };
}

function buildIsland(source: LandmarkSource, record: LandmarkRecord, spacing: number) {
  const elevation = elevationOf(record);
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
    const height = LOWLAND_CLEARANCE + (metresAt[index] / Math.max(summit, 1)) * source.height;
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
        shoreDistance: shoreAt[index],
        beachWidth: source.beachWidth,
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
    { metres: 0, slope: 1, shoreHeight: source.shoreHeight, summit, grain: 0.35, shoreDistance: 0, beachWidth: source.beachWidth },
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

// The shallows band: the water around the shoreline, carrying the distance from
// shore in its UVs so the runtime shader can fall off from turquoise to navy
// across it and break the surf line on its shoreward side.
function buildShallows(outlines: PlanarPoint[][], source: LandmarkSource, spacing: number, tier: Tier) {
  const { surfWidth, shallowsWidth } = source;
  const band = shoreBand(outlines, {
    // A coarser surface comes up through the water further inland, so the band
    // reaches further under it: no swell opens a gap between the two.
    tuck: Math.max(WATERLINE + 0.1, spacing * 0.8),
    surf: surfWidth,
    reach: shallowsWidth,
    shore: Math.max(spacing * 1.6, surfWidth * 0.85),
    // Low keeps its triangles for the land: the falloff is smooth enough to
    // cross the band in a single step.
    field: Math.max(spacing * 2, shallowsWidth * (tier === "low" ? 0.9 : 0.5)),
  });
  const positions = new Float32Array(band.points.length * 3);
  const uvs = new Float32Array(band.points.length * 2);
  for (const [index, point] of band.points.entries()) {
    positions.set([point.x, 0, point.z], index * 3);
    // Both measure out from the waterline: `u` in surf widths, `v` in shallows
    // widths, so each reaches 1 where its own line ends. Under the land they
    // run negative, and the shader holds them at 0.
    const out = band.distance[index] + WATERLINE;
    uvs.set([out / (surfWidth + WATERLINE), out / (shallowsWidth + WATERLINE)], index * 2);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  geometry.setIndex(band.triangles.flatMap(([a, b, c]) => [a, c, b]));
  return { geometry, triangles: band.triangles.length };
}

const authored = featureFile.source ? await readFeatureSource(featureFile.source, featureModels, featureFile.bytes, featureFile.textureSize) : null;
const models = authored?.models ?? featureModels.map((id) => {
  const build = featureModelBuilders[id];
  if (!build) throw new Error(`Feature ${id} needs a recorded human source or a procedural builder`);
  return { id, geometry: build() };
});
const modelTriangles = (index: number) => models[index].geometry.getAttribute("position").count / 3;

// Everything that stands on one Landmark, on the Balanced surface: instances
// scattered by terrain rules, then the named Features at their coordinates.
function placeFeatures(source: LandmarkSource, record: LandmarkRecord, island: ReturnType<typeof buildIsland>) {
  const elevation = elevationOf(record);
  const { toWorld, toDegrees, scale } = projectLandmark(record.coastline.islands.map((entry) => entry.ring), source.span);
  const metresAt = (point: PlanarPoint) => {
    const { lon, lat } = toDegrees(point);
    return Math.max(0, sampleElevation(elevation, lon, lat));
  };
  // The ground's real steepness, from the recorded elevation either side of a
  // point rather than from the mesh, whose relief is exaggerated.
  const terrainAt = (point: PlanarPoint): Terrain => {
    const step = 0.2;
    const rise = Math.hypot(
      metresAt({ x: point.x + step, z: point.z }) - metresAt({ x: point.x - step, z: point.z }),
      metresAt({ x: point.x, z: point.z + step }) - metresAt({ x: point.x, z: point.z - step }),
    ) / ((2 * step) / scale);
    return { metres: metresAt(point), slope: rise / Math.hypot(1, rise), inland: distanceToRings(point, island.outlines) };
  };
  const surface = new Mesh(island.geometry, new MeshBasicMaterial({ side: DoubleSide }));
  island.geometry.computeBoundingBox();
  const top = island.geometry.boundingBox!.max.y + 1;
  const ray = new Raycaster();
  const down = new Vector3(0, -1, 0);
  const standing = (point: PlanarPoint): [number, number, number] | null => {
    ray.set(new Vector3(point.x, top, point.z), down);
    const hit = ray.intersectObject(surface, false)[0];
    return hit ? [point.x, hit.point.y, point.z] : null;
  };

  const placements: Placement[] = [];
  for (const [seed, rule] of (source.scatter ?? []).entries()) {
    for (const site of scatterSites(island.outlines, rule, terrainAt, seed * 4)) {
      const position = standing(site);
      if (position) placements.push({ model: featureModels.indexOf(rule.model), position, heading: site.heading, scale: site.scale });
    }
  }
  for (const feature of source.features ?? []) {
    const point = toWorld(feature);
    const position = insideRings(point, island.outlines) ? standing(point) : null;
    if (!position) throw new Error(`${feature.name} does not stand on ${source.id}: check its coordinates`);
    placements.push({ model: featureModels.indexOf(feature.model), position, heading: feature.heading ?? 0, scale: feature.scale });
  }
  surface.material.dispose();
  const triangles = placements.reduce((total, placement) => total + modelTriangles(placement.model), 0);
  const budget = landmarkBudget.balanced;
  if (placements.length > budget.instances || triangles > budget.featureTriangles)
    throw new Error(`${source.id} exceeds its Feature budget: ${placements.length} instances, ${triangles} triangles`);
  return { record: encodePlacements(placements), instances: placements.length, triangles };
}

await mkdir("public/models", { recursive: true });
await mkdir("public/textures", { recursive: true });
const manifest: Record<string, unknown>[] = [];
const placed: Record<string, number[]> = {};
for (const source of landmarkSources) {
  const record: LandmarkRecord = await Bun.file(`data/landmarks/${source.id}.json`).json();
  const variants: Record<string, unknown> = {};
  const baked = await bakeLandmarkTextures(source, record.coastline.islands.map((island) => island.ring), elevationOf(record));
  const textures: Record<string, unknown> = {};
  for (const tier of ["balanced", "low"] as const) {
    const entries: Record<string, unknown> = {};
    let bytes = 0;
    for (const [kind, buffer] of Object.entries(baked[tier])) {
      const url = `/textures/landmark-${source.id}-${tier}-${kind}.v1.webp`;
      await Bun.write(`public${url}`, buffer);
      entries[kind] = { url, bytes: buffer.length, size: tier === "low" ? 512 : 1024 };
      bytes += buffer.length;
    }
    if (bytes > 150 * 1024) throw new Error(`${source.id} ${tier} texture budget exceeded`);
    textures[tier] = entries;
  }
  let extent = { x: 0, z: 0 };
  let radius = 0;
  let islands = 0;
  let scale = 0;
  let features = { instances: 0, triangles: 0 };
  let balancedBake: { geometry: BufferGeometry; colours: Uint8Array } | undefined;
  for (const tier of ["balanced", "low"] satisfies Tier[]) {
    const budget = landmarkBudget[tier];
    // The surface, its skirt and its shallows all follow from one sample
    // spacing, so the budget is met by drawing the island more coarsely until
    // it fits rather than by hand-tuning each island.
    // Low reserves transfer headroom for shoreline vertices; Balanced uses its
    // expanded allowance instead of the former 4,400-triangle density target.
    const target = tier === "low" ? Math.min(budget.triangles, 1200) : budget.triangles;
    let spacing = Math.sqrt(polygonArea(coastline(record, source)) / (0.433 * target * 0.68));
    let island = buildIsland(source, record, spacing);
    let surf = buildShallows(island.outlines, source, spacing, tier);
    for (let attempt = 0; attempt < 8 && island.triangles + surf.triangles > budget.triangles; attempt++) {
      spacing *= Math.sqrt((island.triangles + surf.triangles) / (budget.triangles * 0.92));
      island = buildIsland(source, record, spacing);
      surf = buildShallows(island.outlines, source, spacing, tier);
    }

    if (tier === "balanced") {
      const accessibility = bakeAccessibility(island.geometry, source.height * 1.5);
      for (let vertex = 0; vertex < accessibility.length; vertex++) {
        for (let channel = 0; channel < 3; channel++) {
          island.colours[vertex * 4 + channel] = Math.round(island.colours[vertex * 4 + channel] * accessibility[vertex]);
        }
      }
      balancedBake = { geometry: island.geometry, colours: island.colours };
      // Instances stand on the Balanced surface, the only one they are drawn on.
      const standing = placeFeatures(source, record, island);
      if (standing.instances) placed[source.id] = standing.record;
      features = { instances: standing.instances, triangles: standing.triangles };
    } else {
      if (!balancedBake) throw new Error("Balanced must be baked before Low");
      island.colours = transferColours(balancedBake.geometry, balancedBake.colours, island.geometry);
    }

    // One mesh for the land and its skirt, one for the shallows band.
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
    const points = merged.getAttribute("position");
    const uvs = new Uint16Array(points.count * 2);
    for (let vertex = 0; vertex < points.count; vertex++) {
      uvs[vertex * 2] = Math.round((points.getX(vertex) - baked.bounds.minX) / (baked.bounds.maxX - baked.bounds.minX) * 65535);
      uvs[vertex * 2 + 1] = Math.round((points.getZ(vertex) - baked.bounds.minZ) / (baked.bounds.maxZ - baked.bounds.minZ) * 65535);
    }
    merged.setAttribute("uv", new BufferAttribute(uvs, 2, true));
    merged.setIndex([...landIndices, ...island.skirt.indices.map((index) => index + vertices)]);
    merged.computeVertexNormals();
    merged.deleteAttribute("normal");

    const landmark = new Group();
    landmark.name = `Travessia Landmark ${source.id} ${tier}`;
    landmark.userData = {
      place: source.place,
      span: source.span,
      surfWidth: source.surfWidth,
      shallowsWidth: source.shallowsWidth,
      master: "scripts/generate-landmarks.ts",
      sources: "data/landmarks",
    };
    const shore = new Mesh(
      merged,
      new MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }),
    );
    shore.name = "island";
    const shallows = new Mesh(surf.geometry, new MeshStandardMaterial({ name: "surf" }));
    shallows.name = "surf";
    landmark.add(shore, shallows);

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
      // half-extent is enough to hold the whole island; the shallows beyond it
      // are water the card may stand over.
      radius = Number(
        (Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) / 2 + 0.5).toFixed(3),
      );
      islands = island.outlines.length;
      scale = island.summit;
    }
    console.log(
      `${source.id} ${tier}: ${triangles} triangles (${surf.triangles} in the shallows), ` +
        `${(glb.byteLength / 1024).toFixed(1)} KiB, ${island.outlines.length} outlines at ${spacing.toFixed(2)} units`,
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
    shallowsWidth: source.shallowsWidth,
    // What stands on the Landmark at Balanced and High, expanded into one draw.
    features,
    variants,
    textures,
  });
}

// The shared Feature file: each model once, and every Landmark's placements in
// the record `lib/landmark-features.ts` reads back.
const library = new Group();
library.name = "Travessia Landmark Features";
library.userData = { master: "scripts/generate-landmarks.ts", models: featureModels, placements: placed };
const paint = new MeshStandardMaterial({ name: "features", vertexColors: true, roughness: 0.9, metalness: 0 });
for (const model of models) {
  const mesh = new Mesh(model.geometry, paint);
  mesh.name = model.id;
  library.add(mesh);
}
const featureGlb = authored ? featureSourceRecord(authored.buffer, library.userData) : (await new GLTFExporter().parseAsync(library, { binary: true })) as ArrayBuffer;
if (featureGlb.byteLength > featureFile.bytes)
  throw new Error(`The Feature file exceeds its budget: ${featureGlb.byteLength} bytes`);
await Bun.write(`public${featureFile.url}`, featureGlb);
const instances = manifest.reduce((total, landmark) => total + (landmark.features as { instances: number }).instances, 0);
console.log(`Features: ${models.length} models, ${instances} instances, ${(featureGlb.byteLength / 1024).toFixed(1)} KiB`);

await Bun.write(
  "content/landmarks.json",
  JSON.stringify(
    {
      schema: 2,
      features: {
        url: featureFile.url,
        bytes: featureGlb.byteLength,
        models: Object.fromEntries(models.map((model, index) => [model.id, { triangles: modelTriangles(index) }])),
      },
      landmarks: manifest,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Recorded ${manifest.length} Landmarks in content/landmarks.json.`);
// Count every shipped tier conservatively before compression, including the
// vessel. Optional textures remain outside the minimum-sailable budget.
let authoredBytes = 0;
for (const directory of ["public/models", "public/textures"]) {
  for await (const path of new Bun.Glob("**/*").scan({ cwd: directory, onlyFiles: true })) authoredBytes += Bun.file(`${directory}/${path}`).size;
}
if (authoredBytes > productionBudgets.allVisuals) throw new Error("All authored model/texture visuals exceed 1.8 MiB");
