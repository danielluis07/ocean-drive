import { describe, expect, test } from "bun:test";
import { BufferAttribute, BufferGeometry, Vector3 } from "three";
import { featureFile, featureModels, landmarkBudget, landmarkSources } from "@/content/landmark-sources";
import landmarks from "@/content/landmarks.json";
import { inspectModel } from "@/lib/asset-audit";
import { decodePlacements, encodePlacements, expandFeatures, scatterSites, type Terrain } from "@/lib/landmark-features";
import { distanceToRings, insideRings, projectLandmark, type PlanarPoint, type Ring } from "@/lib/landmark-geometry";
import { sampleElevation, type ElevationGrid } from "@/lib/landmark-surface";
import { featureModelBuilders } from "@/scripts/landmark-feature-models";

// A square island that climbs from its west shore to a ridge along its east
// one: every metre east is ten metres up, and the last strip is a cliff.
const island: PlanarPoint[] = [
  { x: -10, z: 10 },
  { x: 10, z: 10 },
  { x: 10, z: -10 },
  { x: -10, z: -10 },
];
const terrainAt = (point: PlanarPoint): Terrain => ({
  metres: (point.x + 10) * 10,
  slope: point.x > 6 ? 0.8 : 0.1,
  inland: distanceToRings(point, [island]),
});

describe("Scattering instances by terrain", () => {
  test("every instance stands on land that satisfies its rule", () => {
    const rule = { spacing: 1, scale: [0.8, 1.2] as [number, number], elevation: [20, 120] as [number, number], slope: [0, 0.4] as [number, number], inland: [1.5, 6] as [number, number] };
    const sites = scatterSites([island], rule, terrainAt);
    expect(sites.length).toBeGreaterThan(40);
    for (const site of sites) {
      expect(insideRings(site, [island])).toBe(true);
      const terrain = terrainAt(site);
      expect(terrain.metres).toBeGreaterThanOrEqual(20);
      expect(terrain.metres).toBeLessThanOrEqual(120);
      expect(terrain.slope).toBeLessThanOrEqual(0.4);
      expect(terrain.inland).toBeGreaterThanOrEqual(1.5);
      expect(terrain.inland).toBeLessThanOrEqual(6);
      expect(site.scale).toBeGreaterThanOrEqual(0.8);
      expect(site.scale).toBeLessThanOrEqual(1.2);
      expect(site.heading).toBeGreaterThanOrEqual(0);
      expect(site.heading).toBeLessThan(360);
    }
  });

  test("a rule the terrain never satisfies places nothing, and an open rule covers the land", () => {
    expect(scatterSites([island], { spacing: 1, scale: [1, 1], elevation: [500, 900] }, terrainAt)).toEqual([]);
    // One candidate per cell of a 20 × 20 island at a spacing of 2.
    expect(scatterSites([island], { spacing: 2, scale: [1, 1] }, terrainAt)).toHaveLength(100);
  });

  test("the same rule always scatters the same sites, and a seed moves them", () => {
    const rule = { spacing: 1.5, scale: [0.7, 1.3] as [number, number], slope: [0, 0.4] as [number, number] };
    expect(scatterSites([island], rule, terrainAt)).toEqual(scatterSites([island], rule, terrainAt));
    expect(scatterSites([island], rule, terrainAt, 4)).not.toEqual(scatterSites([island], rule, terrainAt));
  });

  test("sites keep their distance instead of lining up or crowding", () => {
    const sites = scatterSites([island], { spacing: 2, scale: [1, 1] }, terrainAt);
    for (const [index, site] of sites.entries()) {
      for (const other of sites.slice(index + 1)) expect(Math.hypot(site.x - other.x, site.z - other.z)).toBeGreaterThan(0.39);
    }
    expect(new Set(sites.map((site) => site.x.toFixed(3))).size).toBeGreaterThan(sites.length / 2);
  });

  test("the rules read a real island's recorded terrain", async () => {
    const source = landmarkSources.find((entry) => entry.id === "ilha-grande")!;
    const record: { coastline: { islands: { ring: Ring }[] }; elevation: { grid: number; metres: string; bounds: ElevationGrid["bounds"] } } =
      await Bun.file(`data/landmarks/${source.id}.json`).json();
    const elevation: ElevationGrid = {
      bounds: record.elevation.bounds,
      grid: record.elevation.grid,
      metres: new Int16Array(Buffer.from(record.elevation.metres, "base64").buffer.slice(0)),
    };
    const { rings, toDegrees } = projectLandmark(record.coastline.islands.map((entry) => entry.ring), source.span);
    const real = (point: PlanarPoint): Terrain => {
      const { lon, lat } = toDegrees(point);
      return { metres: Math.max(0, sampleElevation(elevation, lon, lat)), slope: 0, inland: distanceToRings(point, rings) };
    };
    // Palms keep to the low ground just behind the beach.
    const palms = scatterSites(rings, { spacing: 0.7, scale: [0.8, 1.2], elevation: [0, 25], inland: [0.4, 1.6] }, real);
    // Ilha Grande is steep to the waterline, so few sites qualify.
    expect(palms.length).toBeGreaterThan(5);
    expect(palms.length).toBeLessThan(scatterSites(rings, { spacing: 0.7, scale: [1, 1] }, real).length / 10);
    for (const palm of palms) {
      expect(real(palm).metres).toBeLessThanOrEqual(25);
      expect(real(palm).inland).toBeLessThanOrEqual(1.6);
    }
  });
});

