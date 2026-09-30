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
  for (let frame = 0; frame < 1000; frame++) quality.frame(20);
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

test("the laptop safety net sheds wake work before a missed-vsync window and restores it at 60 Hz", () => {
  const quality = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 1.25, maxTier: "balanced", preserveTier: true });
  quality.frame(REFRESH_60, 13);
  expect(quality.current()).toEqual({ tier: "balanced", dpr: 1.25, fallback: false });
  quality.frame(REFRESH_60, 13);
  expect(quality.current()).toEqual({ tier: "balanced", dpr: 1.25, fallback: false, wakeSamples: 2 });
  for (let frame = 0; frame < 800; frame++) quality.frame(REFRESH_60, 8);
  expect(quality.current()).toEqual({ tier: "balanced", dpr: 1.25, fallback: false });
});

test("untimed laptop pressure sheds wake, then DPR, then tier if even those cannot hold", () => {
  const quality = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 1.25, maxTier: "balanced", preserveTier: true });
  quality.frame(25);
  quality.frame(25);
  expect(quality.current().wakeSamples).toBe(2);
  quality.frame(25);
  quality.frame(25);
  expect(quality.current()).toEqual({ tier: "balanced", dpr: 1, fallback: false, wakeSamples: 2 });
  for (let frame = 0; frame < 500; frame++) quality.frame(25);
  expect(quality.current().tier).toBe("low");
});

test("laptop safety steps reserve compositing time before a slow window accumulates", () => {
  const quality = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 1.25, maxTier: "balanced", preserveTier: true });
  // This 11 ms render fits the old 15 ms slow-window threshold, but leaves
  // too little room for compositing on the reference integrated laptop.
  quality.frame(REFRESH_60, 11);
  quality.frame(REFRESH_60, 11);
  expect(quality.current().wakeSamples).toBe(2);
  quality.frame(REFRESH_60, 11);
  quality.frame(REFRESH_60, 11);
  expect(quality.current()).toEqual({ tier: "balanced", dpr: 1, fallback: false, wakeSamples: 2 });
});

test("missed laptop frames can shed compositing pixels even with cheap timed ocean draws", () => {
  const quality = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 1.25, maxTier: "balanced", preserveTier: true });
  for (let frame = 0; frame < 4; frame++) quality.frame(25, 8);
  expect(quality.current()).toEqual({ tier: "balanced", dpr: 1, fallback: false, wakeSamples: 2 });
});

test("isolated GPU stalls and suspensions cannot accumulate laptop safety-net pressure", () => {
  const quality = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 1.25, maxTier: "balanced", preserveTier: true });
  quality.frame(REFRESH_60, 30);
  quality.frame(REFRESH_60, 8);
  quality.frame(REFRESH_60, 30);
  quality.suspend();
  quality.frame(REFRESH_60, 30);
  expect(quality.current().wakeSamples).toBeUndefined();
});

test("untimed laptop resolution recovery requires a full minute of stable cadence", () => {
  const quality = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 1.25, maxTier: "balanced", preserveTier: true });
  for (let frame = 0; frame < 4; frame++) quality.frame(25);
  expect(quality.current()).toEqual({ tier: "balanced", dpr: 1, fallback: false, wakeSamples: 2 });
  // Vsync at a reduced resolution does not measure reserve for more pixels.
  // Restore wake detail first, then require sustained stability before a trial.
  for (let frame = 0; frame < 1800; frame++) quality.frame(REFRESH_60);
  expect(quality.current()).toEqual({ tier: "balanced", dpr: 1, fallback: false });
  for (let frame = 0; frame < 3600; frame++) quality.frame(REFRESH_60);
  expect(quality.current()).toEqual({ tier: "balanced", dpr: 1.25, fallback: false });
});

test("timed laptop DPR recovery must have headroom for the larger drawing buffer", () => {
  const quality = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 1.25, maxTier: "balanced", preserveTier: true });
  for (let frame = 0; frame < 4; frame++) quality.frame(REFRESH_60, 16);
  expect(quality.current().dpr).toBe(1);
  for (let frame = 0; frame < 1800; frame++) quality.frame(REFRESH_60, 8);
  expect(quality.current()).toEqual({ tier: "balanced", dpr: 1, fallback: false });
  for (let frame = 0; frame < 800; frame++) quality.frame(REFRESH_60, 5);
  expect(quality.current()).toEqual({ tier: "balanced", dpr: 1.25, fallback: false });
});

