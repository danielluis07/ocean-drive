import { assetSha256 as hash } from '@/lib/asset-provenance';
const fontSources = await Bun.file('docs/third-party/fonts/sources.json').json();
const assets = [];
for await (const file of new Bun.Glob('**/*').scan({cwd:'public',onlyFiles:true})) {
 const path = `public/${file.replaceAll('\\','/')}`;
 const vessel = path.endsWith('.glb');
 const illustrative = path.startsWith('public/images/');
 if (illustrative) {
  assets.push({path, url: '/'+file.replaceAll('\\','/'), kind: 'illustrative-image', sourceKind: 'ai-generated', creator: 'Higgsfield (Z Image), commissioned by the project owner', source: 'Higgsfield Z Image (z_image)', retrieved: '2026-09-17', rights: "Generated under the project owner's Higgsfield account; usage rights per Higgsfield's terms for commercial/commissioned output", proof: 'docs/third-party/ai-generated-images.md', transformations: 'AI-generated PNG resized to 960px width and re-encoded as WebP with Sharp; no other edits', essential: false, experience: true, sha256: await hash(path)});
  continue;
 }
 assets.push({path, url: '/'+file.replaceAll('\\','/'), kind: 'authored', sourceKind: 'project-source', creator: 'Ocean Drive project contributors', source: vessel ? 'scripts/generate-vessels.mjs' : 'scripts/generate-identity.mjs', retrieved: '2026-09-15', rights: 'Project-authored source contribution; no imported artwork', proof: 'docs/third-party/project-assets.md', transformations: vessel ? 'Deterministic GLB v2 export from the shared geometry master' : 'Deterministic SVG paths and Sharp PNG rasterization', essential: vessel, experience: vessel || path.includes('vignette'), sha256: await hash(path)});
}
for (const font of fontSources) assets.push({path: font.file, kind:'font', sourceKind:'ofl-font', ...font, rights:'OFL-1.1 commercial use, modification and redistribution with retained notice', essential:false, experience:true, sha256:await hash(font.file)});
for (const path of ['components/voyage/travessia-mark.tsx','components/ocean/stop-marker.tsx','lib/ocean-surface.ts','lib/ocean-lighting.ts']) assets.push({path, kind:'procedural', sourceKind:'project-source', creator:'Ocean Drive project contributors', source:path, retrieved:'2026-09-15', rights:'Project-authored source contribution; no imported artwork', proof:'docs/third-party/project-assets.md', transformations:'Compiled by Next into same-origin HTML/application code', essential:path.includes('surface'), experience:true, sha256:await hash(path)});
assets.sort((a,b)=>a.path.localeCompare(b.path));
await Bun.write('content/asset-manifest.json',JSON.stringify({schema:1, assets},null,2)+'\n');
console.log(`Recorded ${assets.length} asset provenance entries.`);
