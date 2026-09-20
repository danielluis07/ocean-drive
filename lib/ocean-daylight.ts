import { Color, Vector2, Vector3 } from "three";

// One high daylight sun for the aerial camera, water, Ship, and Landmarks.
export const oceanSunPosition: [number, number, number] = [-25, 88, -40];
export const oceanFogRange: [number, number] = [140, 420];
export const CALM_WAVE_RATE = 0.3;
export const CALM_WAVE_STRENGTH = 0.45;

// Read the authored CSS tokens once when the Canvas mounts. Three converts
// sRGB token colours to linear light before uniforms or the environment use them.
export function readOceanDaylight(element: Element) {
  const tokens = getComputedStyle(element);
  return createOceanDaylight(
    tokens.getPropertyValue("--ocean-950").trim(),
    tokens.getPropertyValue("--ocean-050").trim(),
  );
}

export function createOceanDaylight(navyToken: string, whiteToken: string) {
  const navy = new Color(navyToken);
  const white = new Color(whiteToken);
  return {
    background: navy,
    white,
    deep: navy.clone().multiplyScalar(2.6),
    crest: navy.clone().multiplyScalar(3),
    horizon: navy.clone().lerp(white, 0.26),
    zenith: navy.clone().lerp(white, 0.08),
    sun: new Vector3(...oceanSunPosition).normalize(),
  };
}

export type OceanDaylight = ReturnType<typeof createOceanDaylight>;

// Water and shoreline materials share the same linear-light palette and haze.
export function oceanDaylightUniforms(daylight: OceanDaylight) {
  return {
    oceanDeep: { value: daylight.deep },
    oceanCrest: { value: daylight.crest },
    oceanWhite: { value: daylight.white },
    oceanHorizon: { value: daylight.horizon },
    oceanZenith: { value: daylight.zenith },
    oceanFog: { value: daylight.background },
    oceanFogRange: { value: new Vector2(...oceanFogRange) },
    sunDirection: { value: daylight.sun },
  };
}

export const oceanDaylightShader = `
  uniform vec3 oceanDeep;
  uniform vec3 oceanCrest;
  uniform vec3 oceanWhite;
  uniform vec3 oceanHorizon;
  uniform vec3 oceanZenith;
  uniform vec3 oceanFog;
  uniform vec2 oceanFogRange;
  uniform vec3 sunDirection;
  vec3 oceanHaze(vec3 colour, vec3 worldPosition) {
    float haze = smoothstep(oceanFogRange.x, oceanFogRange.y, distance(cameraPosition, worldPosition));
    return mix(colour, oceanFog, haze);
  }
`;
