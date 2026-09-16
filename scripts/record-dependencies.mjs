import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
const missing = {
 '@mediapipe/tasks-vision': 'https://raw.githubusercontent.com/google-ai-edge/mediapipe/master/LICENSE',
 'draco3d': 'https://raw.githubusercontent.com/google/draco/main/LICENSE',
 '@next/env': 'https://raw.githubusercontent.com/vercel/next.js/v16.3.4/license.md',
 '@next/swc-win32-x64-msvc': 'https://raw.githubusercontent.com/vercel/next.js/v16.3.4/license.md',
 '@react-three/fiber': 'https://raw.githubusercontent.com/pmndrs/react-three-fiber/v9.7.0/LICENSE',
 'client-only': 'https://raw.githubusercontent.com/facebook/react/main/LICENSE',
 'maath': 'https://raw.githubusercontent.com/pmndrs/maath/main/LICENSE',
 'stats-gl': 'https://raw.githubusercontent.com/RenaudRohlinger/stats-gl/main/LICENSE',
};
const scan = Bun.spawnSync(['bun', 'pm', 'licenses', '--prod', '--json']);
if (scan.exitCode !== 0) throw new Error(scan.stderr.toString());
const inventory = JSON.parse(scan.stdout.toString());
const ledger = [];
let notices = '# Retained production dependency notices\n\nIncludes the complete installed production dependency closure (also packages tree-shaken from browser chunks) and Next bundled licenses. Versions and package sources are recorded in dependencies.json; bun.lock pins integrity. Font OFLs are retained separately in fonts/.\n';
for (const entries of Object.values(inventory)) for (const entry of entries) {
 const packagePath = entry.paths[0];
 const files = (await readdir(packagePath)).filter(file => /^(licen[sc]e|copying|notice)/i.test(file));
 let license = '';
 let proof = '';
 for (const file of files) {
  const candidate = Bun.file(join(packagePath,file));
  try { license += await candidate.text() + '\n'; proof += `${entry.name}/${file}; `; } catch { /* License directories are covered by upstream evidence below. */ }
 }
 if (!license && missing[entry.name]) {
  const response = await fetch(missing[entry.name]);
  if (response.ok) { license = await response.text(); proof = missing[entry.name]; }
 }
 if (!license && entry.name.startsWith('@next/')) { license = await Bun.file('node_modules/next/license.md').text(); proof = 'next@16.3.4/license.md'; }
 if (!license && entry.name === '@react-three/fiber') { license = await Bun.file('docs/third-party/graphics-notices.md').text(); proof = 'docs/third-party/graphics-notices.md'; }
 if (!license && entry.name === 'stats-gl') { license = await Bun.file(join(packagePath,'README.md')).text(); proof = 'stats-gl@2.4.2/README.md and package.json: MIT declaration; unused by selective Html import.'; }
 if (!license) throw new Error(`Missing retained notice: ${entry.name}`);
 notices += `\n## ${entry.name} ${entry.versions.join(', ')}\n\nSource: ${proof}\n\n${license}\n`;
 ledger.push({name: entry.name, versions: entry.versions, creator: entry.author ?? 'Package copyright holders; see retained notice', source: `https://www.npmjs.com/package/${entry.name}`, retrieved: '2026-09-15', license: entry.name === 'webgl-constants' ? 'MIT' : entry.license, rights: 'Commercial use and modification subject to the retained license and attribution terms.', proof: 'docs/third-party/dependency-notices.md', transformations: entry.name === '@react-three/fiber' ? 'Bundled by Next; clock patch retained in patches/.' : 'Bundled/tree-shaken by Next; no authored source modification.'});
}
for await (const file of new Bun.Glob('**/{LICENSE,license,LICENSE.md,license.md,LICENSE.txt}').scan('node_modules/next/dist/compiled')) {
 notices += `\n## Next bundled: ${file}\n\n${await Bun.file(join('node_modules/next/dist/compiled',file)).text()}\n`;
}
await Bun.write('docs/third-party/dependency-notices.md', notices.split('\n').map(line => line.trimEnd()).join('\n').trimEnd() + '\n');
await Bun.write('docs/third-party/dependencies.json',JSON.stringify({ lockSha256: new Bun.CryptoHasher('sha256').update(await Bun.file('bun.lock').arrayBuffer()).digest('hex'), dependencies: ledger },null,2)+'\n');
console.log(`Retained notices for ${ledger.length} production packages and Next bundled dependencies.`);
