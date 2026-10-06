import { createHash } from "node:crypto";

// Maintenance only. The build reads these exact retained bytes offline.
const sources = [
  { file: "surface.png", url: "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_8192.png" },
  { file: "clouds.tif", url: "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_8192.tif" },
  { file: "source.html", url: "https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/" },
  { file: "usage.html", url: "https://www.nasa.gov/nasa-brand-center/images-and-media/" },
];

const records = [];
for (const source of sources) {
  const response = await fetch(source.url);
  if (!response.ok) throw new Error(`${source.url}: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  await Bun.write(`data/earth/${source.file}`, bytes);
  records.push({ ...source, retrieved: new Date().toISOString().slice(0, 10), sha256: createHash("sha256").update(bytes).digest("hex") });
}
await Bun.write("data/earth/sources.json", JSON.stringify(records, null, 2) + "\n");
console.log("Recorded NASA Blue Marble imagery and source/usage evidence.");
