// Records the open source data every Landmark is built from. This is the only
// step that touches the network, and it is a maintenance command: it writes
// `data/landmarks/<id>.json`, those records are committed, and
// `scripts/generate-landmarks.ts` rebuilds the meshes from them offline.
//
// Coastlines come from OpenStreetMap's `natural=coastline` ways through the
// Overpass API (ODbL-1.0). Elevation comes from the Terrain Tiles open dataset
// on AWS in Mapzen's `terrarium` encoding, which over the Brazilian coast
// carries SRTM measurements courtesy of the U.S. Geological Survey.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { landmarkSources, type GeographicBounds, type LandmarkSource } from "@/content/landmark-sources";
import { ringArea, type Ring } from "@/lib/landmark-geometry";

const overpass = "https://overpass-api.de/api/interpreter";
const terrain = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium";
const agent = "ocean-drive-landmark-pipeline/1.0 (https://github.com/danielluis07/ocean-drive)";
const retrieved = new Date().toISOString().slice(0, 10);

function coastlineQuery(bounds: GeographicBounds) {
  const box = [bounds.south, bounds.west, bounds.north, bounds.east].map((degrees) => degrees.toFixed(4)).join(",");
  return `[out:json][timeout:180];way["natural"="coastline"](${box});out geom;`;
}

type OverpassWay = { id: number; tags?: Record<string, string>; geometry: { lat: number; lon: number }[] };

function degreeBounds(rings: Ring[]): GeographicBounds {
  const lon = rings.flat().map(([value]) => value);
  const lat = rings.flat().map(([, value]) => value);
  return { west: Math.min(...lon), east: Math.max(...lon), south: Math.min(...lat), north: Math.max(...lat) };
}

// Overpass is a shared public service and sheds load with a 429 or a 504.
async function ask(url: string, init?: RequestInit) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, init);
    if (response.ok) return response;
    if (attempt === 5 || ![429, 502, 503, 504].includes(response.status))
      throw new Error(`${url} refused the request: ${response.status}`);
    await Bun.sleep(attempt * 15_000);
  }
}

async function fetchCoastline(source: LandmarkSource) {
  const query = coastlineQuery(source.bounds);
  const response = await ask(overpass, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": agent },
    body: new URLSearchParams({ data: query }),
  });
  const document = (await response.json()) as { osm3s: { timestamp_osm_base: string }; elements: OverpassWay[] };
  // OSM draws coastline as directed ways with the land on the left, and a large
  // island is many ways joined end to end rather than one closed way. Chain them
  // on their shared end nodes: a chain that returns to its start encloses an
  // island, while a mainland shore leaves the box and stays open. Counting the
  // signed area then separates islands from inner water bodies.
  const key = (point: { lat: number; lon: number }) => `${point.lat}/${point.lon}`;
  const starting = new Map(document.elements.map((way) => [key(way.geometry[0]), way]));
  const used = new Set<number>();
  const chains: { ways: OverpassWay[]; geometry: { lat: number; lon: number }[] }[] = [];
  for (const start of document.elements) {
    if (used.has(start.id)) continue;
    const ways = [start];
    const geometry = [...start.geometry];
    used.add(start.id);
    for (;;) {
      const next = starting.get(key(geometry[geometry.length - 1]));
      if (!next || used.has(next.id)) break;
      used.add(next.id);
      ways.push(next);
      geometry.push(...next.geometry.slice(1));
    }
    chains.push({ ways, geometry });
  }
  const rings = chains
    .filter((chain) => chain.geometry.length > 3 && key(chain.geometry[0]) === key(chain.geometry[chain.geometry.length - 1]))
    .map((chain) => ({
      ways: chain.ways.map((way) => way.id),
      name: chain.ways.find((way) => way.tags?.name)?.tags?.name,
      ring: chain.geometry.slice(0, -1).map(({ lon, lat }): [number, number] => [
        Number(lon.toFixed(6)),
        Number(lat.toFixed(6)),
      ]) as Ring,
    }))
    .filter((island) => ringArea(island.ring) > 0)
    .sort((a, b) => ringArea(b.ring) - ringArea(a.ring));
  if (!rings.length) throw new Error(`No island coastline recorded for ${source.id}`);
  // The Landmark is the largest island and the company it keeps: rings too
  // small to read from the camera, and neighbours that only share the query
  // box, are left out so the outline is the place and not its whole bay.
  const largest = ringArea(rings[0].ring);
  const around = degreeBounds([rings[0].ring]);
  const reach = {
    lon: ((around.east - around.west) * (1 + source.group * 2)) / 2,
    lat: ((around.north - around.south) * (1 + source.group * 2)) / 2,
  };
  const centre = { lon: (around.west + around.east) / 2, lat: (around.south + around.north) / 2 };
  const kept = rings.filter((island) => {
    if (ringArea(island.ring) < largest * source.smallestRing) return false;
    const box = degreeBounds([island.ring]);
    return (
      box.west > centre.lon - reach.lon &&
      box.east < centre.lon + reach.lon &&
      box.south > centre.lat - reach.lat &&
      box.north < centre.lat + reach.lat
    );
  });
  return {
    source: "OpenStreetMap `natural=coastline` ways, retrieved through the Overpass API",
    endpoint: overpass,
    query,
    retrieved,
    licence: "ODbL-1.0",
    attribution: "© OpenStreetMap contributors, ODbL 1.0",
    databaseTimestamp: document.osm3s.timestamp_osm_base,
    islands: kept.map((island) => ({ ways: island.ways, ...(island.name ? { name: island.name } : {}), ring: island.ring })),
  };
}

