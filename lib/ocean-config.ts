import type { StopId } from "@/content/editorial";
import landmarks from "@/content/landmarks.json";
import ship from "@/content/ship.json";

export type LandmarkVariant = { url: string; triangles: number; bytes: number };

export type Landmark = {
  id: string;
  place: string;
  span: number;
  // Half the island's width and depth in world units, from its built mesh.
  extent: { x: number; z: number };
  // Half the side of the square about the centre the island fits inside, which
  // the Stop Card keeps clear of.
  radius: number;
  islands: number;
  summitMetres: number;
  surfWidth: number;
  shallowsWidth: number;
  // What stands on the island at Balanced and High, expanded into one draw.
  features: { instances: number; triangles: number };
  variants: { balanced: LandmarkVariant; low: LandmarkVariant };
};

export type OceanStop = {
  id: StopId;
  // Where the Ship rests on the Charted Route.
  anchorage: [number, number];
  // The Landmark's centre, north of the anchorage; Stop 00 is open water.
  landmark: [number, number] | null;
};

export type OceanConfiguration = {
  vessels: { balanced: string; low: string };
  // The shared Feature file: every model placed on a Landmark and where each
  // instance stands. Balanced and High request it; Low never does.
  features: string;
  stops: OceanStop[];
  landmarks: Record<string, Landmark>;
};

// Fictional Voyage Waters with compressed distances, ordered along the route.
// The layout echoes the coast's order, not geographic measurement.
//
// The Charted Route runs west, and every Landmark lies due north of its
// anchorage, so the Ship passes along the island's southern shore rather than
// sailing at it, and the near top-down camera frames the whole island above the
// Ship with the Stop Card clear to the side. `tests/landmark-placement.test.ts`
// holds both of those as checks.
export const oceanConfiguration: OceanConfiguration = {
  vessels: {
    balanced: ship.variants.balanced.url,
    low: ship.variants.low.url,
  },
  features: landmarks.features.url,
  stops: [
    { id: "partida", anchorage: [0, 0], landmark: null },
    { id: "fernando-de-noronha", anchorage: [-112, -12], landmark: [-112, -30] },
    { id: "boipeba", anchorage: [-224, 10], landmark: [-224, -9] },
    { id: "abrolhos", anchorage: [-336, -8], landmark: [-336, -15] },
    { id: "ilha-grande", anchorage: [-448, 12], landmark: [-448, -2.5] },
  ],
  landmarks: Object.fromEntries(landmarks.landmarks.map((landmark) => [landmark.id, landmark as Landmark])),
};
