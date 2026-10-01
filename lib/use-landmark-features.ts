import { useEffect, useState } from "react";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Mesh, type BufferGeometry, type Group } from "three";

export type FeatureLibrary = {
  // In the order the placements index them.
  models: BufferGeometry[];
  // Per Landmark id, the record `expandFeatures` reads.
  placements: Record<string, number[]>;
};

type FeatureRecord = { models?: string[]; placements?: Record<string, number[]> };

function readLibrary(scene: Group): FeatureLibrary | null {
  let record: FeatureRecord | undefined;
  const meshes = new Map<string, BufferGeometry>();
  scene.traverse((object) => {
    if (object.userData.placements) record = object.userData;
    if (object instanceof Mesh) meshes.set(object.name, object.geometry);
  });
  const models = record?.models?.map((name) => meshes.get(name));
  if (!record?.placements || !models || models.some((model) => !model)) return null;
  return { models: models as BufferGeometry[], placements: record.placements };
}

function disposeScene(scene: Group) {
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    object.material.dispose();
  });
}

// The shared Feature file, loaded once for every Landmark and never in the way
// of entry: the islands are complete without it, so it arrives when it arrives
// and a failed request leaves them as they are. A null URL, which is how Low
// asks for no Features, releases whatever was loaded.
export function useLandmarkFeatures(url: string | null) {
  const [loaded, setLoaded] = useState<{ url: string; library: FeatureLibrary } | null>(null);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let scene: Group | null = null;
    new GLTFLoader().load(url, (asset) => {
      if (cancelled) { disposeScene(asset.scene); return; }
      scene = asset.scene;
      const library = readLibrary(asset.scene);
      if (library) setLoaded({ url, library });
    }, undefined, () => { /* The Landmarks stand without their Features. */ });
    return () => {
      cancelled = true;
      if (scene) disposeScene(scene);
    };
  }, [url]);
  return loaded?.url === url ? loaded.library : null;
}
