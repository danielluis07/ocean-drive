import { oceanDaylightShader } from "@/lib/ocean-daylight";

// Long swells are shared by the GPU surface and the vessel's buoyancy samples.
const swells = [
  { x: 0.16, z: 0.08, amplitude: 0.22, speed: 0.72 },
  { x: -0.09, z: 0.23, amplitude: 0.12, speed: -0.61 },
  { x: 0.31, z: 0.17, amplitude: 0.055, speed: 1.05 },
] as const;

export function sampleOceanHeight(x: number, z: number, time: number, waveStrength = 1) {
  let height = 0;
  for (const wave of swells) height += Math.sin(x * wave.x + z * wave.z + time * wave.speed) * wave.amplitude;
  return height * waveStrength;
}

const swellShader = swells.map((wave) =>
  `wave(p, vec2(${wave.x}, ${wave.z}), ${wave.amplitude}, ${wave.speed}, height, slope);`,
).join("\n");

// The shoreline hook: any mesh that has to sit on the water includes this chunk
// and displaces its world Y by `swell(world.xz, height, slope)` with the same
// `time` and `waveStrength` the ocean is given, so it rides the same surface.
// The Landmark surf line in `lib/landmark-surf.ts` is the first caller;
// see docs/ocean-resilience.md for the complete material contract.
export const oceanSwellShader = `
  uniform float time;
  uniform float waveStrength;
  void wave(vec2 p, vec2 direction, float amplitude, float speed, inout float height, inout vec2 slope) {
    float phase = dot(p, direction) + time * speed;
    height += sin(phase) * amplitude;
    slope += cos(phase) * amplitude * direction;
  }
  void swell(vec2 p, out float height, out vec2 slope) {
    height = 0.;
    slope = vec2(0.);
    ${swellShader}
    height *= waveStrength;
    slope *= waveStrength;
  }
`;

