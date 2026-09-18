import { DoubleSide, ShaderMaterial } from "three";
import { oceanSwellShader } from "@/lib/ocean-surface";

// The surf line: the band of water each Landmark's mesh carries around its
// shoreline, drawn over the ocean rather than cut into it. Its vertices ride
// the ocean's own swell through `oceanSwellShader`, so the foam stays attached
// to the water at every quality tier instead of floating at a fixed height.
//
// The band's UVs come from `scripts/generate-landmarks.ts`: `u` is world-unit
// arc length around the shore, so foam keeps one scale on every island, and `v`
// runs 0 at the shoreline to 1 at the outer edge of the band.

const surfVertexShader = `
  ${oceanSwellShader}
  varying vec2 shore;
  void main() {
    shore = uv;
    vec3 world = (modelMatrix * vec4(position, 1.)).xyz;
    float height;
    vec2 slope;
    swell(world.xz, height, slope);
    // Just clear of the water it sits on, so the band never z-fights the ocean.
    world.y += height + .03;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.);
  }
`;

const surfFragmentShader = `
  varying vec2 shore;
  uniform float time;
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
    // The shallows the island stands in, palest right against the land.
    float shallows = 1. - smoothstep(0., .72, shore.y);
    // Sets of breakers rolling shoreward, broken along the shore so the ring
    // never reads as one even stripe. A motion of zero leaves the set
    // where it stands: a still foam ring rather than a travelling one.
    float drift = time * .16 * motion;
    float along = noise(vec2(shore.x * .35, drift * .6));
    float sets = .55 + .45 * cos((shore.y * 2.6 - drift * 2.2 + along * .9) * 6.2832);
    float lather = noise(vec2(shore.x * 1.9, shore.y * 4.2 - drift * 1.4));
    float fizz = noise(vec2(shore.x * 7.3 + drift, shore.y * 9.) );
    float froth = lather * .62 + fizz * .38;
    // Foam gathers where the water is shallowest and tears apart further out.
    float breaking = smoothstep(.42, .86, froth * (.4 + .8 * sets)) * smoothstep(.8, .12, shore.y);
    // A wash right at the waterline, so the land always meets broken water.
    float wash = smoothstep(.16, 0., shore.y);
    float foam = clamp(max(breaking * .85, wash * (.6 + .3 * sets)), 0., 1.);
    // Reef shallows, not surf: a turquoise halo the white only breaks out of
    // against the land, so the band never reads as a rim of ice.
    vec3 water = mix(vec3(.02, .09, .13), vec3(.07, .27, .3), shallows);
    gl_FragColor = vec4(mix(water, vec3(.76, .86, .88), foam), clamp(shallows * .5 + foam * .8, 0., .86));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createSurfMaterial() {
  return new ShaderMaterial({
    uniforms: { time: { value: 0 }, motion: { value: 1 } },
    vertexShader: surfVertexShader,
    fragmentShader: surfFragmentShader,
    transparent: true,
    // The band lies flat on the water; writing depth would hide the wake and
    // the Ship's hull where they cross it.
    depthWrite: false,
    side: DoubleSide,
  });
}
