// Long swells are shared by the GPU surface and the vessel's buoyancy samples.
const swells = [
  { x: 0.16, z: 0.08, amplitude: 0.22, speed: 0.72 },
  { x: -0.09, z: 0.23, amplitude: 0.12, speed: -0.61 },
  { x: 0.31, z: 0.17, amplitude: 0.055, speed: 1.05 },
] as const;

export function sampleOceanHeight(x: number, z: number, time: number) {
  let height = 0;
  for (const wave of swells) height += Math.sin(x * wave.x + z * wave.z + time * wave.speed) * wave.amplitude;
  return height;
}

const swellShader = swells.map((wave) =>
  `wave(p, vec2(${wave.x}, ${wave.z}), ${wave.amplitude}, ${wave.speed}, height, slope);`,
).join("\n");

const surfaceShader = `
  uniform float time;
  void wave(vec2 p, vec2 direction, float amplitude, float speed, inout float height, inout vec2 slope) {
    float phase = dot(p, direction) + time * speed;
    height += sin(phase) * amplitude;
    slope += cos(phase) * amplitude * direction;
  }
  void swell(vec2 p, out float height, out vec2 slope) {
    height = 0.;
    slope = vec2(0.);
    ${swellShader}
  }
`;

export const oceanVertexShader = `
  ${surfaceShader}
  uniform vec2 vessel;
  varying vec3 world;
  void main() {
    world = (modelMatrix * vec4(position, 1.)).xyz;
    // Concentrate the existing grid near the boat, where swell contact matters.
    world.xz = sign(world.xz) * world.xz * world.xz / 600. + vessel;
    float height;
    vec2 slope;
    swell(world.xz, height, slope);
    world.y += height;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.);
  }
`;

