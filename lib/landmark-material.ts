import type { MeshStandardMaterial } from "three";

// Fine surface detail belongs in the material, so the silhouette can spend its
// triangles on the recorded coastline and relief. Object coordinates keep the
// grain attached to the land across camera movement and quality changes.
const terrainShader = `
  varying vec3 terrainPosition;
  float terrainNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 blend = f * f * (3. - 2. * f);
    vec4 h = fract(sin(vec4(dot(i, vec2(127.1, 311.7)), dot(i + vec2(1., 0.), vec2(127.1, 311.7)),
      dot(i + vec2(0., 1.), vec2(127.1, 311.7)), dot(i + vec2(1., 1.), vec2(127.1, 311.7)))) * 43758.5453);
    return mix(mix(h.x, h.y, blend.x), mix(h.z, h.w, blend.x), blend.y);
  }
`;

export function detailLandmarkMaterial(material: MeshStandardMaterial) {
  const previousCompile = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey;
  const previousIntensity = material.envMapIntensity;
  // Keep the directional light's relief readable under the ocean environment.
  material.envMapIntensity = 0.3;
  material.onBeforeCompile = (shader, renderer) => {
    previousCompile.call(material, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 terrainPosition;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nterrainPosition = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${terrainShader}`)
      .replace("#include <color_fragment>", `
        #include <color_fragment>
        float vegetation = smoothstep(.012, .075, diffuseColor.g - diffuseColor.r);
        vec2 ground = terrainPosition.xz;
        float cover = terrainNoise(ground * 1.4);
        // Fade subpixel grain before it can shimmer on a small viewport.
        float footprint = max(length(dFdx(ground)), length(dFdy(ground)));
        float canopy = mix(.5, terrainNoise(ground * 7.5), 1. - smoothstep(.07, .22, footprint));
        float grit = mix(.5, terrainNoise(ground * 23.), 1. - smoothstep(.02, .08, footprint));
        float grain = cover * .3 + canopy * .55 + grit * .15;
        diffuseColor.rgb *= mix(.86 + grain * .23, .64 + grain * .62, vegetation);
        // Small rounded crowns on vegetation, quieter weathering on bare ground.
        float terrainBump = mix(grit * .012, canopy * .055 + cover * .015, vegetation);
      `)
      .replace("#include <normal_fragment_maps>", `
        #include <normal_fragment_maps>
        vec3 dx = dFdx(-vViewPosition), dy = dFdy(-vViewPosition);
        vec3 across = cross(dy, normal), along = cross(normal, dx);
        float determinant = dot(dx, across);
        vec3 gradient = sign(determinant) * (dFdx(terrainBump) * across + dFdy(terrainBump) * along);
        normal = normalize(max(abs(determinant), 1e-8) * normal - gradient);
      `);
  };
  material.customProgramCacheKey = () => "landmark-terrain-v1";
  material.needsUpdate = true;
  return () => {
    material.onBeforeCompile = previousCompile;
    material.customProgramCacheKey = previousKey;
    material.envMapIntensity = previousIntensity;
    material.needsUpdate = true;
  };
}
