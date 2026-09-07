import { mkdir, writeFile } from "node:fs/promises";
import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, Shape } from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// GLTFExporter needs only this browser FileReader operation for binary export.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
};

const output = new URL("../public/models/", import.meta.url);
await mkdir(output, { recursive: true });

for (const variant of ["balanced", "low"]) {
  const hullParts = [];
  const workingParts = [];
  const add = (parts, geometry, position, color) => {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    flat.deleteAttribute("uv");
    flat.translate(...position);
    // Ivory and ochre share one opaque vertex-colored working material.
    const colors = new Float32Array(flat.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) colors.set(color, i);
    flat.setAttribute("color", new flat.attributes.position.constructor(colors, 3));
    parts.push(flat);
  };
  const ivory = [0.85, 0.88, 0.76];
  const ochre = [0.78, 0.46, 0.12];
  const blue = [0.025, 0.18, 0.3];
  const outline = new Shape();
  outline.moveTo(-1.1, 2.8);
  outline.lineTo(1.1, 2.8);
  outline.lineTo(1.3, 0);
  outline.quadraticCurveTo(1.1, -2.2, 0, -3.4);
  outline.quadraticCurveTo(-1.1, -2.2, -1.3, 0);
  outline.closePath();
  const hull = new ExtrudeGeometry(outline, { depth: 0.85, bevelEnabled: false, curveSegments: variant === "low" ? 3 : 8 });
  hull.rotateX(Math.PI / 2);
  add(hullParts, hull, [0, 0.85, 0], blue);
  const deck = new ExtrudeGeometry(outline, { depth: 0.12, bevelEnabled: false, curveSegments: variant === "low" ? 3 : 8 });
  deck.rotateX(Math.PI / 2);
  deck.scale(0.88, 1, 0.91);
  add(workingParts, deck, [0, 0.94, 0], ivory);
  add(workingParts, new BoxGeometry(1.65, 1.1, 1.7), [0, 1.45, -0.65], ivory);
  add(hullParts, new BoxGeometry(1.68, 0.32, 1.72), [0, 1.64, -0.65], blue);
  add(workingParts, new BoxGeometry(1.95, 0.15, 2), [0, 2.05, -0.65], ivory);
  add(workingParts, new CylinderGeometry(0.075, 0.075, 1.5, 6), [0, 2.8, -0.45], ivory);
  add(workingParts, new BoxGeometry(1.05, 0.08, 0.08), [0, 3.3, -0.45], ivory);
  add(workingParts, new BoxGeometry(0.75, 0.6, 0.85), [0.45, 1.2, 1.6], ochre);
  add(workingParts, new BoxGeometry(0.1, 1.15, 0.12), [-0.9, 1.45, 2.1], ochre);
  add(workingParts, new BoxGeometry(0.1, 1.15, 0.12), [0.9, 1.45, 2.1], ochre);
  add(workingParts, new BoxGeometry(1.9, 0.12, 0.12), [0, 2, 2.1], ochre);
  if (variant === "balanced") {
    for (const x of [-1, 1]) {
      add(workingParts, new BoxGeometry(0.055, 0.055, 2.1), [x, 1.35, 1.35], ivory);
      for (const z of [0.5, 1.5, 2.35]) {
        add(workingParts, new BoxGeometry(0.055, 0.4, 0.055), [x, 1.14, z], ivory);
      }
    }
  }
  const vessel = new Group();
  vessel.name = `Ocean Drive Research Vessel ${variant}`;
  for (const [name, parts] of [["Hull", hullParts], ["Working deck", workingParts]]) {
    const mesh = new Mesh(mergeGeometries(parts), new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }));
    mesh.name = name;
    vessel.add(mesh);
  }
  const glb = await new GLTFExporter().parseAsync(vessel, { binary: true });
  await writeFile(new URL(`research-vessel-${variant}.v1.glb`, output), Buffer.from(glb));
  const triangles = vessel.children.reduce((total, mesh) => total + mesh.geometry.attributes.position.count / 3, 0);
  console.log(`${variant}: ${triangles} triangles, ${glb.byteLength} bytes, 2 opaque materials`);
}
