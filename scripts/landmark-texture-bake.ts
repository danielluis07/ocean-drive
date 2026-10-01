import sharp from "sharp";
import type { LandmarkSource } from "@/content/landmark-sources";
import { boundsOf, distanceToRings, projectLandmark, type Ring } from "@/lib/landmark-geometry";
import { mottle, sampleElevation, shadeSurface, type ElevationGrid } from "@/lib/landmark-surface";

// Sample recorded terrain offline. The low-frequency field follows the survey;
// authored grain supplies detail without claiming satellite land-cover data.
export async function bakeLandmarkTextures(source: LandmarkSource, rings: Ring[], elevation: ElevationGrid) {
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
