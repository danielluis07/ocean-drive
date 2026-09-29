// Authored protection regions in Del Mar's transformed world coordinates.
// Keep deck breaks and the bow tip while spending simplification on broad hull
// panels. These constraints are applied only to Low and remain source-relative.
export const shipLowArt = {
  targetTriangles: 3200,
  error: 0.04,
  uvWeight: 1,
  textureQuality: 75,
  regions: [
    { name: "bow and foredeck", min: [-1.04, 0.66, -3.21], max: [1.04, 0.69, -1.9] },
    { name: "observation lounge", min: [-1.11, 1.16, -1.88], max: [1.11, 1.44, -0.88] },
    { name: "port tenders", min: [-1.28, 0.37, -1.25], max: [-1.01, 0.51, 2.44] },
    { name: "starboard tenders", min: [1.01, 0.37, -1.25], max: [1.28, 0.51, 2.44] },
    { name: "upper deck and aft steps", min: [-1.18, 1.16, -1.21], max: [1.18, 1.19, 3.05] },
  ],
  aoRadius: 0.65,
} as const;
