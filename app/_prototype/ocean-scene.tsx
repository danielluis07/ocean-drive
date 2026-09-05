"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { stations, type Variant } from "@/app/_prototype/directions";

const vertexShader = `
  uniform float uTime;
  uniform float uAmplitude;
  varying vec3 vWorld;
  float wave(vec2 p) {
    return sin(p.x * .34 + p.y * .19 + uTime * .65) * .34
      + sin(p.x * -.18 + p.y * .48 + uTime * .48) * .18
      + sin(p.x * .78 + p.y * .28 - uTime * .8) * .065;
  }
  void main() {
    vec3 p = position;
    p.z += wave(p.xy) * uAmplitude;
    vWorld = (modelMatrix * vec4(p, 1.)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSky;
  uniform float uFog;
  uniform float uGraphic;
  uniform float uFaceted;
  varying vec3 vWorld;
  void main() {
    vec2 p = vWorld.xz;
    float a = sin(p.x * 1.4 + p.y * .8 + sin(p.y * .4 + uTime * .4) + uTime * .7);
    float b = sin(p.x * -.6 + p.y * 2.5 - uTime * .6);
    float w1 = cos(p.x * .34 - p.y * .19 + uTime * .65);
    float w2 = cos(p.x * -.18 - p.y * .48 + uTime * .48);
    float w3 = cos(p.x * .78 - p.y * .28 - uTime * .8);
    vec3 smoothNormal = normalize(vec3(-(.1156 * w1 - .0324 * w2 + .0507 * w3), 1., .0646 * w1 + .0864 * w2 + .0182 * w3));
    vec3 faceNormal = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    if (faceNormal.y < 0.) faceNormal = -faceNormal;
    vec3 normal = normalize(mix(smoothNormal, faceNormal, uFaceted));
    normal = normalize(normal + vec3(a * .09, 0., b * .08));
    vec3 viewDirection = normalize(cameraPosition - vWorld);
    float fresnel = pow(1. - max(dot(normal, viewDirection), 0.), 3.);
    float broad = sin(p.x * .06 + p.y * .04) * .5 + .5;
    vec3 color = mix(uDeep, uShallow, .13 + broad * .25 + normal.x * .32);
    float shine = pow(max(dot(reflect(-normalize(vec3(-.7, 1.7, -.8)), normal), viewDirection), 0.), 55.);
    float strokes = smoothstep(.975, 1., a * b) * .1;
    color += uSky * (shine * .65 + strokes);
    color = mix(color, uSky, fresnel * .33);
    float graphicLine = smoothstep(.94, .99, sin(p.x * .25 + p.y * .35 + sin(p.y * .14) * 3.));
    color = mix(color, uShallow, graphicLine * uGraphic * .17);
    float distanceFog = 1. - exp(-length(cameraPosition - vWorld) * uFog);
    gl_FragColor = vec4(mix(color, uSky, distanceFog), 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function makeVessel(variant: Variant) {
  const vessel = new THREE.Group();
  const navy = new THREE.MeshStandardMaterial({ color: variant === "B" ? "#dceceb" : "#164859", roughness: .85 });
  const ivory = new THREE.MeshStandardMaterial({ color: "#eee9d8", roughness: .9 });
  const ochre = new THREE.MeshStandardMaterial({ color: "#d79b46", roughness: .8 });
  const glass = new THREE.MeshStandardMaterial({ color: "#355d6a", roughness: .4 });
  const hull = new THREE.Shape();
  hull.moveTo(-.85, -2.2);
  hull.lineTo(.85, -2.2);
  hull.lineTo(1, 1.05);
  hull.quadraticCurveTo(.75, 2.1, 0, 2.8);
  hull.quadraticCurveTo(-.75, 2.1, -1, 1.05);
  hull.closePath();
  const hullMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(hull, { depth: .6, bevelEnabled: true, bevelSize: .12, bevelThickness: .12, bevelSegments: 1, steps: 1 }), navy);
  hullMesh.rotation.x = -Math.PI / 2;
  hullMesh.position.y = .1;
  vessel.add(hullMesh);
  const addBox = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    box.position.set(x, y, z);
    vessel.add(box);
  };
  addBox(1.55, .16, 3.1, 0, .8, .25, ivory);
  addBox(1.25, .75, 1.4, 0, 1.23, -.45, ivory);
  addBox(1.31, .27, .85, 0, 1.37, -.7, glass);
  addBox(1.5, .15, 1.65, 0, 1.7, -.45, ivory);
  addBox(.09, 1.7, .09, .3, 2.3, -.3, ivory);
  addBox(.95, .08, .1, .3, 3, -.3, ivory);
  addBox(.65, .45, .7, -.2, 1.1, 1.35, ochre);
  for (const side of [-1, 1]) {
    addBox(.035, .4, 3, side * .76, 1, .25, ivory);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.22, .07, 6, 12), ochre);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(side * .86, 1.2, .15);
    vessel.add(ring);
  }
  return vessel;
}

export default function OceanScene({ variant, station, paused, onStation }: { variant: Variant; station: number; paused: boolean; onStation: (index: number) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const markers = useRef<(HTMLButtonElement | null)[]>([]);
  const current = useRef({ station, paused });
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => { current.current = { station, paused }; }, [station, paused]);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2", { antialias: false, alpha: false });
    // Context availability is a browser-only external capability, discovered at mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!context) { setUnavailable(true); return; }
    const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.prepend(canvas);
    const scene = new THREE.Scene();
    const sky = new THREE.Color(variant === "A" ? "#c4dcda" : variant === "B" ? "#102f50" : "#d3e4df");
    scene.background = sky;
    if (variant !== "B") scene.fog = new THREE.FogExp2(sky, variant === "A" ? .005 : .003);
    const perspective = new THREE.PerspectiveCamera(43, 1, .1, 500);
    const orthographic = new THREE.OrthographicCamera(-38, 38, 32, -32, .1, 500);
    const camera = variant === "B" ? orthographic : perspective;
    scene.add(new THREE.HemisphereLight("#effbf5", "#316370", 2.6));
    const sun = new THREE.DirectionalLight("#fff1cc", 3);
    sun.position.set(-20, 40, -15);
    scene.add(sun);
    const waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uAmplitude: { value: variant === "B" ? .25 : .8 },
        uDeep: { value: new THREE.Color(variant === "A" ? "#093b48" : variant === "B" ? "#102f50" : "#29686b") },
        uShallow: { value: new THREE.Color(variant === "A" ? "#348c91" : variant === "B" ? "#276881" : "#69a6a0") },
        uSky: { value: sky }, uFog: { value: variant === "B" ? 0 : .003 },
        uGraphic: { value: variant === "B" ? 1 : 0 },
        uFaceted: { value: variant === "C" ? .5 : 0 },
      }, vertexShader, fragmentShader,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 600, 180, 180), waterMaterial);
    water.rotation.x = -Math.PI / 2;
    scene.add(water);
    const vessel = makeVessel(variant);
    if (variant === "C") vessel.scale.setScalar(1.65);
    vessel.position.set(2, 0, 7);
    scene.add(vessel);
    const buoys: THREE.Group[] = [];
    stations.forEach(({ position }, index) => {
      const buoy = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(.55, .75, .5, 12), new THREE.MeshStandardMaterial({ color: "#d7a342", roughness: .8 }));
      body.position.y = .35;
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 2.7, 6), new THREE.MeshStandardMaterial({ color: "#e6e9db" }));
      mast.position.y = 1.7;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 6), new THREE.MeshBasicMaterial({ color: "#f6d88e" }));
      cap.position.y = 3.1;
      buoy.add(body, mast, cap);
      buoy.position.set(position[0], 0, position[1]);
      scene.add(buoy);
      buoys.push(buoy);
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.9, 1.96, 64), new THREE.MeshBasicMaterial({ color: "#b8d8d2", side: THREE.DoubleSide, transparent: true, opacity: .55 }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(position[0], .45, position[1]);
      scene.add(ring);
      ring.name = `station-${index}`;
    });
    if (variant === "B") {
      const route = new THREE.CatmullRomCurve3([new THREE.Vector3(2, .5, 7), ...stations.map(s => new THREE.Vector3(s.position[0], .5, s.position[1]))]);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(route.getPoints(100)), new THREE.LineDashedMaterial({ color: "#b6d7d6", dashSize: .35, gapSize: .5, transparent: true, opacity: .4 }));
      line.computeLineDistances();
      scene.add(line);
    }
    const wake = new THREE.Group();
    for (const side of [-1, 1]) {
      const points = Array.from({ length: 24 }, (_, i) => new THREE.Vector3(side * (.7 + i * .13), .2, 2 + i * .32));
      wake.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: "#dceceb", transparent: true, opacity: .27 })));
    }
    vessel.add(wake);
    const resize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      const aspect = w / h;
      renderer.setSize(w, h);
      perspective.aspect = aspect;
      if (variant === "A") {
        perspective.position.set(aspect < .8 ? 32 : 28, aspect < .8 ? 47 : 34, aspect < .8 ? 60 : 43);
        perspective.lookAt(0, 0, -4);
        perspective.setViewOffset(w, h, aspect < .8 ? 0 : -w * .1, -h * .12, w, h);
      } else if (variant === "C") {
        perspective.position.set(24, 24, 33);
        perspective.lookAt(2, 0, 0);
      } else {
        const halfHeight = aspect < 1 ? 38 / aspect : 33;
        orthographic.left = -halfHeight * aspect;
        orthographic.right = halfHeight * aspect;
        orthographic.top = halfHeight;
        orthographic.bottom = -halfHeight;
        orthographic.position.set(0, 65, 4);
        orthographic.lookAt(0, 0, 0);
        orthographic.updateProjectionMatrix();
      }
      perspective.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    let time = 0, previous = 0, frame = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const projected = new THREE.Vector3();
    const labelOffset = new THREE.Vector3(0, 3.8, 0);
    const target = new THREE.Vector3();
    const render = (now: number) => {
      const delta = Math.min((now - previous) / 1000, .04);
      previous = now;
      const stopped = current.current.paused || reduced.matches;
      if (!stopped && !document.hidden) time += delta;
      waterMaterial.uniforms.uTime.value = time;
      const destination = stations[current.current.station];
      target.set(destination.position[0] - 3, 0, destination.position[1] + 4);
      if (reduced.matches) vessel.position.copy(target);
      else if (!stopped) {
        const dx = target.x - vessel.position.x, dz = target.z - vessel.position.z;
        if (Math.hypot(dx, dz) > .3) vessel.rotation.y = Math.atan2(-dx, -dz);
        vessel.position.lerp(target, 1 - Math.exp(-delta * .17));
      }
      vessel.position.y = Math.sin(time * .9) * .12;
      vessel.rotation.z = Math.sin(time * .7) * .025;
      buoys.forEach((buoy, index) => {
        buoy.position.y = Math.sin(time + index) * .12;
        projected.copy(buoy.position).add(labelOffset).project(camera);
        const marker = markers.current[index];
        if (marker) {
          marker.style.left = `${(projected.x * .5 + .5) * 100}%`;
          marker.style.top = `${(-projected.y * .5 + .5) * 100}%`;
          const horizontalLimit = container.clientWidth < 700 ? .7 : .88;
          const screenY = -projected.y * .5 + .5;
          const clearOfCopy = variant !== "A" || (screenY > .34 && screenY < .72);
          marker.style.visibility = Math.abs(projected.x) < horizontalLimit && Math.abs(projected.y) < .92 && clearOfCopy ? "visible" : "hidden";
        }
      });
      if (!document.hidden) renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    const contextLost = () => setUnavailable(true);
    canvas.addEventListener("webglcontextlost", contextLost);
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", contextLost);
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      renderer.dispose();
      canvas.remove();
    };
  }, [variant]);

  return <div ref={host} className="ocean-scene" role="group" aria-label="Estudo do oceano com embarcação e três estações fictícias">
    {unavailable ? <p className="scene-unavailable">A visualização 3D não está disponível. Explore as estações pelo índice.</p> : stations.map((item, index) => <button key={item.name} ref={element => { markers.current[index] = element; }} className={`world-marker ${station === index ? "selected" : ""}`} onClick={() => onStation(index)} aria-pressed={station === index}><span className="marker-dot" /><span>{item.name}</span></button>)}
  </div>;
}
