// The Landmark pipeline's authored configuration: one entry per island Stop.
// Adding an island to Voyage Waters is one entry here, plus its placement in
// `lib/ocean-config.ts`. `bun run landmarks:fetch` records the open source data
// for every entry under `data/landmarks/`, and `bun run landmarks:build` turns
// those records into the shipped meshes without touching the network.
import type { StopId } from "@/content/editorial";
import type { LandmarkPalette } from "@/lib/landmark-surface";

export type GeographicBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
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
  // World units from sea level to the island's real summit, at `span`'s scale.
  height: number;
  // Metres of real elevation that read as beach rather than hillside.
  shoreHeight: number;
  // World units of water the surf line covers outside the shoreline.
  surfWidth: number;
  // How the island is shaded by height and slope.
  palette: LandmarkPalette;
};

// Triangles each quality tier may spend on one Landmark, shared between the
// island surface, the skirt that hides its underside, and the surf line.
export const landmarkBudget = {
  balanced: { triangles: 4_400, bytes: 76 * 1024 },
  low: { triangles: 1_300, bytes: 28 * 1024 },
} as const;

export const landmarkSources: LandmarkSource[] = [
  {
    id: "fernando-de-noronha",
    place: "Fernando de Noronha, Pernambuco, Brazil",
    bounds: { west: -32.52, south: -3.94, east: -32.32, north: -3.76 },
    elevationZoom: 13,
    elevationGrid: 192,
    smallestRing: 0.004,
    group: 0.6,
    span: 24,
    height: 2.6,
    shoreHeight: 26,
    surfWidth: 2.2,
    // Volcanic: dark basalt headlands, dry scrub, pale coral sand.
    palette: { sand: "#e8d8b4", rock: "#4a4640", lowland: "#7b8a55", highland: "#61764a" },
  },
  {
    id: "boipeba",
    place: "Ilha de Boipeba, Bahia, Brazil",
    bounds: { west: -39.1, south: -13.75, east: -38.8, north: -13.4 },
    elevationZoom: 13,
    elevationGrid: 192,
    smallestRing: 0.01,
    group: 0.25,
    span: 19,
    height: 0.9,
    shoreHeight: 8,
    surfWidth: 2.6,
    // Low and sandy: long beaches, mangrove and restinga behind them.
    palette: { sand: "#ecdfbe", rock: "#847a69", lowland: "#6d8f5b", highland: "#55764a" },
  },
  {
    id: "abrolhos",
    place: "Arquipélago de Abrolhos, Bahia, Brazil",
    bounds: { west: -38.76, south: -18.02, east: -38.66, north: -17.92 },
    elevationZoom: 15,
    elevationGrid: 192,
    smallestRing: 0.01,
    group: 4,
    span: 22,
    height: 1.8,
    shoreHeight: 7,
    surfWidth: 3.4,
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
    span: 28,
    height: 2.4,
    shoreHeight: 30,
    surfWidth: 2.4,
    // Atlantic forest to the waterline, with granite showing on the ridges.
    palette: { sand: "#e5d5b6", rock: "#6f675e", lowland: "#4b7248", highland: "#3a5c3c" },
  },
];
