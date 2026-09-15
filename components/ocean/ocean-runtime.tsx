/* eslint-disable react-hooks/immutability -- Three owns mutable GPU objects; frame updates and ref writes deliberately bypass React rendering. */
import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Group, ShaderMaterial, Vector2, Vector3 } from "three";
import { useVesselScene } from "@/lib/use-vessel-scene";
import { qualityEnvelope, type OceanQuality } from "@/lib/ocean-quality";
import type { VesselPose } from "@/lib/expedition-state";
import type { StationId } from "@/content/editorial";
import type { OceanConfiguration, OceanStation } from "@/lib/ocean-config";
import FieldStationBeacon from "@/components/ocean/field-station-beacon";
import { advanceStationJourney, type StationNavigation } from "@/lib/station-approach";
import type { AssistanceStage } from "@/lib/assisted-return";
import { boundaryCurrent } from "@/lib/boundary-current";
import { frameHelmCamera } from "@/lib/helm-camera";
import { baselineOceanFragmentShader, oceanFragmentShader, oceanVertexShader, sampleOceanHeight } from "@/lib/ocean-surface";
import { createOceanEnvironment } from "@/lib/ocean-lighting";

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
  sailing: boolean;
  reading: boolean;
  availableStations: StationId[];
  completedStations: StationId[];
  livePose: RefObject<VesselPose>;
  steering: RefObject<number>;
  targetHeading: RefObject<number | null>;
  reorientation: RefObject<boolean>;
  assistance: { stage: AssistanceStage; boundaryReturning: boolean };
  onAssistance: (assistance: { stage: AssistanceStage; boundaryReturning: boolean }) => void;
  controlsConnected: RefObject<boolean>;
  onStage: (stage: PreparationStage) => void;
  onFailure: () => void;
  onCanvas: (canvas: HTMLCanvasElement) => void;
  onStation: (station: OceanStation) => void;
};


