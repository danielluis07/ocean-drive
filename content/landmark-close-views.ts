import type { StopId } from "@/content/editorial";

export type LandmarkCloseView = {
  pitch: number;
  // Clockwise from north; the camera looks along this bearing at the island.
  bearing: number;
  distance: number;
  targetHeight: number;
};

// Authored framing for diagnostic art review and the future #72 interaction.
export const landmarkCloseViews: Partial<Record<StopId, LandmarkCloseView>> = {
  "fernando-de-noronha": { pitch: 48, bearing: 0, distance: .5, targetHeight: 1 },
  boipeba: { pitch: 48, bearing: 0, distance: .5, targetHeight: .7 },
};
