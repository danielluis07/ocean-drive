export type OceanConfiguration = {
  vessels: { balanced: string; low: string };
  firstStation: { position: [number, number, number]; name: string };
};

export const oceanConfiguration: OceanConfiguration = {
  vessels: {
    balanced: "/models/research-vessel-balanced.v1.glb",
    low: "/models/research-vessel-low.v1.glb",
  },
  firstStation: { position: [0, 0, -42], name: "Pulso de Calor" },
};
