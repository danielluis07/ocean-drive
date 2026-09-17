import type { StopId } from "@/content/editorial";

export type OceanStop = {
  id: StopId;
  // Where the Ship rests on the Charted Route.
  anchorage: [number, number];
  // The placeholder Landmark beside the anchorage; Stop 00 is open water.
  landmark: [number, number] | null;
  color: string;
};

export type OceanConfiguration = {
  vessels: { balanced: string; low: string };
  stops: OceanStop[];
};

// Fictional Voyage Waters with compressed distances, ordered along the route.
// The layout echoes the coast's order, not geographic measurement.
export const oceanConfiguration: OceanConfiguration = {
  vessels: {
    balanced: "/models/research-vessel-balanced.v2.glb",
    low: "/models/research-vessel-low.v2.glb",
  },
  stops: [
    { id: "partida", anchorage: [0, 0], landmark: null, color: "#f4f7f8" },
    { id: "fernando-de-noronha", anchorage: [48, -112], landmark: [34, -120], color: "#ffdda2" },
    { id: "boipeba", anchorage: [-22, -224], landmark: [-36, -232], color: "#ecc5ac" },
    { id: "abrolhos", anchorage: [29, -328], landmark: [15, -336], color: "#b3ded5" },
    { id: "ilha-grande", anchorage: [-26, -448], landmark: [-40, -456], color: "#f4e9bc" },
  ],
};
