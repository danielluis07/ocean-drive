import { ACESFilmicToneMapping, Mesh, PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, Vector3, WebGLRenderer } from "three";
import { createGpuTimer } from "@/lib/gpu-timer";
import { createOceanDaylight, oceanDaylightUniforms } from "@/lib/ocean-daylight";
import { oceanFragmentShader, oceanVertexShader } from "@/lib/ocean-surface";
import { qualityEnvelope } from "@/lib/ocean-quality";
import { CAMERA_FOV, frameRouteCamera } from "@/lib/route-camera";
import { cruiseWake } from "@/lib/ship-wake";
import { createWakeField, placeWakeField, WAKE_FIELD_SIZE } from "@/lib/wake-field";
import { percentile } from "@/lib/lab-vitals";

// Test-only ablations of the actual shader. Never shipped as runtime toggles.
const variants = {
  full: (source: string) => source,
  "swell + ripples": (source: string) => source
    .replace("swell(p, height, slope);", "height = 0.; slope = vec2(0.);")
    .replace(/^\s*windWave\(.*;$/gm, ""),
  "detailed wake": (source: string) => source.replace("shipWake(p, slope, wakeSurface, slick, wash, washAge, breaking);", "wash = 0.; washAge = 0.; breaking = 0.;"),
  foam: (source: string) => source.replace(/float tear = [\s\S]*?water = mix\(water, oceanWhite, clamp\(max\(foam[^\n]+/, "water = mix(water, oceanWhite, clamp(whitecaps * .85, 0., .9));"),
  whitecaps: (source: string) => source.replace(/whitecaps \*= [^\n]+/, "whitecaps = 0.;"),
  "bow wave": (source: string) => source.replace(/float energy = wakeEnergy\(speed\);[\s\S]*?wakeSurface \+= bowWave \* .6;/, "float energy = 0.; float ridge = 0.; float ahead = 0.; float abeam = 0.;"),
  "sky/cloud": (source: string) => source.replace(/vec3 sky = mix\(oceanHorizon[^\n]+\n\s*#ifndef LOW_QUALITY[\s\S]*?#endif/, "vec3 sky = oceanHorizon;"),
};

export async function measureOceanFeatures(captureOnly = false) {
  const renderer = new WebGLRenderer({ antialias: true });
  // Match Canvas's default display transform; it changes the compiled program.
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.setPixelRatio(1.25);
  renderer.setSize(1522, 632);
  document.body.append(renderer.domElement);
  const timer = createGpuTimer(renderer.getContext() as WebGL2RenderingContext);
  if (!timer) { renderer.dispose(); throw new Error("GPU timer queries are unavailable; no per-feature cost can be claimed"); }
  const framing = frameRouteCamera({ x: 0, z: 0 }, { width: 1522, height: 632 });
  const camera = new PerspectiveCamera(CAMERA_FOV, 1522 / 632, .1, 1000);
  camera.position.set(...framing.position);
  camera.lookAt(...framing.target);
  const { wakePoints, wakeTexels, segments } = qualityEnvelope.balanced;
  const uniforms = {
    ...oceanDaylightUniforms(createOceanDaylight("#071019", "#f4f7f8", "#2fb6b2")),
    time: { value: 50 }, waveStrength: { value: 1 }, vessel: { value: new Vector2() }, heading: { value: -Math.PI / 2 },
    wakeDetail: { value: 1 }, wakeCandidatesLimit: { value: 4 }, speed: { value: 60 }, thrust: { value: 0 }, course: { value: new Vector2(-1, 0) },
    wakePoints: { value: new Float32Array(wakePoints * 4) }, wakeForces: { value: new Float32Array(wakePoints * 4) },
    wakeBounds: { value: new Float32Array([1, 1, -1, -1]) }, wakeField: { value: new Vector3() }, wakeCandidates: { value: null as unknown },
  };
  const field = createWakeField(wakeTexels, wakePoints, uniforms);
  uniforms.wakeCandidates.value = field.texture;
  field.clear(renderer);
  const geometry = new PlaneGeometry(1200, 1200, segments, segments);
  const scenes = Object.entries(variants).map(([name, ablate]) => {
    const fragmentShader = ablate(oceanFragmentShader);
    if (name !== "full" && fragmentShader === oceanFragmentShader) throw new Error(`Ablation no longer matches the shader: ${name}`);
    const material = new ShaderMaterial({
      defines: { WAKE_POINTS: wakePoints }, uniforms,
      vertexShader: name === "swell + ripples" ? oceanVertexShader.replace("swell(world.xz, height, slope);", "height = 0.; slope = vec2(0.);") : oceanVertexShader,
      fragmentShader,
    });
    const water = new Mesh(geometry, material);
    water.rotation.x = -Math.PI / 2;
    const scene = new Scene();
    scene.add(water);
    return { name, scene, material };
  });
  const shaderErrors: string[] = [];
  renderer.debug.onShaderError = () => shaderErrors.push("Feature ablation failed to compile");
  for (const { scene } of scenes) await renderer.compileAsync(scene, camera);
  await renderer.compileAsync(field.scene, field.camera);
  if (shaderErrors.length) throw new Error(shaderErrors.join("; "));
  const rows = [];
  const captures: { state: string; dataURL: string }[] = [];
  try {
    const wake = cruiseWake({ x: 0, z: 0 }, -Math.PI / 2, 50);
    for (const age of [-1, 0, 4]) {
      uniforms.time.value = 50 + Math.max(age, 0);
      wake.write(uniforms.wakePoints.value, uniforms.wakeForces.value, uniforms.wakeBounds.value, uniforms.time.value);
      if (age < 0) { uniforms.wakeBounds.value.set([1, 1, -1, -1]); uniforms.speed.value = 0; }
      else uniforms.speed.value = age === 0 ? 60 : 0;
      const origin = placeWakeField(uniforms.wakeBounds.value, { x: 0, z: 0 }, wakeTexels);
      if (origin) uniforms.wakeField.value.set(origin.x, origin.z, 1 / WAKE_FIELD_SIZE);
      const samples = new Map(scenes.map(({ name }) => [name, [] as number[]]));
      // Interleave variants to distribute shared-iGPU clock drift. Discard each
      // variant's first ten draws; query results are asynchronous, never gl.finish.
      for (let round = 0; round < (captureOnly ? 0 : 70); round++) {
        for (let index = 0; index < scenes.length; index++) {
          const { name, scene } = scenes[(index + round) % scenes.length];
          if (!timer.begin()) throw new Error("GPU query was still in flight");
          if (origin && name !== "detailed wake") field.render(renderer);
          renderer.render(scene, camera);
          timer.end();
          let elapsed: number | null = null;
          const deadline = performance.now() + 5000;
          while (elapsed === null && performance.now() < deadline) {
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            elapsed = timer.poll();
          }
          if (elapsed === null) throw new Error("GPU query unavailable or disjoint; rerun the lab");
          if (round >= 10) samples.get(name)!.push(elapsed);
        }
      }
      if (!captureOnly) for (const [name, values] of samples) rows.push({ state: age < 0 ? "settled" : age === 0 ? "cruise" : "aged 4 s", omitted: name, samples: values.length, medianMs: percentile(values, .5), p90Ms: percentile(values, .9), minimumMs: Math.min(...values) });
      if (origin) field.render(renderer);
      renderer.render(scenes[0].scene, camera);
      captures.push({ state: age < 0 ? "settled" : age === 0 ? "cruise" : "aged-4s", dataURL: renderer.domElement.toDataURL() });
    }
    return { drawingBuffer: { width: renderer.domElement.width, height: renderer.domElement.height }, rows, captures };
  } finally {
    timer.dispose(); field.dispose(); field.material.dispose(); geometry.dispose();
    for (const { material } of scenes) material.dispose();
    renderer.dispose(); renderer.domElement.remove();
  }
}

declare global { interface Window { __measureOceanFeatures: typeof measureOceanFeatures } }
window.__measureOceanFeatures = measureOceanFeatures;
