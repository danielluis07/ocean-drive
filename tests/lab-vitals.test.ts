import { describe, expect, test } from "bun:test";
import {
  cumulativeLayoutShift,
  interactionToNextPaint,
  isSoftwareRenderer,
  labRunsPerProfile,
  percentile,
  summariseLabRuns,
} from "@/lib/lab-vitals";

describe("Lab Core Web Vitals", () => {
  test("p75 is the nearest-rank observed value and refuses missing measurements", () => {
    expect(percentile([5, 1, 4, 2, 3], 0.75)).toBe(4);
    expect(percentile([900], 0.75)).toBe(900);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8], 0.75)).toBe(6);
    expect(() => percentile([], 0.75)).toThrow();
    expect(() => percentile([1, NaN], 0.75)).toThrow();
  });

  test("CLS is the largest session window and ignores shifts right after input", () => {
    expect(cumulativeLayoutShift([])).toBe(0);
    // Two bursts more than a second apart form separate windows.
    expect(cumulativeLayoutShift([
      { startTime: 100, value: 0.02, hadRecentInput: false },
      { startTime: 600, value: 0.03, hadRecentInput: false },
      { startTime: 2000, value: 0.04, hadRecentInput: false },
    ])).toBeCloseTo(0.05);
    // A window closes after five seconds even while shifts keep coming.
    const steady = Array.from({ length: 12 }, (_, index) => ({ startTime: index * 900, value: 0.01, hadRecentInput: false }));
    expect(cumulativeLayoutShift(steady)).toBeCloseTo(0.06);
    expect(cumulativeLayoutShift([{ startTime: 50, value: 0.5, hadRecentInput: true }])).toBe(0);
  });

  test("INP takes each interaction's longest event and ignores one outlier per fifty", () => {
    expect(interactionToNextPaint([
      { interactionId: 7, duration: 40 },
      { interactionId: 7, duration: 96 },
      { interactionId: 9, duration: 64 },
      { interactionId: 0, duration: 500 },
    ], null)).toEqual({ inpMs: 96, interactions: 2 });
    const many = Array.from({ length: 100 }, (_, index) => ({ interactionId: index + 1, duration: index + 1 }));
    expect(interactionToNextPaint(many, null)).toEqual({ inpMs: 98, interactions: 100 });
  });

  test("fast interactions fall back to the first input, and none at all is no measurement", () => {
    expect(interactionToNextPaint([], { interactionId: 3, duration: 8 })).toEqual({ inpMs: 8, interactions: 1 });
    expect(() => interactionToNextPaint([], null)).toThrow("No interaction");
  });

  test("thresholds are inclusive and too few runs fail the evidence itself", () => {
    const good = Array.from({ length: labRunsPerProfile }, () => ({ lcpMs: 2500, inpMs: 200, cls: 0.1 }));
    expect(summariseLabRuns(good).failures).toEqual([]);
    const slow = [...good.slice(1), { lcpMs: 2501, inpMs: 201, cls: 0.11 }, { lcpMs: 2501, inpMs: 201, cls: 0.11 }];
    expect(summariseLabRuns(slow).failures).toHaveLength(3);
    expect(summariseLabRuns(good.slice(1)).failures).toEqual([`only ${labRunsPerProfile - 1} of ${labRunsPerProfile} required runs`]);
  });

  test("software rasterizers are recognised, hardware renderers are not", () => {
    expect(isSoftwareRenderer("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)")).toBe(true);
    expect(isSoftwareRenderer("llvmpipe (LLVM 15.0.7, 256 bits)")).toBe(true);
    expect(isSoftwareRenderer("ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)")).toBe(true);
    expect(isSoftwareRenderer("ANGLE (AMD, AMD Radeon(TM) RX Vega 10 Graphics (0x000015D8) Direct3D11 vs_5_0 ps_5_0, D3D11)")).toBe(false);
    expect(isSoftwareRenderer("Apple M2")).toBe(false);
  });
});
