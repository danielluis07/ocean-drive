"use client";

/* eslint-disable react-hooks/immutability -- The imperative simulation is external to React; both renderer adapters report capability loss into it. */

import { Component, useEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createWorld } from "@/app/_prototype/world";
import type { Expedition } from "@/app/_prototype/expedition";

type Props = {
  state: Expedition;
  labels: (HTMLDivElement | null)[];
  engine: "r3f" | "three";
};
class SceneBoundary extends Component<
  { state: Expedition; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.state.fallback =
      "Não foi possível abrir o oceano. Continue pela leitura.";
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function FiberWorld({ state, labels }: Props) {
  const { scene, camera, gl, setDpr } = useThree();
  const world = useRef<ReturnType<typeof createWorld> | null>(null);
  useEffect(() => {
    world.current = createWorld(
      scene,
      camera as THREE.PerspectiveCamera,
      gl,
      state,
      labels,
      setDpr,
    );
    const lost = (e: Event) => {
      e.preventDefault();
      state.fallback =
        "A conexão com o oceano foi interrompida. Continue pela leitura.";
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      gl.domElement.removeEventListener("webglcontextlost", lost);
      world.current?.dispose();
      world.current = null;
    };
  }, [scene, camera, gl, state, labels, setDpr]);
  useFrame(({ size }, delta) => {
    world.current?.update(delta, size.width, size.height);
  });
  return null;
}
function DirectWorld({ state, labels }: Props) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      state.fallback =
        "Não foi possível abrir o oceano. Continue pela leitura.";
      return;
    }
    element.append(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(43, 1, 0.1, 600);
    const world = createWorld(scene, camera, renderer, state, labels);
    const resize = new ResizeObserver(() =>
      renderer.setSize(element.clientWidth, element.clientHeight),
    );
    resize.observe(element);
    renderer.setSize(element.clientWidth, element.clientHeight);
    const lost = (e: Event) => {
      e.preventDefault();
      state.fallback =
        "A conexão com o oceano foi interrompida. Continue pela leitura.";
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    let previous = 0;
    renderer.setAnimationLoop((now) => {
      const dt = previous ? (now - previous) / 1000 : 0;
      previous = now;
      world.update(dt, element.clientWidth, element.clientHeight);
      renderer.render(scene, camera);
    });
    return () => {
      resize.disconnect();
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      world.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [state, labels]);
  return <div className="render-host" ref={host} />;
}
export default function OceanRenderer(props: Props) {
  return (
    <SceneBoundary state={props.state}>
      {props.engine === "three" ? (
        <DirectWorld {...props} />
      ) : (
        <Canvas
          dpr={1}
          camera={{ fov: 43, near: 0.1, far: 600 }}
          gl={{
            antialias: false,
            alpha: false,
            powerPreference: "high-performance",
          }}
          fallback={<p>Use a versão em texto para acompanhar a expedição.</p>}
        >
          <FiberWorld {...props} />
        </Canvas>
      )}
    </SceneBoundary>
  );
}