function SailableScene(props: RuntimeProps) {
  const { onStage, onFailure, onFrame, active, sailing, reading, visible, recoveryGeneration } = props;
  const { gl, scene, camera, size, invalidate, setFrameloop } = useThree();
  const vesselScene = useVesselScene(props.vesselUrl);
  const vesselGroup = useRef<Group>(null);
  const stationLabel = useRef<HTMLButtonElement>(null);
  const prepared = useRef(false);
  const announced = useRef(false);
  const failed = useRef(false);
  const compiling = useRef<Promise<unknown>>(Promise.resolve());
  const liveMaterial = useRef<ShaderMaterial | null>(null);
  const fallbackPending = useRef(false);
  const [baselineWater, setBaselineWater] = useState(false);
  const elapsed = useRef(0);
  const lastFrame = useRef<number | null>(null);
  const frameWasActive = useRef(false);
  const navigation = useRef<StationNavigation>({ departedStation: null, arrivalPending: false });
  const cameraFraming = useRef<ReturnType<typeof frameHelmCamera> | null>(null);
  const reportedAssistance = useRef(props.assistance);
  const desiredCamera = useMemo(() => new Vector3(), []);
  const lookTarget = useMemo(() => new Vector3(), []);
  const material = useMemo(() => new ShaderMaterial({
    defines: props.quality.tier === "low" ? { LOW_QUALITY: 1 } : props.quality.tier === "high" ? { HIGH_QUALITY: 1 } : {},
    uniforms: { time: { value: 0 }, vessel: { value: new Vector2() }, heading: { value: 0 }, moving: { value: 0 }, wakeDetail: { value: 1 },
      boundaryCenter: { value: new Vector2(boundaryCurrent.centerX, boundaryCurrent.centerZ) }, boundaryRadius: { value: boundaryCurrent.radius } },
    vertexShader: oceanVertexShader,
    fragmentShader: baselineWater ? baselineOceanFragmentShader : oceanFragmentShader,
  }), [baselineWater, props.quality.tier]);

  useEffect(() => {
    const environment = createOceanEnvironment(gl);
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
  }, [gl, scene, recoveryGeneration]);

  useEffect(() => {
    let cancelled = false;
    prepared.current = false;
    announced.current = false;
    failed.current = false;
    fallbackPending.current = false;
    if (baselineWater) {
      const context = gl.getContext();
      // Consume errors from the rejected decorative program before validating
      // the replacement. Errors from its own frame still fail readiness.
      for (let error = 0; error < 8 && context.getError() !== context.NO_ERROR; error++) { /* Drain old flags. */ }
    }
    onStage("preparing");
    gl.debug.onShaderError = (context, program, vertex, fragment) => {
      if (!baselineWater && context.getShaderSource(fragment)?.includes("uniform float wakeDetail;")) {
        fallbackPending.current = true;
        setBaselineWater(true);
        return;
      }
      console.error("Ocean shader preparation failed", context.getProgramInfoLog(program), context.getShaderInfoLog(vertex), context.getShaderInfoLog(fragment));
      failed.current = true;
      onFailure();
    };
    const compilation = gl.compileAsync(scene, camera);
    compiling.current = compilation.catch(() => undefined);
    compilation.then(() => {
      if (cancelled || failed.current || fallbackPending.current) return;
      prepared.current = true;
      onStage("frame");
      invalidate();
    }).catch((error) => { console.error("Ocean preparation failed", error); onFailure(); });
    return () => { cancelled = true; gl.debug.onShaderError = null; };
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
  }, [active, sailing, reading, visible, recoveryGeneration, onFrame, invalidate]);

  // Three polls every compiling material until its program is ready. Disposing one
  // mid-poll throws and strands readiness (parallel compilation in Firefox/WebKit
  // widens that window), so release a material only after that compilation, and
  // only if it was replaced or unmounted rather than remounted.
  useEffect(() => {
    liveMaterial.current = material;
    return () => {
      liveMaterial.current = null;
      void compiling.current.then(() => { if (liveMaterial.current !== material) material.dispose(); });
    };
  }, [material]);

  useFrame((_, delta) => {
    if (failed.current || document.hidden || props.suspended.current || gl.getContext().isContextLost()) return;
    try {
      const measuring = announced.current && props.active && props.sailing && !props.reading;
      const now = performance.now();
      if (measuring && frameWasActive.current && lastFrame.current !== null) props.onFrame(now - lastFrame.current);
      // The first frame after entry/resume anchors time without moving the vessel.
      const seconds = measuring && frameWasActive.current ? Math.min(delta, 0.05) : 0;
      lastFrame.current = measuring ? now : null;
      frameWasActive.current = measuring;
      if (props.reorientation.current) {
        navigation.current.assistance = undefined;
        props.reorientation.current = false;
      }
      const journey = advanceStationJourney(props.livePose.current, navigation.current, {
        stations: props.configuration.stations,
        availableStations: props.availableStations,
        completedStations: props.completedStations,
        sailing: props.active && props.sailing,
        steering: props.steering.current,
        targetHeading: props.targetHeading.current,
        seconds,
      });
      props.livePose.current = journey.pose;
      navigation.current = journey.navigation;
      const assistance = { stage: journey.navigation.assistance?.stage ?? "none", boundaryReturning: journey.navigation.boundaryReturning ?? false };
      if (reportedAssistance.current.stage !== assistance.stage || reportedAssistance.current.boundaryReturning !== assistance.boundaryReturning) {
        reportedAssistance.current = assistance;
        props.onAssistance(assistance);
      }
      if (journey.arrived) props.onStation(journey.arrived);
      const { pose, sailing } = journey;
      if (sailing && !props.reducedMotion) elapsed.current += seconds;
      material.uniforms.time.value = elapsed.current;
      material.uniforms.vessel.value.set(pose.position.x, pose.position.z);
      material.uniforms.heading.value = pose.heading;
      material.uniforms.moving.value = sailing ? 1 : 0;
      material.uniforms.wakeDetail.value = qualityEnvelope[props.quality.tier].wake;
      if (vesselGroup.current) {
        const { x, z } = pose.position;
        const time = elapsed.current;
        const forwardX = Math.sin(pose.heading);
        const forwardZ = -Math.cos(pose.heading);
        const bowHeight = sampleOceanHeight(x + forwardX * 2.5, z + forwardZ * 2.5, time);
        const sternHeight = sampleOceanHeight(x - forwardX * 2.5, z - forwardZ * 2.5, time);
        const portHeight = sampleOceanHeight(x - Math.cos(pose.heading), z - Math.sin(pose.heading), time);
        const starboardHeight = sampleOceanHeight(x + Math.cos(pose.heading), z + Math.sin(pose.heading), time);
        vesselGroup.current.position.set(x, sampleOceanHeight(x, z, time) + .05, z);
        vesselGroup.current.rotation.set(
          props.reducedMotion ? 0 : Math.atan2(bowHeight - sternHeight, 5),
          -pose.heading,
          props.reducedMotion ? 0 : Math.atan2(starboardHeight - portHeight, 2),
          "YXZ",
        );
      }
      const portrait = size.width < size.height;
      const choosingMiddle = props.completedStations.length === 1 && props.availableStations.length === 3;
      const framing = frameHelmCamera(cameraFraming.current, pose.heading, {
        portrait, choosingMiddle, reading: props.reading, reducedMotion: props.reducedMotion, sailing, seconds,
      });
      cameraFraming.current = framing;
      desiredCamera.set(pose.position.x - Math.sin(framing.heading) * framing.distance, framing.height, pose.position.z + Math.cos(framing.heading) * framing.distance);
      // Keep the vessel coupled to the camera; only heading and framing have lag.
      if (!sailing && camera.position.distanceToSquared(desiredCamera) > 0.001) invalidate();
      camera.position.copy(desiredCamera);
      lookTarget.set(pose.position.x + Math.sin(framing.heading) * framing.lookAhead, 0, pose.position.z - Math.cos(framing.heading) * framing.lookAhead);
      camera.lookAt(lookTarget);
      // Owning this render makes readiness a post-render fact, not a useFrame guess.
      gl.render(scene, camera);
      if (fallbackPending.current) return;
      if (prepared.current && !announced.current && props.controlsConnected.current && stationLabel.current?.isConnected) {
        const context = gl.getContext();
        const error = context.getError();
        if (context.isContextLost() || error !== context.NO_ERROR || gl.info.render.calls < 3) {
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
      <color attach="background" args={["#183047"]} />
      <hemisphereLight args={["#dceaf2", "#173d47", .65]} />
      <directionalLight position={[-25, 78, -57]} intensity={3.1} color="#edf4ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={material}>
        <planeGeometry args={[1200, 1200, qualityEnvelope[props.quality.tier].segments, qualityEnvelope[props.quality.tier].segments]} />
      </mesh>
      <group ref={vesselGroup}><primitive object={vesselScene} /></group>
      {props.configuration.stations.map((station, index) => (
        <FieldStationBeacon
          key={station.id}
          station={station}
          available={props.availableStations.includes(station.id)}
          completed={props.completedStations.includes(station.id)}
          active={props.active}
          reading={props.reading && props.active}
          low={props.quality.tier === "low"}
          assisted={props.assistance.stage !== "none" && (!props.completedStations.includes(station.id)
            || props.availableStations.every((id) => props.completedStations.includes(id)))}
          livePose={props.livePose}
          onStation={(selected) => { navigation.current.departedStation = selected.id; props.onStation(selected); }}
          onLabel={index === 0 ? (label) => { stationLabel.current = label; if (label) invalidate(); } : undefined}
        />
      ))}
    </>
  );
}

export default function OceanRuntime(props: RuntimeProps) {
  return (
    <Canvas
      dpr={props.quality.dpr}
      camera={{ fov: 42, near: 0.5, far: 1200 }}
      frameloop={!props.visible ? "never" : props.active && props.sailing ? "always" : "demand"}
      gl={{ alpha: false, antialias: true, powerPreference: "default" }}
      onCreated={({ gl }) => props.onCanvas(gl.domElement)}
      fallback="A navegação em 3D não está disponível. Use a versão em texto.">
      <Suspense fallback={null}><SailableScene {...props} /></Suspense>
    </Canvas>
  );
}
