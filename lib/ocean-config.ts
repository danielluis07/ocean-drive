import type { StationId } from "@/content/editorial";

export type OceanStation = {
  id: StationId;
  position: [number, number, number];
  name: string;
  color: string;
};

export type OceanConfiguration = {
  vessels: { balanced: string; low: string };
  stations: OceanStation[];
};

export const oceanConfiguration: OceanConfiguration = {
  vessels: {
    balanced: "/models/research-vessel-balanced.v1.glb",
    low: "/models/research-vessel-low.v1.glb",
  },
  stations: [
    { id: "pulso-de-calor", position: [0, 0, -42], name: "Pulso de Calor", color: "#ffdda2" },
    { id: "corais-sob-estresse", position: [-14, 0, -76], name: "Corais sob Estresse", color: "#ecc5ac" },
    { id: "respostas-desiguais", position: [14, 0, -76], name: "Respostas Desiguais", color: "#b3ded5" },
    { id: "convergencia", position: [0, 0, -112], name: "Convergência", color: "#f4e9bc" },
  ],
};
