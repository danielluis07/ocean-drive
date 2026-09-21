import { Color, DataTexture, EquirectangularReflectionMapping, FloatType, PMREMGenerator, RGBAFormat, type WebGLRenderer } from "three";
import type { OceanDaylight } from "@/lib/ocean-daylight";

// A small local sky supplies real material reflections without a network asset.
export function createOceanEnvironment(renderer: WebGLRenderer, daylight: OceanDaylight) {
  const width = 128;
  const height = 64;
  const pixels = new Float32Array(width * height * 4);
  const skyColour = new Color();
  const sunColour = new Color();
  for (let y = 0; y < height; y++) {
    const elevation = Math.sin(((y + .5) / height - .5) * Math.PI);
    for (let x = 0; x < width; x++) {
      const azimuth = ((x + .5) / width - .5) * Math.PI * 2;
      const horizontal = Math.sqrt(1 - elevation * elevation);
      const sunDot = horizontal * Math.cos(azimuth) * daylight.sun.x + elevation * daylight.sun.y + horizontal * Math.sin(azimuth) * daylight.sun.z;
      const glow = Math.pow(Math.max(0, sunDot), 96) * 4;
      const sky = Math.pow(Math.max(0, elevation), .45);
      const color = elevation > 0
        ? skyColour.copy(daylight.horizon).lerp(daylight.zenith, sky).add(sunColour.copy(daylight.white).multiplyScalar(glow))
        : daylight.deep;
      const index = (y * width + x) * 4;
      pixels.set([color.r, color.g, color.b, 1], index);
    }
  }
  const texture = new DataTexture(pixels, width, height, RGBAFormat, FloatType);
  texture.mapping = EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  const generator = new PMREMGenerator(renderer);
  // Three's own convolution shader makes ANGLE's D3D compiler warn that a folded
  // constant sum (X4122) is inexact. The program links and runs; the warning is
  // only noise in the Visitor's console, so error checking is lifted for this
  // one generation and restored immediately, leaving our own materials checked.
  const checkShaderErrors = renderer.debug.checkShaderErrors;
  renderer.debug.checkShaderErrors = false;
  let environment;
  try {
    environment = generator.fromEquirectangular(texture);
  } finally {
    renderer.debug.checkShaderErrors = checkShaderErrors;
    texture.dispose();
    generator.dispose();
  }
  return environment;
}
