import { useLayoutEffect } from "react";
import { Mesh, MeshStandardMaterial, type ShaderMaterial } from "three";
import { useModelScene } from "@/lib/use-model-scene";
import { detailLandmarkMaterial } from "@/lib/landmark-material";

// One island Landmark: the land, built from open elevation and coastline data
// by `scripts/generate-landmarks.ts`, and the surf line around its shore. The
// glTF carries both meshes; the surf band's material is the scene's, so it can
// ride the same swell as the water.
export default function StopLandmark({
  url,
  position,
  surf,
}: {
  url: string;
  position: [number, number];
  surf: ShaderMaterial;
}) {
  const scene = useModelScene(url);
  useLayoutEffect(() => {
    const restores: (() => void)[] = [];
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (object.name === "surf") {
        const own = object.material;
        object.material = surf;
        restores.push(() => { object.material = own; });
        // The band lies on the water, so it is drawn after it, and its own
        // bounds are flat; keep it out of the frustum test's flat-sphere edge.
        object.renderOrder = 1;
        return;
      }
      // The island ships without normals to stay inside its transfer budget;
      // they are worth more as smooth shading here than as bytes on the wire.
      if (!object.geometry.getAttribute("normal")) object.geometry.computeVertexNormals();
      if (object.material instanceof MeshStandardMaterial) {
        object.material.flatShading = false;
        restores.push(detailLandmarkMaterial(object.material));
      }
    });
    // A scene replaced by another tier is disposed with its materials, so it
    // gets its own surf material back rather than taking the shared one along.
    return () => restores.forEach((restore) => restore());
  }, [scene, surf]);
  return (
    <group position={[position[0], 0, position[1]]}>
      <primitive object={scene} />
    </group>
  );
}
