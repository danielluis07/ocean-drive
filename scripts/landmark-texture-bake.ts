import sharp from "sharp";
import type { LandmarkSource } from "@/content/landmark-sources";
import { boundsOf, distanceToRings, projectLandmark, type Ring } from "@/lib/landmark-geometry";
import { mottle, sampleElevation, shadeSurface, type ElevationGrid } from "@/lib/landmark-surface";
import type { BufferGeometry } from "three";
import { rasterizeAccessibility } from "@/scripts/terrain-occlusion";
import { terrainPigment } from "@/scripts/terrain-treatment";
import { createShoreSampler } from "@/scripts/terrain-shore-sampler";
import { createBeachSampler } from "@/scripts/terrain-regions";

type OcclusionBake = { geometry: BufferGeometry; accessibility: Float32Array };

// Islands opt in individually. Keep the legacy output byte-identical until
// Noronha's human visual review and physical-device validation permit rollout.
export async function bakeLandmarkTextures(source: LandmarkSource, rings: Ring[], elevation: ElevationGrid, occlusion?: OcclusionBake) {
  if (!source.terrainTreatment) return bakeLegacyTextures(source, rings, elevation);
  if (!occlusion) throw new Error("Detailed terrain requires the Balanced accessibility bake");
  const projected = projectLandmark(rings, source.span);
  const bounds = boundsOf(projected.rings);
  const summit = Math.max(...elevation.metres, 1);
  const shore = createShoreSampler(projected.rings);
  const beachAt = createBeachSampler(source, projected.toWorld);
  const height = (x: number, z: number) => {
    const { lon, lat } = projected.toDegrees({ x, z });
    return Math.max(0, sampleElevation(elevation, lon, lat));
  };
  const bake = async (size: number, withNormal: boolean) => {
    const accessibility = rasterizeAccessibility(occlusion.geometry, occlusion.accessibility, bounds, size);
    const colour = new Uint8Array(size * size * 3);
    const bumps = new Float32Array(size * size);
    const stepX = (bounds.maxX - bounds.minX) / size, stepZ = (bounds.maxZ - bounds.minZ) / size;
    for (let row = 0; row < size; row++) {
      const crossings = shore.crossings(bounds.minZ + (row + .5) * stepZ);
      let crossing = 0;
      for (let column = 0; column < size; column++) {
        const x = bounds.minX + (column + .5) * stepX, z = bounds.minZ + (row + .5) * stepZ;
        const inland = shore.distance({ x, z });
        while (crossing < crossings.length && crossings[crossing] <= x) crossing++;
        const pixel = row * size + column;
        // Keep a small shoreline gutter for filtering. Unseen ocean texels do
        // not spend transfer on authored detail.
        if (inland > Math.max(stepX, stepZ) * 4 && crossing % 2 === 0) {
          colour.set([101, 94, 80], pixel * 3);
          continue;
        }
        // Fixed geographical derivative support, independent of texture LOD.
        const step = .12;
        const rise = Math.hypot(height(x + step, z) - height(x - step, z), height(x, z + step) - height(x, z - step)) / (2 * step / projected.scale);
        const pigment = terrainPigment(x, z, height(x, z), rise / Math.hypot(1, rise), inland, summit, source, beachAt({ x, z }));
        bumps[pixel] = pigment.bump;
        for (let channel = 0; channel < 3; channel++) {
          const linear = Math.min(1, Math.max(0, pigment.colour[channel] * accessibility[pixel]));
          colour[pixel * 3 + channel] = Math.round(255 * (linear <= .0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - .055));
        }
      }
    }
    const encode = (data: Uint8Array) => sharp(data, { raw: { width: size, height: size, channels: 3 } })
      .webp({ quality: 78, effort: 6 }).toBuffer();
    const colourMap = await encode(colour);
    if (!withNormal) return { colour: colourMap };
    const normal = new Uint8Array(colour.length);
    const bump = (column: number, row: number) => bumps[Math.max(0, Math.min(size - 1, row)) * size + Math.max(0, Math.min(size - 1, column))];
    for (let row = 0; row < size; row++) for (let column = 0; column < size; column++) {
      const dx = (bump(column + 1, row) - bump(column - 1, row)) / (2 * stepX);
      const dz = (bump(column, row + 1) - bump(column, row - 1)) / (2 * stepZ);
      const length = Math.hypot(dx, dz, 1);
      // UV v grows along +Z. Both tangent derivatives therefore use -dH.
      normal.set([-dx, -dz, 1].map(value => Math.round((value / length * .5 + .5) * 255)), (row * size + column) * 3);
    }
    return { colour: colourMap, normal: await encode(normal) };
  };
  return { balanced: await bake(1024, true), low: await bake(512, false), bounds };
}

// Sample recorded terrain offline. The low-frequency field follows the survey;
// authored grain supplies detail without claiming satellite land-cover data.
async function bakeLegacyTextures(source: LandmarkSource, rings: Ring[], elevation: ElevationGrid) {
  const projected = projectLandmark(rings, source.span);
  const bounds = boundsOf(projected.rings);
  const size = 256;
  const colour = new Uint8Array(size * size * 3);
  const normal = new Uint8Array(colour.length);
  const summit = Math.max(...elevation.metres, 1);
  const step = source.span / size;
  const height = (x: number, z: number) => {
    const { lon, lat } = projected.toDegrees({ x, z });
    return Math.max(0, sampleElevation(elevation, lon, lat));
  };
  for (let row = 0; row < size; row++) for (let column = 0; column < size; column++) {
    const x = bounds.minX + (column + .5) / size * (bounds.maxX - bounds.minX);
    const z = bounds.minZ + (row + .5) / size * (bounds.maxZ - bounds.minZ);
    const dx = (height(x + step, z) - height(x - step, z)) / (2 * step / projected.scale);
    const dz = (height(x, z + step) - height(x, z - step)) / (2 * step / projected.scale);
    const rise = Math.hypot(dx, dz);
    const rgb = shadeSurface({ metres: height(x, z), summit, slope: rise / Math.hypot(1, rise),
      shoreHeight: source.shoreHeight, shoreDistance: distanceToRings({ x, z }, projected.rings),
      beachWidth: source.beachWidth, grain: mottle(x * 7.5, z * 7.5) }, source.palette);
    const offset = (row * size + column) * 3;
    colour.set(rgb.map((value) => Math.round(255 * (value <= .0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - .055))), offset);
    // Tangent-space weathering only: mesh normals already carry the relief.
    const bumpX = (mottle((x + step) * 7.5, z * 7.5) - mottle((x - step) * 7.5, z * 7.5)) * .15;
    const bumpY = (mottle(x * 7.5, (z + step) * 7.5) - mottle(x * 7.5, (z - step) * 7.5)) * .15;
    const length = Math.hypot(bumpX, bumpY, 1);
    normal.set([-bumpX, bumpY, 1].map((value) => Math.round((value / length * .5 + .5) * 255)), offset);
  }
  const encode = (data: Uint8Array, pixels: number) => sharp(data, { raw: { width: size, height: size, channels: 3 } })
    .resize(pixels, pixels).webp({ quality: 78, effort: 6 }).toBuffer();
  return { balanced: { colour: await encode(colour, 1024), normal: await encode(normal, 1024) },
    low: { colour: await encode(colour, 512) }, bounds };
}
