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

const vertexShader = `
  uniform float time;
  varying vec3 world;
  void main() {
    vec3 p = position;
    p.z += sin(p.x * .07 + time * .4) * .16 + sin(p.y * .11 - time * .3) * .12;
    world = (modelMatrix * vec4(p, 1.)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.);
  }
`;

const fragmentShader = `
  uniform float time;
  uniform vec2 vessel;
  uniform float heading;
  uniform float moving;
  uniform float wakeDetail;
  uniform vec2 boundaryCenter;
  uniform float boundaryRadius;
  varying vec3 world;
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3. - 2. * f);
    vec4 h = fract(sin(vec4(dot(i, vec2(127.1, 311.7)), dot(i + vec2(1., 0.), vec2(127.1, 311.7)),
      dot(i + vec2(0., 1.), vec2(127.1, 311.7)), dot(i + vec2(1., 1.), vec2(127.1, 311.7)))) * 43758.5453);
    return mix(mix(h.x, h.y, f.x), mix(h.z, h.w, f.x), f.y);
  }
  void main() {
    vec2 p = world.xz;
    float broad = noise(p * .025 + time * .008);
    vec3 water = mix(vec3(.003, .033, .05), vec3(.018, .12, .10), broad);
    #ifndef LOW_QUALITY
    vec2 current = p + vec2(noise(p * .07), noise(p * .09)) * 8.;
    float ripple = sin(current.x * 2.2 + current.y * .7 + time * .55);
    float silver = pow(max(0., ripple), 24.) * pow(noise(current * vec2(.3, 1.6)), 3.);
    water += silver * vec3(.12, .2, .18) * min(wakeDetail, 1.);
    vec2 offset = p - vessel;
    float aft = dot(offset, vec2(-sin(heading), cos(heading)));
    float side = abs(dot(offset, vec2(cos(heading), sin(heading))));
    float wake = (1. - smoothstep(.12, .5, abs(side - aft * .18)))
      * smoothstep(1., 3., aft) * (1. - smoothstep(3., 16., aft)) * moving;
    water = mix(water, vec3(.55, .72, .66), wake * .48 * min(wakeDetail, 1.));
    float foam = (1. - smoothstep(0., 1.4, side)) * smoothstep(1., 2., aft)
      * (1. - smoothstep(2., 10., aft)) * noise(p * 3. + time);
    water += foam * .12 * moving * max(0., wakeDetail - 1.);
    #endif
    vec2 edge = p - boundaryCenter;
    float radius = length(edge);
    float band = smoothstep(boundaryRadius - 10., boundaryRadius, radius)
      * (1. - smoothstep(boundaryRadius + 18., boundaryRadius + 32., radius));
    // Curved, inward-running ribbons make the returning current visible on water.
    float ribbons = pow(max(0., sin(atan(edge.y, edge.x) * 24. + radius * .45 + time * .8)), 10.);
    water = mix(water, vec3(.53, .77, .68), band * (.16 + ribbons * .58));
    float haze = smoothstep(65., 260., distance(cameraPosition, world));
    gl_FragColor = vec4(mix(water, vec3(.64, .76, .74), haze), 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Baseline water keeps the visible boundary current if decorative shading fails.
const baselineFragmentShader = `
  uniform vec2 boundaryCenter;
  uniform float boundaryRadius;
  varying vec3 world;
  void main() {
    float radius = length(world.xz - boundaryCenter);
    float band = smoothstep(boundaryRadius - 10., boundaryRadius, radius)
      * (1. - smoothstep(boundaryRadius + 18., boundaryRadius + 32., radius));
    vec3 water = mix(vec3(.018, .12, .10), vec3(.53, .77, .68), band * .6);
    float haze = smoothstep(65., 260., distance(cameraPosition, world));
    gl_FragColor = vec4(mix(water, vec3(.64, .76, .74), haze), 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function SailableScene(props: RuntimeProps) {
  const { onStage, onFailure, onFrame, active, sailing, reading, visible, recoveryGeneration } = props;
  const { gl, scene, camera, size, invalidate, setFrameloop } = useThree();
  const vesselScene = useVesselScene(props.vesselUrl);
  const vesselGroup = useRef<Group>(null);
  const stationLabel = useRef<HTMLButtonElement>(null);
  const prepared = useRef(false);
  const announced = useRef(false);
  const failed = useRef(false);
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
    defines: props.quality.tier === "low" ? { LOW_QUALITY: 1 } : {},
    uniforms: { time: { value: 0 }, vessel: { value: new Vector2() }, heading: { value: 0 }, moving: { value: 0 }, wakeDetail: { value: 1 },
      boundaryCenter: { value: new Vector2(boundaryCurrent.centerX, boundaryCurrent.centerZ) }, boundaryRadius: { value: boundaryCurrent.radius } },
    vertexShader,
    fragmentShader: baselineWater ? baselineFragmentShader : fragmentShader,
  }), [baselineWater, props.quality.tier]);

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
    gl.compileAsync(scene, camera).then(() => {
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

  useEffect(() => () => material.dispose(), [material]);

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
        vesselGroup.current.position.set(pose.position.x, 0.05, pose.position.z);
        vesselGroup.current.rotation.y = -pose.heading;
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
      <color attach="background" args={["#a3c2bd"]} />
      <hemisphereLight args={["#f0f2dd", "#174c54", 2.5]} />
      <directionalLight position={[-30, 60, 20]} intensity={2.6} color="#fff1cf" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={material}>
        <planeGeometry args={[2400, 2400, qualityEnvelope[props.quality.tier].segments, qualityEnvelope[props.quality.tier].segments]} />
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
      gl={{ alpha: false, antialias: false, powerPreference: "low-power" }}
      onCreated={({ gl }) => props.onCanvas(gl.domElement)}
      fallback="A navegação em 3D não está disponível. Use a versão em texto.">
      <Suspense fallback={null}><SailableScene {...props} /></Suspense>
    </Canvas>
  );
}
