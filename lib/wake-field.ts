import { Color, Mesh, NearestFilter, OrthographicCamera, PlaneGeometry, RGBAFormat, Scene, ShaderMaterial, UnsignedByteType, WebGLRenderTarget, type IUniform, type WebGLRenderer } from "three";
import type { RoutePoint } from "@/lib/charted-route";
import { wakeFieldFragmentShader, wakeFieldVertexShader } from "@/lib/ocean-surface";

// The wake field is a square of water, WAKE_FIELD_SIZE world units a side, that
// follows the Ship. Each frame one quad over the water the trail can still disturb
// ranks, per texel, the four trail segments that reach it most strongly, and the
// water shader draws only those. The wake's cost per pixel then no longer grows
// with the length of the trail, which keeps a passage close to the cost of a rest.
//
// The heaviest wake, High's 48 points laid at cruise and then left to age out,
// disturbs at most about 410 world units across (Balanced's 32 points, 340), so
// the field holds the whole wake at every tier with room to snap to its texels.
export const WAKE_FIELD_SIZE = 448;
// Without room for the whole wake, the field keeps at least this much water
// around the Ship, where the wake is youngest and strongest.
const SHIP_MARGIN = 96;

// Where the field's origin (its minimum x and z corner) goes so it covers the
// `bounds` (min x, min z, max x, max z) the trail can disturb, snapped to whole
// texels so the ranking stays anchored to the water instead of swimming with the
// Ship. Null when the trail disturbs nothing and the field need not be drawn.
export function placeWakeField(bounds: ArrayLike<number>, ship: RoutePoint, texels: number): RoutePoint | null {
  if (!(bounds[0] <= bounds[2] && bounds[1] <= bounds[3])) return null;
  const texel = WAKE_FIELD_SIZE / texels;
  const axis = (low: number, high: number, at: number) => {
    // One texel pads each side of the drawn quad, and one more absorbs the snap.
    const centred = (low + high - WAKE_FIELD_SIZE) / 2;
    const start = high - low + texel * 3 <= WAKE_FIELD_SIZE
      ? centred
      : Math.min(Math.max(centred, at + SHIP_MARGIN - WAKE_FIELD_SIZE), at - SHIP_MARGIN);
    return Math.floor(start / texel) * texel;
  };
  return { x: axis(bounds[0], bounds[2], ship.x), z: axis(bounds[1], bounds[3], ship.z) };
}

// The field pass is part of the decorative water: if its program fails, the
// ocean falls back to baseline water, as it does when the water's own fails.
export const isWakeFieldShader = (source: string) => source.includes("#define WAKE_FIELD_TEXELS");

type FieldUniforms = Record<"time" | "wakePoints" | "wakeForces" | "wakeBounds" | "wakeField", IUniform>;

export type WakeField = ReturnType<typeof createWakeField>;

// `uniforms` are the water material's own, so the field always ranks the trail
// the water is about to draw. `points` is the water's WAKE_POINTS.
export function createWakeField(texels: number, points: number, uniforms: FieldUniforms) {
  // Segment indices fit a byte, and nearest sampling keeps them whole.
  const target = new WebGLRenderTarget(texels, texels, {
    type: UnsignedByteType, format: RGBAFormat, minFilter: NearestFilter, magFilter: NearestFilter,
    depthBuffer: false, generateMipmaps: false,
  });
  const material = new ShaderMaterial({
    defines: { WAKE_POINTS: points, WAKE_FIELD_TEXELS: texels },
    uniforms, vertexShader: wakeFieldVertexShader, fragmentShader: wakeFieldFragmentShader,
    depthTest: false, depthWrite: false,
  });
  const geometry = new PlaneGeometry(2, 2);
  const quad = new Mesh(geometry, material);
  quad.frustumCulled = false;
  const scene = new Scene();
  scene.add(quad);
  const camera = new OrthographicCamera();

  const into = (renderer: WebGLRenderer, draw: () => void) => {
    const previous = renderer.getRenderTarget();
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setRenderTarget(target);
    try {
      draw();
    } finally {
      renderer.setRenderTarget(previous);
      renderer.autoClear = autoClear;
    }
  };

  return {
    texture: target.texture,
    // For compiling ahead of the first frame. The material is left to the caller
    // to dispose, once no compilation is still polling its program.
    scene,
    camera,
    material,
    // Marks every texel empty. Texels outside a frame's quad are never read, so
    // this only matters before the first frame.
    clear(renderer: WebGLRenderer) {
      into(renderer, () => {
        const alpha = renderer.getClearAlpha();
        const color = renderer.getClearColor(new Color());
        renderer.setClearColor(0xffffff, 1);
        renderer.clear(true, false, false);
        renderer.setClearColor(color, alpha);
      });
    },
    render(renderer: WebGLRenderer) {
      into(renderer, () => renderer.render(scene, camera));
    },
    // Releases the GPU handles, which must happen while a lost context is still
    // lost: deleting them after restoration would invalidate the new context's frame.
    dispose() {
      target.dispose();
      geometry.dispose();
    },
  };
}
