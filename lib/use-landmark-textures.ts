import { useEffect, useMemo, useReducer } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { LandmarkTexturePreparation } from "@/lib/landmark-texture-preparation";
import type { OceanConfiguration } from "@/lib/ocean-config";
import type { RouteMotion } from "@/lib/route-motion";
import type { QualityTier } from "@/lib/ocean-quality";

export function useLandmarkTextures(configuration: OceanConfiguration, route: RouteMotion, tier: QualityTier, generation: number) {
  const { gl, scene, invalidate } = useThree();
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const preparation = useMemo(() => new LandmarkTexturePreparation(gl, scene, route, configuration, tier, generation,
    () => { refresh(); invalidate(); }), [gl, scene, route, configuration, tier, generation, invalidate]);
  useFrame(preparation.update);
  useEffect(() => {
    preparation.reset();
    preparation.update();
    gl.domElement.addEventListener("webglcontextlost", preparation.dispose);
    return () => { gl.domElement.removeEventListener("webglcontextlost", preparation.dispose); preparation.dispose(); };
  }, [preparation, gl]);
  return preparation.cache;
}
