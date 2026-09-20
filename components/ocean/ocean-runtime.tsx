/* eslint-disable react-hooks/immutability -- Three owns mutable GPU objects; frame updates and ref writes deliberately bypass React rendering. */
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Group, ShaderMaterial, Vector2, Vector3 } from "three";
import { useModelScene } from "@/lib/use-model-scene";
import { qualityEnvelope, type OceanQuality } from "@/lib/ocean-quality";
import type { OceanConfiguration } from "@/lib/ocean-config";
import StopLandmark from "@/components/ocean/stop-landmark";
import { poseAtProgress, type ChartedRoute } from "@/lib/charted-route";
import type { RouteMotion } from "@/lib/route-motion";
import { CAMERA_FOV, frameRouteCamera, isPortraitViewport } from "@/lib/route-camera";
import { baselineOceanFragmentShader, oceanFragmentShader, oceanVertexShader, sampleOceanHeight } from "@/lib/ocean-surface";
import { createOceanEnvironment } from "@/lib/ocean-lighting";
import { CALM_WAVE_RATE, CALM_WAVE_STRENGTH, oceanDaylightUniforms, oceanFogRange, oceanSunPosition, readOceanDaylight } from "@/lib/ocean-daylight";
import { createShipWake, CRUISE_SPEED } from "@/lib/ship-wake";
import { useSceneDiagnostics } from "@/lib/use-scene-diagnostics";
import { projectWaterCircle, SHIP_EXTENT } from "@/lib/scene-projection";
import { createSurfMaterial } from "@/lib/landmark-surf";
import type { StageLayout } from "@/lib/stage-layout";

export type PreparationStage = "checking" | "loading" | "preparing" | "frame" | "ready";

type RuntimeProps = {
  configuration: OceanConfiguration;
  vesselUrl: string;
  quality: OceanQuality;
  visible: boolean;
  suspended: RefObject<boolean>;
  recoveryGeneration: number;
  onFrame: (milliseconds: number | null) => void;
  reducedMotion: boolean;
  active: boolean;
  reading: boolean;
  chartedRoute: ChartedRoute;
  route: RouteMotion;
  inputConnected: RefObject<boolean>;
  onStage: (stage: PreparationStage) => void;
  onFailure: () => void;
  onCanvas: (canvas: HTMLCanvasElement) => void;
  onSettle: (stop: number | null) => void;
  // Where the settled Ship and its Landmark appear, so the Stop Card stands clear of both.
  onLayout: (layout: StageLayout) => void;
};

// How far the hull answers the water it drives through, in radians.
const SQUAT = 0.012;
const SURGE_PITCH = 0.03;
const HEEL = 0.035;
const MAXIMUM_HEEL = 0.06;


