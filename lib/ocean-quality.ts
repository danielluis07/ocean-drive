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

// This clock receives measured frame intervals only while the 3D voyage is visible and not being read.
// Suspending discards partial windows and consecutive evidence, not cooldown time.
export function createQualityController(hints: { coarsePointer: boolean; smallScreen: boolean; deviceDpr: number }) {
  const rawDpr = Number.isFinite(hints.deviceDpr) && hints.deviceDpr > 0 ? hints.deviceDpr : 1;
  let tier: QualityTier = hints.coarsePointer || hints.smallScreen ? "low" : "balanced";
  let dpr = Math.min(rawDpr, qualityEnvelope[tier].maxDpr);
  let preference: VoyageQualityPreference = "automatic";
  let fallback = false;
  let activeMs = 0;
  let lastChange = -Infinity;
  let samples: number[] = [];
  let windowMs = 0;
  let slowWindows = 0;
  let unusableWindows = 0;
  let fastMs = 0;
  const current = (): OceanQuality => ({ tier, dpr, fallback });
  const suspend = () => {
    samples = [];
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
    frame(milliseconds: number) {
      if (fallback || preference === "text" || !Number.isFinite(milliseconds) || milliseconds <= 0) return current();
      activeMs += milliseconds;
      windowMs += milliseconds;
      samples.push(milliseconds);
      if (windowMs < 2000) return current();
      samples.sort((a, b) => a - b);
      const p90 = samples[Math.ceil(samples.length * 0.9) - 1];
      slowWindows = p90 > 20 ? slowWindows + 1 : 0;
      unusableWindows = tier === "low" && p90 > 33.3 ? unusableWindows + 1 : 0;
      fastMs = p90 < 14 ? fastMs + windowMs : 0;
      windowMs = 0;
      samples = [];
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
