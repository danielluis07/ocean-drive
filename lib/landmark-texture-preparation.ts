import type { Scene, WebGLRenderer } from "three";
import { detachLandmarkTextures, LandmarkTextureCache } from "@/lib/landmark-textures";
import type { OceanConfiguration } from "@/lib/ocean-config";
import type { RouteMotion } from "@/lib/route-motion";
import { classifyRenderer, landmarkNormalEnabled, readRenderer } from "@/lib/starting-tier";
import type { QualityTier } from "@/lib/ocean-quality";
import { recordDiagnostic } from "@/lib/local-diagnostics";

// Owns transient preparation outside React. Stop changes select the pair;
// asynchronous byte/decode completion requests only one preparation frame.
export class LandmarkTexturePreparation {
  readonly cache: LandmarkTextureCache;
  private pending: number | null = null;
  private progress: number;
  private direction = 1;
  private settled: number | null = null;

  constructor(private renderer: WebGLRenderer, scene: Scene, private route: RouteMotion,
    private configuration: OceanConfiguration, private tier: QualityTier, generation: number, changed: () => void) {
    this.progress = route.frame().progress;
    this.cache = new LandmarkTextureCache(renderer, () => !renderer.getContext().isContextLost() && route.frame().settledStop !== null,
      changed, (action, id, retained) => recordDiagnostic("landmark-texture",
        JSON.stringify({ action, id, retained, tier, generation, settledStop: route.frame().settledStop })),
      (textures) => detachLandmarkTextures(scene, textures), this.wake);
  }

  private wake = () => {
    if (this.pending !== null) return;
    this.pending = requestAnimationFrame(() => { this.pending = null; this.cache.prepare(); });
  };

  update = () => {
    const frame = this.route.frame();
    if (frame.progress !== this.progress) this.direction = Math.sign(frame.progress - this.progress);
    this.progress = frame.progress;
    if (frame.settledStop === this.settled) return;
    this.settled = frame.settledStop;
    if (frame.settledStop === null || this.renderer.getContext().isContextLost()) return;
    const normalEnabled = landmarkNormalEnabled(classifyRenderer(readRenderer(this.renderer.getContext())), this.tier);
    const current = frame.settledStop;
    const next = Math.min(this.configuration.stops.length - 1, Math.max(0, current + this.direction));
    this.cache.retain([current, next].flatMap((index) => {
      const stop = this.configuration.stops[index];
      if (!stop?.landmark) return [];
      const source = this.configuration.landmarks[stop.id].textures[this.tier === "low" ? "low" : "balanced"];
      return [{ id: stop.id, sources: normalEnabled ? source : { colour: source.colour } }];
    }));
    this.cache.prepare();
  };

  reset() { this.settled = null; }

  dispose = () => {
    if (this.pending !== null) cancelAnimationFrame(this.pending);
    this.pending = null;
    this.cache.dispose();
  };
}
