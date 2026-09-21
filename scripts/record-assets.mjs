import { assetSha256 as hash } from '@/lib/asset-provenance';
import { shipSource } from '@/content/ship-source';
import ship from '@/content/ship.json';
const fontSources = await Bun.file('docs/third-party/fonts/sources.json').json();
const assets = [];
const shipRights = {
 sourceKind: 'licensed-model', creator: shipSource.creator, source: shipSource.url,
 retrieved: shipSource.retrieved, rights: 'CC-BY-3.0: commercial use, adaptation and redistribution with attribution and retained licence; source mesh and texture by Poly by Google', proof: shipSource.proof,
};
for (const path of [shipSource.path, 'docs/third-party/ship/source.html', 'docs/third-party/ship/CC-BY-3.0.txt']) {
 assets.push({path, kind: 'source-data', ...shipRights, transformations: 'Retained upstream bytes; source-page snapshot and Creative Commons legal code retained as rights evidence', essential: false, experience: false, sha256: await hash(path)});
}
for (const path of ['content/ship-source.ts', 'content/ship.json', 'scripts/build-ship.ts']) {
 assets.push({path, kind: 'pipeline', sourceKind: 'project-source', creator: 'Ocean Drive project contributors', source: 'scripts/build-ship.ts', retrieved: shipSource.retrieved, rights: 'Project-authored adaptation pipeline; upstream artwork remains CC-BY-3.0', proof: shipSource.proof, transformations: path.endsWith('.json') ? 'Measured output from the offline Ship build' : 'Authored Ship configuration and reproducible glTF adaptation pipeline', essential: true, experience: false, sha256: await hash(path)});
}
// The open coastline and elevation data the Landmarks are built from, recorded
// once by scripts/fetch-landmark-sources.ts and committed. See
// docs/third-party/open-geodata.md.
const geodata = (retrieved) => ({
 sourceKind: 'open-data',
 creator: 'OpenStreetMap contributors (coastline); U.S. Geological Survey (SRTM elevation), redistributed as Terrain Tiles on AWS',
 source: 'https://overpass-api.de/api/interpreter and https://s3.amazonaws.com/elevation-tiles-prod/terrarium',
 retrieved,
 rights: 'Coastline © OpenStreetMap contributors under ODbL-1.0, attributed in the experience and in docs/third-party/graphics-notices.md; SRTM elevation is a U.S. Government work in the public domain',
 proof: 'docs/third-party/open-geodata.md',
});
const landmarkRecords = new Map();
for await (const file of new Bun.Glob('*.json').scan({cwd:'data/landmarks',onlyFiles:true})) {
 const path = `data/landmarks/${file.replaceAll('\\','/')}`;
 const record = await Bun.file(path).json();
 landmarkRecords.set(record.id, record);
 assets.push({path, kind: 'source-data', ...geodata(record.coastline.retrieved), transformations: 'Coastline ways chained into closed island rings, filtered by winding, size and neighbourhood, and rounded to six decimals; terrarium elevation tiles decoded to metres and resampled to one square grid over those rings', essential: false, experience: false, sha256: await hash(path)});
}
for await (const file of new Bun.Glob('**/*').scan({cwd:'public',onlyFiles:true})) {
 const path = `public/${file.replaceAll('\\','/')}`;
 const url = '/'+file.replaceAll('\\','/');
 const vessel = Object.values(ship.variants).some((variant) => variant.url === url);
 const landmark = /\/landmark-(.+)-(balanced|low)\.v\d+\.glb$/.exec(path);
 const illustrative = path.startsWith('public/images/');
 if (vessel) {
  assets.push({path, url, kind: 'authored', ...shipRights, transformations: 'Cruise ship adapted as Maré Mansa: rotated to -Z, broadened beam, lowered superstructure and waterline, UV-aware LOD simplification, quantized vertex attributes, embedded 512px Balanced / 256px Low JPEG atlas, one opaque material; built offline by scripts/build-ship.ts', essential: true, experience: true, sha256: await hash(path)});
  continue;
 }
 if (landmark) {
  assets.push({path, url, kind: 'authored', ...geodata(landmarkRecords.get(landmark[1])?.coastline.retrieved), source: 'scripts/generate-landmarks.ts', transformations: `Deterministic GLB v2 export at the ${landmark[2]} tier: recorded coastline rings projected, scaled and simplified, triangulated, lifted by the recorded elevation grid, raised above the swell, shaded by height, slope and distance inland, with a skirt and a surf band around the shoreline`, essential: true, experience: true, sha256: await hash(path)});
  continue;
 }
 if (illustrative) {
  assets.push({path, url, kind: 'photographic-image', sourceKind: 'ai-generated', creator: 'OpenAI GPT Image, commissioned by the project owner', source: 'OpenAI built-in image generation', retrieved: '2026-09-21', rights: "Generated under the project owner's OpenAI account; usage rights per OpenAI's terms for commissioned output", proof: 'docs/third-party/ai-generated-images.md', transformations: 'AI-generated PNG resized and cropped to 960×720 then re-encoded as WebP with Sharp; no other edits', essential: false, experience: true, sha256: await hash(path)});
  continue;
 }
 assets.push({path, url, kind: 'authored', sourceKind: 'project-source', creator: 'Ocean Drive project contributors', source: 'scripts/generate-identity.mjs', retrieved: '2026-09-15', rights: 'Project-authored source contribution; no imported artwork', proof: 'docs/third-party/project-assets.md', transformations: 'Deterministic SVG paths and Sharp PNG rasterization', essential: false, experience: false, sha256: await hash(path)});
}
for (const font of fontSources) assets.push({path: font.file, kind:'font', sourceKind:'ofl-font', ...font, rights:'OFL-1.1 commercial use, modification and redistribution with retained notice', essential:false, experience:true, sha256:await hash(font.file)});
for (const path of ['components/voyage/travessia-mark.tsx','lib/ocean-surface.ts','lib/ocean-lighting.ts','lib/ocean-daylight.ts','lib/landmark-surf.ts','lib/landmark-material.ts']) assets.push({path, kind:'procedural', sourceKind:'project-source', creator:'Ocean Drive project contributors', source:path, retrieved:path === 'lib/ocean-daylight.ts' ? '2026-09-20' : path === 'lib/landmark-material.ts' ? '2026-09-19' : '2026-09-15', rights:'Project-authored source contribution; no imported artwork', proof:'docs/third-party/project-assets.md', transformations:'Compiled by Next into same-origin HTML/application code', essential:path.includes('surface') || path.includes('daylight'), experience:true, sha256:await hash(path)});
// The Landmark pipeline's authored configuration and the record its build
// writes, hash-pinned so a mesh can never drift from what CI was shown.
for (const path of ['content/landmark-sources.ts','content/landmarks.json']) assets.push({path, kind:'pipeline', sourceKind:'project-source', creator:'Ocean Drive project contributors', source:'scripts/generate-landmarks.ts', retrieved:'2026-09-17', rights:'Project-authored source contribution; no imported artwork', proof:'docs/third-party/open-geodata.md', transformations:path.endsWith('.json') ? 'Written by the Landmark build from the recorded source data' : 'Authored configuration, compiled by Next into same-origin application code', essential:true, experience:true, sha256:await hash(path)});
assets.sort((a,b)=>a.path.localeCompare(b.path));
await Bun.write('content/asset-manifest.json',JSON.stringify({schema:1, assets},null,2)+'\n');
console.log(`Recorded ${assets.length} asset provenance entries.`);
