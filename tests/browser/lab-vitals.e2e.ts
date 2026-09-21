import { expect, test, type Browser } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { cpus, platform, release, totalmem } from "node:os";
import {
  cumulativeLayoutShift,
  interactionToNextPaint,
  isSoftwareRenderer,
  labProfiles,
  labRunsPerProfile,
  labVitalsThresholds,
  summariseLabRuns,
  type EventTiming,
  type LabProfileName,
  type LayoutShift,
} from "@/lib/lab-vitals";

type Observed = {
  lcp: { startTime: number; element: string }[];
  shifts: LayoutShift[];
  events: EventTiming[];
  firstInput: EventTiming | null;
};

declare global {
  interface Window { __labVitals?: Observed }
}

// Installed before any page script, with buffered observers, so nothing from
// the load is missed. Serialised into the page: it must stay self-contained.
function observeVitals() {
  const observed: Observed = { lcp: [], shifts: [], events: [], firstInput: null };
  window.__labVitals = observed;
  const describe = (element: Element | null) =>
    element ? `${element.tagName.toLowerCase()} “${(element.textContent ?? "").trim().slice(0, 60)}”` : "(removed element)";
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as (PerformanceEntry & { element: Element | null })[])
      observed.lcp.push({ startTime: entry.startTime, element: describe(entry.element) });
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[])
      observed.shifts.push({ startTime: entry.startTime, value: entry.value, hadRecentInput: entry.hadRecentInput });
  }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as (PerformanceEntry & { interactionId: number })[])
      observed.events.push({ interactionId: entry.interactionId, duration: entry.duration });
  }).observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
  new PerformanceObserver((list) => {
    const entry = list.getEntries()[0] as (PerformanceEntry & { interactionId: number }) | undefined;
    if (entry) observed.firstInput = { interactionId: entry.interactionId, duration: entry.duration };
  }).observe({ type: "first-input", buffered: true });
}

async function webglRenderer(browser: Browser) {
  const page = await browser.newPage();
  const renderer = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "no WebGL 2";
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    return String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  });
  await page.close();
  return renderer;
}

// One cold-cache load in a fresh context (empty cache and storage, so a new
// Voyage), then the interactions a Visitor makes first.
async function labRun(browser: Browser, name: LabProfileName, baseURL: string) {
  const profile = labProfiles[name];
  const context = await browser.newContext({
    baseURL,
    viewport: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  if (profile.network) {
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: profile.network.latencyMs,
      downloadThroughput: (profile.network.downloadKbps * 1024) / 8,
      uploadThroughput: (profile.network.uploadKbps * 1024) / 8,
    });
  }
  if (profile.cpuSlowdown > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpuSlowdown });
  await page.addInitScript(observeVitals);
  await page.goto("/", { timeout: 120_000 });
  const ocean = page.locator("#voyage-ocean");
  await expect(ocean, "A representative run needs the Visitor's default 3D voyage").toHaveAttribute("data-stage", "ready", { timeout: 120_000 });
  const readyMs = await page.evaluate(() => performance.now());
  const quality = await ocean.getAttribute("data-quality");
  // Let the Stop 00 card finish fading in, so LCP has its final candidate before input stops it.
  await page.waitForTimeout(2000);
  const press = async (locator: ReturnType<typeof page.getByRole>) => (profile.hasTouch ? locator.tap() : locator.click());
  await press(page.getByRole("button", { name: "Capítulos", exact: true }));
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(600);
  if (profile.hasTouch) await press(sheet.getByRole("button", { name: "Fechar", exact: true }));
  else await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await page.waitForTimeout(600);
  if (!profile.hasTouch) {
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(600);
  }
  await press(page.getByRole("link", { name: "Modo leitura", exact: true }));
  await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "editorial");
  // Event Timing entries are delivered after the next paint.
  await page.waitForTimeout(1000);
  const observed = (await page.evaluate(() => window.__labVitals))!;
  await context.close();
  const lcp = observed.lcp.at(-1);
  if (!lcp) throw new Error("No largest-contentful-paint entry was observed");
  const { inpMs, interactions } = interactionToNextPaint(observed.events, observed.firstInput);
  return {
    lcpMs: lcp.startTime,
    lcpElement: lcp.element,
    inpMs,
    interactions,
    cls: cumulativeLayoutShift(observed.shifts),
    layoutShifts: observed.shifts.length,
    readyMs,
    quality,
  };
}

for (const name of ["mobile", "desktop"] as const) {
  test(`${name}: p75 of ${labRunsPerProfile} cold-cache runs meets the LCP, INP and CLS thresholds (lab evidence, not field data)`, async ({ browser, request }, testInfo) => {
    const renderer = await webglRenderer(browser);
    test.skip(
      isSoftwareRenderer(renderer),
      `Lab vitals need a hardware-accelerated renderer; ${renderer} would measure its own software rasterizer, not the page. Run \`bun run test:vitals\` on a machine with a GPU.`,
    );
    const baseURL = testInfo.project.use.baseURL!;
    // One unmeasured request, so no measured run pays for a server cold start.
    expect((await request.get("/")).ok()).toBe(true);
    const runs = [];
    for (let run = 0; run < labRunsPerProfile; run++) runs.push(await labRun(browser, name, baseURL));
    const summary = summariseLabRuns(runs);
    const report = {
      kind: "lab",
      label: "Lab evidence: synthetic cold-cache Chromium runs against the production build. Not field data about real Visitors.",
      build: (await readFile(".next/BUILD_ID", "utf8")).trim(),
      profile: { name, ...labProfiles[name] },
      thresholds: labVitalsThresholds,
      method: `${labRunsPerProfile} cold-cache loads, each in a fresh browser context; LCP read before the first input; INP from Event Timing over the interactions; CLS as the largest session window; p75 by nearest rank.`,
      interactions: labProfiles[name].hasTouch
        ? "Tap “Capítulos”, tap “Fechar”, tap “Modo leitura”"
        : "Click “Capítulos”, press Escape, press ArrowDown, click “Modo leitura”",
      renderer,
      browser: `Chromium ${browser.version()}`,
      playwright: testInfo.config.version,
      host: { os: `${platform()} ${release()}`, cpu: `${cpus()[0]?.model.trim()} × ${cpus().length}`, memory: `${Math.round(totalmem() / 1024 ** 3)} GiB` },
      runs,
      p75: summary.p75,
      failures: summary.failures,
    };
    const path = testInfo.outputPath(`lab-vitals-${name}.json`);
    await writeFile(path, JSON.stringify(report, null, 2));
    await testInfo.attach(`lab-vitals-${name}.json`, { path, contentType: "application/json" });
    expect(summary.failures, `${name} lab p75: LCP ${Math.round(summary.p75.lcpMs)} ms, INP ${Math.round(summary.p75.inpMs)} ms, CLS ${summary.p75.cls.toFixed(3)}`).toEqual([]);
  });
}
