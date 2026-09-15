import { afterEach, expect, spyOn, test } from "bun:test";
import { _roots, createRoot } from "@react-three/fiber";
import type { WebGLRenderer } from "three";

const canvases: HTMLCanvasElement[] = [];
afterEach(() => { for (const canvas of canvases.splice(0)) _roots.delete(canvas); });

function createClockStore() {
  const canvas = {} as HTMLCanvasElement;
  canvases.push(canvas);
  createRoot(canvas);
  return _roots.get(canvas)!.store;
}

test("creating the real Fiber root does not construct deprecated THREE.Clock", () => {
  const warning = spyOn(console, "warn").mockImplementation(() => {});
  try {
    createClockStore();
    expect(warning.mock.calls.flat().join(" ")).not.toContain("THREE.Clock");
  } finally { warning.mockRestore(); }
});

test("Fiber timing preserves seconds, stop/start, and elapsed-time resets across frame modes", () => {
  let now = 1000;
  const time = spyOn(performance, "now").mockImplementation(() => now);
  try {
    const store = createClockStore();
    // No WebGL is needed to exercise the store's frame-mode timing contract.
    store.setState({ gl: { xr: { isPresenting: false } } as WebGLRenderer });
    const clock = store.getState().clock;
    expect(clock.getDelta()).toBe(0);
    now += 16;
    expect(clock.getDelta()).toBeCloseTo(.016);
    now += 24;
    expect(clock.getElapsedTime()).toBeCloseTo(.04);
    store.getState().setFrameloop("never");
    now += 30_000;
    expect(clock.getDelta()).toBe(0);
    expect(clock.elapsedTime).toBe(0);
    // Fiber's manual advance path writes the public elapsed-time accumulator.
    clock.elapsedTime = 12;
    expect(clock.getElapsedTime()).toBe(12);
    store.getState().setFrameloop("always");
    expect(clock.elapsedTime).toBe(0);
    now += 20;
    expect(clock.getDelta()).toBeCloseTo(.02);
    clock.stop();
    now += 10_000;
    expect(clock.getDelta()).toBe(0);
    clock.start();
    now += 10;
    expect(clock.getElapsedTime()).toBeCloseTo(.01);
  } finally { time.mockRestore(); }
});
