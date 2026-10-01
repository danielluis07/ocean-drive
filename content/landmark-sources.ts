// The Landmark pipeline's authored configuration: one entry per island Stop.
// Adding an island to Voyage Waters is one entry here, plus its placement in
// `lib/ocean-config.ts`. `bun run landmarks:fetch` records the open source data
// for every entry under `data/landmarks/`, and `bun run landmarks:build` turns
// those records into the shipped meshes without touching the network.
import type { StopId } from "@/content/editorial";
import type { LandmarkPalette } from "@/lib/landmark-surface";
import type { TerrainRange, TerrainRule } from "@/lib/landmark-features";

export type GeographicBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

// The models the build generates in code, in `scripts/landmark-feature-models.ts`,
// and ships once in the shared Feature file for every Landmark to place.
//
// `placeholder` proves the mechanism and stands for no real structure: the
// island issues replace it with their own models or remove it.
export const featureModels = ["placeholder"] as const;
export type FeatureModel = (typeof featureModels)[number];

// Vegetation and other repeated models, placed wherever the terrain allows.
export type LandmarkScatter = TerrainRule & {
  model: FeatureModel;
  // World units between candidate sites.
  spacing: number;
  // Smallest and largest instance, in multiples of the model's authored size.
  scale: TerrainRange;
};

// A real, named place on the island, drawn larger than life at its own
// coordinates. The build refuses a Feature that does not stand on the land.
export type LandmarkFeature = {
  name: string;
  model: FeatureModel;
  lon: number;
  lat: number;
  // Multiples of the model's authored size.
  scale: number;
  // Degrees clockwise from north the model's front faces.
  heading?: number;
};

export type LandmarkSource = {
  id: Exclude<StopId, "partida">;
  // The real place the Landmark is drawn from, for the provenance ledger.
  place: string;
  // The box the coastline is queried in, in degrees. Draw it generously: a way
  // that leaves the box is dropped, and a ring the query cuts in half never
  // closes. The elevation grid is drawn around the coastline that comes back.
  bounds: GeographicBounds;
  // Slippy-map zoom of the recorded elevation tiles. Higher zoom resolves
  // smaller islands; the underlying SRTM samples are about 30 m either way.
  elevationZoom: number;
  // Side of the recorded square elevation grid covering `bounds`.
  elevationGrid: number;
  // Coastline rings smaller than this share of the largest kept ring are
  // dropped, so a Landmark carries its islands and not every wave-washed rock.
  smallestRing: number;
  // How far beyond the largest island, as a share of its own size, a ring may
  // lie and still belong to this Landmark rather than to the coast around it.
  group: number;
  // World units across the Landmark's longest axis in Voyage Waters. Distances
  // here are deliberately compressed, and each island is compressed on its own
  // so that a 1 km archipelago and a 25 km island both read from the camera.
  // `tests/landmark-placement.test.ts` holds the sizes the camera can frame.
  span: number;
  // World units of relief to the real summit, above the lowland display offset.
  height: number;
  // Metres of real elevation that read as beach rather than hillside.
  shoreHeight: number;
  // Visible sandy margin in world units; low inland ground stays vegetated.
  beachWidth: number;
  // World units of water the surf line covers outside the shoreline.
  surfWidth: number;
  // World units from the shoreline to where the shallows have deepened to the
  // ocean's navy. An authored treatment: no depth data is recorded.
  shallowsWidth: number;
  // Instances scattered over the island by terrain rules. Balanced and High only.
  scatter?: LandmarkScatter[];
  // Named Features at their real coordinates. Balanced and High only.
  features?: LandmarkFeature[];
  // How the island is shaded by height and slope.
  palette: LandmarkPalette;
};

// Triangles each quality tier may spend on one Landmark, shared between the
// island surface, the skirt that hides its underside, and the shallows band,
// and the draws it may add to the scene: one for the land, one for its
// shallows and, at Balanced and High, one for everything placed on it. That
// third draw has its own allowance of instances and of the triangles they
// expand to. Low carries no instances at all.
export const landmarkBudget = {
  balanced: { triangles: 4_400, bytes: 76 * 1024, draws: 3, instances: 160, featureTriangles: 3_000 },
  low: { triangles: 1_300, bytes: 28 * 1024, draws: 2, instances: 0, featureTriangles: 0 },
} as const;

// The one file every Landmark's models and placements ship in. Low never
// requests it.
export const featureFile = { url: "/models/landmark-features.v1.glb", bytes: 30 * 1024 } as const;

export const landmarkSources: LandmarkSource[] = [
  {
    id: "fernando-de-noronha",
    place: "Fernando de Noronha, Pernambuco, Brazil",
    bounds: { west: -32.52, south: -3.94, east: -32.32, north: -3.76 },
    elevationZoom: 13,
    elevationGrid: 192,
    smallestRing: 0.004,
    group: 0.6,
    span: 34,
    height: 4.5,
    shoreHeight: 14,
    beachWidth: 1.2,
    surfWidth: 1.5,
    shallowsWidth: 4.2,
    // Volcanic: dark basalt headlands, dry scrub, pale coral sand.
    palette: { sand: "#e8d8b4", rock: "#655e50", lowland: "#657747", highland: "#7b8050" },
  },
  {
    id: "boipeba",
    place: "Ilha de Boipeba, Bahia, Brazil",
    bounds: { west: -39.1, south: -13.75, east: -38.8, north: -13.4 },
    elevationZoom: 13,
    elevationGrid: 192,
    smallestRing: 0.01,
    group: 0.25,
    span: 27,
    height: 1.3,
    shoreHeight: 8,
    beachWidth: 1.5,
    surfWidth: 1.8,
    shallowsWidth: 5.6,
    // Low and sandy: long beaches, mangrove and restinga behind them.
    palette: { sand: "#ecdfbe", rock: "#847a69", lowland: "#416745", highland: "#6a8050" },
  },
  {
    id: "abrolhos",
    place: "Arquipélago de Abrolhos, Bahia, Brazil",
    bounds: { west: -38.76, south: -18.02, east: -38.66, north: -17.92 },
    elevationZoom: 15,
    elevationGrid: 192,
    smallestRing: 0.01,
    group: 4,
    span: 31,
    height: 2.5,
    shoreHeight: 3,
    beachWidth: 0.65,
    surfWidth: 1.9,
    shallowsWidth: 6,
    // The lighthouse on Ilha de Santa Bárbara, standing in as the placeholder
    // Feature until the Abrolhos issue models it.
    features: [{ name: "Farol de Abrolhos", model: "placeholder", lon: -38.6942, lat: -17.9647, scale: 1 }],
    // Reef-fringed basalt tables: bare rock, thin grass, almost no beach.
    palette: { sand: "#e0d2af", rock: "#54504a", lowland: "#8d9260", highland: "#7a8156" },
  },
  {
    id: "ilha-grande",
    place: "Ilha Grande, Rio de Janeiro, Brazil",
    bounds: { west: -44.45, south: -23.32, east: -43.98, north: -22.98 },
    elevationZoom: 12,
    elevationGrid: 192,
    smallestRing: 0.006,
    group: 0.2,
    span: 39,
    height: 4.3,
    shoreHeight: 14,
    beachWidth: 0.9,
    surfWidth: 1.45,
    shallowsWidth: 3.6,
    // Atlantic forest to the waterline, with granite showing on the ridges.
    palette: { sand: "#e5d5b6", rock: "#6f675e", lowland: "#365d3d", highland: "#60774c" },
  },
];
