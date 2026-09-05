import * as THREE from "three";
import {
  angleDifference,
  available,
  measure,
  stations,
  step,
  tiers,
  variants,
  type Expedition,
} from "@/app/_prototype/expedition";

// Shared scene/control workload isolates R3F loop integration from direct Three.js.
const vertexShader = `
uniform float uTime;
varying vec3 vWorld;
void main() {
  vec3 p = position;
  p.z += sin(p.x*.34+p.y*.19+uTime*.65)*.27
       + sin(p.x*-.18+p.y*.48+uTime*.48)*.14;
  vWorld = (modelMatrix * vec4(p, 1.)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.);
}`;
const fragmentShader = `
uniform float uTime;
uniform float uDetail;
varying vec3 vWorld;
void main() {
  vec2 p = vWorld.xz;
  float w1=cos(p.x*.34-p.y*.19+uTime*.65);
  float w2=cos(p.x*-.18-p.y*.48+uTime*.48);
  float a=sin(p.x*1.4+p.y*.8+sin(p.y*.4+uTime*.4)+uTime*.7);
  float b=sin(p.x*-.6+p.y*2.5-uTime*.6);
  vec3 n=normalize(vec3(-(.092*w1-.026*w2)+a*.06*uDetail,1.,.051*w1+.069*w2+b*.05*uDetail));
  vec3 view=normalize(cameraPosition-vWorld);
  float fresnel=pow(1.-max(dot(n,view),0.),3.);
  vec3 deep=vec3(.0027,.0437,.0648), jade=vec3(.034,.262,.283), sky=vec3(.50,.66,.64);
  float broad=sin(p.x*.04+p.y*.025)*.5+.5;
  vec3 color=mix(deep,jade,.13+broad*.25+n.x*.32);
  float shine=pow(max(dot(reflect(-normalize(vec3(-.7,1.7,-.8)),n),view),0.),48.);
  color+=sky*(shine*.45+smoothstep(.97,1.,a*b)*.045*uDetail);
  color=mix(color,sky,fresnel*.35);
  float radius=length(p-vec2(0.,-50.));
  float current=smoothstep(82.,88.,radius)*(1.-smoothstep(103.,109.,radius));
  float bands=smoothstep(.5,.95,sin(radius*2.5+atan(p.y+50.,p.x)*10.-uTime*.9));
  color=mix(color,sky,current*(.07+bands*.22));
  float fog=1.-exp(-length(cameraPosition-vWorld)*.0018);
  gl_FragColor=vec4(mix(color,sky,fog),1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function vesselModel() {
  const group = new THREE.Group();
  const navy = new THREE.MeshStandardMaterial({
    color: "#164859",
    roughness: 0.85,
  });
  const ivory = new THREE.MeshStandardMaterial({
    color: "#eee9d8",
    roughness: 0.9,
  });
  const ochre = new THREE.MeshStandardMaterial({
    color: "#d79b46",
    roughness: 0.8,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: "#355d6a",
    roughness: 0.4,
  });
  const shape = new THREE.Shape();
  shape.moveTo(-0.85, -2.2);
  shape.lineTo(0.85, -2.2);
  shape.lineTo(1, 1.05);
  shape.quadraticCurveTo(0.75, 2.1, 0, 2.8);
  shape.quadraticCurveTo(-0.75, 2.1, -1, 1.05);
  shape.closePath();
  const hull = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.6,
      bevelEnabled: true,
      bevelSize: 0.12,
      bevelThickness: 0.12,
      bevelSegments: 1,
      steps: 1,
    }),
    navy,
  );
  hull.rotation.x = -Math.PI / 2;
  hull.position.y = 0.1;
  group.add(hull);
  const box = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    group.add(mesh);
  };
  box(1.55, 0.16, 3.1, 0, 0.8, 0.25, ivory);
  box(1.25, 0.75, 1.4, 0, 1.23, -0.45, ivory);
  box(1.31, 0.27, 0.85, 0, 1.37, -0.7, glass);
  box(1.5, 0.15, 1.65, 0, 1.7, -0.45, ivory);
  box(0.09, 1.7, 0.09, 0.3, 2.3, -0.3, ivory);
  box(0.95, 0.08, 0.1, 0.3, 3, -0.3, ivory);
  box(0.65, 0.45, 0.7, -0.2, 1.1, 1.35, ochre);
  for (const side of [-1, 1]) {
    box(0.035, 0.4, 3, side * 0.76, 1, 0.25, ivory);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.07, 6, 12),
      ochre,
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.set(side * 0.86, 1.2, 0.15);
    group.add(ring);
  }
  group.scale.setScalar(1.25);
  return group;
}

export function createWorld(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  s: Expedition,
  labels: (HTMLDivElement | null)[],
  setDpr?: (dpr: number) => void,
) {
  const group = new THREE.Group();
  scene.add(group);
  scene.background = new THREE.Color("#b7d5d1");
  scene.fog = new THREE.FogExp2("#b7d5d1", 0.0025);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const hemi = new THREE.HemisphereLight("#effbf5", "#316370", 2.6);
  const sun = new THREE.DirectionalLight("#fff1cc", 3);
  sun.position.set(-20, 40, -15);
  group.add(hemi, sun);
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDetail: { value: 0.55 } },
    vertexShader,
    fragmentShader,
  });
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(430, 430, 112, 112),
    material,
  );
  water.rotation.x = -Math.PI / 2;
  group.add(water);
  const vessel = vesselModel();
  group.add(vessel);
  const buoys = stations.map((p, i) => {
    const buoy = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({
      color: "#ecc180",
      roughness: 0.8,
    });
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.15, 0.8, 12),
      metal,
    );
    body.position.y = 0.6;
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 3.6, 6),
      new THREE.MeshStandardMaterial({ color: "#e6e9db" }),
    );
    mast.position.y = 2.2;
    const beacon = new THREE.Mesh(
      i === 3
        ? new THREE.OctahedronGeometry(0.55)
        : i === 2
          ? new THREE.BoxGeometry(0.65, 0.65, 0.65)
          : new THREE.SphereGeometry(0.38, 8, 6),
      new THREE.MeshBasicMaterial({ color: "#ffe0a3" }),
    );
    beacon.position.y = 4.2;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(7.2, 7.35, 72),
      new THREE.MeshBasicMaterial({
        color: "#dceceb",
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.45;
    buoy.add(body, mast, beacon, ring);
    buoy.position.set(p.x, 0, p.z);
    group.add(buoy);
    return { buoy, beacon, ring, metal };
  });
  const wakePositions = [new Float32Array(90 * 3), new Float32Array(90 * 3)];
  const wakes = wakePositions.map((points) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: "#dceceb",
        transparent: true,
        opacity: 0.3,
      }),
    );
    line.frustumCulled = false;
    group.add(line);
    return line;
  });
  let lastTier = "",
    firstCamera = true,
    lastReading: number | null = null,
    lastVariant = "",
    width = 0,
    height = 0;
  const projected = new THREE.Vector3(),
    desired = new THREE.Vector3(),
    look = new THREE.Vector3(),
    smoothLook = new THREE.Vector3();
  const geometryCache = new Map<string, THREE.PlaneGeometry>([
    ["balanced", water.geometry],
  ]);
  return {
    update(delta: number, w: number, h: number) {
      const portrait = w / h < 0.8;
      if (width !== w || height !== h) {
        width = w;
        height = h;
        camera.aspect = w / h;
        camera.fov = portrait ? 49 : 43;
        camera.updateProjectionMatrix();
        firstCamera = true;
      }
      step(s, delta, portrait);
      if (s.reading !== lastReading) {
        firstCamera = true;
        lastReading = s.reading;
      }
      measure(s, delta);
      const routeChoice =
        s.completed.includes(0) &&
        !s.completed.includes(1) &&
        !s.completed.includes(2);
      const targetFov = portrait ? (routeChoice ? 60 : 49) : 43;
      if (Math.abs(camera.fov - targetFov) > 0.01) {
        camera.fov +=
          (targetFov - camera.fov) * (1 - Math.exp(-Math.min(delta, 0.05) * 2));
        camera.updateProjectionMatrix();
      }
      if (s.tier !== lastTier) {
        const settings = tiers[s.tier];
        if (!geometryCache.has(s.tier))
          geometryCache.set(
            s.tier,
            new THREE.PlaneGeometry(
              430,
              430,
              settings.segments,
              settings.segments,
            ),
          );
        water.geometry = geometryCache.get(s.tier)!;
        material.uniforms.uDetail.value = settings.detail;
        s.dpr = Math.min(window.devicePixelRatio, settings.dpr);
        if (setDpr) setDpr(s.dpr);
        else renderer.setPixelRatio(s.dpr);
        lastTier = s.tier;
      }
      material.uniforms.uTime.value = s.waveTime;
      vessel.position.set(s.x, Math.sin(s.waveTime * 0.9) * 0.1, s.z);
      vessel.rotation.set(0, -s.heading, -s.turn * 0.045);
      const tuning = variants[s.variant];
      const frozen = s.paused || s.hidden || s.reading !== null;
      if (firstCamera || lastVariant !== s.variant || s.reduced)
        s.cameraHeading = s.heading;
      else if (!frozen)
        s.cameraHeading +=
          angleDifference(s.heading, s.cameraHeading) *
          (1 - Math.exp(-Math.min(delta, 0.05) * tuning.lag));
      const forwardX = Math.sin(s.cameraHeading),
        forwardZ = -Math.cos(s.cameraHeading);
      const extraHeight = portrait
        ? 18 + (routeChoice ? 44 : 0)
        : routeChoice
          ? 7
          : 0;
      desired.set(
        s.x - forwardX * tuning.behind,
        tuning.height + extraHeight,
        s.z - forwardZ * tuning.behind,
      );
      const ahead = tuning.ahead + (portrait ? 17 : 0);
      look.set(s.x + forwardX * ahead, 0, s.z + forwardZ * ahead);
      if (firstCamera || lastVariant !== s.variant || s.reduced) {
        camera.position.copy(desired);
        smoothLook.copy(look);
      } else if (!frozen) {
        camera.position.lerp(desired, 1 - Math.exp(-delta * 3));
        smoothLook.lerp(look, 1 - Math.exp(-delta * 3));
      }
      camera.lookAt(smoothLook);
      camera.updateMatrixWorld();
      firstCamera = false;
      lastVariant = s.variant;
      const occupied: { x: number; y: number }[] = [];
      buoys.forEach(({ buoy, beacon, ring, metal }, i) => {
        const active = available(s, i),
          complete = s.completed.includes(i);
        buoy.position.y = Math.sin(s.waveTime + i) * 0.1;
        metal.color.set(complete ? "#9baea9" : active ? "#ecc180" : "#58797a");
        beacon.visible = active;
        ring.visible = active;
        ring.material.opacity = complete ? 0.18 : s.assistance ? 0.7 : 0.4;
        beacon.scale.setScalar(
          complete
            ? 0.7
            : (s.assistance ? 1.45 : 1) + Math.sin(s.waveTime * 2 + i) * 0.1,
        );
        const label = labels[i];
        if (!label) return;
        projected.set(buoy.position.x, 5, buoy.position.z).project(camera);
        const x = (projected.x * 0.5 + 0.5) * w,
          y = (-projected.y * 0.5 + 0.5) * h;
        const margin = portrait ? 72 : 92;
        const visible =
          active &&
          projected.z < 1 &&
          projected.z > -1 &&
          x > margin &&
          x < w - margin &&
          y > 110 &&
          y < h - 140 &&
          !occupied.some(
            (p) => Math.abs(p.x - x) < margin * 2 && Math.abs(p.y - y) < 52,
          );
        label.style.visibility = visible ? "visible" : "hidden";
        label.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
        label.dataset.complete = String(complete);
        if (visible) occupied.push({ x, y });
      });
      wakes.forEach((line, side) => {
        const count = Math.min(s.history.length, tiers[s.tier].wake);
        for (let i = 0; i < count; i++) {
          const point = s.history[i],
            next = s.history[Math.min(i + 1, s.history.length - 1)];
          const heading = Math.atan2(point.x - next.x, -(point.z - next.z));
          const spread = (side === 0 ? -1 : 1) * (1 + i * 0.07);
          wakePositions[side][i * 3] = point.x + Math.cos(heading) * spread;
          wakePositions[side][i * 3 + 1] = 0.4;
          wakePositions[side][i * 3 + 2] = point.z + Math.sin(heading) * spread;
        }
        line.geometry.setDrawRange(0, count);
        line.geometry.attributes.position.needsUpdate = true;
      });
      s.drawCalls = renderer.info.render.calls;
      s.triangles = renderer.info.render.triangles;
      s.ready = true;
    },
    dispose() {
      scene.remove(group);
      const geometries = new Set<THREE.BufferGeometry>(geometryCache.values()),
        materials = new Set<THREE.Material>();
      group.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          geometries.add(object.geometry);
          if (Array.isArray(object.material))
            object.material.forEach((m) => materials.add(m));
          else materials.add(object.material);
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
