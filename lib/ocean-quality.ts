import type { VoyageQualityPreference } from "@/lib/voyage-state";

export type QualityTier = "high" | "balanced" | "low";
export type OceanQuality = { tier: QualityTier; dpr: number; fallback: boolean; wakeSamples?: 2 };
export type StartingQuality = { tier: QualityTier; dpr: number };
export const qualityEnvelope = {
  // `wakePoints` is how much of the Ship's remembered trail the water shader reads.
  // `wakeTexels` is the wake field's resolution (lib/wake-field.ts); Low has no
  // field and walks its short trail directly.
  high: { minDpr: 1.25, maxDpr: 1.5, segments: 160, wake: 2, wakePoints: 48, wakeTexels: 512 },
  balanced: { minDpr: 1, maxDpr: 1.25, segments: 120, wake: 1, wakePoints: 32, wakeTexels: 448 },
  low: { minDpr: 0.75, maxDpr: 1, segments: 48, wake: 0.8, wakePoints: 8, wakeTexels: 0 },
} as const;

// The rungs the plainest water steps down, once there is no effect left to shed.
const dprLadder = [qualityEnvelope.balanced.maxDpr, qualityEnvelope.low.maxDpr, qualityEnvelope.low.minDpr];

// The p90 frame interval a tier must hold (acceptance criterion E2).
const FRAME_BUDGET_MS = 20;
// Passage pressure above Low's usable frame budget is too severe to protect.
const SEVERE_FRAME_MS = 33.3;
// A window trusts GPU time once at least this share of its frames were timed.
const GPU_COVERAGE = 0.5;
// GPU time this close to the budget is about to miss frames, so effects go before they do.
const GPU_PRESSURE = 0.9;
// Below this share of the refresh interval, the GPU has room for more.
const GPU_HEADROOM = 0.6;
// Without timer queries, steady vsync proves cadence, not GPU reserve. A laptop
// must hold it for a minute before trying more pixels or a more expensive tier.
const UNTIMED_LAPTOP_RECOVERY_MS = 60_000;
// One final 10% resolution step reserves room for the compositor before a
// laptop loses its reference tier, even at that tier's ordinary DPR floor.
const LAPTOP_DPR_RESERVE = 0.9;
// A tier the warm-up predicts at or under this share of the budget may be chosen.
const BENCHMARK_FIT = 0.75;
// The fewest GPU-timed frames a warm-up needs before it may decide anything.
const BENCHMARK_SAMPLES = 20;
// How each tier's water costs per pixel relative to Low, with a full wake. A
// conservative prior for predicting tiers the warm-up did not render; the
// measured tier's own time is always used as measured.
const tierCost: Record<QualityTier, number> = { low: 1, balanced: 2.5, high: 3.75 };
const tierOrder: QualityTier[] = ["low", "balanced", "high"];
// Active time without an automatic change after which the tier counts as settled.
const SETTLED_MS = 15_000;
// Allow ordinary vsync jitter without counting a missed refresh as headroom.
const REFRESH_TOLERANCE = 1.1;

const percentile = (values: number[], rank: number) => {
  values.sort((a, b) => a - b);
  return values[Math.ceil(values.length * rank) - 1];
};

// Frames can only be shown on a vsync, so the budget is the longest whole
// number of refresh intervals that still fits E2's 20 ms. The median avoids
// mistaking paired early/late callbacks for a faster display. Displays slower
// than 60 Hz are read as 60 Hz,
// which only tightens the budget.
function frameBudget(intervals: number[]) {
  const refresh = Math.min(Math.max(percentile(intervals, 0.5), 1000 / 240), 1000 / 60);
  return { refresh, budget: Math.max(1, Math.floor(FRAME_BUDGET_MS / refresh)) * refresh };
}

