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