describe("Placing a Feature at a real coordinate", () => {
  test("a coordinate projects to the world point its degrees came from", () => {
    const { rings, toWorld, toDegrees } = projectLandmark([[[0, 0], [2, 0], [2, 1], [0, 1]]], 20);
    const corner = toWorld({ lon: 2, lat: 1 });
    expect(corner.x).toBeCloseTo(rings[0][2].x, 9);
    expect(corner.z).toBeCloseTo(rings[0][2].z, 9);
    const back = toDegrees(toWorld({ lon: 0.7, lat: 0.4 }));
    expect(back.lon).toBeCloseTo(0.7, 9);
    expect(back.lat).toBeCloseTo(0.4, 9);
  });

  test("each configured Feature ships at its real coordinate and authored scale", async () => {
    const file = inspectModel(await Bun.file(`public${featureFile.url}`).arrayBuffer());
    expect(file.features?.models).toEqual([...featureModels]);
    for (const source of landmarkSources) {
      if (!source.features?.length) continue;
      const record: { coastline: { islands: { ring: Ring }[] } } = await Bun.file(`data/landmarks/${source.id}.json`).json();
      const projected = projectLandmark(record.coastline.islands.map((entry) => entry.ring), source.span);
      const placements = decodePlacements(file.features!.placements![source.id] ?? []);
      for (const feature of source.features) {
        const point = projected.toWorld(feature);
        expect(insideRings(point, projected.rings)).toBe(true);
        const placement = placements.find((entry) => featureModels[entry.model] === feature.model
          && Math.abs(entry.position[0] - point.x) <= .01 && Math.abs(entry.position[2] - point.z) <= .01
          && Math.abs(entry.scale - feature.scale) <= .005);
        expect(placement, `${source.id}: ${feature.name} must be placed at its real coordinate`).toBeDefined();
      }
    }
  });
});

