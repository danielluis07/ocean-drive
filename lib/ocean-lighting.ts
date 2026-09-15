import { DataTexture, EquirectangularReflectionMapping, FloatType, PMREMGenerator, RGBAFormat, type WebGLRenderer } from "three";

// A small local sky supplies real material reflections without a network asset.
export function createOceanEnvironment(renderer: WebGLRenderer) {
  const width = 128;
  const height = 64;
  const pixels = new Float32Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const elevation = Math.sin(((y + .5) / height - .5) * Math.PI);
    for (let x = 0; x < width; x++) {
      const azimuth = ((x + .5) / width - .5) * Math.PI * 2;
      const horizontal = Math.sqrt(1 - elevation * elevation);
      const sunDot = horizontal * Math.cos(azimuth) * -.25 + elevation * .78 + horizontal * Math.sin(azimuth) * -.57;
      const glow = Math.pow(Math.max(0, sunDot), 96) * 4;
      const sky = Math.pow(Math.max(0, elevation), .45);
      const color = elevation > 0
        ? [.24 - .175 * sky + glow * .72, .34 - .21 * sky + glow * .86, .47 - .23 * sky + glow]
        : [.005, .016, .034];
      const index = (y * width + x) * 4;
      pixels.set([...color, 1], index);
    }
  }
  const texture = new DataTexture(pixels, width, height, RGBAFormat, FloatType);
  texture.mapping = EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  const generator = new PMREMGenerator(renderer);
  const environment = generator.fromEquirectangular(texture);
  texture.dispose();
  generator.dispose();
  return environment;
}
