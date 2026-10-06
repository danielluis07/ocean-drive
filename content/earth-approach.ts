// Pixel domains are nested crops of one orthographic projection, centred on
// open water east of Fernando de Noronha. CSS must retain these scale limits.
export const earthApproach = {
  centre: { longitude: -30, latitude: -4 },
  durationMs: 2400,
  essentialBytes: 450 * 1024,
  optionalBytes: 250 * 1024,
  levels: [
    { id: "globe", url: "/images/earth-globe.v1.webp", size: 4096, crop: 1, maxZoom: 2.2, essential: true },
    { id: "atlantic", url: "/images/earth-atlantic.v1.webp", size: 4096, crop: 3, maxZoom: 6.8, essential: false },
    { id: "water", url: "/images/earth-water.v1.webp", size: 4096, crop: 14, maxZoom: 30, essential: false },
  ],
} as const;
