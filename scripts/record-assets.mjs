import { assetSha256 as hash } from '@/lib/asset-provenance';
import { shipSource } from '@/content/ship-source';
import ship from '@/content/ship.json';
import landmarks from '@/content/landmarks.json';
import { featureFile, landmarkSources } from '@/content/landmark-sources';
import { earthApproach } from '@/content/earth-approach';
const fontSources = await Bun.file('docs/third-party/fonts/sources.json').json();
const assets = [];
const audioRights = { sourceKind: 'project-source', creator: 'Ocean Drive project contributors', source: 'scripts/build-ambient-sound.ts', retrieved: '2026-10-06', rights: 'Original procedural audio dedicated to the public domain under CC0-1.0; generator remains project source', proof: 'docs/third-party/ambient-sound.md' };
for (const path of ['scripts/build-ambient-sound.ts', 'docs/third-party/ambient-sound.md']) assets.push({path, kind:'pipeline', ...audioRights, transformations:'Original deterministic circular noise filtering and periodic engine harmonics; no imported samples', essential:false, experience:false, sha256:await hash(path)});
const earthRights = {
 sourceKind: 'open-data', creator: 'NASA Goddard Space Flight Center; Reto Stöckli; Robert Simmon',
 source: 'https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/',
 retrieved: '2026-10-06', rights: 'NASA U.S. Government imagery, public domain; retained NASA media usage guidelines; no endorsement implied',
 proof: 'docs/third-party/nasa-blue-marble.md',
};
for await (const file of new Bun.Glob('*').scan({cwd:'data/earth',onlyFiles:true})) {
 const path = `data/earth/${file}`;
 assets.push({path, kind:'source-data', ...earthRights, transformations:'Retained upstream surface/cloud bytes, source/usage page snapshots or SHA-256 maintenance ledger', essential:false, experience:false, sha256:await hash(path)});
}
for (const path of ['content/earth-approach.ts','scripts/build-earth.ts','scripts/fetch-earth-sources.ts','docs/third-party/nasa-blue-marble.md']) {
 assets.push({path, kind:'pipeline', sourceKind:'project-source', creator:'Ocean Drive project contributors', source:'scripts/build-earth.ts', retrieved:earthRights.retrieved, rights:'Project-authored orthographic projection and grading of public-domain NASA imagery', proof:earthRights.proof, transformations:'Reproducible offline nested crops; authored atmosphere, navy grading and deep-water hand-off; network confined to maintenance fetch', essential:false, experience:false, sha256:await hash(path)});
}
const shipRights = {
 sourceKind: 'licensed-model', creator: shipSource.creator, source: shipSource.url,
 retrieved: shipSource.retrieved, rights: 'CC-BY-3.0: commercial use, adaptation and redistribution with attribution and retained licence; source mesh and texture by Poly by Google', proof: shipSource.proof,
};
for (const path of [shipSource.path, 'docs/third-party/ship/source.html', 'docs/third-party/ship/CC-BY-3.0.txt']) {
 assets.push({path, kind: 'source-data', ...shipRights, transformations: 'Retained upstream bytes; source-page snapshot and Creative Commons legal code retained as rights evidence', essential: false, experience: false, sha256: await hash(path)});
}
for (const path of ['content/ship-source.ts', 'content/ship-art.ts', 'content/ship.json', 'scripts/build-ship.ts', 'scripts/ship-texture-bake.ts', 'scripts/asset-bake.ts']) {
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
if (featureFile.source) assets.push({ ...featureFile.source, kind: 'source-data', sourceKind: featureFile.source.sourceKind ?? 'licensed-model', transformations: 'Retained project-authored reconstruction from licensed references, existing model preserved, one shared embedded atlas; see source proof for tools, UVs and texture transformations', essential: false, experience: false, sha256: await hash(featureFile.source.path) });
const boipebaRoot = 'data/landmarks/features/boipeba';
const boipebaReferences = await Bun.file(`${boipebaRoot}/sources.json`).json();
for await (const file of new Bun.Glob('**/*').scan({cwd: boipebaRoot, onlyFiles:true})) {
 const path = `${boipebaRoot}/${file.replaceAll('\\','/')}`;
 if (path === featureFile.source?.path) continue;
 const reference = boipebaReferences.find(entry => entry.files.includes(file.replaceAll('\\','/')));
 assets.push({path, kind:'source-data', sourceKind: reference?.sourceKind ?? 'project-source',
  creator:reference?.creator ?? 'Ocean Drive project contributors', source:reference?.source ?? `${boipebaRoot}/build.ts`,
  retrieved:reference?.retrieved ?? (reference ? '2026-10-03' : featureFile.source.retrieved), rights:reference?.rights ?? 'Palm reconstruction under CC BY-SA 3.0, after Panta LH; church and combined atlas adaptation under CC BY-SA 4.0, after Waltson Campos, INPE and Marcio Filho/MTur; pre-existing placeholder remains project source',
  proof:reference?.proof ?? `${boipebaRoot}/README.md`, transformations:reference ? 'Retained reference/rights evidence; usage and rejected references documented in README.md' : 'Reproducible offline source, shared atlas or reconstruction/provenance record; no AI-generated model',
  essential:false, experience:false, sha256:await hash(path)});
}
for await (const file of new Bun.Glob('*.json').scan({cwd:'data/landmarks',onlyFiles:true})) {
 const path = `data/landmarks/${file.replaceAll('\\','/')}`;
 const record = await Bun.file(path).json();
 landmarkRecords.set(record.id, record);
 assets.push({path, kind: 'source-data', ...geodata(record.coastline.retrieved), transformations: 'Coastline ways chained into closed island rings, filtered by winding, size and neighbourhood, and rounded to six decimals; terrarium elevation tiles decoded to metres and resampled to one square grid over those rings', essential: false, experience: false, sha256: await hash(path)});
}
const abrolhosRoot = 'data/landmarks/features/abrolhos';
const abrolhosReferences = await Bun.file(`${abrolhosRoot}/sources.json`).json();
for await (const file of new Bun.Glob('**/*').scan({cwd:abrolhosRoot,onlyFiles:true})) {
 const relative = file.replaceAll('\\','/'), path = `${abrolhosRoot}/${relative}`;
 if (path === featureFile.source?.path) continue;
 const reference = abrolhosReferences.find(entry => entry.files.includes(relative));
 assets.push({path, kind:'source-data', sourceKind:reference?.sourceKind ?? 'project-source',
  creator:reference?.creator ?? 'Ocean Drive project contributors', source:reference?.source ?? `${abrolhosRoot}/build.ts`,
  retrieved:reference?.retrieved ?? '2026-10-05', rights:reference?.rights ?? 'Project-authored lighthouse and shared atlas adaptation under CC BY-SA 4.0, after Munique Bassoli, Alicedaraujo and Gabi Carrera / Marinha do Brasil; retained Boipeba assets keep their recorded licences',
  proof:reference?.proof ?? `${abrolhosRoot}/README.md`, transformations:reference ? 'Retained licensed reference and rights evidence; no photographic pixels embedded; coordinates from retained OSM node' : 'Reproducible offline reconstruction, atlas and provenance; Boipeba attributes and occupied atlas pixels preserved; no AI generation',
  essential:false, experience:false, sha256:await hash(path)});
}
const ilhaGrandeRoot = 'data/landmarks/features/ilha-grande';
const ilhaGrandeReferences = await Bun.file(`${ilhaGrandeRoot}/sources.json`).json();
for await (const file of new Bun.Glob('**/*').scan({cwd:ilhaGrandeRoot,onlyFiles:true})) {
 const relative = file.replaceAll('\\','/'), path = `${ilhaGrandeRoot}/${relative}`;
 if (path === featureFile.source?.path) continue;
 const reference = ilhaGrandeReferences.find(entry => entry.files.includes(relative));
 assets.push({path, kind:'source-data', sourceKind:reference?.sourceKind ?? 'project-source',
  creator:reference?.creator ?? 'Ocean Drive project contributors', source:reference?.source ?? `${ilhaGrandeRoot}/build.ts`,
  retrieved:reference?.retrieved ?? '2026-10-05', rights:reference?.rights ?? 'Project-authored Ilha Grande church, pier, granite summit, canopy and shared atlas adaptation under CC BY-SA 4.0; completed models keep their recorded licences',
  proof:reference?.proof ?? `${ilhaGrandeRoot}/README.md`, transformations:reference ? 'Retained licensed reference, rights evidence or mapped OSM coordinates; granite surface crop and reconstructed geometry documented in README.md' : 'Reproducible offline full 3D reconstruction, quantized appended geometry and atlas; previous attributes and occupied PNG pixels preserved; shared JPEG re-encoded at quality 78 / 4:2:0; no AI generation',
  essential:false, experience:false, sha256:await hash(path)});
}
for await (const file of new Bun.Glob('**/*').scan({cwd:'public',onlyFiles:true})) {
 const path = `public/${file.replaceAll('\\','/')}`;
 const url = '/'+file.replaceAll('\\','/');
 if (url === '/audio/ocean-engine.v1.wav') {
  assets.push({path, url, kind:'audio', ...audioRights, transformations:'12-second seamless mono 12 kHz 16-bit PCM loop; quiet ocean wash and distant engine; playback gain 0.22', essential:false, experience:true, sha256:await hash(path)});
  continue;
 }
 const vessel = Object.values(ship.variants).some((variant) => variant.url === url);
 const landmark = /\/landmark-(.+)-(balanced|low)\.v\d+\.glb$/.exec(path);
 const features = url === landmarks.features.url;
 const terrain = /\/landmark-(.+)-(balanced|low)-(colour|normal)\.v\d+\.webp$/.exec(path);
 if (terrain) {
  const detailed = landmarkSources.find(source => source.id === terrain[1])?.terrainTreatment;
  assets.push({path, url, kind: "authored", ...geodata(landmarkRecords.get(terrain[1])?.coastline.retrieved), source: "scripts/landmark-texture-bake.ts", transformations: `Deterministic offline ${terrain[2]} ${terrain[3]} terrain bake from recorded elevation, slope, distance inland and authored palette; ${detailed ? `native 1024px Balanced / 512px Low island-specific sand, rock and vegetation signals; same mesh accessibility rasterised into colour once; authored weathering normals; see docs/third-party/${terrain[1] === "fernando-de-noronha" ? "noronha" : terrain[1]}-terrain.md` : 'legacy 256px field resized to output dimensions'}; WebP encoding; no satellite imagery or measured land-cover claim`, essential: false, experience: true, sha256: await hash(path)});
  continue;
 }
 const illustrative = path.startsWith('public/images/');
 if (vessel) {
  assets.push({path, url, kind: 'authored', ...shipRights, transformations: 'Cruise ship adapted as Del Mar: rotated to -Z, broadened beam, lowered superstructure and waterline, UV-aware LOD simplification with authored Low feature protection regions, quantized vertex attributes, embedded 512px Balanced / 256px Low JPEG atlas; Low has source-mesh ambient occlusion and up-facing lighting baked into its existing atlas; one opaque material; built offline by scripts/build-ship.ts', essential: true, experience: true, sha256: await hash(path)});
  continue;
 }
 if (landmark) {
  const detailed = landmarkSources.find(source => source.id === landmark[1])?.terrainTreatment;
  assets.push({path, url, kind: 'authored', ...geodata(landmarkRecords.get(landmark[1])?.coastline.retrieved), source: 'scripts/generate-landmarks.ts', transformations: `Deterministic GLB v2 export at the ${landmark[2]} tier: recorded coastline rings projected, scaled and simplified, triangulated, lifted by the recorded elevation grid, raised above the swell; ${detailed ? 'selective Balanced coastline/slope sampling and bounded project-authored erosion relief (not surveyed detail), documented in the island terrain provenance; ' : ''}Balanced surface palette and 24-ray ambient occlusion baked into vertex colours and transferred to Low by surface projection; with a skirt and a shallows band`, essential: true, experience: true, sha256: await hash(path)});
  continue;
 }
 if (features && featureFile.source) {
  assets.push({...featureFile.source, path, url, kind: "authored", sourceKind: featureFile.source.sourceKind ?? "licensed-model", source: featureFile.source.source, transformations: "Project-authored Boipeba palm/church, Abrolhos lighthouse and Ilha Grande church/pier/granite/canopy reconstructions; one opaque shared 1024px atlas from retained licensed references; completed model attributes, occupied source PNG pixels and placements preserved; shared JPEG intentionally re-encoded quality 78 / 4:2:0; new geometry quantized through KHR_mesh_quantization; named coordinates projected onto terrain by scripts/generate-landmarks.ts", essential: false, experience: true, sha256: await hash(path)});
  continue;
 }
 if (features) {
  assets.push({path, url, kind: 'authored', sourceKind: 'project-source', creator: 'Ocean Drive project contributors', source: 'scripts/generate-landmarks.ts', retrieved: '2026-10-01', rights: 'Project-authored source contribution; no imported artwork. Instance positions derive from the open geodata documented in docs/third-party/open-geodata.md', proof: 'docs/third-party/project-assets.md', transformations: 'Deterministic GLB v2 export of the Feature models generated in code by scripts/landmark-feature-models.ts, low-poly and vertex-coloured with no textures, and of the instance placements on each Landmark, scattered by terrain rules or projected from configured coordinates onto the Balanced surface', essential: false, experience: true, sha256: await hash(path)});
  continue;
 }
 if (illustrative) {
  const earth = earthApproach.levels.find(level => level.url === url);
  if (earth) {
   assets.push({path, url, kind:'photographic-image', ...earthRights, transformations:`Offline orthographic projection centred at 30 W / 4 S; nested crop ${earth.crop}; native ${earth.size}px WebP; ${earth.id === 'globe' ? 'NASA cloud composite and authored atmosphere rim' : 'cloud-free surface'}; authored navy grading and plain deep-water centre on the close level; no AI imagery`, essential:earth.essential, experience:true, sha256:await hash(path)});
   continue;
  }
  assets.push({path, url, kind: 'photographic-image', sourceKind: 'ai-generated', creator: 'OpenAI GPT Image, commissioned by the project owner', source: 'OpenAI built-in image generation', retrieved: '2026-09-21', rights: "Generated under the project owner's OpenAI account; usage rights per OpenAI's terms for commissioned output", proof: 'docs/third-party/ai-generated-images.md', transformations: 'AI-generated PNG resized and cropped to 960×720 then re-encoded as WebP with Sharp; no other edits', essential: false, experience: true, sha256: await hash(path)});
  continue;
 }
 assets.push({path, url, kind: 'authored', sourceKind: 'project-source', creator: 'Ocean Drive project contributors', source: 'scripts/generate-identity.mjs', retrieved: '2026-09-15', rights: 'Project-authored source contribution; no imported artwork', proof: 'docs/third-party/project-assets.md', transformations: 'Deterministic SVG paths and Sharp PNG rasterization', essential: false, experience: false, sha256: await hash(path)});
}
for (const font of fontSources) assets.push({path: font.file, kind:'font', sourceKind:'ofl-font', ...font, rights:'OFL-1.1 commercial use, modification and redistribution with retained notice', essential:false, experience:true, sha256:await hash(font.file)});
for (const path of ['components/voyage/travessia-mark.tsx','lib/ocean-surface.ts','lib/ocean-lighting.ts','lib/ocean-daylight.ts','lib/landmark-surf.ts','lib/landmark-material.ts']) assets.push({path, kind:'procedural', sourceKind:'project-source', creator:'Ocean Drive project contributors', source:path, retrieved:path === 'lib/ocean-daylight.ts' ? '2026-09-20' : path === 'lib/landmark-material.ts' ? '2026-09-19' : '2026-09-15', rights:'Project-authored source contribution; no imported artwork', proof:'docs/third-party/project-assets.md', transformations:'Compiled by Next into same-origin HTML/application code', essential:path.includes('surface') || path.includes('daylight'), experience:true, sha256:await hash(path)});
// The Landmark pipeline's authored configuration and the record its build
// writes, hash-pinned so a mesh can never drift from what CI was shown.
for (const path of ['content/landmark-sources.ts','content/landmarks.json','scripts/generate-landmarks.ts','scripts/landmark-feature-models.ts','scripts/landmark-feature-source.ts','scripts/landmark-texture-bake.ts','lib/landmark-geometry.ts','lib/landmark-surface.ts','lib/landmark-features.ts']) assets.push({path, kind:'pipeline', sourceKind:'project-source', creator:'Ocean Drive project contributors', source:'scripts/generate-landmarks.ts', retrieved:'2026-09-17', rights:'Project-authored source contribution; no imported artwork', proof:'docs/third-party/open-geodata.md', transformations:path.endsWith('.json') ? 'Written by the Landmark build from the recorded source data' : 'Authored geometry, surface palette, Feature models and placement, and offline Balanced-to-Low bake pipeline', essential:true, experience:!path.startsWith('scripts/'), sha256:await hash(path)});
for (const path of ['scripts/terrain-treatment.ts', 'scripts/terrain-occlusion.ts', 'scripts/terrain-shore-sampler.ts', 'docs/third-party/noronha-terrain.md']) assets.push({path, kind:'pipeline', sourceKind:'project-source', creator:'Ocean Drive project contributors', source:'scripts/generate-landmarks.ts', retrieved:'2026-10-03', rights:'Project-authored source contribution; no imported artwork', proof:'docs/third-party/noronha-terrain.md', transformations:'Retained deterministic authored surface/relief, scalar accessibility rasterisation and exact coastline queries; no new surveyed geography', essential:true, experience:false, sha256:await hash(path)});
for (const path of ["content/landmark-close-views.ts", "docs/third-party/boipeba-terrain.md"]) assets.push({path, kind:"pipeline", sourceKind:"project-source", creator:"Ocean Drive project contributors", source:"scripts/generate-landmarks.ts", retrieved:"2026-10-03", rights:"Project-authored interpretation; no new surveyed geography", proof:"docs/third-party/boipeba-terrain.md", transformations:"Authored Boipeba surface interpretation and diagnostic Close View framing", essential:false, experience:false, sha256:await hash(path)});
assets.push({path:"docs/third-party/abrolhos-terrain.md", kind:"pipeline", sourceKind:"project-source", creator:"Ocean Drive project contributors", source:"scripts/generate-landmarks.ts", retrieved:"2026-10-05", rights:"Project-authored interpretation; no new surveyed geography", proof:"docs/third-party/abrolhos-terrain.md", transformations:"Bare rock tables, thin grass, narrow beach pockets, broad reef shallows and configured Close View; native terrain and unchanged geographic inputs", essential:false, experience:false, sha256:await hash("docs/third-party/abrolhos-terrain.md")});
for (const path of ['lib/landmark-feature-geometry.ts', 'scripts/terrain-regions.ts', 'docs/third-party/ilha-grande-terrain.md']) assets.push({path, kind:'pipeline', sourceKind:'project-source', creator:'Ocean Drive project contributors', source:'scripts/generate-landmarks.ts', retrieved:'2026-10-05', rights:'Project-authored surface interpretation; retained OSM beach coordinates under ODbL-1.0', proof:'docs/third-party/ilha-grande-terrain.md', transformations:'Dense Atlantic canopy, steep granite ridges, mapped sandy pockets and island-specific shoreline/Close View; bounded relief distinguished from unchanged SRTM samples; floating-point CPU decode preserves quantized Feature geometry', essential:false, experience:false, sha256:await hash(path)});
assets.sort((a,b)=>a.path.localeCompare(b.path));
await Bun.write('content/asset-manifest.json',JSON.stringify({schema:1, assets},null,2)+'\n');
console.log(`Recorded ${assets.length} asset provenance entries.`);