test("the integrated-laptop ceiling preserves Balanced through settled headroom and recovery", () => {
  expect(createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 2, maxTier: "balanced", start: { tier: "high", dpr: 1.5 } }).current()).toEqual({ tier: "balanced", dpr: 1.25, fallback: false });
  const quality = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 1.25, maxTier: "balanced" });
  for (let frame = 0; frame < 60; frame++) quality.benchmark(REFRESH_60, 3);
  expect(quality.concludeBenchmark().tier).toBe("balanced");
  // Five minutes of cheap frames cannot promote into expensive High water.
  for (let frame = 0; frame < 18_001; frame++) quality.frame(REFRESH_60, 8);
  expect(quality.current().tier).toBe("balanced");
  // A GPU that cannot sustain even settled Balanced can still step down.
  for (let frame = 0; frame < 420; frame++) quality.frame(REFRESH_60, 17);
  expect(quality.current().tier).toBe("low");
  for (let frame = 0; frame < 1800; frame++) quality.frame(REFRESH_60, 8);
  expect(quality.current().tier).toBe("balanced");
  const untimed = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 1.25, maxTier: "balanced" });
  for (let frame = 0; frame < 18_001; frame++) untimed.frame(REFRESH_60);
  expect(untimed.current().tier).toBe("balanced");
});
const windows = (count: number, interval: number) => Math.ceil((count * 2000) / interval);

for (const hz of [60, 120, 144]) {
  test(`${hz} Hz vsync recovers the previous tier and DPR after sustained pressure`, () => {
    const quality = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 1.25 });
    const refresh = 1000 / hz;
    for (let frame = 0; frame < windows(2, refresh); frame++) quality.frame(refresh);
    quality.suspend();
    for (let frame = 0; frame < 1120; frame++) quality.frame(25);
    expect(quality.current()).toEqual({ tier: "low", dpr: 0.75, fallback: false });
    quality.suspend();
    // Two promotions restore Low's DPR, then Balanced; allow window rounding.
    for (let frame = 0; frame < windows(13, refresh); frame++) quality.frame(refresh);
    expect(quality.current()).toEqual({ tier: "balanced", dpr: 1.25, fallback: false });
  });

  test(`${hz} Hz missed vsyncs do not earn promotions or oscillate tiers`, () => {
    const quality = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 1.25 });
    const refresh = 1000 / hz;
    for (let frame = 0; frame < windows(2, refresh); frame++) quality.frame(refresh);
    quality.suspend();
    for (let frame = 0; frame < 320; frame++) quality.frame(25);
    expect(quality.current().tier).toBe("low");
    // Alternate one and two vsyncs: under 20 ms on fast displays, but no headroom.
    for (let frame = 0; frame < Math.ceil(300_000 / refresh); frame++) {
      expect(quality.frame(refresh * (frame % 2 + 1)).tier).toBe("low");
    }
  });
}

test("60 Hz recovery tolerates vsync jitter and isolated stalls", () => {
  const quality = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 1.25 });
  for (let frame = 0; frame < 178; frame++) quality.frame(45);
  expect(quality.current().tier).toBe("low");
  quality.suspend();
  for (let frame = 0; frame < 700; frame++) quality.frame(frame % 50 === 0 ? 40 : frame % 2 === 0 ? 16.5 : 17.5);
  expect(quality.current()).toEqual({ tier: "balanced", dpr: 1.25, fallback: false });
});

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

test("GPU budgets use sustained display cadence rather than early callbacks in a jittery window", () => {
  const quality = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 1.25 });
  // Paired early/late callbacks preserve 60 Hz on average and at the median.
  // A p10-based estimate mistakes the 10.5 ms callbacks for a 95 Hz display,
  // snaps its budget down to 10.5 ms, and falsely demotes a 13.5 ms GPU render.
  for (let frame = 0; frame < 1800; frame++) {
    const phase = frame % 7;
    quality.frame(phase === 0 ? 10.5 : phase === 1 ? 2 * REFRESH_60 - 10.5 : REFRESH_60, 13.5);
  }
  expect(quality.current().tier).toBe("balanced");
});

test("GPU timing decides headroom when available, even at steady 60 Hz vsync", () => {
  const timed = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 2 });
  const untimed = createQualityController({ coarsePointer: false, smallScreen: false, deviceDpr: 2 });
  for (let frame = 0; frame < windows(5, REFRESH_60); frame++) {
    timed.frame(REFRESH_60, 8);
    untimed.frame(REFRESH_60);
  }
  expect(timed.current()).toEqual({ tier: "high", dpr: 1.5, fallback: false });
  expect(untimed.current()).toEqual({ tier: "high", dpr: 1.5, fallback: false });
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

const desktop = { coarsePointer: false, smallScreen: false };
const warmUp = (quality: ReturnType<typeof createQualityController>, gpu: number | null, frames = 60, interval = REFRESH_60) => {
  for (let frame = 0; frame < frames; frame++) quality.benchmark(interval, gpu);
  return quality.concludeBenchmark();
};

test("warm-up callback jitter cannot downgrade a GPU that fits Balanced at 60 Hz", () => {
  const quality = createQualityController({ ...desktop, deviceDpr: 1.25 });
  for (let frame = 0; frame < 60; frame++) {
    const phase = frame % 7;
    quality.benchmark(phase === 0 ? 10.5 : phase === 1 ? 2 * REFRESH_60 - 10.5 : REFRESH_60, 13.5);
  }
  expect(quality.concludeBenchmark().tier).toBe("balanced");
});

