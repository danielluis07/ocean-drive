import { expect, test } from "bun:test";
import { createQualityController } from "@/lib/ocean-quality";

test("three slow active windows remove effects before lowering DPR", () => {
  const quality = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 3 });
  expect(quality.current()).toEqual({ tier: "balanced", dpr: 1.25, fallback: false });
  for (let frame = 0; frame < 200; frame++) quality.frame(30);
  expect(quality.current()).toEqual({ tier: "balanced", dpr: 1.25, fallback: false });
  for (let frame = 0; frame < 4; frame++) quality.frame(30);
  // The water goes plain, and stays exactly as sharp as it was.
  expect(quality.current()).toEqual({ tier: "low", dpr: 1.25, fallback: false });
});

test("quality needs ten active fast seconds to promote and ten seconds between changes", () => {
  const quality = createQualityController({ coarsePointer: true, smallScreen: true, deviceDpr: 4 });
  for (let frame = 0; frame < 999; frame++) quality.frame(10);
  expect(quality.current().tier).toBe("low");
  quality.frame(10);
  expect(quality.current()).toEqual({ tier: "balanced", dpr: 1.25, fallback: false });
  for (let frame = 0; frame < 204; frame++) quality.frame(30);
  expect(quality.current().tier).toBe("balanced");
  for (let frame = 0; frame < 136; frame++) quality.frame(30);
  expect(quality.current()).toEqual({ tier: "low", dpr: 1.25, fallback: false });
});

test("continued pressure drops effects one tier at a time, then steps Low's DPR down", () => {
  const quality = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 2 });
  for (let frame = 0; frame < 240; frame++) quality.frame(25);
  expect(quality.current()).toEqual({ tier: "low", dpr: 1.25, fallback: false });
  for (let frame = 0; frame < 400; frame++) quality.frame(25);
  expect(quality.current()).toEqual({ tier: "low", dpr: 1, fallback: false });
  for (let frame = 0; frame < 400; frame++) quality.frame(25);
  expect(quality.current()).toEqual({ tier: "low", dpr: 0.75, fallback: false });
  for (let frame = 0; frame < 1000; frame++) quality.frame(14);
  expect(quality.current()).toEqual({ tier: "low", dpr: 0.75, fallback: false });
});

test("interruptions discard loading, paused, reading, and hidden timing evidence", () => {
  const quality = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 2 });
  for (let frame = 0; frame < 134; frame++) quality.frame(30);
  quality.suspend();
  for (let frame = 0; frame < 134; frame++) quality.frame(30);
  expect(quality.current().dpr).toBe(1.25);
  quality.suspend();
  for (let frame = 0; frame < 800; frame++) quality.frame(10);
  quality.suspend();
  for (let frame = 0; frame < 800; frame++) quality.frame(10);
  expect(quality.current().tier).toBe("balanced");
});

test("reduced 3D blocks promotions but cannot block sustained Low fallback during cooldown", () => {
  const quality = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 2 });
  quality.choose("reduced-3d");
  for (let frame = 0; frame < 2000; frame++) quality.frame(10);
  expect(quality.current().tier).toBe("low");
  quality.choose("automatic");
  quality.choose("reduced-3d");
  for (let frame = 0; frame < 149; frame++) quality.frame(40);
  expect(quality.current().fallback).toBe(false);
  quality.frame(40);
  expect(quality.current().fallback).toBe(true);
});

test("p90 ignores isolated spikes, requires consecutive bad windows, and honors strict thresholds", () => {
  const quality = createQualityController({ coarsePointer: true, smallScreen: false, deviceDpr: 1 });
  for (let window = 0; window < 10; window++) {
    for (let frame = 0; frame < 96; frame++) quality.frame(20);
    quality.frame(80);
  }
  expect(quality.current()).toEqual({ tier: "low", dpr: 1, fallback: false });
  for (let frame = 0; frame < 100; frame++) quality.frame(40);
  for (let frame = 0; frame < 100; frame++) quality.frame(20);
  for (let frame = 0; frame < 100; frame++) quality.frame(40);
  expect(quality.current().fallback).toBe(false);
});

