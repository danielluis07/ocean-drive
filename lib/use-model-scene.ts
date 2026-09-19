import { useEffect, useState } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Mesh, type Group } from "three";

function disposeScene(scene: Group) {
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
  });
}

// Only the first model gates entry. Keep it visible during optional LOD loads:
// a quality change swaps the scene once its replacement has arrived, so the
// Ship and the Landmarks never blink out while a tier is substituted.
export function useModelScene(url: string) {
  const [initialUrl] = useState(url);
  const initial = useLoader(GLTFLoader, initialUrl).scene;
  const [replacement, setReplacement] = useState<{ url: string; scene: typeof initial } | null>(null);
  useEffect(() => {
    if (url === initialUrl) return;
    let cancelled = false;
    let loaded: Group | null = null;
    new GLTFLoader().load(url, (asset) => {
      if (cancelled) { disposeScene(asset.scene); return; }
      loaded = asset.scene;
      setReplacement({ url, scene: asset.scene });
    }, undefined, () => { /* Preserve the already usable model. */ });
    return () => {
      cancelled = true;
      if (loaded) disposeScene(loaded);
    };
  }, [url, initialUrl]);
  return replacement?.url === url ? replacement.scene : initial;
}
