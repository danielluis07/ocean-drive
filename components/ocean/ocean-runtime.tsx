/* eslint-disable react-hooks/immutability -- Three owns mutable GPU objects; frame updates and ref writes deliberately bypass React rendering. */
import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei/web/Html";
import { Group, ShaderMaterial, Vector2, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { advanceHelm } from "@/lib/guided-helm";
import type { VesselPose } from "@/lib/expedition-state";
import type { OceanConfiguration } from "@/lib/ocean-config";

export type PreparationStage = "checking" | "loading" | "preparing" | "frame" | "ready";

type RuntimeProps = {
  configuration: OceanConfiguration;
  vesselUrl: string;
  low: boolean;
  reducedMotion: boolean;
  active: boolean;
  sailing: boolean;
  livePose: RefObject<VesselPose>;
  steering: RefObject<number>;
  targetHeading: RefObject<number | null>;
  controlsConnected: RefObject<boolean>;
  onStage: (stage: PreparationStage) => void;
  onFailure: () => void;
  onCanvas: (canvas: HTMLCanvasElement) => void;
  onStation: () => void;
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
  const desiredCamera = useMemo(() => new Vector3(), []);
  const lookTarget = useMemo(() => new Vector3(), []);
  const material = useMemo(() => new ShaderMaterial({
    uniforms: { time: { value: 0 }, vessel: { value: new Vector2() }, heading: { value: 0 }, moving: { value: 0 } },
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
      const sailing = props.active && props.sailing;
      props.livePose.current = advanceHelm(props.livePose.current, props.steering.current, delta, sailing, props.targetHeading.current);
      const pose = props.livePose.current;
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
      const distance = portrait ? 29 : 31;
      desiredCamera.set(pose.position.x - Math.sin(pose.heading) * distance, portrait ? 53 : 36, pose.position.z + Math.cos(pose.heading) * distance);
      if (!announced.current || props.reducedMotion) camera.position.copy(desiredCamera);
      else camera.position.lerp(desiredCamera, 1 - Math.exp(-Math.min(delta, 0.05) * 3));
      lookTarget.set(pose.position.x + Math.sin(pose.heading) * 17, 0, pose.position.z - Math.cos(pose.heading) * 17);
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
      <group position={props.configuration.firstStation.position}>
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.7, 1.25, 1.3, 12]} />
          <meshStandardMaterial color="#dbaa59" roughness={0.8} />
        </mesh>
        <mesh position={[0, 2.1, 0]}>
          <cylinderGeometry args={[0.1, 0.14, 2.5, 8]} />
          <meshStandardMaterial color="#f0ead6" />
        </mesh>
        <mesh position={[0, 3.5, 0]}>
          <sphereGeometry args={[0.28, 8, 6]} />
          <meshBasicMaterial color="#ffdda2" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.26, 0]}>
          <ringGeometry args={[5.7, 5.82, 64]} />
          <meshBasicMaterial color="#9cbeb0" />
        </mesh>
        <Html position={[0, 5.5, 0]} center zIndexRange={[5, 0]}>
          <button ref={(label) => { stationLabel.current = label; if (label) invalidate(); }} className="beacon-label" type="button" onClick={props.onStation} tabIndex={props.active ? 0 : -1}>
            <span>Primeira estação</span>
            {props.configuration.firstStation.name}
            <small>Ler estação</small>
          </button>
        </Html>
      </group>
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