test("automatic can reach High, text freezes measurements, and quality never exceeds raw DPR", () => {
  const quality = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 3 });
  for (let frame = 0; frame < 1000; frame++) quality.frame(10);
  expect(quality.current()).toEqual({ tier: "high", dpr: 1.5, fallback: false });
  quality.choose("text");
  for (let frame = 0; frame < 1000; frame++) quality.frame(50);
  expect(quality.current()).toEqual({ tier: "high", dpr: 1.5, fallback: false });
  const standard = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 1 });
  for (let frame = 0; frame < 1000; frame++) standard.frame(10);
  expect(standard.current().dpr).toBe(1);
});

const REFRESH_60 = 1000 / 60;
const windows = (count: number, interval: number) => Math.ceil((count * 2000) / interval);

test("GPU time near the vsync budget sheds effects even while frames still hold vsync", () => {
  const quality = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 2 });
  for (let frame = 0; frame < windows(3, REFRESH_60) - 1; frame++) quality.frame(REFRESH_60, 16);
  expect(quality.current().tier).toBe("balanced");
  quality.frame(REFRESH_60, 16);
  expect(quality.current()).toEqual({ tier: "low", dpr: 1.25, fallback: false });
});

test("main-thread stalls do not downgrade when the GPU has headroom", () => {
  const timed = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 2 });
  const untimed = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 2 });
  for (let frame = 0; frame < 2000; frame++) {
    timed.frame(30, 12);
    untimed.frame(30);
  }
  expect(timed.current()).toEqual({ tier: "balanced", dpr: 1.25, fallback: false });
  expect(untimed.current().tier).toBe("low");
});

test("GPU headroom promotes on a 60 Hz display, where frame intervals never can", () => {
  const timed = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 2 });
  const untimed = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 2 });
  for (let frame = 0; frame < windows(5, REFRESH_60); frame++) {
    timed.frame(REFRESH_60, 8);
    untimed.frame(REFRESH_60);
  }
  expect(timed.current()).toEqual({ tier: "high", dpr: 1.5, fallback: false });
  expect(untimed.current()).toEqual({ tier: "balanced", dpr: 1.25, fallback: false });
  // Between headroom and pressure, the GPU earns no change either way.
  const steady = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 2 });
  for (let frame = 0; frame < 3000; frame++) steady.frame(REFRESH_60, 12);
  expect(steady.current()).toEqual({ tier: "balanced", dpr: 1.25, fallback: false });
});

test("on fast displays the GPU budget is the most vsyncs that fit 20 ms", () => {
  const refresh = 1000 / 144;
  const easy = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 2 });
  const pressed = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 2 });
  for (let frame = 0; frame < windows(4, refresh); frame++) {
    // Two 144 Hz frames are 13.9 ms, so 12 ms keeps E2 and 13 ms is about to miss it.
    easy.frame(refresh, 12);
    pressed.frame(refresh, 13);
  }
  expect(easy.current().tier).toBe("balanced");
  expect(pressed.current().tier).toBe("low");
});

test("windows with too few GPU samples fall back to frame intervals", () => {
  const quality = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 2 });
  for (let frame = 0; frame < 240; frame++) quality.frame(25, frame % 3 === 0 ? 4 : null);
  expect(quality.current()).toEqual({ tier: "low", dpr: 1.25, fallback: false });
});

test("without GPU timing every decision matches the frame-interval path", () => {
  const plain = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 2 });
  const absent = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 2 });
  let seed = 7;
  for (let frame = 0; frame < 20_000; frame++) {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    const phase = Math.floor(frame / 1500) % 3;
    const interval = [9, 17, 28][phase] + (seed % 1000) / 200;
    expect(absent.frame(interval, null)).toEqual(plain.frame(interval));
  }
});

test("sustained Low jank still opens text even when the GPU looks idle", () => {
  const quality = createQualityController({ coarsePointer: true, smallScreen: false, deviceDpr: 1 });
  for (let frame = 0; frame < 150; frame++) quality.frame(40, 3);
  expect(quality.current().fallback).toBe(true);
});
