import type { OceanQuality, QualityTier } from "@/lib/ocean-quality";

export type SceneCounts = { drawCalls: number; triangles: number; oceanDraws: number; renderTargets: number };
type DiagnosticEvent = { atMs: number; kind: string; detail: string | OceanQuality };
// `gpuP90Ms` is the ocean render's GPU time, null where the browser cannot time it.
type TimingWindow = { atMs: number; p90Ms: number; gpuP90Ms: number | null; wakeActive: boolean; quality: OceanQuality | null };
type DiagnosticReport = {
  schema: 1;
  candidate: string;
  build: string;
  startedAt: string;
  quality: OceanQuality | null;
  events: DiagnosticEvent[];
  droppedEvents: number;
  timing: { activeMs: number; frames: number; windows: TimingWindow[] };
  scenes: Partial<Record<QualityTier, SceneCounts>>;
};

declare global {
  interface Window { __oceanDiagnostics?: { exportJSON: () => string } }
}

let report: DiagnosticReport | null = null;
let windowMs = 0;
let windowHasWake = false;
let samples: number[] = [];
let gpuSamples: number[] = [];

const p90 = (values: number[]) => {
  values.sort((a, b) => a - b);
  return values[Math.ceil(values.length * .9) - 1];
};

// Explicit DevTools opt-in. No URL, public control, upload, persistent trace or replay.
export function enableLocalDiagnostics() {
  if (report || typeof window === "undefined") return;
  try { if (sessionStorage.getItem("ocean-drive:diagnostics") !== "enabled") return; }
  catch { return; }
  report = {
    schema: 1, candidate: process.env.NEXT_PUBLIC_RELEASE_CANDIDATE ?? "unvalidated",
    build: process.env.NEXT_PUBLIC_BUILD_ID ?? "development", startedAt: new Date().toISOString(), quality: null,
    events: [], droppedEvents: 0, timing: { activeMs: 0, frames: 0, windows: [] }, scenes: {},
  };
  window.__oceanDiagnostics = { exportJSON: () => JSON.stringify(report, null, 2) };
}

export function recordDiagnostic(kind: string, detail: string | OceanQuality) {
  if (!report) return;
  if (kind === "quality" && typeof detail !== "string") report.quality = { ...detail };
  if (report.events.length === 512) { report.events.shift(); report.droppedEvents++; }
  report.events.push({ atMs: performance.now(), kind, detail });
}

export function recordFrame(milliseconds: number | null, gpuMilliseconds: number | null = null, wakeActive = false) {
  if (!report) return;
  if (milliseconds === null) { windowMs = 0; windowHasWake = false; samples = []; gpuSamples = []; return; }
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return;
  report.timing.activeMs += milliseconds;
  report.timing.frames++;
  windowMs += milliseconds;
  windowHasWake ||= wakeActive;
  samples.push(milliseconds);
  if (gpuMilliseconds !== null && Number.isFinite(gpuMilliseconds) && gpuMilliseconds >= 0) gpuSamples.push(gpuMilliseconds);
  if (windowMs < 2000) return;
  if (report.timing.windows.length === 180) report.timing.windows.shift();
  report.timing.windows.push({
    atMs: performance.now(), p90Ms: p90(samples), gpuP90Ms: gpuSamples.length > 0 ? p90(gpuSamples) : null, quality: report.quality,
    wakeActive: windowHasWake,
  });
  windowMs = 0;
  windowHasWake = false;
  samples = [];
  gpuSamples = [];
}

export function recordScene(tier: QualityTier, counts: SceneCounts) {
  if (!report) return;
  const previous = report.scenes[tier];
  report.scenes[tier] = {
    drawCalls: Math.max(previous?.drawCalls ?? 0, counts.drawCalls),
    triangles: Math.max(previous?.triangles ?? 0, counts.triangles),
    oceanDraws: Math.max(previous?.oceanDraws ?? 0, counts.oceanDraws),
    renderTargets: Math.max(previous?.renderTargets ?? 0, counts.renderTargets),
  };
}
