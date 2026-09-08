/* eslint-disable react-hooks/immutability -- Three owns mutable GPU objects; frame updates and ref writes deliberately bypass React rendering. */
import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Group, ShaderMaterial, Vector2, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
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
  low: boolean;
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
    vec2 current = p + vec2(noise(p * .07), noise(p * .09)) * 8.;
    float ripple = sin(current.x * 2.2 + current.y * .7 + time * .55);
    float silver = pow(max(0., ripple), 24.) * pow(noise(current * vec2(.3, 1.6)), 3.);
    vec3 water = mix(vec3(.003, .033, .05), vec3(.018, .12, .10), broad);
    water += silver * vec3(.12, .2, .18);
    vec2 offset = p - vessel;
    float aft = dot(offset, vec2(-sin(heading), cos(heading)));
    float side = abs(dot(offset, vec2(cos(heading), sin(heading))));
    float wake = (1. - smoothstep(.12, .5, abs(side - aft * .18)))
      * smoothstep(1., 3., aft) * (1. - smoothstep(3., 16., aft)) * moving;
    water = mix(water, vec3(.55, .72, .66), wake * .48);
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

function SailableScene(props: RuntimeProps) {
  const { onStage, onFailure } = props;
  const { gl, scene, camera, size, invalidate } = useThree();
  const { scene: vesselScene } = useLoader(GLTFLoader, props.vesselUrl);
  const vesselGroup = useRef<Group>(null);
  const stationLabel = useRef<HTMLButtonElement>(null);
  const prepared = useRef(false);
  const announced = useRef(false);
  const failed = useRef(false);
  const elapsed = useRef(0);
  const navigation = useRef<StationNavigation>({ departedStation: null, arrivalPending: false });
  const cameraFraming = useRef<ReturnType<typeof frameHelmCamera> | null>(null);
  const reportedAssistance = useRef(props.assistance);
  const desiredCamera = useMemo(() => new Vector3(), []);
  const lookTarget = useMemo(() => new Vector3(), []);
  const material = useMemo(() => new ShaderMaterial({
    uniforms: { time: { value: 0 }, vessel: { value: new Vector2() }, heading: { value: 0 }, moving: { value: 0 },
      boundaryCenter: { value: new Vector2(boundaryCurrent.centerX, boundaryCurrent.centerZ) }, boundaryRadius: { value: boundaryCurrent.radius } },
    vertexShader,
    fragmentShader,
  }), []);

  useEffect(() => {
    let cancelled = false;
    onStage("preparing");
    gl.debug.onShaderError = (context, program, vertex, fragment) => {
      console.error("Ocean shader preparation failed", context.getProgramInfoLog(program), context.getShaderInfoLog(vertex), context.getShaderInfoLog(fragment));
      failed.current = true;
      onFailure();
    };
    gl.compileAsync(scene, camera).then(() => {
      if (cancelled || failed.current) return;
      prepared.current = true;
      onStage("frame");
      invalidate();
    }).catch((error) => { console.error("Ocean preparation failed", error); onFailure(); });
    return () => { cancelled = true; gl.debug.onShaderError = null; };
  }, [gl, scene, camera, invalidate, onStage, onFailure]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    if (failed.current || document.hidden) return;
    try {
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
        seconds: delta,
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
      if (sailing && !props.reducedMotion) elapsed.current += Math.min(delta, 0.05);
      material.uniforms.time.value = elapsed.current;
      material.uniforms.vessel.value.set(pose.position.x, pose.position.z);
      material.uniforms.heading.value = pose.heading;
      material.uniforms.moving.value = sailing ? 1 : 0;
      if (vesselGroup.current) {
        vesselGroup.current.position.set(pose.position.x, 0.05, pose.position.z);
        vesselGroup.current.rotation.y = -pose.heading;
      }
      const portrait = size.width < size.height;
      const choosingMiddle = props.completedStations.length === 1 && props.availableStations.length === 3;
      const framing = frameHelmCamera(cameraFraming.current, pose.heading, {
        portrait, choosingMiddle, reading: props.reading, reducedMotion: props.reducedMotion, sailing, seconds: delta,
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
        <planeGeometry args={[2400, 2400, props.low ? 80 : 160, props.low ? 80 : 160]} />
      </mesh>
      <group ref={vesselGroup}><primitive object={vesselScene} /></group>
      {props.configuration.stations.map((station, index) => (
        <FieldStationBeacon
          key={station.id}
          station={station}
          available={props.availableStations.includes(station.id)}
          completed={props.completedStations.includes(station.id)}
          active={props.active}
          reading={props.reading}
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
      dpr={props.low ? 1 : Math.min(window.devicePixelRatio, 1.25)}
      camera={{ fov: 42, near: 0.5, far: 1200 }}
      frameloop={props.active && props.sailing ? "always" : "demand"}
      gl={{ alpha: false, antialias: !props.low, powerPreference: "low-power" }}
      onCreated={({ gl }) => props.onCanvas(gl.domElement)}
      fallback="A navegação em 3D não está disponível. Use a versão em texto.">
      <Suspense fallback={null}><SailableScene {...props} /></Suspense>
    </Canvas>
  );
}
