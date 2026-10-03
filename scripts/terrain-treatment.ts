import type { LandmarkSource } from "@/content/landmark-sources";
import { channels, mottle } from "@/lib/landmark-surface";

export type TerrainTreatment = {
  // Project-authored display detail in world units, never surveyed elevation.
  relief: number;
  scrubScale: number;
  rockScale: number;
};

export const smooth = (a: number, b: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function scrubCrown(x: number, z: number) {
  const cellX = Math.floor(x), cellZ = Math.floor(z);
  let crown = 0;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const i = cellX + dx, j = cellZ + dz;
    const hash = (seed: number) => {
      const value = Math.sin(i * 127.1 + j * 311.7 + seed * 91.3) * 43758.5453;
      return value - Math.floor(value);
    };
    const px = x - i - .15 - hash(1) * .7, pz = z - j - .15 - hash(2) * .7;
    const radius = .30 + hash(3) * .30;
    const distance = Math.hypot(px, pz * (1 + hash(4) * .3)) / radius;
    crown = Math.max(crown, (1 - smooth(.15, 1, distance)) * (.8 + hash(5) * .2));
  }
  return crown;
}

export function terrainMasks(metres: number, slope: number, inland: number, source: LandmarkSource) {
  const beach = (1 - smooth(source.beachWidth * .12, source.beachWidth, inland))
    * (1 - smooth(source.shoreHeight * .4, source.shoreHeight * 2.2, metres))
    * (1 - smooth(.24, .48, slope));
  const cliff = (1 - smooth(.3, 1.2, inland)) * smooth(source.shoreHeight, source.shoreHeight * 3, metres);
  const rock = Math.max(smooth(.32, .68, slope), cliff) * (1 - beach);
  return { beach, rock, scrub: (1 - beach) * (1 - rock) };
}

// Small-scale erosion is authored stylisation anchored to the retained DEM's
// slopes and coastal heights. It cannot add islands, move a coastline or claim
// a new summit. The amplitude is recorded in the island's configuration.
export function authoredRelief(x: number, z: number, metres: number, slope: number, inland: number, source: LandmarkSource) {
  if (!source.terrainTreatment) return 0;
  const { rock } = terrainMasks(metres, slope, inland, source);
  const ridge = smooth(.15, .45, slope);
  const ribs = 1 - Math.abs(mottle(x * 2.8, z * 2.8) * 2 - 1);
  return source.terrainTreatment.relief * (ribs - .5) * Math.max(rock, ridge * .5) * smooth(.08, .5, inland);
}

// Each texel evaluates these world-space signals directly. Broad scrub crowns
// remain readable in the 512px colour-only tier; smaller rock joints and sandy
// ripples supply native 1024px detail. None is a measured land-cover mask.
export function terrainPigment(x: number, z: number, metres: number, slope: number, inland: number, summit: number, source: LandmarkSource) {
  const treatment = source.terrainTreatment!;
  const masks = terrainMasks(metres, slope, inland, source);
  const patch = mottle(x * 1.1, z * 1.1);
  const crownLight = scrubCrown(x * treatment.scrubScale, z * treatment.scrubScale);
  const grain = mottle(x * 24, z * 24);
  const joint = smooth(.40, .55, mottle(x * treatment.rockScale, z * treatment.rockScale * .45));
  const strata = Math.sin(metres * .9 + mottle(x * 3, z * 3) * 4) * .5 + .5;
  const sand = channels(source.palette.sand), rock = channels(source.palette.rock);
  const low = channels(source.palette.lowland), high = channels(source.palette.highland);
  const dry = smooth(.25, .9, metres / summit) * .5 + patch * .35;
  const scrubTone = .78 + crownLight * .40 + grain * .06 + patch * .12;
  const rockTone = .62 + joint * .40 + strata * .15 + grain * .12;
  const wetSand = .80 + smooth(.05, .45, inland) * .2;
  const sandTone = wetSand * (.95 + grain * .08);
  const colour = low.map((value, channel) =>
    (value + (high[channel] - value) * dry) * scrubTone * masks.scrub
    + rock[channel] * rockTone * masks.rock + sand[channel] * sandTone * masks.beach);
  const bump = masks.scrub * crownLight * .035 + masks.rock * (joint * .028 + strata * .007)
    + masks.beach * grain * .0015;
  return { colour, bump };
}
