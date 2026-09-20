import type { Page } from "@playwright/test";

type WaterSample = { kind: string; time: number; strength: number; white: number[]; sun: number[] | null };

declare global {
  interface Window { __waterSamples: () => WaterSample[] }
}

// Observe real GPU uniforms after drawing, without changing the scene or exposing
// a production test API. Retired quality programs disappear from the samples.
export async function observeWater(page: Page) {
  await page.addInitScript(() => {
    const programs: { gl: WebGL2RenderingContext; program: WebGLProgram; kind: string }[] = [];
    const original = WebGL2RenderingContext.prototype.linkProgram;
    WebGL2RenderingContext.prototype.linkProgram = function (program) {
      original.call(this, program);
      const source = this.getAttachedShaders(program)?.map((shader) => this.getShaderSource(shader)).join("\n") ?? "";
      if (!source.includes("uniform float waveStrength;")) return;
      const kind = source.includes("uniform float wakeDetail;")
        ? source.includes("#define LOW_QUALITY") ? "low" : source.includes("#define HIGH_QUALITY") ? "high" : "balanced"
        : "surf";
      programs.push({ gl: this, program, kind });
    };
    window.__waterSamples = () => programs.flatMap(({ gl, program, kind }) => {
      if (!gl.isProgram(program) || !gl.getProgramParameter(program, gl.LINK_STATUS)) return [];
      const uniform = (name: string) => {
        const location = gl.getUniformLocation(program, name);
        return location ? gl.getUniform(program, location) : null;
      };
      const time = uniform("time");
      if (!time) return [];
      return [{ kind, time, strength: uniform("waveStrength"), white: Array.from(uniform("oceanWhite") ?? []),
        sun: uniform("sunDirection") ? Array.from(uniform("sunDirection")) : null }];
    });
  });
}
