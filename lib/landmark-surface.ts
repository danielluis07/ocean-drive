// How a Landmark's recorded elevation becomes the height and the colour of its
// mesh. The near top-down camera never sees an island from the side, so the
// surface reads by its shading: sand where the land is low and flat, bare rock
// where it is steep, and vegetation over everything between.

export type ElevationGrid = {
  // The square of degrees the grid covers.
  bounds: { west: number; south: number; east: number; north: number };
  // Samples per side, row-major from north-west, in whole metres.
  grid: number;
  metres: Int16Array;
};

// Bilinear, so the height profile stays smooth between 30 m samples instead of
// terracing into the steps a near top-down camera would show plainly.
export function sampleElevation(elevation: ElevationGrid, lon: number, lat: number) {
  const { bounds, grid, metres } = elevation;
  const at = (column: number, row: number) =>
    metres[Math.min(grid - 1, Math.max(0, row)) * grid + Math.min(grid - 1, Math.max(0, column))];
  const x = ((lon - bounds.west) / (bounds.east - bounds.west)) * grid - 0.5;
  const y = ((bounds.north - lat) / (bounds.north - bounds.south)) * grid - 0.5;
  const column = Math.floor(x);
  const row = Math.floor(y);
  const fx = x - column;
  const fy = y - row;
  const top = at(column, row) * (1 - fx) + at(column + 1, row) * fx;
  const bottom = at(column, row + 1) * (1 - fx) + at(column + 1, row + 1) * fx;
  return top * (1 - fy) + bottom * fy;
}

// A deterministic value noise, so the same record always produces the same GLB
// and the shading carries a little grain rather than reading as flat paint.
export function mottle(x: number, z: number) {
  const hash = (i: number, j: number) => {
    const value = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const i = Math.floor(x);
  const j = Math.floor(z);
  const fx = x - i;
  const fz = z - j;
  const ease = (t: number) => t * t * (3 - 2 * t);
  const bx = ease(fx);
  const bz = ease(fz);
  const top = hash(i, j) * (1 - bx) + hash(i + 1, j) * bx;
  const bottom = hash(i, j + 1) * (1 - bx) + hash(i + 1, j + 1) * bx;
  return top * (1 - bz) + bottom * bz;
}

export type LandmarkPalette = {
  // Beaches and sand flats at the waterline.
  sand: string;
  // Bare rock and cliff faces.
  rock: string;
  // Vegetation on the lower slopes.
  lowland: string;
  // Vegetation at the summit, where the camera sees the island's spine.
  highland: string;
};

function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  // Authored in sRGB, as CSS; Three renders in linear-sRGB.
  const linear = (byte: number) => {
    const unit = byte / 255;
    return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  };
  return [linear((value >> 16) & 255), linear((value >> 8) & 255), linear(value & 255)];
}

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

export type SurfacePoint = {
  // Real elevation in metres at this vertex.
  metres: number;
  // The sine of the ground's real angle: 0 flat, 0.5 at 30°, 1 vertical.
  slope: number;
  // Metres of elevation that still read as beach on this island.
  shoreHeight: number;
  // Elevation of the island's summit, in metres.
  summit: number;
  // 0 to 1 grain, from `mottle`.
  grain: number;
};

// Returns linear-sRGB, the space a Three vertex colour is read in.
export function shadeSurface(point: SurfacePoint, palette: LandmarkPalette): [number, number, number] {
  const sand = channels(palette.sand);
  const rock = channels(palette.rock);
  const lowland = channels(palette.lowland);
  const highland = channels(palette.highland);
  const climb = smoothstep(0.3, 0.95, point.metres / Math.max(point.summit, 1));
  const vegetation = lowland.map((value, index) => value + (highland[index] - value) * climb);
  // Steep ground sheds soil, so rock takes over as the slope grows. Flat, low
  // ground at the waterline is beach; a steep shoreline is cliff, not sand.
  const bare = smoothstep(0.42, 0.72, point.slope);
  const beach = smoothstep(point.shoreHeight * 2.2, 0, point.metres) * (1 - smoothstep(0.26, 0.5, point.slope));
  const ground = vegetation.map((value, index) => value + (rock[index] - value) * bare);
  const mixed = ground.map((value, index) => value + (sand[index] - value) * beach);
  // A little grain, and a lift on the summits, so a large island does not read
  // as one flat colour from above.
  const grain = 0.85 + point.grain * 0.3;
  return mixed.map((value) => Math.min(1, Math.max(0, value * grain))) as [number, number, number];
}
