import { useEffect, useLayoutEffect, useMemo } from "react";
import { Mesh, MeshStandardMaterial, type ShaderMaterial } from "three";
import { useModelScene } from "@/lib/use-model-scene";
import { detailLandmarkMaterial } from "@/lib/landmark-material";
import { expandFeatures } from "@/lib/landmark-features";
import type { FeatureLibrary } from "@/lib/use-landmark-features";

// One island Landmark: the land, built from open elevation and coastline data
// by `scripts/generate-landmarks.ts`, the shallows around its shore, and what
// stands on it. The glTF carries the first two meshes; the band's material is
// the scene's, so it can ride the same swell as the water. Everything placed on
// the island comes from the shared Feature file and is one more mesh.
export default function StopLandmark({
  id,
  url,
  position,
  shallows,
  features,
  featureMaterial,
}: {
  id: string;
  url: string;
  position: [number, number];
  shallows: ShaderMaterial;
  // Null at Low, and until the shared Feature file has arrived.
  features: FeatureLibrary | null;
  featureMaterial: MeshStandardMaterial;
}) {
  const scene = useModelScene(url);
  useLayoutEffect(() => {
    const restores: (() => void)[] = [];
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (object.name === "surf") {
        const own = object.material;
        object.material = shallows;
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
    // gets its own band material back rather than taking the shared one along.
    return () => restores.forEach((restore) => restore());
  }, [scene, shallows]);
  // Every instance on this island as one geometry, so any number of models
  // costs the Landmark a single draw.
  const placed = features?.placements[id];
  const standing = useMemo(
    () => (features && placed?.length ? expandFeatures(features.models, placed) : null),
    [features, placed],
  );
  useEffect(() => () => standing?.dispose(), [standing]);
  return (
    <group position={[position[0], 0, position[1]]}>
      <primitive object={scene} />
      {/* The material is the scene's and the geometry is released above. */}
      {standing ? <mesh name="features" geometry={standing} material={featureMaterial} dispose={null} /> : null}
    </group>
  );
}
