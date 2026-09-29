/* eslint-disable react-hooks/immutability -- Three owns this mutable renderer; instrumentation is installed and restored in an effect. */
import { useLayoutEffect, useRef } from "react";
import type { WebGLRenderer } from "three";
import type { QualityTier } from "@/lib/ocean-quality";
import { recordScene } from "@/lib/local-diagnostics";

export function useSceneDiagnostics(renderer: WebGLRenderer) {
  type Target = NonNullable<Parameters<WebGLRenderer["setRenderTarget"]>[0]>;
  const targets = useRef(new Set<Target>());
  useLayoutEffect(() => {
    const retained = targets.current;
    const original = renderer.setRenderTarget;
    const dispose = (event: { target: Target }) => { retained.delete(event.target); };
    renderer.setRenderTarget = function (target, ...args) {
      if (target && !retained.has(target)) {
        retained.add(target);
        target.addEventListener("dispose", dispose);
      }
      return original.call(this, target, ...args);
    };
    return () => {
      renderer.setRenderTarget = original;
      for (const target of retained) target.removeEventListener("dispose", dispose);
      retained.clear();
    };
  }, [renderer]);
  // `passes` counts what was drawn into render targets before the scene this
  // frame, since rendering the scene resets the renderer's own counts.
  return (tier: QualityTier, oceanDraws: number, passes = { calls: 0, triangles: 0 }) => recordScene(tier, {
    drawCalls: renderer.info.render.calls + passes.calls, triangles: renderer.info.render.triangles + passes.triangles,
    oceanDraws, renderTargets: targets.current.size,
  });
}