export const oceanVertexShader = `
  ${oceanSwellShader}
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
  ${oceanSwellShader}
  ${oceanDaylightShader}
  uniform vec2 vessel;
  uniform float heading;
  uniform float wakeDetail;
  uniform vec4 wakePoints[WAKE_POINTS];
  uniform vec4 wakeForces[WAKE_POINTS];
  uniform vec4 wakeBounds;
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

  #ifndef LOW_QUALITY
  // Written by lib/ship-wake.ts, oldest point first and the Ship's live point last.
  uniform float speed;
  uniform float thrust;
  uniform vec2 course;

  // Mirror lib/ship-wake.ts. Speeds are world units per second.
  const float WAKE_LIFETIME = 9.;
  const float CRUISE_SPEED = 60.;

  float wakeEnergy(float shipSpeed) {
    return min(sqrt(max(shipSpeed, 0.) / CRUISE_SPEED), 1.1);
  }

  // Every trail segment leaves divergent crests that travel outward (the Kelvin
  // arms), transverse crests between them, and a lane of turbulent prop wash
  // that widens and tears apart as it ages. Where segments overlap, at joints or
  // where the Ship doubles back, the strongest contribution wins instead of
  // adding up, so the trail never shows its seams.
  void shipWake(vec2 p, inout vec2 slope, out float surface, out float slick, out float wash, out float washAge, out float breaking) {
    surface = 0.;
    slick = 0.;
    wash = 0.;
    washAge = 0.;
    breaking = 0.;
    if (any(lessThan(p, wakeBounds.xy)) || any(greaterThan(p, wakeBounds.zw))) return;
    // World-anchored noise bends the arms and frays the lane, so the wake
    // deforms where it lies rather than sliding along with the Ship.
    float warp = noise(p * .085 + vec2(time * .021, -time * .013)) - .5;
    float fray = noise(p * .23 + vec2(-time * .034, time * .027));
    vec2 waveSlope = vec2(0.);
    float waveSurface = 0.;
    float waveWeight = 1e-5;
    for (int i = 0; i < WAKE_POINTS - 1; i++) {
      vec4 a = wakePoints[i];
      vec4 b = wakePoints[i + 1];
      float ageA = time - a.z;
      float ageB = time - b.z;
      if (min(ageA, ageB) > WAKE_LIFETIME || max(ageA, ageB) > WAKE_LIFETIME * 2.) continue;
      vec2 track = b.xy - a.xy;
      float span = dot(track, track);
      float along = dot(p - a.xy, track) / max(span, 1e-4);
      float t = clamp(along, 0., 1.);
      vec2 away = p - a.xy - track * t;
      float d = length(away);
      vec4 force = mix(wakeForces[i], wakeForces[i + 1], t);
      float age = max(mix(ageA, ageB, t), 0.);
      float reach = 1.05 + .354 * force.x / (1. + force.x / 35.) * age;
      float width = .7 + age * .42 + reach * .05;
      float lane = .55 + sqrt(age) * .95;
      if (d > max(reach + width * 3.8, lane * 3. + 1.2 + sqrt(age) * .7)) continue;

      float energy = wakeEnergy(force.x) * force.w;
      vec2 outward = d > 1e-3 ? away / d : vec2(0.);
      vec2 forward = track * inversesqrt(max(span, 1e-8));
      vec2 abeam = vec2(-forward.y, forward.x);
      float side = dot(away, abeam) >= 0. ? 1. : -1.;
      // Water piles up on the outside of a turn and slackens on the inside.
      float bias = 1. - side * clamp(force.z * .5, -.45, .45);
      // Crests only span their own stretch of trail. Rings wrapping past each
      // end would otherwise chain along the wake, where real water cancels them.
      float beyond = abs(along - t) * sqrt(span);
      float stretch = 1. - smoothstep(0., 1. + reach * .3, beyond);

      // Divergent crests ride just inside the cusp line. Their phase outruns
      // the packet, as in deep water, so crests drift outward through it.
      float u = (d - reach - warp * width * 1.6) / width;
      float packet = exp(-u * u * 1.3) * energy * bias * stretch * exp(-age * .36) * (.55 + .9 * fray);
      float phase = u * 3.4 - age * 1.9;
      float crest = cos(phase);
      vec2 waves = outward * packet * (-2.6 * u * crest - 3.4 * sin(phase)) / width;
      // Transverse crests span the V behind the stern and keep moving once it has passed.
      float wavenumber = 6.2832 / max(3.5, force.x * .3);
      float transverse = energy * stretch * (1. - smoothstep(reach * .45, reach * .95, d)) * exp(-age * .5) * .2;
      float transversePhase = age * force.x * wavenumber;
      waves += forward * transverse * wavenumber * sin(transversePhase) * .1;
      float envelope = packet + transverse;
      float weight = envelope * envelope;
      waveSlope += waves * weight;
      waveSurface += (packet * crest + transverse * cos(transversePhase)) * weight;
      waveWeight += weight;
      breaking = max(breaking, smoothstep(.3, .85, packet * crest) * exp(-age * .9));

      // The wash lane is thrown to the outside of a turn as the stern skids, and
      // meanders as it ages. Shifting the lane's centre rather than the distance
      // keeps it continuous around the ends of each segment.
      float churn = (energy * .42 + force.y * .45 * force.w) * exp(-age * .42);
      float drift = clamp(force.z, -2., 2.) * .4 * min(age, 1.5) + warp * sqrt(age) * 1.4;
      float laneShape = dot(away + abeam * drift, away + abeam * drift) / (lane * lane);
      float washHere = exp(-laneShape) * churn;
      washAge = washHere > wash ? age : washAge;
      wash = max(wash, washHere);
      slick = max(slick, exp(-laneShape / 2.2) * min(energy * 1.6, 1.) * exp(-age * .2));
    }
    slope += waveSlope / waveWeight * .3;
    surface = waveSurface / waveWeight;
  }
  #endif

  void main() {
    vec2 p = world.xz;
    float height;
    vec2 slope;
    swell(p, height, slope);
    // Pixel-sized waves fade before they alias into glitter or moire.
    float footprint = max(length(dFdx(p)), length(dFdy(p)));
    float detail = 1. - smoothstep(.18, 1.6, footprint);
    // Cross the secondary ripples to break the uniform brushed-metal grain.
    vec2 ripples = vec2(0.);
    #ifdef LOW_QUALITY
    // Two layers still resolve smaller broken highlights on portrait screens;
    // broad smooth ripples alone would read as polished metal from overhead.
    windWave(p, vec2(.8, .6), .48, .22, .18, ripples);
    windWave(p + vec2(17.2, -9.4), vec2(-.119615, .992820), 2.6, .057 * detail, -.24, ripples);
    #else
    windWave(p, vec2(.8, .6), .48, .29, .18, ripples);
    windWave(p + vec2(17.2, -9.4), vec2(-.119615, .992820), 1.1, .13 * detail, -.24, ripples);
    windWave(p + vec2(-8.3, 21.7), vec2(.919615, -.392820), 2.6, .057 * detail, .31, ripples);
    windWave(p + vec2(31.8, 4.1), vec2(.8, .6), 5.8, .019 * detail * detail, -.43, ripples);
    #ifdef HIGH_QUALITY
    windWave(p + vec2(7.1, 13.2), vec2(-.119615, .992820), 11.5, .007 * detail * detail, .52, ripples);
    #endif
    #endif
    ripples *= waveStrength;

    vec2 offset = p - vessel;
    float aft = dot(offset, vec2(-sin(heading), cos(heading)));
    float side = dot(offset, vec2(cos(heading), sin(heading)));
    float wakeSurface = 0.;
    float slick = 0.;
    #ifndef LOW_QUALITY
    float wash;
    float washAge;
    float breaking;
    shipWake(p, slope, wakeSurface, slick, wash, washAge, breaking);
    // The hull's waterline as an ellipse along the course, so a Ship backing
    // along the route pushes water from its stern. The bow wave rides just
    // outside it, pushed further out and higher the faster the Ship sails.
    float energy = wakeEnergy(speed);
    vec2 abeamAxis = vec2(-course.y, course.x);
    float ahead = dot(offset, course);
    float abeam = dot(offset, abeamAxis);
    float station = length(vec2(abeam / 1.2, ahead / 3.));
    vec2 stationNormal = normalize(abeamAxis * abeam / 1.44 + course * ahead / 9. + 1e-5);
    float ridge = station - 1.1 - energy * .25;
    float bowWave = exp(-ridge * ridge * 14.) * energy * mix(.25, 1., smoothstep(-2., 2.8, ahead));
    slope -= stationNormal * 28. * ridge * bowWave * .07;
    wakeSurface += bowWave * .6;
    #endif
    // Churned water smooths the wind ripples into a slick lane behind the Ship.
    slope += ripples * (1. - slick * .65);

    vec3 normal = normalize(vec3(-slope.x, 1., -slope.y));
    vec3 view = normalize(cameraPosition - world);
    // Unresolved ripples roughen the reflection; mirroring them at full strength
    // turns grazing Fresnel into high-contrast brushed-metal streaks.
    vec3 reflectionNormal = normalize(vec3(-slope.x * .6, 1., -slope.y * .6));
    vec3 reflected = reflect(-view, reflectionNormal);
    vec3 sky = mix(oceanHorizon, oceanZenith, pow(max(reflected.y, 0.), .45));
    #ifndef LOW_QUALITY
    float cloud = smoothstep(.46, .77, noise(reflected.xz / max(.22, reflected.y) * 3.2));
    sky = mix(sky, oceanWhite, cloud * .06);
    #endif
    float fresnel = .0204 + .9796 * pow(1. - max(dot(reflectionNormal, view), 0.), 5.);
    float depth = noise(p * .018);
    vec3 water = oceanDeep * mix(.8, 1.35, depth);
    // Light scattered back out of the water body keeps the surface from reading
    // as a pure mirror; it gathers on swell crests and viewer-facing slopes.
    float crest = smoothstep(-.3, .35, height);
    water += oceanCrest * crest * max(dot(normal, view), 0.);
    #ifndef LOW_QUALITY
    // Wake crests catch the same scattered light and the troughs between them
    // darken; aerated wash glows pale before it whitens into foam.
    water += oceanCrest * clamp(wakeSurface, -.2, 1.);
    water += oceanCrest * .4 * min(wash, 1.);
    #endif
    water = mix(water, sky, fresnel * .88);
    vec3 sun = sunDirection;
    vec3 halfway = normalize(sun + view);
    // Broaden unresolved highlights instead of letting subpixel pinpricks alias.
    float specularPower = mix(90., 320., detail);
    float specular = pow(max(dot(normal, halfway), 0.), specularPower);
    #ifdef LOW_QUALITY
    specular *= .45;
    #endif
    float windPatch = smoothstep(.3, .8, noise(p * vec2(.36, .22) + time * .018));
    water += oceanWhite * specular * mix(.12, .85, windPatch) * (1. - slick * .5) * mix(.35, 1., waveStrength);
    water += oceanZenith * pow(max(dot(reflected, sun), 0.), 18.) * .12;

    // A soft contact shadow seats the hull in the water.
    float contact = exp(-pow(side / 1.35, 4.) - pow((aft + .1) / 3.15, 4.));
    water *= 1. - contact * .46;
    #ifndef LOW_QUALITY
    // Foam is sampled where the water is, so the Ship sails through it rather than towing it.
    float lather = noise(p * 1.3 + vec2(time * .06, -time * .045));
    float bubbles = noise(p * 4.2 + lather * 2.3 - time * .02);
    float fizz = noise(p * 11.7 - bubbles * 1.7 + time * .05);
    float froth = lather * .5 + bubbles * .32 + fizz * .18;
    // Wind-driven whitecaps remain visible away from the Ship. Reuse the
    // existing ripple slopes and foam samples; no extra octaves or surface pass.
    float whitecaps = smoothstep(.32, .55, length(ripples)) * smoothstep(.57, .8, froth);
    whitecaps *= smoothstep(-.08, .24, height) * detail * waveStrength;
    // Fresh, hard-driven wash is a dense churn; as it ages the foam tears into
    // lace and then into scattered streaks.
    float tear = mix(.3, .66, smoothstep(0., 5., washAge)) - min(wash, 1.) * .18;
    float foam = min(wash, 1.) * smoothstep(tear, tear + .3, froth);
    foam += breaking * smoothstep(.45, .8, froth) * .5;
    // Water broken along the hull, and spray heaped at the stem.
    float skirt = exp(-ridge * ridge * 9.) * energy * smoothstep(-3.4, 1.6, ahead) * smoothstep(.4, .75, froth);
    float stem = exp(-pow(abeam / .6, 2.) - pow((ahead - 2.9 - energy * .35) / .8, 2.)) * energy;
    foam += skirt * .6 + stem * smoothstep(.25, .7, froth) * .7;
    #ifdef HIGH_QUALITY
    foam += min(wash, 1.) * (noise(p * 13. + time * .3) - .5) * .18;
    #endif
    water = mix(water, oceanWhite, clamp(max(foam * min(wakeDetail, 1.), whitecaps * .85), 0., .9));
    #else
    // Eight remembered points give phones a world-anchored wake in the same
    // ocean draw. No slope derivatives, extra noise octaves, or render targets.
    float foam = 0.;
    if (all(greaterThanEqual(p, wakeBounds.xy)) && all(lessThanEqual(p, wakeBounds.zw))) {
      for (int i = 0; i < WAKE_POINTS - 1; i++) {
        vec4 a = wakePoints[i], b = wakePoints[i + 1];
        vec2 segment = b.xy - a.xy;
        float lengthSquared = dot(segment, segment);
        if (lengthSquared < .001 || time - max(a.z, b.z) >= 9. || time - min(a.z, b.z) >= 18.) continue;
        float along = clamp(dot(p - a.xy, segment) / lengthSquared, 0., 1.);
        float age = max(0., time - mix(a.z, b.z, along));
        vec4 force = mix(wakeForces[i], wakeForces[i + 1], along);
        float energy = min(sqrt(max(force.x, 0.) / 60.), 1.);
        float distanceToTrail = length(p - mix(a.xy, b.xy, along));
        float width = .55 + sqrt(age) * .45;
        float wash = exp(-pow(distanceToTrail / width, 2.));
        float arm = exp(-pow((distanceToTrail - 1.05 - min(force.x * .18, 4.) * age) / .38, 2.));
        foam = max(foam, (wash * .65 + arm * .28) * energy * force.w * (1. - smoothstep(0., 9., age)));
      }
      foam *= .65 + .35 * noise(p * 2. + time * .06);
    }
    water = mix(water, oceanWhite, clamp(foam * wakeDetail, 0., .8));
    #endif

    gl_FragColor = vec4(oceanHaze(water, world), 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Keep a plain, usable ocean when the decorative shader cannot compile.
export const baselineOceanFragmentShader = `
  ${oceanDaylightShader}
  varying vec3 world;
  void main() {
    gl_FragColor = vec4(oceanHaze(oceanDeep, world), 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
