import sharp from "sharp";
import { shipLowArt } from "@/content/ship-art";
import { bakeAccessibility, sourceGeometry } from "@/scripts/asset-bake";

// Bake into the existing atlas: no new runtime texture or UV stream. Overlapping
// source UVs share the mean shading; untouched texels retain their source colour.
export async function bakeShipTexture(source: Buffer, positions: Float32Array, normals: Float32Array, uv: Float32Array, indices: Uint32Array, size: number) {
  const geometry = sourceGeometry(positions, normals, indices);
  const ao = bakeAccessibility(geometry, shipLowArt.aoRadius);
  geometry.dispose();
  const sum = new Float32Array(size * size), count = new Uint16Array(size * size);
  for (let face = 0; face < indices.length; face += 3) {
    const vertices = [indices[face], indices[face + 1], indices[face + 2]];
    const x = vertices.map((v) => uv[v * 2] * size - 0.5);
    const y = vertices.map((v) => uv[v * 2 + 1] * size - 0.5);
    const denominator = (y[1] - y[2]) * (x[0] - x[2]) + (x[2] - x[1]) * (y[0] - y[2]);
    if (Math.abs(denominator) < 1e-8) continue;
    for (let py = Math.max(0, Math.ceil(Math.min(...y))); py <= Math.min(size - 1, Math.floor(Math.max(...y))); py++) {
      for (let px = Math.max(0, Math.ceil(Math.min(...x))); px <= Math.min(size - 1, Math.floor(Math.max(...x))); px++) {
        const a = ((y[1] - y[2]) * (px - x[2]) + (x[2] - x[1]) * (py - y[2])) / denominator;
        const b = ((y[2] - y[0]) * (px - x[2]) + (x[0] - x[2]) * (py - y[2])) / denominator;
        const c = 1 - a - b;
        if (Math.min(a, b, c) < -1e-5) continue;
        const factors = vertices.map((v) => ao[v] * (0.92 + 0.08 * Math.max(0, normals[v * 3 + 1])));
        const pixel = py * size + px;
        sum[pixel] += factors[0] * a + factors[1] * b + factors[2] * c;
        count[pixel]++;
      }
    }
  }
  const pixels = await sharp(source).resize(size, size).removeAlpha().raw().toBuffer();
  for (let pixel = 0; pixel < count.length; pixel++) {
    if (!count[pixel]) continue;
    // Source bytes are sRGB; the AO factor is linear light.
    for (let channel = 0; channel < 3; channel++) {
      const value = pixels[pixel * 3 + channel] / 255;
      const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      const shaded = linear * sum[pixel] / count[pixel];
      pixels[pixel * 3 + channel] = Math.round(255 * (shaded <= 0.0031308 ? shaded * 12.92 : 1.055 * shaded ** (1 / 2.4) - 0.055));
    }
  }
  return sharp(pixels, { raw: { width: size, height: size, channels: 3 } }).jpeg({ quality: shipLowArt.textureQuality, chromaSubsampling: "4:4:4" }).toBuffer();
}
