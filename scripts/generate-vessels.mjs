import { mkdir, writeFile } from 'node:fs/promises';
import { BoxGeometry, Color, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, Shape } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// The master is deterministic geometry, with no imported model or generated imagery.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); });
  }
};
const output = new URL('../public/models/', import.meta.url);
await mkdir(output, { recursive: true });
for (const variant of ['balanced', 'low']) {
  const detailed = variant === 'balanced';
  const parts = { hull: [], deck: [] };
  const add = (part, geometry, position, hex) => {
    const mesh = geometry.index ? geometry.toNonIndexed() : geometry;
    mesh.deleteAttribute('uv');
    mesh.translate(...position);
    const color = new Color(hex);
    const colors = [];
    for (let i = 0; i < mesh.attributes.position.count; i++) colors.push(color.r, color.g, color.b);
    mesh.setAttribute('color', new Float32BufferAttribute(colors, 3));
    parts[part].push(mesh);
  };
  const box = (size, position, color = '#e2e5de') => add('deck', new BoxGeometry(...size), position, color);
  const outline = new Shape();
  outline.moveTo(-1.02, 2.75);
  outline.quadraticCurveTo(-1.21, 2.7, -1.26, 2.35);
  outline.bezierCurveTo(-1.39, .5, -1.38, -1.95, 0, -3.55);
  outline.bezierCurveTo(1.38, -1.95, 1.39, .5, 1.26, 2.35);
  outline.quadraticCurveTo(1.21, 2.7, 1.02, 2.75);
  outline.closePath();
  // Shared outline, origin and -Z bow keep every quality substitution spatially stable.
  const hull = new ExtrudeGeometry(outline, { depth: 1.15, bevelEnabled: false, curveSegments: 12 });
  hull.rotateX(Math.PI / 2);
  add('hull', hull, [0, .85, 0], '#16485c');
  const deck = new ExtrudeGeometry(outline, { depth: .08, bevelEnabled: false, curveSegments: 12 });
  deck.rotateX(Math.PI / 2);
  deck.scale(.94, 1, .96);
  add('deck', deck, [0, .9, 0], '#e2e5de');
  box([1.68, 1.13, 1.92], [0, 1.43, -.72]);
  box([1.72, .42, 1.96], [0, 1.65, -.72], '#16485c');
  box([1.99, .13, 2.19], [0, 2.06, -.72]);
  box([.75, .49, .78], [.55, 1.12, 1.15]);
  for (const x of [-1.02, 1.02]) box([.14, 1.3, .16], [x, 1.55, 2.25], '#c99645');
  box([2.18, .16, .16], [0, 2.2, 2.25], '#c99645');
  box([.78, .12, .56], [-.49, .97, 1.35], '#c99645');
  const winch = new CylinderGeometry(.24, .24, .6, detailed ? 16 : 6);
  winch.rotateZ(Math.PI / 2);
  add('deck', winch, [-.49, 1.25, 1.35], '#c99645');
  box([.09, 1.1, .09], [0, 2.65, -.63]);
  box([.85, .12, .21], [0, 3.22, -.63]);
  if (detailed) {
    for (const x of [-.5, .5]) box([.07, .44, .03], [x, 1.65, -1.71]);
    for (const x of [-1.15, 1.15]) box([.1, .16, 2.6], [x, 1.01, 1.1], '#c99645');
  }
  const vessel = new Group();
  vessel.name = `Ocean Drive Research Vessel ${variant}`;
  vessel.userData = { forwardAxis: '-Z', collisionFootprint: [2.8, 6.4], origin: 'waterline', master: 'scripts/generate-vessels.mjs' };
  for (const [name, geometries] of Object.entries(parts)) {
    const mesh = new Mesh(mergeVertices(mergeGeometries(geometries)), new MeshStandardMaterial({ vertexColors: true, roughness: .65, metalness: .08 }));
    mesh.name = name;
    vessel.add(mesh);
  }
  const glb = await new GLTFExporter().parseAsync(vessel, { binary: true });
  await writeFile(new URL(`research-vessel-${variant}.v2.glb`, output), Buffer.from(glb));
  console.log(`${variant}: ${vessel.children.reduce((sum, mesh) => sum + mesh.geometry.index.count / 3, 0)} triangles, ${glb.byteLength} bytes, 2 opaque materials`);
}
