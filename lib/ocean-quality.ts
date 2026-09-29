import type { VoyageQualityPreference } from "@/lib/voyage-state";

export type QualityTier = "high" | "balanced" | "low";
export type OceanQuality = { tier: QualityTier; dpr: number; fallback: boolean };
export const qualityEnvelope = {
  // `wakePoints` is how much of the Ship's remembered trail the water shader reads.
  high: { minDpr: 1.25, maxDpr: 1.5, segments: 160, wake: 2, wakePoints: 48 },
  balanced: { minDpr: 1, maxDpr: 1.25, segments: 120, wake: 1, wakePoints: 32 },
  low: { minDpr: 0.75, maxDpr: 1, segments: 48, wake: 0.8, wakePoints: 8 },
} as const;

// The rungs the plainest water steps down, once there is no effect left to shed.
const dprLadder = [qualityEnvelope.balanced.maxDpr, qualityEnvelope.low.maxDpr, qualityEnvelope.low.minDpr];

// The p90 frame interval a tier must hold (acceptance criterion E2).
const FRAME_BUDGET_MS = 20;
// A window trusts GPU time once at least this share of its frames were timed.
const GPU_COVERAGE = 0.5;
// GPU time this close to the budget is about to miss frames, so effects go before they do.
const GPU_PRESSURE = 0.9;
// Below this share of the refresh interval, the GPU has room for more.
const GPU_HEADROOM = 0.6;

const percentile = (values: number[], rank: number) => {
  values.sort((a, b) => a - b);
  return values[Math.ceil(values.length * rank) - 1];
};

// Frames can only be shown on a vsync, so the budget is the longest whole
// number of refresh intervals that still fits E2's 20 ms. The fastest frames
// approximate the refresh interval; displays slower than 60 Hz are read as 60 Hz,
// which only tightens the budget.
function gpuVerdict(intervals: number[], gpu: number[]) {
  const refresh = Math.min(Math.max(percentile(intervals, 0.1), 1000 / 240), 1000 / 60);
  const budget = Math.max(1, Math.floor(FRAME_BUDGET_MS / refresh)) * refresh;
  const p90 = percentile(gpu, 0.9);
  return { slow: p90 > budget * GPU_PRESSURE, fast: p90 < refresh * GPU_HEADROOM };
}

// This clock receives measured frame intervals only while the 3D voyage is visible and not being read.
// Suspending discards partial windows and consecutive evidence, not cooldown time.
// When the browser can time the ocean's render on the GPU, that time decides
// downgrades and promotions: frame intervals alone cannot tell an idle GPU waiting
// on vsync from one barely making it, and they also carry main-thread stalls the
// ocean did not cause. Without GPU timing, frame intervals decide as before.
export function createQualityController(hints: { coarsePointer: boolean; smallScreen: boolean; deviceDpr: number }) {
  const rawDpr = Number.isFinite(hints.deviceDpr) && hints.deviceDpr > 0 ? hints.deviceDpr : 1;
  let tier: QualityTier = hints.coarsePointer || hints.smallScreen ? "low" : "balanced";
  let dpr = Math.min(rawDpr, qualityEnvelope[tier].maxDpr);
  let preference: VoyageQualityPreference = "automatic";
  let fallback = false;
  let activeMs = 0;
  let lastChange = -Infinity;
  let samples: number[] = [];
  let gpuSamples: number[] = [];
  let windowMs = 0;
  let slowWindows = 0;
  let unusableWindows = 0;
  let fastMs = 0;
  const current = (): OceanQuality => ({ tier, dpr, fallback });
  const suspend = () => {
    samples = [];
    gpuSamples = [];
    windowMs = slowWindows = unusableWindows = fastMs = 0;
  };
  const change = (nextTier: QualityTier, nextDpr: number) => {
    tier = nextTier;
    dpr = Math.min(rawDpr, nextDpr);
    lastChange = activeMs;
    suspend();
  };
  return {
    current,
    suspend,
    choose(next: VoyageQualityPreference) {
      if (preference === next) return current();
      preference = next;
      suspend();
      if (next === "reduced-3d") change("low", qualityEnvelope.low.maxDpr);
      return current();
    },
    // `gpuMilliseconds` is a GPU render time that finished this frame, if any; it
    // may belong to a frame a few intervals back.
    frame(milliseconds: number, gpuMilliseconds: number | null = null) {
      if (fallback || preference === "text" || !Number.isFinite(milliseconds) || milliseconds <= 0) return current();
      activeMs += milliseconds;
      windowMs += milliseconds;
      samples.push(milliseconds);
      if (gpuMilliseconds !== null && Number.isFinite(gpuMilliseconds) && gpuMilliseconds >= 0) gpuSamples.push(gpuMilliseconds);
      if (windowMs < 2000) return current();
      const gpu = gpuSamples.length >= samples.length * GPU_COVERAGE ? gpuVerdict(samples, gpuSamples) : null;
      const p90 = percentile(samples, 0.9);
      slowWindows = (gpu ? gpu.slow : p90 > FRAME_BUDGET_MS) ? slowWindows + 1 : 0;
      // Unusable is about what the Visitor sees, so it stays on frame intervals.
      unusableWindows = tier === "low" && p90 > 33.3 ? unusableWindows + 1 : 0;
      fastMs = (gpu ? gpu.fast : p90 < 14) ? fastMs + windowMs : 0;
      windowMs = 0;
      samples = [];
      gpuSamples = [];
      if (unusableWindows >= 3) {
        fallback = true;
        return current();
      }
      if (activeMs - lastChange < 10_000) return current();
      if (slowWindows >= 3) {
        // Resolution is the last thing the ocean gives up: under pressure it
        // drops effects a tier at a time, keeping the sharpness it has, and only
        // steps DPR down once the water is as plain as it gets. A blurred ocean
        // is more conspicuous than a calmer one, and a long passage keeps the
        // wake shader busy from Stop to Stop.
        if (tier !== "low") change(tier === "high" ? "balanced" : "low", dpr);
        else {
          const step = dprLadder.find((rung) => rung < dpr);
          if (step !== undefined) change(tier, step);
        }
      } else if (fastMs >= 10_000 && preference === "automatic") {
        if (dpr < Math.min(rawDpr, qualityEnvelope[tier].maxDpr)) change(tier, qualityEnvelope[tier].maxDpr);
        else if (tier !== "high") {
          const nextTier = tier === "low" ? "balanced" : "high";
          change(nextTier, qualityEnvelope[nextTier].maxDpr);
        }
      }
      return current();
    },
  };
}
