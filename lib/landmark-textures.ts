import { Mesh, MeshStandardMaterial, SRGBColorSpace, Texture, type Object3D, type WebGLRenderer } from "three";
import type { LandmarkTextures } from "@/lib/ocean-config";

export type PreparedLandmarkTextures = { colour: Texture; normal?: Texture };

export function detachLandmarkTextures(scene: Object3D, textures: PreparedLandmarkTextures) {
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!(material instanceof MeshStandardMaterial) || material.map !== textures.colour) continue;
      material.map = null;
      material.normalMap = null;
      material.vertexColors = true;
      material.needsUpdate = true;
    }
  });
}

export function releaseLandmarkTextures(textures: PreparedLandmarkTextures) {
  for (const texture of [textures.colour, textures.normal]) {
    if (!texture) continue;
    texture.dispose();
    (texture.image as ImageBitmap).close();
  }
}

// Network transfer may finish while sailing; preparation waits until settled.
export class LandmarkTextureCache {
  private entries = new Map<string, { controller: AbortController; blobs?: Blob[]; decoded?: ImageBitmap[]; textures?: PreparedLandmarkTextures; busy?: boolean }>();
  constructor(private renderer: WebGLRenderer, private safe: () => boolean, private changed: () => void,
    private trace: (action: string, id: string, retained: number) => void = () => {},
    private detach: (textures: PreparedLandmarkTextures) => void = () => {},
    private wake: () => void = () => {}) {}

  retain(requests: { id: string; sources: LandmarkTextures }[]) {
    if (new Set(requests.map((request) => request.id)).size > 2) throw new Error("Only current and next Landmark textures may be retained");
    const wanted = new Set(requests.map((request) => request.id));
    let removed = false;
    for (const [id, entry] of this.entries) if (!wanted.has(id)) {
      removed = true;
      this.entries.delete(id);
      this.trace("release", id, this.entries.size);
      entry.controller.abort();
      if (entry.textures) { this.detach(entry.textures); releaseLandmarkTextures(entry.textures); }
      else entry.decoded?.forEach((bitmap) => bitmap.close());
    }
    if (removed) this.changed();
    for (const { id, sources } of requests) {
      if (this.entries.has(id)) continue;
      const entry = { controller: new AbortController() } as NonNullable<ReturnType<typeof this.entries.get>>;
      this.entries.set(id, entry);
      this.trace("retain", id, this.entries.size);
      Promise.all([sources.colour, ...(sources.normal ? [sources.normal] : [])].map(async ({ url }) => {
        const response = await fetch(url, { signal: entry.controller.signal });
        if (!response.ok) throw new Error("Optional Landmark texture unavailable");
        return response.blob();
      })).then((blobs) => {
        if (this.entries.get(id) === entry) { entry.blobs = blobs; this.wake(); }
      }).catch(() => { /* Sailing remains available without terrain detail. */ });
    }
  }

  prepare() {
    if (!this.safe()) return;
    for (const [id, entry] of this.entries) {
      if (entry.textures || entry.busy || !entry.blobs) continue;
      if (!entry.decoded) {
        entry.busy = true;
        this.trace("decode", id, this.entries.size);
        // Baked row zero and mesh v=0 both correspond to bounds.minZ.
        Promise.allSettled(entry.blobs.map((blob) => createImageBitmap(blob, { imageOrientation: "none", colorSpaceConversion: "none" })))
          .then((results) => {
            const decoded = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
            if (decoded.length !== results.length) { decoded.forEach((bitmap) => bitmap.close()); entry.blobs = undefined; return; }
            if (this.entries.get(id) !== entry) decoded.forEach((bitmap) => bitmap.close());
            else { entry.decoded = decoded; this.wake(); }
          }).catch(() => { entry.blobs = undefined; })
          .finally(() => { entry.busy = false; });
        continue;
      }
      if (!this.safe()) return;
      this.trace("upload", id, this.entries.size);
      const [colour, normal] = entry.decoded.map((bitmap, index) => {
        const texture = new Texture(bitmap);
        texture.flipY = false;
        if (!index) texture.colorSpace = SRGBColorSpace;
        texture.needsUpdate = true;
        this.renderer.initTexture(texture);
        return texture;
      });
      entry.textures = { colour, normal };
      entry.blobs = undefined;
      this.changed();
    }
  }

  get(id: string) { return this.entries.get(id)?.textures ?? null; }
  dispose() { this.retain([]); }
}