function gpuVerdict(gpu: number[], refresh: number) {
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
// `start`, when given, is where this device is expected to settle (see
// lib/starting-tier.ts); without it, coarse pointers and small screens start on
// Low and everything else on Balanced.
export function createQualityController(hints: {
  coarsePointer: boolean;
  smallScreen: boolean;
  deviceDpr: number;
  start?: StartingQuality | null;
  // Modest laptops sustain the reference Balanced look. Settled headroom must
  // not promote them to High and spend the reserve their next passage needs.
  maxTier?: QualityTier;
  // Laptop safety net: shed wake work and resolution before the reference tier.
  preserveTier?: boolean;
}) {
  const rawDpr = Number.isFinite(hints.deviceDpr) && hints.deviceDpr > 0 ? hints.deviceDpr : 1;
  const maximumRank = tierOrder.indexOf(hints.maxTier ?? "high");
  let tier: QualityTier = hints.start?.tier ?? (hints.coarsePointer || hints.smallScreen ? "low" : "balanced");
  const aboveCeiling = tierOrder.indexOf(tier) > maximumRank;
  if (tierOrder.indexOf(tier) > maximumRank) tier = tierOrder[maximumRank];
  let dpr = Math.min(rawDpr, hints.start?.dpr ?? qualityEnvelope[tier].maxDpr, aboveCeiling ? qualityEnvelope[tier].maxDpr : Infinity);
  let preference: VoyageQualityPreference = "automatic";
  let wakeSamples: 2 | 4 = 4;
  let pressureFrames = 0;
  let fallback = false;
  let activeMs = 0;
  let lastChange = -Infinity;
  let samples: number[] = [];
  let gpuSamples: number[] = [];
  let windowMs = 0;
  let windowHasWake = false;
  let slowWindows = 0;
  let unusableWindows = 0;
  let fastMs = 0;
  // Keep the fastest window median across pauses and changes. Slower rendering
  // must not teach the controller that missed vsyncs are the display's cadence.
  // Without an observed cadence, assume no slower than a 60 Hz display.
  let refreshMs = 1000 / 60;
  let benchmarkSamples: number[] = [];
  let benchmarkGpu: number[] = [];
  const current = (): OceanQuality => ({ tier, dpr, fallback, ...(wakeSamples === 2 ? { wakeSamples } : {}) });
  const suspend = () => {
    samples = [];
    gpuSamples = [];
    benchmarkSamples = [];
    benchmarkGpu = [];
    windowMs = slowWindows = unusableWindows = fastMs = 0;
    windowHasWake = false;
    pressureFrames = 0;
  };
  const change = (nextTier: QualityTier, nextDpr: number, nextWakeSamples: 2 | 4 = wakeSamples) => {
    wakeSamples = nextTier === tier ? nextWakeSamples : 4;
    tier = nextTier;
    dpr = Math.min(rawDpr, nextDpr);
    lastChange = activeMs;
    suspend();
  };
  const shedLaptopResolution = () => {
    const floor = qualityEnvelope[tier].minDpr;
    const next = [floor, floor * LAPTOP_DPR_RESERVE].find((rung) => Math.min(rawDpr, rung) < dpr);
    if (next === undefined) return false;
    change(tier, next);
    return true;
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
    // True once the tier has held for a while without an automatic change: what
    // this device settles on, and worth starting from next time.
    settled() {
      return !fallback && preference === "automatic" && activeMs - Math.max(lastChange, 0) >= SETTLED_MS;
    },
    // Records one warm-up frame, rendered with the heaviest wake while the Approach
    // still covers the ocean. Warm-up frames never enter the live windows.
    benchmark(milliseconds: number, gpuMilliseconds: number | null) {
      if (fallback || !Number.isFinite(milliseconds) || milliseconds <= 0) return;
      benchmarkSamples.push(milliseconds);
      if (gpuMilliseconds !== null && Number.isFinite(gpuMilliseconds) && gpuMilliseconds >= 0) benchmarkGpu.push(gpuMilliseconds);
    },
    // Moves to the highest tier the warm-up predicts will hold a passage within
    // budget, with headroom. Only GPU time tells how close to the budget the ocean
    // is, so without it the warm-up keeps the starting tier. The move starts no
    // cooldown: live measurement may correct it straight away.
    concludeBenchmark() {
      const intervals = benchmarkSamples;
      const gpu = benchmarkGpu;
      suspend();
      if (fallback || preference !== "automatic") return current();
      if (gpu.length < BENCHMARK_SAMPLES || gpu.length < intervals.length * GPU_COVERAGE) return current();
      const { budget } = frameBudget(intervals);
      const measured = percentile(gpu, 0.9);
      const rank = tierOrder.indexOf(tier);
      // Promotion takes the next tier's sharpness; demotion keeps the current one.
      const dprFor = (candidate: QualityTier) =>
        tierOrder.indexOf(candidate) > rank ? Math.min(rawDpr, qualityEnvelope[candidate].maxDpr) : dpr;
      const predicted = (candidate: QualityTier) =>
        measured * (tierCost[candidate] / tierCost[tier]) * (dprFor(candidate) / dpr) ** 2;
      const pressed = measured > budget * GPU_PRESSURE;
      // Highest first: under pressure only lower tiers, otherwise only higher ones.
      const candidates = tierOrder.filter((_, index) => index <= maximumRank && (pressed ? index < rank : index > rank)).reverse();
      const chosen = candidates.find((candidate) => predicted(candidate) <= budget * BENCHMARK_FIT)
        ?? (pressed && rank > 0 ? "low" : null);
      if (chosen) {
        dpr = dprFor(chosen);
        tier = chosen;
      }
      return current();
    },
    // `gpuMilliseconds` is a GPU render time that finished this frame, if any; it
    // may belong to a frame a few intervals back.
    // `wakeActive` describes the rendered trail, including decay after arrival.
    frame(milliseconds: number, gpuMilliseconds: number | null = null, wakeActive = false) {
      if (fallback || preference === "text" || !Number.isFinite(milliseconds) || milliseconds <= 0) return current();
      activeMs += milliseconds;
      if (hints.preserveTier && tier !== "low" && preference === "automatic") {
        // Reserve the same GPU margin needed for recovery, including the
        // compositor. Missed intervals also reveal queue/compositing pressure
        // that a cheap ocean timer cannot see. Downward safety steps need only
        // two consecutive frames; tier changes and recovery keep the cooldown.
        const timed = gpuMilliseconds !== null && Number.isFinite(gpuMilliseconds) && gpuMilliseconds >= 0;
        pressureFrames = (milliseconds > FRAME_BUDGET_MS || (timed && gpuMilliseconds > refreshMs * GPU_HEADROOM)) ? pressureFrames + 1 : 0;
        if (pressureFrames >= 2) {
          if (wakeSamples === 4) { change(tier, dpr, 2); return current(); }
          if (shedLaptopResolution()) return current();
        }
      }
      windowMs += milliseconds;
      windowHasWake ||= wakeActive;
      samples.push(milliseconds);
      if (gpuMilliseconds !== null && Number.isFinite(gpuMilliseconds) && gpuMilliseconds >= 0) gpuSamples.push(gpuMilliseconds);
      if (windowMs < 2000) return current();
      refreshMs = Math.min(refreshMs, Math.max(percentile(samples, 0.5), 1000 / 240));
      const gpu = gpuSamples.length >= samples.length * GPU_COVERAGE ? gpuVerdict(gpuSamples, refreshMs) : null;
      const p90 = percentile(samples, 0.9);
      // Live passage wake is temporary load, including its decay after arrival.
      // Keep the cheaper safety steps, but judge moderate tier pressure only
      // once that water has expired. Severe stalls can still demote immediately
      // after the normal sustained-window threshold and cooldown.
      const passagePressure = hints.preserveTier && tier !== "low" && windowHasWake && p90 <= SEVERE_FRAME_MS;
      slowWindows = (gpu ? gpu.slow : p90 > FRAME_BUDGET_MS) && !passagePressure ? slowWindows + 1 : 0;
      // Unusable is about what the Visitor sees, so it stays on frame intervals.
      unusableWindows = tier === "low" && p90 > SEVERE_FRAME_MS ? unusableWindows + 1 : 0;
      const recoveringDpr = wakeSamples === 4 && dpr < Math.min(rawDpr, qualityEnvelope[tier].maxDpr);
      const recoveryDpr = Math.min(rawDpr, hints.preserveTier && dpr < qualityEnvelope[tier].minDpr
        ? qualityEnvelope[tier].minDpr : qualityEnvelope[tier].maxDpr);
      // Estimate the cost at the proposed resolution before raising it. Merely
      // holding vsync with a smaller buffer does not justify a 56% pixel increase.
      const dprHeadroom = !hints.preserveTier || !recoveringDpr || !gpu
        || percentile(gpuSamples, 0.9) * (recoveryDpr / dpr) ** 2 < refreshMs * GPU_HEADROOM;
      fastMs = (gpu ? gpu.fast && dprHeadroom : p90 <= refreshMs * REFRESH_TOLERANCE) ? fastMs + windowMs : 0;
      const recoveryMs = hints.preserveTier && !gpu && wakeSamples === 4
        ? UNTIMED_LAPTOP_RECOVERY_MS : 10_000;
      windowMs = 0;
      windowHasWake = false;
      samples = [];
      gpuSamples = [];
      if (unusableWindows >= 3) {
        fallback = true;
        return current();
      }
      if (activeMs - lastChange < 10_000) return current();
      if (slowWindows >= 3) {
        if (hints.preserveTier && tier !== "low") {
          if (wakeSamples === 4) { change(tier, dpr, 2); return current(); }
          if (shedLaptopResolution()) return current();
        }
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
      } else if (fastMs >= recoveryMs && preference === "automatic") {
        if (wakeSamples === 2) change(tier, dpr, 4);
        else if (recoveringDpr) change(tier, recoveryDpr);
        else if (tierOrder.indexOf(tier) < maximumRank) {
          const nextTier = tier === "low" ? "balanced" : "high";
          change(nextTier, qualityEnvelope[nextTier].maxDpr);
        }
      }
      return current();
    },
  };
}
