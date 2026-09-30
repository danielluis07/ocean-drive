import { expect, test } from "bun:test";
import {
  classifyRenderer,
  deviceKey,
  promotionCeiling,
  readRenderer,
  recallQuality,
  rememberQuality,
  startingQuality,
} from "@/lib/starting-tier";

const VEGA_10 = "ANGLE (AMD, AMD Radeon(TM) RX Vega 10 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)";

test("the renderer string sorts obvious GPUs into a coarse class, and nothing else", () => {
  expect(classifyRenderer(VEGA_10)).toBe("modest");
  expect(classifyRenderer("ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)")).toBe("modest");
  expect(classifyRenderer("ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)")).toBe("modest");
  expect(classifyRenderer("ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)")).toBe("modest");
  expect(classifyRenderer("Mali-G52 MC2")).toBe("modest");
  expect(classifyRenderer("Adreno (TM) 506")).toBe("modest");
  expect(classifyRenderer("ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)")).toBe("capable");
  expect(classifyRenderer("ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)")).toBe("capable");
  expect(classifyRenderer("Apple M2 Max")).toBe("capable");
  // Masked, generic, unknown, and software renderers are no evidence either way.
  for (const renderer of [null, "", "WebKit WebGL", "Apple GPU", "Mozilla", "Adreno (TM) 740", "Intel(R) Arc(TM) A770 Graphics",
    "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)", "llvmpipe (LLVM 15.0.7, 256 bits)"])
    expect(classifyRenderer(renderer)).toBeNull();
});

function context(renderer: string, unmasked: string | null) {
  const asked: string[] = [];
  const gl = {
    RENDERER: 0x1f01,
    getParameter: (name: number) => (name === 0x1f01 ? renderer : unmasked),
    getExtension: (name: string) => { asked.push(name); return unmasked === null ? null : { UNMASKED_RENDERER_WEBGL: 0x9246 }; },
  };
  return { gl: gl as unknown as WebGL2RenderingContext, asked };
}

test("the debug extension is asked only when the plain renderer string is masked", () => {
  const firefox = context("Radeon R9 200 Series, or similar", "ignored");
  expect(readRenderer(firefox.gl)).toBe("Radeon R9 200 Series, or similar");
  expect(firefox.asked).toEqual([]);
  expect(readRenderer(context("WebKit WebGL", VEGA_10).gl)).toBe(VEGA_10);
  expect(readRenderer(context("WebKit WebGL", null).gl)).toBeNull();
  const broken = { getParameter: () => { throw new Error("lost"); } } as unknown as WebGL2RenderingContext;
  expect(readRenderer(broken)).toBeNull();
});

test("storage keys hash the renderer with the screen and DPR, never carrying the string itself", () => {
  const key = deviceKey(VEGA_10, { width: 1920, height: 1080 }, 1.25);
  expect(key).toMatch(/^ocean-drive:quality:[0-9a-z]+$/);
  expect(key).not.toContain("Vega");
  expect(deviceKey(VEGA_10, { width: 1920, height: 1080 }, 1.25)).toBe(key);
  expect(deviceKey(VEGA_10, { width: 2560, height: 1440 }, 1.25)).not.toBe(key);
  expect(deviceKey(VEGA_10, { width: 1920, height: 1080 }, 1.5)).not.toBe(key);
  expect(deviceKey(null, { width: 1920, height: 1080 }, 1.25)).not.toBe(key);
});

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    items,
    storage: () => ({ getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => { items.set(key, value); } }) as Storage,
  };
}

test("a remembered quality round-trips, and anything malformed is ignored", () => {
  const { items, storage } = memoryStorage();
  expect(recallQuality(storage, "key")).toBeNull();
  rememberQuality(storage, "key", { tier: "low", dpr: 1.25 });
  expect(items.get("key")).toBe('{"tier":"low","dpr":1.25}');
  expect(recallQuality(storage, "key")).toEqual({ tier: "low", dpr: 1.25 });
  for (const stored of ["{", '{"tier":"ultra","dpr":1}', '{"tier":"high","dpr":4}', '{"tier":"high"}', "null", "3"]) {
    items.set("key", stored);
    expect(recallQuality(storage, "key")).toBeNull();
  }
});

test("storage that throws, on access or on use, degrades to no memory", () => {
  const denied = () => { throw new DOMException("denied", "SecurityError"); };
  expect(recallQuality(denied, "key")).toBeNull();
  expect(() => rememberQuality(denied, "key", { tier: "high", dpr: 1.5 })).not.toThrow();
  const full = () => ({ getItem: denied, setItem: () => { throw new DOMException("full", "QuotaExceededError"); } }) as unknown as Storage;
  expect(recallQuality(full, "key")).toBeNull();
  expect(() => rememberQuality(full, "key", { tier: "high", dpr: 1.5 })).not.toThrow();
});

const laptop = { coarsePointer: false, smallScreen: false, deviceDpr: 1.25 };

test("promotion requires credible GPU headroom above Balanced", () => {
  expect(promotionCeiling("modest", true)).toBe("balanced");
  expect(promotionCeiling("modest", false)).toBe("balanced");
  expect(promotionCeiling(null, false)).toBe("balanced");
  expect(promotionCeiling(null, true)).toBe("high");
  expect(promotionCeiling("capable", false)).toBe("high");
  expect(promotionCeiling("capable", true)).toBe("high");
});
const phone = { coarsePointer: true, smallScreen: true, deviceDpr: 3 };

test("a remembered result outranks the GPU class, which outranks today's defaults", () => {
  expect(startingQuality({ ...laptop, remembered: { tier: "balanced", dpr: 1 }, gpuClass: "modest" }))
    .toEqual({ start: { tier: "balanced", dpr: 1 }, source: "remembered" });
  expect(startingQuality({ ...phone, remembered: { tier: "balanced", dpr: 1.25 }, gpuClass: null }))
    .toEqual({ start: { tier: "balanced", dpr: 1.25 }, source: "remembered" });
  // Integrated laptops start on the reference look now that the wake field
  // bounds passage cost. Live measurements can still demote a weak GPU.
  expect(startingQuality({ ...laptop, remembered: null, gpuClass: "modest" }))
    .toEqual({ start: { tier: "balanced", dpr: 1.25 }, source: "gpu-class" });
  expect(startingQuality({ ...phone, remembered: null, gpuClass: "modest" }))
    .toEqual({ start: { tier: "low", dpr: 1 }, source: "gpu-class" });
  expect(startingQuality({ ...laptop, remembered: null, gpuClass: "capable" }))
    .toEqual({ start: { tier: "high", dpr: 1.5 }, source: "gpu-class" });
  // A capable GPU behind a touch-first or small screen keeps the handheld default.
  expect(startingQuality({ ...phone, remembered: null, gpuClass: "capable" })).toEqual({ start: null, source: "default" });
  // No memory and a masked renderer: exactly today's behaviour.
  expect(startingQuality({ ...laptop, remembered: null, gpuClass: null })).toEqual({ start: null, source: "default" });
});
