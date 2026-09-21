// Lab Core Web Vitals: synthetic Chromium runs against the production build.
// These are lab evidence only. Remote analytics are outside the architecture, so
// nothing here may be reported as field (real-Visitor) p75 data.

// The approved "good" thresholds (issue #19, A10): https://web.dev/articles/vitals
export const labVitalsThresholds = { lcpMs: 2500, inpMs: 200, cls: 0.1 } as const;

export const labRunsPerProfile = 5;

export type LabProfileName = "mobile" | "desktop";

export type LabProfile = {
  label: string;
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  // Applied on top of the host CPU, which the report records.
  cpuSlowdown: number;
  // Applied throttling; null leaves the loopback connection unthrottled.
  network: { latencyMs: number; downloadKbps: number; uploadKbps: number } | null;
};

// Viewports and throttling values follow Lighthouse's mobile and desktop presets
// with DevTools-applied throttling. They are recorded verbatim in every report.
export const labProfiles: Record<LabProfileName, LabProfile> = {
  mobile: {
    label: "Mobile: 412×823 at 1.75× DPR, touch, 4× CPU slowdown, Slow 4G (562.5 ms latency, 1,474.56 kbps down, 675 kbps up)",
    viewport: { width: 412, height: 823 },
    deviceScaleFactor: 1.75,
    isMobile: true,
    hasTouch: true,
    cpuSlowdown: 4,
    network: { latencyMs: 562.5, downloadKbps: 1474.56, uploadKbps: 675 },
  },
  desktop: {
    label: "Desktop: 1350×940 at 1× DPR, mouse and keyboard, no CPU or network throttling",
    viewport: { width: 1350, height: 940 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    cpuSlowdown: 1,
    network: null,
  },
};

// A software rasterizer measures itself, not the page: every frame of the ocean
// scene is drawn on the CPU, so interaction latency reflects the host's software
// GPU. Lab runs on such a renderer are withheld and stay Unvalidated.
export function isSoftwareRenderer(renderer: string) {
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
}

// Nearest-rank percentile: always an observed value, never an interpolation.
export function percentile(values: number[], fraction: number) {
  if (values.length === 0 || values.some((value) => !Number.isFinite(value)))
    throw new Error("A percentile needs at least one finite measurement");
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

export type LayoutShift = { startTime: number; value: number; hadRecentInput: boolean };

// CLS is the largest session window: shifts less than one second apart, the
// window lasting at most five seconds. Shifts right after input do not count.
export function cumulativeLayoutShift(shifts: LayoutShift[]) {
  let largest = 0;
  let current = 0;
  let first = -Infinity;
  let previous = -Infinity;
  for (const shift of [...shifts].sort((a, b) => a.startTime - b.startTime)) {
    if (shift.hadRecentInput) continue;
    if (shift.startTime - previous < 1000 && shift.startTime - first < 5000) current += shift.value;
    else {
      current = shift.value;
      first = shift.startTime;
    }
    previous = shift.startTime;
    largest = Math.max(largest, current);
  }
  return largest;
}

export type EventTiming = { interactionId: number; duration: number };

// INP is the worst interaction latency, ignoring one outlier per fifty
// interactions. An interaction's latency is its longest event. Event Timing only
// reports events of 16 ms or more, so the first input is observed separately:
// without any observed interaction there is no measurement, never a zero.
export function interactionToNextPaint(events: EventTiming[], firstInput: EventTiming | null) {
  const latencies = new Map<number, number>();
  for (const event of events) {
    if (event.interactionId > 0)
      latencies.set(event.interactionId, Math.max(latencies.get(event.interactionId) ?? 0, event.duration));
  }
  if (latencies.size === 0) {
    if (!firstInput) throw new Error("No interaction was observed, so INP cannot be measured");
    return { inpMs: firstInput.duration, interactions: 1 };
  }
  const sorted = [...latencies.values()].sort((a, b) => b - a);
  return { inpMs: sorted[Math.min(Math.floor(sorted.length / 50), sorted.length - 1)], interactions: sorted.length };
}

export type LabRun = { lcpMs: number; inpMs: number; cls: number };

// Mobile and desktop are summarised separately; fewer runs than required is a
// failure of the evidence itself, not a smaller sample.
export function summariseLabRuns(runs: LabRun[]) {
  const p75 = {
    lcpMs: percentile(runs.map((run) => run.lcpMs), 0.75),
    inpMs: percentile(runs.map((run) => run.inpMs), 0.75),
    cls: percentile(runs.map((run) => run.cls), 0.75),
  };
  const failures = [
    ...(runs.length < labRunsPerProfile ? [`only ${runs.length} of ${labRunsPerProfile} required runs`] : []),
    ...(p75.lcpMs > labVitalsThresholds.lcpMs ? [`p75 LCP ${Math.round(p75.lcpMs)} ms exceeds ${labVitalsThresholds.lcpMs} ms`] : []),
    ...(p75.inpMs > labVitalsThresholds.inpMs ? [`p75 INP ${Math.round(p75.inpMs)} ms exceeds ${labVitalsThresholds.inpMs} ms`] : []),
    ...(p75.cls > labVitalsThresholds.cls ? [`p75 CLS ${p75.cls.toFixed(3)} exceeds ${labVitalsThresholds.cls}`] : []),
  ];
  return { p75, failures };
}