describe("The Feature record and its single draw", () => {
  test("placements survive their whole-number record", () => {
    const placements = [
      { model: 0, position: [1.234, 0.5, -17.891] as [number, number, number], heading: 359.6, scale: 1.25 },
      { model: 2, position: [-8, 2.01, 3] as [number, number, number], heading: -90, scale: 0.8 },
    ];
    const record = encodePlacements(placements);
    expect(record.every(Number.isInteger)).toBe(true);
    expect(decodePlacements(record)).toEqual([
      { model: 0, position: [1.23, 0.5, -17.89], heading: 0, scale: 1.25 },
      { model: 2, position: [-8, 2.01, 3], heading: 270, scale: 0.8 },
    ]);
  });

  test("every instance of every model expands into one geometry", () => {
    const model = new BufferGeometry();
    // One triangle pointing north, a unit tall.
    model.setAttribute("position", new BufferAttribute(new Float32Array([-1, 0, 0, 1, 0, 0, 0, 1, -1]), 3));
    model.setAttribute("color", new BufferAttribute(new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]), 4, true));
    const geometry = expandFeatures([model], encodePlacements([
      { model: 0, position: [10, 2, -5], heading: 0, scale: 1 },
      // Turned to face east and doubled.
      { model: 0, position: [0, 0, 0], heading: 90, scale: 2 },
      // A model the file does not carry is skipped rather than drawn wrongly.
      { model: 3, position: [0, 0, 0], heading: 0, scale: 1 },
    ]));
    const position = geometry.getAttribute("position");
    expect(position.count).toBe(6);
    expect(new Vector3().fromBufferAttribute(position, 2).toArray()).toEqual([10, 3, -6]);
    const turned = new Vector3().fromBufferAttribute(position, 5);
    expect(turned.x).toBeCloseTo(2, 5);
    expect(turned.y).toBeCloseTo(2, 5);
    expect(turned.z).toBeCloseTo(0, 5);
    expect(Array.from(geometry.getAttribute("color").array).slice(0, 8)).toEqual([255, 0, 0, 255, 0, 255, 0, 255]);
    expect(geometry.getAttribute("normal").count).toBe(6);
    expect(geometry.getIndex()).toBeNull();
  });

  test("built-in fallback models are coloured per vertex and closed all the way round", () => {
    for (const build of Object.values(featureModelBuilders)) {
      const model = build();
      const position = model.getAttribute("position");
      expect(position.count / 3).toBeLessThanOrEqual(400);
      expect(model.getAttribute("color").count).toBe(position.count);
      expect(model.getAttribute("uv")).toBeUndefined();
      // Faces look out in every compass direction, so a low camera sees sides
      // from wherever it stands, and the model reaches below its footing.
      const facing = new Set<string>();
      const [a, b, c, normal] = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
      let lowest = Infinity;
      for (let index = 0; index < position.count; index += 3) {
        a.fromBufferAttribute(position, index);
        b.fromBufferAttribute(position, index + 1);
        c.fromBufferAttribute(position, index + 2);
        lowest = Math.min(lowest, a.y, b.y, c.y);
        normal.crossVectors(b.sub(a), c.sub(a)).normalize();
        if (Math.abs(normal.y) < 0.5) facing.add(`${Math.sign(Math.round(normal.x * 2))}:${Math.sign(Math.round(normal.z * 2))}`);
      }
      expect(facing.size).toBeGreaterThanOrEqual(6);
      expect(lowest).toBeLessThan(0);
    }
  });
});

describe("Feature budgets", () => {
  test("the shared file ships every model once with an optional atlas inside its budget", async () => {
    const buffer = await Bun.file(`public${featureFile.url}`).arrayBuffer();
    const file = inspectModel(buffer);
    expect(buffer.byteLength).toBeLessThanOrEqual(featureFile.bytes);
    expect(buffer.byteLength).toBe(landmarks.features.bytes);
    expect(file.textures).toBeLessThanOrEqual(1);
    expect(file.imageSizes).toHaveLength(file.textures);
    for (const size of file.imageSizes) {
      expect(size).toEqual({ width: featureFile.textureSize, height: featureFile.textureSize });
    }
    expect(file.materials).toBe(1);
    expect(file.opaque).toBe(true);
    expect(file.externalResources).toEqual([]);
    expect(Object.keys(file.partTriangles).sort()).toEqual([...featureModels].sort());
  });

  test("each Landmark's instances fit its Balanced allowance and Low carries none", async () => {
    const file = inspectModel(await Bun.file(`public${featureFile.url}`).arrayBuffer());
    expect(landmarkBudget.low).toMatchObject({ draws: 2, instances: 0, featureTriangles: 0 });
    for (const landmark of landmarks.landmarks) {
      const placements = decodePlacements(file.features!.placements![landmark.id] ?? []);
      const triangles = placements.reduce((total, placement) => total + file.partTriangles[file.features!.models![placement.model]], 0);
      expect(placements.length).toBeLessThanOrEqual(landmarkBudget.balanced.instances);
      expect(triangles).toBeLessThanOrEqual(landmarkBudget.balanced.featureTriangles);
      expect(landmark.features).toEqual({ instances: placements.length, triangles });
    }
  });
});
