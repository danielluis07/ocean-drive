import { assetSha256 as hash } from '@/lib/asset-provenance';
const fontSources = await Bun.file('docs/third-party/fonts/sources.json').json();
const assets = [];
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
 const vessel = path.endsWith('.glb') && !path.includes('/landmark-');
 const landmark = /\/landmark-(.+)-(balanced|low)\.v\d+\.glb$/.exec(path);
 const illustrative = path.startsWith('public/images/');
 if (landmark) {
  assets.push({path, url, kind: 'authored', ...geodata(landmarkRecords.get(landmark[1])?.coastline.retrieved), source: 'scripts/generate-landmarks.ts', transformations: `Deterministic GLB v2 export at the ${landmark[2]} tier: recorded coastline rings projected, scaled and simplified, triangulated, lifted by the recorded elevation grid, raised above the swell, shaded by height, slope and distance inland, with a skirt and a surf band around the shoreline`, essential: true, experience: true, sha256: await hash(path)});
  continue;
 }
 if (illustrative) {
  assets.push({path, url, kind: 'illustrative-image', sourceKind: 'ai-generated', creator: 'Higgsfield (Z Image), commissioned by the project owner', source: 'Higgsfield Z Image (z_image)', retrieved: '2026-09-17', rights: "Generated under the project owner's Higgsfield account; usage rights per Higgsfield's terms for commercial/commissioned output", proof: 'docs/third-party/ai-generated-images.md', transformations: 'AI-generated PNG resized to 960px width and re-encoded as WebP with Sharp; no other edits', essential: false, experience: true, sha256: await hash(path)});
  continue;
 }
 assets.push({path, url, kind: 'authored', sourceKind: 'project-source', creator: 'Ocean Drive project contributors', source: vessel ? 'scripts/generate-vessels.mjs' : 'scripts/generate-identity.mjs', retrieved: '2026-09-15', rights: 'Project-authored source contribution; no imported artwork', proof: 'docs/third-party/project-assets.md', transformations: vessel ? 'Deterministic GLB v2 export from the shared geometry master' : 'Deterministic SVG paths and Sharp PNG rasterization', essential: vessel, experience: vessel || path.includes('vignette'), sha256: await hash(path)});
}
for (const font of fontSources) assets.push({path: font.file, kind:'font', sourceKind:'ofl-font', ...font, rights:'OFL-1.1 commercial use, modification and redistribution with retained notice', essential:false, experience:true, sha256:await hash(font.file)});
for (const path of ['components/voyage/travessia-mark.tsx','lib/ocean-surface.ts','lib/ocean-lighting.ts','lib/landmark-surf.ts','lib/landmark-material.ts']) assets.push({path, kind:'procedural', sourceKind:'project-source', creator:'Ocean Drive project contributors', source:path, retrieved:path === 'lib/landmark-material.ts' ? '2026-09-19' : '2026-09-15', rights:'Project-authored source contribution; no imported artwork', proof:'docs/third-party/project-assets.md', transformations:'Compiled by Next into same-origin HTML/application code', essential:path.includes('surface'), experience:true, sha256:await hash(path)});
// The Landmark pipeline's authored configuration and the record its build
// writes, hash-pinned so a mesh can never drift from what CI was shown.
for (const path of ['content/landmark-sources.ts','content/landmarks.json']) assets.push({path, kind:'pipeline', sourceKind:'project-source', creator:'Ocean Drive project contributors', source:'scripts/generate-landmarks.ts', retrieved:'2026-09-17', rights:'Project-authored source contribution; no imported artwork', proof:'docs/third-party/open-geodata.md', transformations:path.endsWith('.json') ? 'Written by the Landmark build from the recorded source data' : 'Authored configuration, compiled by Next into same-origin application code', essential:true, experience:true, sha256:await hash(path)});
assets.sort((a,b)=>a.path.localeCompare(b.path));
await Bun.write('content/asset-manifest.json',JSON.stringify({schema:1, assets},null,2)+'\n');
console.log(`Recorded ${assets.length} asset provenance entries.`);
