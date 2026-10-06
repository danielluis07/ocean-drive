import sharp from "sharp";
import { createHash } from "node:crypto";
import { earthApproach } from "@/content/earth-approach";

sharp.concurrency(1);
const records: { file: string; sha256: string }[] = await Bun.file("data/earth/sources.json").json();
for (const source of records) {
  const bytes = await Bun.file(`data/earth/${source.file}`).bytes();
  if (createHash("sha256").update(bytes).digest("hex") !== source.sha256) throw new Error(`Earth source drift: ${source.file}`);
}
const surface = await sharp("data/earth/surface.png").removeAlpha().raw().toBuffer({ resolveWithObject: true });
const clouds = await sharp("data/earth/clouds.tif").removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
const radians = Math.PI / 180;
const latitude = earthApproach.centre.latitude * radians;
const longitude = earthApproach.centre.longitude * radians;
// Calibrated to the opening ocean camera. No colour sampled from the satellite
// is evidence of current water conditions. Grading and atmosphere are authored.
const background = [7, 16, 25];
const water = [9, 24, 40];

function sample(map: typeof surface, lon: number, lat: number, channel: number) {
  const x = ((lon / (2 * Math.PI) + 0.5) * map.info.width + map.info.width) % map.info.width;
  const y = Math.max(0, Math.min(map.info.height - 1.001, (0.5 - lat / Math.PI) * map.info.height));
  const left = Math.floor(x), top = Math.floor(y), fx = x - left, fy = y - top;
  const pixel = (dx: number, dy: number) => map.data[((top + dy) * map.info.width + (left + dx) % map.info.width) * map.info.channels + channel];
  return (pixel(0, 0) * (1 - fx) + pixel(1, 0) * fx) * (1 - fy) + (pixel(0, 1) * (1 - fx) + pixel(1, 1) * fx) * fy;
}

let optionalBytes = 0;
for (const level of earthApproach.levels) {
  const size = level.size;
  const pixels = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px = ((x + 0.5) / size * 2 - 1) / level.crop;
    const py = (1 - (y + 0.5) / size * 2) / level.crop;
    const radius2 = px * px + py * py;
    const index = (y * size + x) * 3;
    if (radius2 >= 1) {
      const rim = Math.exp(-Math.pow((Math.sqrt(radius2) - 1) / 0.007, 2)) * 0.3;
      for (let c = 0; c < 3; c++) pixels[index + c] = background[c] + rim * [34, 100, 155][c];
      continue;
    }
    // Inverse orthographic projection in a camera basis; all three levels
    // sample the same geographic camera basis; CSS pans the coastal crop offshore.
    const z = Math.sqrt(1 - radius2);
    const lat = Math.asin(py * Math.cos(latitude) + z * Math.sin(latitude));
    const lon = longitude + Math.atan2(px, z * Math.cos(latitude) - py * Math.sin(latitude));
    const rgb = [0, 1, 2].map(c => sample(surface, lon, lat, c));
    const ocean = rgb[2] > rgb[0] * 1.4 && rgb[2] > rgb[1] * 1.15;
    const light = 0.62 + 0.38 * Math.max(0, -px * 0.25 + py * 0.3 + z * 0.92);
    const cloud = level.id === "globe" ? sample(clouds, lon, lat, 0) / 255 : 0;
    // Across the close level (including the entire final viewport), real
    // open ocean becomes exactly the scene's deep-water reference colour.
    const plain = level.id === "water" ? Math.max(0, Math.min(1, (0.14 - Math.sqrt(radius2)) / 0.04)) : 0;
    for (let c = 0; c < 3; c++) {
      const graded = ocean ? water[c] + (rgb[c] - [2, 20, 45][c]) * 0.12 : rgb[c] * light * 0.87;
      const cloudy = graded * (1 - cloud * 0.88) + [211, 222, 229][c] * cloud * 0.88 * light;
      pixels[index + c] = Math.max(0, Math.min(255, cloudy * (1 - plain) + water[c] * plain));
    }
  }
  const output = await sharp(pixels, { raw: { width: size, height: size, channels: 3 } }).webp({ quality: level.essential ? 25 : 55, effort: 6 }).toBuffer();
  if (level.essential && output.length > earthApproach.essentialBytes) throw new Error(`Globe payload: ${output.length} > ${earthApproach.essentialBytes}`);
  if (!level.essential) optionalBytes += output.length;
  await Bun.write(`public${level.url}`, output);
  console.log(`${level.id}: ${size} px, ${output.length} bytes`);
}
if (optionalBytes > earthApproach.optionalBytes) throw new Error(`Optional Approach payload: ${optionalBytes} > ${earthApproach.optionalBytes}`);
