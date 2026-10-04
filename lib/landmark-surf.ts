import { DoubleSide, ShaderMaterial, Vector2 } from "three";
import { oceanSheetShader, oceanSwellShader } from "@/lib/ocean-surface";
import { oceanDaylightShader, oceanDaylightUniforms, type OceanDaylight } from "@/lib/ocean-daylight";

// The shallows: the band of water each Landmark's mesh carries around its
// shoreline, drawn over the ocean rather than cut into it. It is turquoise
// against the land and falls off to the ocean's navy at its outer edge, and the
// surf line breaks along its shoreward side. The falloff is an authored
// treatment; no depth data is recorded for any island.
//
// Its vertices ride the ocean's own swell through `oceanSwellShader`, and every
// fragment takes its depth from `oceanSheet`, the surface the water actually
// draws, so the band stays attached to the water at every quality tier instead
// of dipping under a coarse grid's flat triangles.
//
// The band's UVs come from `scripts/generate-landmarks.ts`. Both measure the
// distance out from the waterline: `u` in widths of the island's surf line, so
// foam keeps to the water against the land, and `v` in widths of its shallows,
// 0 at the waterline and 1 at the outer edge of the band. Where the band tucks
// under the land they run negative and are held at 0.

// World units the band is drawn above the water it lies on.
const CLEARANCE = 0.04;

const shallowsVertexShader = `
  ${oceanSwellShader}
  varying vec2 fromShore;
  varying vec2 ground;
  varying vec3 waterPosition;
  varying float reefPool;
  void main() {
    reefPool = color.r;
    fromShore = uv;
    vec3 world = (modelMatrix * vec4(position, 1.)).xyz;
    ground = position.xz;
    float height;
    vec2 slope;
    swell(world.xz, height, slope);
    world.y += height + ${CLEARANCE};
    waterPosition = world;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.);
  }
`;

const shallowsFragmentShader = `
  ${oceanDaylightShader}
  ${oceanSwellShader}
  ${oceanSheetShader}
  varying vec2 fromShore;
  varying vec2 ground;
  varying vec3 waterPosition;
  varying float reefPool;
  // Three declares this for vertex shaders only.
  uniform mat4 projectionMatrix;
  // 1 while the surf rolls, 0 when it holds still as a foam ring.
  uniform float motion;

  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 blend = f * f * (3. - 2. * f);
    vec4 h = fract(sin(vec4(dot(i, vec2(127.1, 311.7)), dot(i + vec2(1., 0.), vec2(127.1, 311.7)),
      dot(i + vec2(0., 1.), vec2(127.1, 311.7)), dot(i + vec2(1., 1.), vec2(127.1, 311.7)))) * 43758.5453);
    return mix(mix(h.x, h.y, blend.x), mix(h.z, h.w, blend.x), blend.y);
  }

  void main() {
    vec2 shore = max(fromShore, 0.);
    // The bed the island stands on: sand flats and reef, mottled so the edge of
    // the shallows wanders instead of tracing the shoreline at a fixed distance.
    float bed = noise(ground * .42) * .6 + noise(ground * 1.3) * .4;
    float depth = clamp(shore.y + (bed - .5) * .5 * smoothstep(0., .3, shore.y), 0., 1.);
    // Turquoise against the land, deepening quickly and then slowly through
    // the band to the ocean's navy, and gone entirely at its outer edge so no
    // rim shows on the water.
    float shallows = (1. - depth) * (1. - depth) * (1. - smoothstep(.8, 1., shore.y));
    vec3 water = mix(mix(oceanDeep, oceanShallows, .4), oceanShallows, shallows) * (.86 + bed * .28);
    // Localised authored reef pools, carried by the existing water mesh in both
    // tiers. This colour signal does not claim measured seabed depth.
    float pool = reefPool * smoothstep(.15, .5, bed) * (1. - smoothstep(.7, 1., shore.y));
    water = mix(water, mix(oceanShallows, oceanWhite, .32), pool * .8);
    float foam = 0.;
    if (shore.x < 1.) {
      // Sets of breakers rolling shoreward, broken along the shore so the ring
      // never reads as one even stripe. A motion of zero leaves the set
      // where it stands: a still foam ring rather than a travelling one.
      float drift = time * .16 * motion;
      float along = noise(ground * .8 + drift * .15);
      float sets = .55 + .45 * cos((shore.x * 2.6 - drift * 2.2 + along * .9) * 6.2832);
      // Two grains turned against each other, so the foam's patches do not line
      // up with the axes the noise is laid on.
      float lather = noise(ground * 3.2 + vec2(drift * .3, -drift * .6)) * .6
        + noise(mat2(.8, -.6, .6, .8) * ground * 5.3 - vec2(drift * .4, drift * .2)) * .4;
      float fizz = noise(ground * 11. + drift * .4);
      float froth = lather * .62 + fizz * .38;
      // Foam gathers where the water is shallowest and tears apart further out.
      float breaking = smoothstep(.48, .84, froth * (.4 + .8 * sets)) * (1. - smoothstep(.12, .72, shore.x));
      // A wash right at the waterline, so the land always meets broken water.
      float wash = (1. - smoothstep(.02, .15, shore.x)) * smoothstep(.25, .7, lather);
      foam = clamp(max(breaking * .72, wash * (.35 + .3 * sets)), 0., 1.);
    }
    gl_FragColor = vec4(oceanHaze(mix(water, oceanWhite, foam), waterPosition), clamp(shallows * .8 + foam * .72 + pool * .4, 0., .9));
    // The depth of the water drawn under this fragment, so the band is never
    // hidden by a triangle of a coarse ocean grid nor left floating over one.
    vec4 onWater = projectionMatrix * viewMatrix * vec4(waterPosition.x, oceanSheet(waterPosition.xz) + ${CLEARANCE}, waterPosition.z, 1.);
    gl_FragDepth = onWater.z / onWater.w * .5 + .5;
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createShallowsMaterial(daylight: OceanDaylight) {
  const material = new ShaderMaterial({
    vertexColors: true,
    uniforms: {
      ...oceanDaylightUniforms(daylight),
      time: { value: 0 },
      waveStrength: { value: 1 },
      motion: { value: 1 },
      // The ocean's own grid, for the surface it draws under the band.
      vessel: { value: new Vector2() },
      oceanCell: { value: 1 },
    },
    vertexShader: shallowsVertexShader,
    fragmentShader: shallowsFragmentShader,
    transparent: true,
    // The band lies flat on the water; writing depth would hide the wake and
    // the Ship's hull where they cross it.
    depthWrite: false,
    side: DoubleSide,
  });
  material.defaultAttributeValues.color = [0, 0, 0];
  return material;
}
