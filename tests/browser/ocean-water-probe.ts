import type { Page } from "@playwright/test";

type WaterSample = { kind: string; time: number; strength: number; white: number[]; sun: number[] | null };

declare global {
  interface Window { __waterSamples: () => WaterSample[] }
}

// Observe real GPU uniforms after drawing, without changing the scene or exposing
// a production test API. Retired quality programs, and every program of a lost
// context, disappear from the samples. The wake field pass (lib/wake-field.ts)
// is sampled as "field" once linked, drawn or not, since a settled Ship leaves
// it idle.
export async function observeWater(page: Page) {
  await page.addInitScript(() => {
    const programs: { gl: WebGL2RenderingContext; program: WebGLProgram; kind: string }[] = [];
    const original = WebGL2RenderingContext.prototype.linkProgram;
    WebGL2RenderingContext.prototype.linkProgram = function (program) {
      original.call(this, program);
      const source = this.getAttachedShaders(program)?.map((shader) => this.getShaderSource(shader)).join("\n") ?? "";
      if (source.includes("#define WAKE_FIELD_TEXELS")) {
        programs.push({ gl: this, program, kind: "field" });
        return;
      }
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
      if (kind === "field") return [{ kind, time: time ?? 0, strength: 1, white: [], sun: null }];
      if (!time) return [];
      return [{ kind, time, strength: uniform("waveStrength"), white: Array.from(uniform("oceanWhite") ?? []),
        sun: uniform("sunDirection") ? Array.from(uniform("sunDirection")) : null }];
    });
  });
}