export const oceanFragmentShader = `
  ${surfaceShader}
  uniform vec2 vessel;
  uniform float heading;
  uniform float moving;
  uniform float wakeDetail;
  varying vec3 world;

  vec3 noiseGradient(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 blend = f * f * f * (f * (f * 6. - 15.) + 10.);
    vec2 derivative = 30. * f * f * (f * (f - 2.) + 1.);
    vec4 h = fract(sin(vec4(dot(i, vec2(127.1, 311.7)), dot(i + vec2(1., 0.), vec2(127.1, 311.7)),
      dot(i + vec2(0., 1.), vec2(127.1, 311.7)), dot(i + vec2(1., 1.), vec2(127.1, 311.7)))) * 43758.5453);
    float crossTerm = h.x - h.y - h.z + h.w;
    return vec3(h.x + (h.y - h.x) * blend.x + (h.z - h.x) * blend.y + crossTerm * blend.x * blend.y,
      derivative * (vec2(h.y - h.x, h.z - h.x) + crossTerm * blend.yx));
  }
  float noise(vec2 p) {
    return noiseGradient(p).x;
  }
  void windWave(vec2 p, vec2 direction, float frequency, float amplitude, float speed, inout vec2 slope) {
    // Anisotropic noise forms broken wind crests; analytic derivatives avoid
    // both a visible sine-wave grid and extra texture/height samples.
    mat2 wind = mat2(direction.x, -direction.y, direction.y, direction.x);
    vec2 stretch = vec2(.84, 1.3) * frequency;
    vec3 sampleValue = noiseGradient((wind * p) * stretch + vec2(time * speed, time * speed * -.7));
    vec2 gradient = sampleValue.yz * stretch;
    slope += vec2(dot(wind[0], gradient), dot(wind[1], gradient)) * amplitude;
  }

  void main() {
    vec2 p = world.xz;
    float height;
    vec2 slope;
    swell(p, height, slope);
    // Pixel-sized waves fade before they alias into glitter or moire.
    float footprint = max(length(dFdx(p)), length(dFdy(p)));
    float detail = 1. - smoothstep(.18, 1.6, footprint);
    // Cross the secondary ripples to break the uniform brushed-metal grain.
    windWave(p, vec2(.8, .6), .48, .29, .18, slope);
    windWave(p + vec2(17.2, -9.4), vec2(-.119615, .992820), 1.1, .13 * detail, -.24, slope);
    #ifndef LOW_QUALITY
    windWave(p + vec2(-8.3, 21.7), vec2(.919615, -.392820), 2.6, .057 * detail, .31, slope);
    windWave(p + vec2(31.8, 4.1), vec2(.8, .6), 5.8, .019 * detail * detail, -.43, slope);
    #ifdef HIGH_QUALITY
    windWave(p + vec2(7.1, 13.2), vec2(-.119615, .992820), 11.5, .007 * detail * detail, .52, slope);
    #endif
    #endif

    vec2 offset = p - vessel;
    float aft = dot(offset, vec2(-sin(heading), cos(heading)));
    float side = dot(offset, vec2(cos(heading), sin(heading)));
    #ifndef LOW_QUALITY
    float trail = smoothstep(2., 4., aft) * (1. - smoothstep(8., 23., aft)) * moving;
    float wakeEdge = abs(side) - (1.05 + max(aft - 2.5, 0.) * .25);
    float wakeRidge = exp(-wakeEdge * wakeEdge * 2.4) * trail;
    slope += vec2(cos(heading), sin(heading)) * sign(side) * sin(wakeEdge * 5.) * wakeRidge * .15;
    #endif

    vec3 normal = normalize(vec3(-slope.x, 1., -slope.y));
    vec3 view = normalize(cameraPosition - world);
    // Unresolved ripples roughen the reflection; mirroring them at full strength
    // turns grazing Fresnel into high-contrast brushed-metal streaks.
    vec3 reflectionNormal = normalize(vec3(-slope.x * .6, 1., -slope.y * .6));
    vec3 reflected = reflect(-view, reflectionNormal);
    vec3 sky = mix(vec3(.15, .23, .34), vec3(.045, .1, .19), pow(max(reflected.y, 0.), .45));
    #ifndef LOW_QUALITY
    float cloud = smoothstep(.46, .77, noise(reflected.xz / max(.22, reflected.y) * 3.2));
    sky = mix(sky, vec3(.3, .38, .48), cloud * .2);
    #endif
    float fresnel = .0204 + .9796 * pow(1. - max(dot(reflectionNormal, view), 0.), 5.);
    float depth = noise(p * .018);
    vec3 water = mix(vec3(.003, .012, .03), vec3(.006, .021, .046), depth);
    // Light scattered back out of the water body keeps the surface from reading
    // as a pure mirror; it gathers on swell crests and viewer-facing slopes.
    float crest = smoothstep(-.3, .35, height);
    water += vec3(.003, .022, .034) * crest * max(dot(normal, view), 0.);
    water = mix(water, sky, fresnel * .88);
    vec3 sun = normalize(vec3(-.25, .78, -.57));
    vec3 halfway = normalize(sun + view);
    float specular = pow(max(dot(normal, halfway), 0.), 260.);
    float windPatch = smoothstep(.3, .8, noise(p * vec2(.36, .22) + time * .018));
    water += vec3(.62, .72, .8) * specular * mix(.25, 1., windPatch) * .9;
    water += vec3(.06, .1, .17) * pow(max(dot(reflected, sun), 0.), 18.) * .12;

    // A soft contact shadow and broken foam seat the hull in the water.
    float contact = exp(-pow(side / 1.35, 4.) - pow((aft + .1) / 3.15, 4.));
    water *= 1. - contact * .46;
    #ifndef LOW_QUALITY
    vec2 wakePosition = vec2(side, aft - time * 2.4);
    float turbulence = noise(wakePosition * 2.1);
    float bubbles = noise(wakePosition * 6.7 + vec2(turbulence * 2.));
    float foam = wakeRidge * smoothstep(.18, .7, turbulence) * .58;
    float churnWidth = .42 + max(aft - 2.5, 0.) * .055;
    float churnSide = side + (turbulence - .5) * .65;
    float churn = (1. - smoothstep(churnWidth * .35, churnWidth + turbulence * .4, abs(churnSide))) * trail;
    foam += churn * mix(.36, .86, smoothstep(.2, .78, bubbles));
    float bow = exp(-pow((aft + 2.45) / .9, 2.)) * exp(-pow((abs(side) - .8) * 3., 2.));
    foam += bow * moving * bubbles * .45;
    #ifdef HIGH_QUALITY
    foam += churn * noise(p * 9. - time) * .12;
    #endif
    water = mix(water, vec3(.65, .76, .83), clamp(foam * min(wakeDetail, 1.), 0., .88));
    #endif

    float haze = smoothstep(140., 420., distance(cameraPosition, world));
    gl_FragColor = vec4(mix(water, vec3(.022, .043, .075), haze), 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Keep a plain, usable ocean when the decorative shader cannot compile.
export const baselineOceanFragmentShader = `
  varying vec3 world;
  void main() {
    vec3 water = vec3(.005, .016, .034);
    float haze = smoothstep(140., 420., distance(cameraPosition, world));
    gl_FragColor = vec4(mix(water, vec3(.022, .043, .075), haze), 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