function SailableScene(props: RuntimeProps) {
  const { onStage, onFailure, onFrame, active, reading, visible, recoveryGeneration } = props;
  const { gl, scene, camera, size, invalidate, setFrameloop } = useThree();
  const daylight = useMemo(() => readOceanDaylight(gl.domElement), [gl]);
  const measureScene = useSceneDiagnostics(gl);
  const oceanDraws = useRef(0);
  const vesselScene = useModelScene(props.vesselUrl);
  const vesselGroup = useRef<Group>(null);
  const prepared = useRef(false);
  const announced = useRef(false);
  const failed = useRef(false);
  const compilations = useRef(0);
  const liveMaterial = useRef<ShaderMaterial | null>(null);
  const retired = useRef(new Set<ShaderMaterial>());
  // Dispose the water and surf materials the scene no longer uses, once nothing polls them.
  const releaseRetired = () => {
    if (compilations.current > 0) return;
    for (const old of retired.current) {
      if (old === liveMaterial.current) continue;
      retired.current.delete(old);
      old.dispose();
    }
  };
  const fallbackPending = useRef(false);
  const [baselineWater, setBaselineWater] = useState(false);
  const baselineActive = useRef(false);
  const elapsed = useRef(0);
  const lastFrame = useRef<number | null>(null);
  const frameWasActive = useRef(false);
  const reportedStop = useRef<number | null | undefined>(undefined);
  const cameraPosition = useMemo(() => new Vector3(), []);
  const projection = useMemo(() => new Vector3(), []);
  const [shipWake] = useState(createShipWake);
  const material = useMemo(() => {
    const { wakePoints } = qualityEnvelope[props.quality.tier];
    return new ShaderMaterial({
      defines: { WAKE_POINTS: wakePoints, ...(props.quality.tier === "low" ? { LOW_QUALITY: 1 } : props.quality.tier === "high" ? { HIGH_QUALITY: 1 } : {}) },
      uniforms: {
        ...oceanDaylightUniforms(daylight),
        waveStrength: { value: 1 },
        time: { value: 0 }, vessel: { value: new Vector2() }, heading: { value: 0 }, wakeDetail: { value: 1 },
        speed: { value: 0 }, thrust: { value: 0 }, course: { value: new Vector2(0, -1) },
        wakePoints: { value: new Float32Array(Math.max(wakePoints, 2) * 4) },
        wakeForces: { value: new Float32Array(Math.max(wakePoints, 2) * 4) },
        wakeBounds: { value: new Float32Array([1, 1, -1, -1]) },
      },
      vertexShader: oceanVertexShader,
      fragmentShader: baselineWater ? baselineOceanFragmentShader : oceanFragmentShader,
    });
  }, [baselineWater, props.quality.tier, daylight]);
  // One surf material for every Landmark: they all read the same swell, and one
  // program keeps the shoreline inside the scene's draw and program budgets.
  const surfMaterial = useMemo(() => createSurfMaterial(daylight), [daylight]);
  // Every compilation polls the surf program too, so it is released like a
  // retired water material: only once no compilation is still in flight.
  useEffect(() => {
    const retiring = retired.current;
    retiring.delete(surfMaterial);
    return () => {
      retiring.add(surfMaterial);
      queueMicrotask(releaseRetired);
    };
  }, [surfMaterial]);

  useLayoutEffect(() => {
    if (props.quality.tier === "low") return;
    const environment = createOceanEnvironment(gl, daylight);
    scene.environment = environment.texture;
    scene.environmentIntensity = .75;
    let disposed = false;
    const release = () => {
      if (disposed) return;
      disposed = true;
      scene.environment = null;
      environment.dispose();
    };
    // Release render-target handles while the old context is still lost.
    // Deleting them after restoration would invalidate the new context's frame.
    gl.domElement.addEventListener("webglcontextlost", release);
    return () => {
      gl.domElement.removeEventListener("webglcontextlost", release);
      release();
    };
  }, [gl, scene, recoveryGeneration, props.quality.tier, daylight]);

  // Three checks a program for errors once, on its first use, and that can be
  // the first frame, before any passive effect runs. So the handler is in place
  // before a frame can draw and never lapses while the scene is mounted.
  useLayoutEffect(() => {
    baselineActive.current = baselineWater;
  }, [baselineWater]);
  useLayoutEffect(() => {
    gl.debug.onShaderError = (context, program, vertex, fragment) => {
      if (!baselineActive.current && context.getShaderSource(fragment)?.includes("uniform float wakeDetail;")) {
        fallbackPending.current = true;
        setBaselineWater(true);
        return;
      }
      console.error("Ocean shader preparation failed", context.getProgramInfoLog(program), context.getShaderInfoLog(vertex), context.getShaderInfoLog(fragment));
      failed.current = true;
      onFailure();
    };
    return () => { gl.debug.onShaderError = null; };
  }, [gl, onFailure]);

  useEffect(() => {
    let cancelled = false;
    prepared.current = false;
    announced.current = false;
    failed.current = false;
    // A re-run before baseline water arrives (StrictMode, or any other
    // dependency) keeps waiting for it: the failed decorative program will not
    // report again, so validating it would read its errors as a broken frame.
    if (fallbackPending.current && !baselineWater) return;
    fallbackPending.current = false;
    if (baselineWater) {
      const context = gl.getContext();
      // Consume errors from the rejected decorative program before validating
      // the replacement. Errors from its own frame still fail readiness.
      for (let error = 0; error < 8 && context.getError() !== context.NO_ERROR; error++) { /* Drain old flags. */ }
    }
    onStage("preparing");
    compilations.current++;
    const compilation = gl.compileAsync(scene, camera);
    void compilation.catch(() => undefined).then(() => {
      compilations.current--;
      releaseRetired();
    });
    compilation.then(() => {
      if (cancelled || failed.current || fallbackPending.current) return;
      prepared.current = true;
      onStage("frame");
      invalidate();
    }).catch((error) => { console.error("Ocean preparation failed", error); onFailure(); });
    return () => { cancelled = true; };
  }, [gl, scene, camera, invalidate, onStage, onFailure, recoveryGeneration, material, baselineWater]);

  useEffect(() => {
    const stop = () => {
      setFrameloop("never");
      lastFrame.current = null;
      frameWasActive.current = false;
      onFrame(null);
    };
    const hidden = () => { if (document.hidden) stop(); };
    window.addEventListener("blur", stop);
    window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", stop);
      window.removeEventListener("pagehide", stop);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [setFrameloop, onFrame]);

  useEffect(() => {
    lastFrame.current = null;
    frameWasActive.current = false;
    onFrame(null);
    if (visible) invalidate();
  }, [active, reading, visible, recoveryGeneration, onFrame, invalidate]);

  // Three polls every compiling material until its program is ready. Disposing one
  // mid-poll throws and strands readiness (parallel compilation in Firefox/WebKit
  // widens that window, and a re-run such as StrictMode's can leave more than one
  // compilation polling it), so release a material only once no compilation is
  // in flight, and only if it was replaced or unmounted rather than remounted.
  useEffect(() => {
    const retiring = retired.current;
    liveMaterial.current = material;
    retiring.delete(material);
    return () => {
      liveMaterial.current = null;
      retiring.add(material);
      queueMicrotask(releaseRetired);
    };
  }, [material]);

  useFrame((_, delta) => {
    if (failed.current || document.hidden || props.suspended.current || gl.getContext().isContextLost()) return;
    try {
      const measuring = announced.current && props.active && !props.reading;
      const now = performance.now();
      if (measuring && frameWasActive.current && lastFrame.current !== null) props.onFrame(now - lastFrame.current);
      // The first frame after entry/resume anchors time without moving the Ship.
      const seconds = measuring && frameWasActive.current ? Math.min(delta, 0.05) : 0;
      lastFrame.current = measuring ? now : null;
      frameWasActive.current = measuring;
      const motion = props.route.advance(seconds, now, props.reducedMotion);
      if (reportedStop.current !== motion.settledStop) {
        reportedStop.current = motion.settledStop;
        props.onSettle(motion.settledStop);
      }
      const pose = poseAtProgress(props.chartedRoute, motion.progress);
      elapsed.current += seconds * (props.reducedMotion ? CALM_WAVE_RATE : 1);
      const waveStrength = props.reducedMotion ? CALM_WAVE_STRENGTH : 1;
      material.uniforms.waveStrength.value = waveStrength;
      material.uniforms.time.value = elapsed.current;
      // The surf line shares the ocean's clock, so its band never drifts out of
      // the swell it sits on. Reduced motion holds the sets still.
      surfMaterial.uniforms.time.value = elapsed.current;
      surfMaterial.uniforms.waveStrength.value = waveStrength;
      surfMaterial.uniforms.motion.value = props.reducedMotion ? 0 : 1;
      material.uniforms.vessel.value.set(pose.position.x, pose.position.z);
      material.uniforms.heading.value = pose.heading;
      material.uniforms.wakeDetail.value = qualityEnvelope[props.quality.tier].wake;
      if (props.reducedMotion) shipWake.place(pose.position, pose.heading, elapsed.current);
      const wake = shipWake.sail(pose.position, pose.heading, seconds, elapsed.current);
      shipWake.write(material.uniforms.wakePoints.value, material.uniforms.wakeForces.value, material.uniforms.wakeBounds.value, elapsed.current);
      if (props.quality.tier !== "low") {
        material.uniforms.speed.value = wake.speed;
        material.uniforms.thrust.value = Math.max(wake.surge, 0);
        material.uniforms.course.value.set(wake.course.x, wake.course.z);
      }
      if (vesselGroup.current) {
        const { x, z } = pose.position;
        const time = elapsed.current;
        const forwardX = Math.sin(pose.heading);
        const forwardZ = -Math.cos(pose.heading);
        const bowHeight = sampleOceanHeight(x + forwardX * 2.5, z + forwardZ * 2.5, time, waveStrength);
        const sternHeight = sampleOceanHeight(x - forwardX * 2.5, z - forwardZ * 2.5, time, waveStrength);
        const portHeight = sampleOceanHeight(x - Math.cos(pose.heading), z - Math.sin(pose.heading), time, waveStrength);
        const starboardHeight = sampleOceanHeight(x + Math.cos(pose.heading), z + Math.sin(pose.heading), time, waveStrength);
        vesselGroup.current.position.set(x, sampleOceanHeight(x, z, time, waveStrength) + .05, z);
        // Driving lifts the bow and braking dips it; a turn heels the Ship away
        // from its centre. Backing along the route reverses both.
        const astern = wake.course.x * forwardX + wake.course.z * forwardZ < 0 ? -1 : 1;
        const cruise = Math.min(wake.speed / CRUISE_SPEED, 1);
        const heel = Math.max(-MAXIMUM_HEEL, Math.min(MAXIMUM_HEEL, wake.turn * cruise * HEEL));
        // Reduced motion disables pitch and roll; the Ship still turns along the route.
        vesselGroup.current.rotation.set(
          props.reducedMotion ? 0 : Math.atan2(bowHeight - sternHeight, 5) + astern * (cruise * SQUAT + wake.surge * SURGE_PITCH),
          -pose.heading,
          props.reducedMotion ? 0 : Math.atan2(starboardHeight - portHeight, 2) + astern * heel,
          "YXZ",
        );
      }
      const framing = frameRouteCamera(pose.position, size);
      // A cut while the scene renders on demand still needs its frame.
      if (!measuring && camera.position.distanceToSquared(cameraPosition.set(...framing.position)) > 0.001) invalidate();
      camera.position.set(...framing.position);
      camera.lookAt(...framing.target);
      if (motion.settledStop !== null) {
        camera.updateMatrixWorld();
        const stop = props.configuration.stops[motion.settledStop];
        const landmark = stop.landmark;
        props.onLayout({
          portrait: isPortraitViewport(size),
          ship: projectWaterCircle(camera, pose.position, SHIP_EXTENT, size, projection),
          landmark: landmark
            ? projectWaterCircle(camera, { x: landmark[0], z: landmark[1] }, props.configuration.landmarks[stop.id].radius, size, projection)
            : null,
        });
      }
      // Owning this render makes readiness a post-render fact, not a useFrame guess.
      oceanDraws.current = 0;
      gl.render(scene, camera);
      measureScene(props.quality.tier, oceanDraws.current);
      if (fallbackPending.current) return;
      if (prepared.current && !announced.current && props.inputConnected.current) {
        const context = gl.getContext();
        const error = context.getError();
        // Stop 00 can contain only the ocean and the Ship's single material.
        if (context.isContextLost() || error !== context.NO_ERROR || gl.info.render.calls < 2) {
          console.error("Ocean frame validation failed", context.isContextLost(), error, gl.info.render.calls);
          failed.current = true;
          props.onFailure();
          return;
        }
        announced.current = true;
        props.onStage("ready");
      }
    } catch (error) {
      console.error("Ocean render failed", error);
      failed.current = true;
      props.onFailure();
    }
  }, 1);

  return (
    <>
      <color attach="background" args={[daylight.background]} />
      <fog attach="fog" args={[daylight.background, ...oceanFogRange]} />
      <hemisphereLight args={[daylight.white, daylight.deep, .65]} />
      <directionalLight position={oceanSunPosition} intensity={3.1} color={daylight.white} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={material} onBeforeRender={() => { oceanDraws.current++; }}>
        <planeGeometry args={[1200, 1200, qualityEnvelope[props.quality.tier].segments, qualityEnvelope[props.quality.tier].segments]} />
      </mesh>
      <group ref={vesselGroup}><primitive object={vesselScene} /></group>
      {props.configuration.stops.map((stop) => stop.landmark ? (
        <StopLandmark
          key={stop.id}
          url={props.configuration.landmarks[stop.id].variants[props.quality.tier === "low" ? "low" : "balanced"].url}
          position={stop.landmark}
          surf={surfMaterial}
        />
      ) : null)}
    </>
  );
}

export default function OceanRuntime(props: RuntimeProps) {
  return (
    <Canvas
      dpr={props.quality.dpr}
      camera={{ fov: CAMERA_FOV, near: 0.5, far: 1200 }}
      frameloop={!props.visible ? "never" : props.active && !props.reading ? "always" : "demand"}
      gl={{ alpha: false, antialias: true, powerPreference: "default" }}
      onCreated={({ gl }) => props.onCanvas(gl.domElement)}
      fallback="O oceano em 3D não está disponível. Use o modo leitura.">
      <Suspense fallback={null}><SailableScene {...props} /></Suspense>
    </Canvas>
  );
}
