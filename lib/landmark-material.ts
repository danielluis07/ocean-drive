import type { MeshStandardMaterial } from "three";
import type { PreparedLandmarkTextures } from "@/lib/landmark-textures";

// Baked maps replace fragment grain; vertex colours provide an immediate fallback.
export function detailLandmarkMaterial(material: MeshStandardMaterial, textures: PreparedLandmarkTextures | null = null) {
  const previous = { map: material.map, normalMap: material.normalMap, vertexColors: material.vertexColors, envMapIntensity: material.envMapIntensity };
  material.envMapIntensity = .3;
  material.map = textures?.colour ?? null;
  material.normalMap = textures?.normal ?? null;
  material.vertexColors = !textures;
  material.needsUpdate = true;
  return () => { Object.assign(material, previous); material.needsUpdate = true; };
}