test("a starting quality replaces the device defaults, still capped at raw DPR", () => {
  expect(createQualityController({ ...desktop, deviceDpr: 2, start: { tier: "low", dpr: 1.25 } }).current())
    .toEqual({ tier: "low", dpr: 1.25, fallback: false });
  expect(createQualityController({ ...desktop, deviceDpr: 1, start: { tier: "high", dpr: 1.5 } }).current())
    .toEqual({ tier: "high", dpr: 1, fallback: false });
  expect(createQualityController({ ...desktop, deviceDpr: 2, start: null }).current())
    .toEqual({ tier: "balanced", dpr: 1.25, fallback: false });
});

test("the warm-up keeps a GPU on the tier its passages can hold", () => {
  // A GPU unable to hold Balanced keeps Low effects at the current sharpness.
  const vega = createQualityController({ ...desktop, deviceDpr: 1.25, start: { tier: "low", dpr: 1.25 } });
  expect(warmUp(vega, 8)).toEqual({ tier: "low", dpr: 1.25, fallback: false });
  // Once passages get cheap enough, the same device can start on Balanced.
  const cheaper = createQualityController({ ...desktop, deviceDpr: 1.25, start: { tier: "low", dpr: 1.25 } });
  expect(warmUp(cheaper, 4)).toEqual({ tier: "balanced", dpr: 1.25, fallback: false });
});

test("the warm-up starts a capable desktop on High without ten seconds of fast frames", () => {
  const quality = createQualityController({ ...desktop, deviceDpr: 2 });
  expect(warmUp(quality, 3)).toEqual({ tier: "high", dpr: 1.5, fallback: false });
  // Between the fit and the pressure line, the warm-up keeps what it has.
  expect(warmUp(createQualityController({ ...desktop, deviceDpr: 2 }), 7)).toEqual({ tier: "balanced", dpr: 1.25, fallback: false });
});

test("a passage over budget in the warm-up drops effects before the Visitor sails, keeping sharpness", () => {
  const quality = createQualityController({ ...desktop, deviceDpr: 2, start: { tier: "high", dpr: 1.5 } });
  expect(warmUp(quality, 26)).toEqual({ tier: "low", dpr: 1.5, fallback: false });
  const nearly = createQualityController({ ...desktop, deviceDpr: 2, start: { tier: "high", dpr: 1.5 } });
  expect(warmUp(nearly, 17)).toEqual({ tier: "balanced", dpr: 1.5, fallback: false });
});

test("without GPU timing, too few samples, or automatic quality, the warm-up changes nothing", () => {
  expect(warmUp(createQualityController({ ...desktop, deviceDpr: 2 }), null, 60, 40).tier).toBe("balanced");
  expect(warmUp(createQualityController({ ...desktop, deviceDpr: 2 }), 3, 19).tier).toBe("balanced");
  const reduced = createQualityController({ ...desktop, deviceDpr: 2 });
  reduced.choose("reduced-3d");
  expect(warmUp(reduced, 1).tier).toBe("low");
});

test("warm-up frames never count as live windows, and its move starts no cooldown", () => {
  const quality = createQualityController({ ...desktop, deviceDpr: 2 });
  for (let frame = 0; frame < 400; frame++) quality.benchmark(30, null);
  expect(quality.concludeBenchmark().tier).toBe("balanced");
  expect(warmUp(quality, 3).tier).toBe("high");
  // A wrong guess is corrected after three slow windows, not after ten seconds.
  for (let frame = 0; frame < windows(3, 25); frame++) quality.frame(25);
  expect(quality.current()).toEqual({ tier: "balanced", dpr: 1.5, fallback: false });
});

test("a tier counts as settled after fifteen active seconds without an automatic change", () => {
  const quality = createQualityController({ ...desktop, deviceDpr: 2 });
  for (let frame = 0; frame < 899; frame++) quality.frame(REFRESH_60, 12);
  expect(quality.settled()).toBe(false);
  for (let frame = 0; frame < 2; frame++) quality.frame(REFRESH_60, 12);
  expect(quality.settled()).toBe(true);
  // The first slow window still carries the fast GPU-timed frames before it.
  for (let frame = 0; frame < windows(4, 25); frame++) quality.frame(25);
  expect(quality.current().tier).toBe("low");
  expect(quality.settled()).toBe(false);
  quality.choose("reduced-3d");
  for (let frame = 0; frame < 2000; frame++) quality.frame(REFRESH_60, 12);
  expect(quality.settled()).toBe(false);
});

test("sustained Low jank still opens text even when the GPU looks idle", () => {
  const quality = createQualityController({ coarsePointer: true, smallScreen: false, deviceDpr: 1 });
  for (let frame = 0; frame < 150; frame++) quality.frame(40, 3);
  expect(quality.current().fallback).toBe(true);
});
