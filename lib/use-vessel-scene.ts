import { useEffect, useState } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Mesh, type Group } from "three";

function disposeVessel(scene: Group) {
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
  });
}

// Only the initial vessel gates entry. Keep it visible during optional LOD loads.
export function useVesselScene(url: string) {
  const [initialUrl] = useState(url);
  const initial = useLoader(GLTFLoader, initialUrl).scene;
  const [replacement, setReplacement] = useState<{ url: string; scene: typeof initial } | null>(null);
  useEffect(() => {
    if (url === initialUrl) return;
    let cancelled = false;
    let loaded: Group | null = null;
    new GLTFLoader().load(url, (asset) => {
      if (cancelled) { disposeVessel(asset.scene); return; }
      loaded = asset.scene;
      setReplacement({ url, scene: asset.scene });
    }, undefined, () => { /* Preserve the already usable vessel. */ });
    return () => {
      cancelled = true;
      if (loaded) disposeVessel(loaded);
    };
  }, [url, initialUrl]);
  return replacement?.url === url ? replacement.scene : initial;
}
