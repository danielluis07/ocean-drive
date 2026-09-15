import { mkdir, writeFile } from "node:fs/promises";
import { BoxGeometry, BufferGeometry, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Quaternion, Shape, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

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
  const detailed = variant === "balanced";
  const radial = detailed ? 12 : 6;
  const materials = {
    hull: new MeshPhysicalMaterial({ color: "#16485c", roughness: .32, metalness: .25, clearcoat: .45, clearcoatRoughness: .28 }),
    ivory: new MeshStandardMaterial({ color: "#e2e5de", roughness: .42, metalness: .12 }),
    deck: new MeshStandardMaterial({ color: "#727d79", roughness: .94 }),
    glass: new MeshPhysicalMaterial({ color: "#183541", roughness: .09, metalness: .48, clearcoat: 1 }),
    steel: new MeshStandardMaterial({ color: "#b6c2c6", roughness: .27, metalness: .85 }),
    rubber: new MeshStandardMaterial({ color: "#171f23", roughness: .87 }),
    equipment: new MeshStandardMaterial({ color: "#c99645", roughness: .48, metalness: .3 }),
    safety: new MeshStandardMaterial({ color: "#d76834", roughness: .6 }),
  };
  const parts = Object.fromEntries(Object.keys(materials).map(key => [key, []]));
  const add = (material, geometry, position = [0, 0, 0]) => {
    const mesh = geometry.index ? geometry.toNonIndexed() : geometry;
    mesh.deleteAttribute("uv");
    mesh.translate(...position);
    parts[material].push(mesh);
  };
  const box = (material, size, position, radius = .03) => add(material,
    detailed && radius > 0 ? new RoundedBoxGeometry(...size, 2, radius) : new BoxGeometry(...size), position);
  const pipe = (material, start, end, radius = .026) => {
    const from = new Vector3(...start);
    const to = new Vector3(...end);
    const direction = to.clone().sub(from);
    const geometry = new CylinderGeometry(radius, radius, direction.length(), radial);
    geometry.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()));
    add(material, geometry, from.add(to).multiplyScalar(.5).toArray());
  };
  const outline = new Shape();
  outline.moveTo(-1.02, 2.75);
  outline.quadraticCurveTo(-1.21, 2.7, -1.26, 2.35);
  outline.bezierCurveTo(-1.39, .5, -1.38, -1.95, 0, -3.55);
  outline.bezierCurveTo(1.38, -1.95, 1.39, .5, 1.26, 2.35);
  outline.quadraticCurveTo(1.21, 2.7, 1.02, 2.75);
  outline.closePath();
  // Reverse to make the loft's outward face winding consistent.
  const points = outline.getPoints(detailed ? 16 : 7).reverse();
  if (points[0].equals(points.at(-1))) points.pop();
  const loft = (rings) => {
    const vertices = [];
    const indices = [];
    for (const [y, width, length] of rings) {
      for (const point of points) vertices.push(point.x * width, y + Math.max(0, -point.y - 1.3) * .065, point.y * length);
    }
    for (let ring = 0; ring < rings.length - 1; ring++) {
      for (let i = 0; i < points.length; i++) {
        const a = ring * points.length + i;
        const b = ring * points.length + (i + 1) % points.length;
        const c = b + points.length;
        const d = a + points.length;
        indices.push(a, b, d, b, c, d);
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  };
  add("hull", loft([[-.58, .43, .85], [-.32, .68, .93], [.08, .88, .98], [.5, .97, 1], [.85, 1, 1]]));
  add("ivory", loft([[.66, .989, 1.002], [.73, .996, 1.002]]));
  add("rubber", loft([[.83, 1.009, 1.005], [.91, 1.009, 1.005]]));
  const deck = new ExtrudeGeometry(outline, { depth: .09, bevelEnabled: false, curveSegments: detailed ? 16 : 7 });
  deck.rotateX(Math.PI / 2);
  deck.scale(.96, 1, .97);
  add("deck", deck, [0, .86, 0]);

  // Wheelhouse: shaded window frames, individual glazing, and a lipped roof.
  box("ivory", [1.68, 1.13, 1.92], [0, 1.43, -.72], .075);
  box("rubber", [1.74, .48, 1.97], [0, 1.61, -.72], .035);
  for (const x of [-.46, .46]) {
    box("glass", [.73, .37, .018], [x, 1.63, -1.714], .006);
    box("glass", [.66, .35, .018], [x, 1.63, .274], .006);
  }
  for (const x of [-.877, .877]) {
    for (const z of [-1.29, -.7, -.11]) box("glass", [.016, .37, .49], [x, 1.63, z], .005);
  }
  box("ivory", [1.99, .13, 2.19], [0, 2.06, -.72], .055);
  box("steel", [1.81, .045, 2.01], [0, 2.14, -.72], .018);
  box("ivory", [.49, .75, .045], [-.41, 1.25, .26], .02);
  box("glass", [.34, .27, .025], [-.41, 1.46, .291], .015);
  pipe("steel", [-.23, 1.18, .305], [-.23, 1.32, .305], .018);
  box("rubber", [1.82, .1, .31], [0, .89, .46]);

  // A working aft deck with a research winch, gantry, and storage locker.
  box("ivory", [.75, .49, .78], [.55, 1.12, 1.15], .05);
  box("steel", [.8, .05, .83], [.55, 1.39, 1.15], .02);
  box("equipment", [.78, .12, .56], [-.49, .97, 1.35]);
  for (const x of [-.83, -.15]) box("equipment", [.09, .47, .47], [x, 1.18, 1.35]);
  const winch = new CylinderGeometry(.23, .23, .57, radial);
  winch.rotateZ(Math.PI / 2);
  add("rubber", winch, [-.49, 1.22, 1.35]);
  if (detailed) {
    for (let i = 0; i < 9; i++) {
      const cable = new TorusGeometry(.234, .013, 4, 16);
      cable.rotateY(Math.PI / 2);
      add("steel", cable, [-.75 + i * .065, 1.22, 1.35]);
    }
  }
  for (const x of [-1.02, 1.02]) {
    pipe("equipment", [x, .88, 2.15], [x, 2.18, 2.35], .065);
    pipe("steel", [x, .9, 1.7], [x, 1.73, 2.29], .026);
  }
  pipe("equipment", [-1.02, 2.18, 2.35], [1.02, 2.18, 2.35], .075);
  pipe("steel", [0, 2.18, 2.35], [0, 1.63, 2.35], .018);

  // Railings follow the sheer line instead of making a rectangular cage.
  for (const side of [-1, 1]) {
    const railing = [[1.12, 2.55], [1.22, 1.45], [1.22, .4], [1.13, -.8], [.88, -1.95], [.43, -2.85], [0, -3.35]];
    for (let i = 0; i < railing.length; i++) {
      const [x, z] = railing[i];
      const rise = Math.max(0, -z - 1.3) * .065;
      pipe("steel", [x * side, .9 + rise, z], [x * side, 1.39 + rise, z], .022);
      if (i === 0) continue;
      const [lastX, lastZ] = railing[i - 1];
      const lastRise = Math.max(0, -lastZ - 1.3) * .065;
      for (const y of detailed ? [1.16, 1.4] : [1.4]) pipe("steel", [lastX * side, y + lastRise, lastZ], [x * side, y + rise, z], .02);
    }
    for (const z of detailed ? [-.2, 1, 2] : [1]) {
      const fender = new SphereGeometry(1, radial, detailed ? 8 : 4);
      fender.scale(.14, .36, .15);
      add("rubber", fender, [side * 1.32, .61, z]);
      pipe("steel", [side * 1.29, .88, z], [side * 1.23, 1.28, z], .012);
    }
    for (const z of [-2.15, 2.5]) {
      box("steel", [.21, .055, .13], [side * .67, .96, z], .015);
      pipe("steel", [side * .67, .98, z - .14], [side * .67, .98, z + .14], .035);
    }
  }
  pipe("steel", [0, 2.14, -.63], [0, 3.23, -.63], .043);
  pipe("steel", [-.54, 2.88, -.63], [.54, 2.88, -.63], .027);
  box("ivory", [.85, .12, .21], [0, 3.22, -.63], .035);
  add("ivory", new CylinderGeometry(.13, .17, .22, radial), [.47, 2.28, -.34]);
  pipe("steel", [-.61, 2.14, -.32], [-.61, 3.13, -.32], .012);
  box("rubber", [.23, .36, .25], [.48, 2.3, -1.31]);
  add("safety", new TorusGeometry(.22, .065, 6, detailed ? 20 : 10), [.5, 1.11, .33]);
  if (detailed) {
    for (const x of [-.5, .5]) pipe("rubber", [x - .2, 1.49, -1.73], [x + .08, 1.72, -1.73], .009);
    for (let i = 0; i < 5; i++) box("rubber", [.22, .022, .018], [.5, 1.12 + i * .06, .25], 0);
    for (let i = 0; i < 4; i++) box("steel", [1.76, .012, .015], [0, .865, .65 + i * .45], 0);
  }

  const vessel = new Group();
  vessel.name = `Ocean Drive Research Vessel ${variant}`;
  for (const [name, geometries] of Object.entries(parts)) {
    const mesh = new Mesh(mergeVertices(mergeGeometries(geometries)), materials[name]);
    mesh.name = name;
    vessel.add(mesh);
  }
  const glb = await new GLTFExporter().parseAsync(vessel, { binary: true });
  await writeFile(new URL(`research-vessel-${variant}.v1.glb`, output), Buffer.from(glb));
  const triangles = vessel.children.reduce((total, mesh) => total + mesh.geometry.index.count / 3, 0);
  console.log(`${variant}: ${triangles} triangles, ${glb.byteLength} bytes, ${vessel.children.length} opaque materials`);
}