const tileX = (lon: number, zoom: number) => ((lon + 180) / 360) * 2 ** zoom;
const tileY = (lat: number, zoom: number) =>
  ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** zoom;

async function fetchElevation(source: LandmarkSource, bounds: GeographicBounds) {
  const { elevationZoom: zoom, elevationGrid: side } = source;
  const first = { x: Math.floor(tileX(bounds.west, zoom)), y: Math.floor(tileY(bounds.north, zoom)) };
  const last = { x: Math.floor(tileX(bounds.east, zoom)), y: Math.floor(tileY(bounds.south, zoom)) };
  const columns = last.x - first.x + 1;
  const rows = last.y - first.y + 1;
  const tiles: string[] = [];
  const mosaic = new Int16Array(columns * 256 * rows * 256);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const url = `${terrain}/${zoom}/${first.x + column}/${first.y + row}.png`;
      tiles.push(url);
      const response = await ask(url, { headers: { "user-agent": agent } });
      const { data } = await sharp(Buffer.from(await response.arrayBuffer()))
        .raw()
        .toBuffer({ resolveWithObject: true });
      // Mapzen's terrarium encoding: metres = red * 256 + green + blue / 256 - 32768.
      const channels = data.length / (256 * 256);
      for (let y = 0; y < 256; y++) {
        for (let x = 0; x < 256; x++) {
          const pixel = (y * 256 + x) * channels;
          const metres = data[pixel] * 256 + data[pixel + 1] + data[pixel + 2] / 256 - 32768;
          mosaic[(row * 256 + y) * columns * 256 + column * 256 + x] = Math.round(metres);
        }
      }
    }
  }
  // Resample to one square grid over the recorded bounds, so the build step
  // needs no projection maths and no image decoding.
  const metres = new Int16Array(side * side);
  for (let row = 0; row < side; row++) {
    const lat = bounds.north + ((bounds.south - bounds.north) * (row + 0.5)) / side;
    const y = Math.min(rows * 256 - 1, Math.max(0, Math.round((tileY(lat, zoom) - first.y) * 256 - 0.5)));
    for (let column = 0; column < side; column++) {
      const lon = bounds.west + ((bounds.east - bounds.west) * (column + 0.5)) / side;
      const x = Math.min(columns * 256 - 1, Math.max(0, Math.round((tileX(lon, zoom) - first.x) * 256 - 0.5)));
      metres[row * side + column] = mosaic[y * columns * 256 + x];
    }
  }
  return {
    source: "Terrain Tiles (Mapzen `terrarium` encoding), AWS Open Data Registry",
    dataset: "https://registry.opendata.aws/terrain-tiles/",
    underlying: "SRTM 1 Arc-Second Global, courtesy of the U.S. Geological Survey",
    attributionNotice: "https://github.com/tilezen/joerd/blob/master/docs/attribution.md",
    licence: "Public domain (U.S. Government work), redistributed without restriction",
    attribution: "Elevation data: SRTM courtesy of the U.S. Geological Survey, via Terrain Tiles on AWS",
    retrieved,
    zoom,
    tiles,
    // The square the grid covers, drawn around the kept coastline itself.
    bounds,
    // Row-major from north to south, west to east, in whole metres.
    grid: side,
    encoding: "base64 Int16 little-endian",
    metres: Buffer.from(metres.buffer).toString("base64"),
  };
}

await mkdir("data/landmarks", { recursive: true });
const only = process.argv.slice(2);
for (const source of landmarkSources) {
  if (only.length && !only.includes(source.id)) continue;
  const coastline = await fetchCoastline(source);
  // The elevation grid covers the coastline it belongs to, with a margin, so
  // its resolution follows the island rather than the size of the query box.
  const around = degreeBounds(coastline.islands.map((island) => island.ring));
  const margin = Math.max(around.east - around.west, around.north - around.south) * 0.04;
  const elevation = await fetchElevation(source, {
    west: around.west - margin,
    east: around.east + margin,
    south: around.south - margin,
    north: around.north + margin,
  });
  const record = {
    schema: 1,
    id: source.id,
    place: source.place,
    query: source.bounds,
    coastline,
    elevation,
  };
  await Bun.write(`data/landmarks/${source.id}.json`, JSON.stringify(record, null, 2) + "\n");
  const summit = Math.max(...new Int16Array(Buffer.from(elevation.metres, "base64").buffer));
  console.log(
    `${source.id}: ${coastline.islands.length} island rings ` +
      `(${coastline.islands.reduce((sum, island) => sum + island.ring.length, 0)} nodes), ` +
      `${elevation.tiles.length} elevation tiles at z${elevation.zoom}, summit ${summit} m`,
  );
}
