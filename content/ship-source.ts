// Retained upstream artwork; the build never downloads a model or texture.
export const shipSource = {
  path: "data/ship/cruise-ship.glb",
  title: "Cruise ship",
  creator: "Poly by Google",
  url: "https://poly.pizza/m/dgLCxDWhnZQ",
  download: "https://static.poly.pizza/ec84612a-823d-40e7-86c0-236d03c4bad5.glb",
  license: "CC-BY-3.0",
  licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
  retrieved: "2026-09-19",
  proof: "docs/third-party/ship-model.md",
} as const;

// Raw bytes are enforced too: static GLBs need not be served with compression.
export const shipBudget = {
  balanced: { triangles: 12_000, bytes: 250 * 1024, transfer: 250 * 1024, materials: 2, textures: 1, textureSize: 512, draws: 2 },
  low: { triangles: 4_000, bytes: 120 * 1024, transfer: 120 * 1024, materials: 2, textures: 1, textureSize: 256, draws: 2 },
} as const;
