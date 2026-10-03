import { expect, test } from "bun:test";
import { BufferAttribute, BufferGeometry, MeshStandardMaterial, Texture } from "three";
import sharp from "sharp";
import { landmarkSources } from "@/content/landmark-sources";
import { distanceToRings, insideRings, islandSurface } from "@/lib/landmark-geometry";
import { detailLandmarkMaterial } from "@/lib/landmark-material";
import { authoredRelief, terrainMasks } from "@/scripts/terrain-treatment";
import { rasterizeAccessibility } from "@/scripts/terrain-occlusion";
import { createShoreSampler } from "@/scripts/terrain-shore-sampler";
import { bakeLandmarkTextures } from "@/scripts/landmark-texture-bake";

const source = landmarkSources[0];
test("accelerated shore queries preserve exact distances and inside tests across disjoint islands", () => {
  const outlines = [[{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 1, z: 2 }], [{ x: 5, z: 0 }, { x: 7, z: 1 }, { x: 5, z: 2 }]];
  // Enough retained segments to exercise both partitioning and leaf queries.
  const rings = outlines.map(ring => ring.flatMap((a, index) => Array.from({ length: 8 }, (_, step) => {
    const b = ring[(index + 1) % ring.length];
    return { x: a.x + (b.x - a.x) * step / 8, z: a.z + (b.z - a.z) * step / 8 };
  })));
  const sampler = createShoreSampler(rings);
  for (let i = 0; i < 100; i++) {
    const point = { x: (i * 1.13) % 9 - 1, z: (i * .71) % 4 - 1 };
    expect(sampler.distance(point)).toBeCloseTo(distanceToRings(point, rings), 10);
    expect(sampler.crossings(point.z).filter(x => x <= point.x).length % 2 === 1).toBe(insideRings(point, rings));
  }
});
test("beaches require low, gentle coastal ground; cliffs and inland scrub remain separate", () => {
  expect(terrainMasks(2, .05, .1, source).beach).toBeGreaterThan(.9);
  expect(terrainMasks(70, .05, .1, source).rock).toBeGreaterThan(.9);
  expect(terrainMasks(2, .05, 3, source).scrub).toBe(1);
  expect(terrainMasks(70, .8, 3, source).rock).toBe(1);
});

test("authored relief is bounded, deterministic, and leaves the recorded waterline fixed", () => {
  for (let i = 0; i < 100; i++) {
    const args = [i * .13, i * .17, 80, .6, .7, source] as const;
    expect(authoredRelief(...args)).toBe(authoredRelief(...args));
    expect(Math.abs(authoredRelief(...args))).toBeLessThanOrEqual(source.terrainTreatment!.relief / 2);
    expect(Math.abs(authoredRelief(i, i, 80, .6, 0, source))).toBe(0);
  }
});

test("selective sampling spends additional interior vertices in the requested relief region", () => {
  const mesh = islandSurface([[{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }, { x: 0, z: 10 }]], .5, point => point.x < 5);
  const interior = mesh.points.slice(mesh.shoreCount).filter(point => point.x > 1 && point.x < 9 && point.z > 1 && point.z < 9);
  expect(interior.filter(point => point.x < 5).length).toBeGreaterThan(interior.filter(point => point.x >= 5).length * 2);
});

test("texture accessibility interpolates the scalar mesh bake in projected X/Z, leaving uncovered texels neutral", () => {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 0, 1]), 3));
  geometry.setIndex([0, 1, 2]);
  const ao = rasterizeAccessibility(geometry, new Float32Array([.5, 1, 1]), { minX: 0, minZ: 0, maxX: 1, maxZ: 1 }, 4);
  expect(ao[0]).toBeCloseTo(.625);
  expect(ao[1]).toBeCloseTo(.75);
  expect(ao[15]).toBe(1);
  geometry.dispose();
});

test("colour-only maps replace the palette once; removing them restores vertex fallback", () => {
  const material = new MeshStandardMaterial({ vertexColors: true });
  const colour = new Texture();
  const restore = detailLandmarkMaterial(material, { colour });
  expect(material.vertexColors).toBe(false);
  expect(material.normalMap).toBeNull();
  restore();
  expect(material.vertexColors).toBe(true);
  expect(material.map).toBeNull();
  colour.dispose(); material.dispose();
});

test("native baking retains sub-256 detail and transfers linear occlusion to both tiers", async () => {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array([-4, 0, -4, 0, 0, -4, -4, 0, 4, 0, 0, 4,
    0, 0, -4, 4, 0, -4, 0, 0, 4, 4, 0, 4]), 3));
  geometry.setIndex([0, 2, 1, 1, 2, 3, 4, 6, 5, 5, 6, 7]);
  const fixture = { ...source, span: 8, beachWidth: .1, terrainTreatment: { ...source.terrainTreatment!, scrubScale: 40 } };
  const rings: [number, number][][] = [[[0, 0], [1, 0], [1, 1], [0, 1]]];
  const elevation = { grid: 2, bounds: { west: 0, south: 0, east: 1, north: 1 }, metres: new Int16Array([80, 80, 80, 80]) };
  const lit = await bakeLandmarkTextures(fixture, rings, elevation, { geometry, accessibility: new Float32Array([1, 1, 1, 1, .5, .5, .5, .5]) });
  for (const tier of ["balanced", "low"] as const) {
    const size = tier === "balanced" ? 1024 : 512;
    const region = { top: size / 8, width: size / 4, height: size * 3 / 4 };
    const light = await sharp(await sharp(lit[tier].colour).extract({ ...region, left: size / 8 }).toBuffer()).stats();
    const dark = await sharp(await sharp(lit[tier].colour).extract({ ...region, left: size * 5 / 8 }).toBuffer()).stats();
    // Half the linear-light accessibility must darken sRGB by about .73,
    // rather than halving the already encoded colour or losing AO entirely.
    expect(dark.channels[1].mean / light.channels[1].mean).toBeGreaterThan(.65);
    expect(dark.channels[1].mean / light.channels[1].mean).toBeLessThan(.8);
  }
  const native = await sharp(lit.balanced.colour).raw().toBuffer();
  const coarse = await sharp(lit.balanced.colour).resize(256, 256).png().toBuffer();
  const enlarged = await sharp(coarse).resize(1024, 1024).raw().toBuffer();
  let error = 0;
  for (let i = 0; i < native.length; i++) error += Math.abs(native[i] - enlarged[i]);
  expect(error / native.length).toBeGreaterThan(2);
  geometry.dispose();
}, 60_000);
