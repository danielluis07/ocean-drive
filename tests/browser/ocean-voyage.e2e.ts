import { expect } from "@playwright/test";
import { test } from "@/tests/browser/physical-gpu-fixture";
import { writeFile } from "node:fs/promises";
import { cpus, platform, release } from "node:os";
import { isSoftwareRenderer } from "@/lib/lab-vitals";
import { productionBudgets } from "@/lib/production-budgets";

test("Balanced holds every passage through five active minutes on the host GPU", async ({ page, browser, physicalHost }, testInfo) => {
  test.setTimeout(8 * 60_000);
  const messages: { at: string; kind: string; text: string }[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") messages.push({ at: new Date().toISOString(), kind: message.type(), text: message.text() });
  });
  page.on("pageerror", (error) => messages.push({ at: new Date().toISOString(), kind: "pageerror", text: error.message }));
  await page.addInitScript(() => sessionStorage.setItem("ocean-drive:diagnostics", "enabled"));
  await page.goto("/");
  const renderer = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "no WebGL 2";
    const plain = String(gl.getParameter(gl.RENDERER));
    const info = plain === "WebKit WebGL" ? gl.getExtension("WEBGL_debug_renderer_info") : null;
    const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return name;
  });
  test.skip(renderer === "no WebGL 2" || isSoftwareRenderer(renderer), `Physical GPU evidence is unavailable: ${renderer}`);
  const ocean = page.locator("#voyage-ocean");
  await expect(ocean).toHaveAttribute("data-stage", "ready", { timeout: 60_000 });
  await expect(page.locator('[data-slot="ocean-loading"]')).toHaveAttribute("data-loading", "false");
  await expect(ocean).toHaveAttribute("data-settled-stop", "0");
  await page.bringToFront();
  let start = await page.evaluate(() => ({ atMs: performance.now(), activeMs: JSON.parse(window.__oceanDiagnostics!.exportJSON()).timing.activeMs }));
  let startingTier = await ocean.getAttribute("data-quality");
  const captures: string[] = [];
  try {
    // A ready attribute precedes the Approach's CSS descent. Capture the ocean
    // only once its covering overlay has finished becoming hidden.
    await expect(page.locator('[data-slot="ocean-loading"]')).toBeHidden();
    start = await page.evaluate(() => ({ atMs: performance.now(), activeMs: JSON.parse(window.__oceanDiagnostics!.exportJSON()).timing.activeMs }));
    startingTier = await ocean.getAttribute("data-quality");
    // Real time, full-resolution rendering and the production controller.
    // No clock, quality lock, cuts, or open Sheets hide passages.
    for (let stop = 0; stop <= 4; stop++) {
      const path = testInfo.outputPath(`stop-${stop}.png`);
      await page.screenshot({ path });
      captures.push(path);
      await page.waitForTimeout(60_000);
      if (stop === 4) break;
      await page.bringToFront();
      await page.keyboard.press("PageDown");
      await expect(ocean).not.toHaveAttribute("data-settled-stop", /.+/);
      await page.waitForTimeout(1500);
      const passage = testInfo.outputPath(`passage-${stop}-${stop + 1}.png`);
      await page.screenshot({ path: passage });
      captures.push(passage);
      await expect(ocean).toHaveAttribute("data-settled-stop", String(stop + 1), { timeout: 30_000 });
    }
  } finally {
    // Retain evidence even on a tier change or failed arrival.
    const report = await page.evaluate(() => JSON.parse(window.__oceanDiagnostics!.exportJSON()));
    // The first window can span the Approach. Score complete Voyage windows.
    const windows = report.timing.windows.filter((window: { atMs: number }) => window.atMs >= start.atMs + 2000);
    const changes = report.events.filter((event: { atMs: number; kind: string }) => event.atMs >= start.atMs && event.kind === "quality");
    let previousTier = startingTier;
    const tierChanges = changes.filter((event: { detail: { tier: string } }) => {
      const changed = event.detail.tier !== previousTier;
      previousTier = event.detail.tier;
      return changed;
    });
    const path = testInfo.outputPath("ocean-voyage.json");
    await writeFile(path, JSON.stringify({
      label: "Local physical-GPU lab evidence; visual approval and clean-candidate E2 sign-off remain separate.",
      renderer, browser: `${testInfo.project.name}: ${browser.version()}`,
      labRendering: { headless: testInfo.project.use.headless ?? true, launchOptions: testInfo.project.use.launchOptions ?? {}, hostConditions: physicalHost },
      host: { os: `${platform()} ${release()}`, cpu: cpus()[0]?.model.trim() },
      viewport: page.viewportSize(), deviceDpr: await page.evaluate(() => devicePixelRatio),
      startingTier, start, activeMs: report.timing.activeMs - start.activeMs,
      windows, changes, tierChanges, messages, diagnostics: report,
    }, null, 2));
    await testInfo.attach("ocean-voyage.json", { path, contentType: "application/json" });
    for (const capture of captures) await testInfo.attach(capture.split(/[\\/]/).at(-1)!, { path: capture, contentType: "image/png" });
    expect.soft(startingTier).toBe("balanced");
    expect.soft(messages.filter(message => message.kind === "error" || message.kind === "pageerror"), "The Voyage must not hide renderer or page failures").toEqual([]);
    expect.soft(report.timing.activeMs - start.activeMs).toBeGreaterThanOrEqual(300_000);
    expect.soft(windows.length).toBeGreaterThanOrEqual(150);
    expect.soft(tierChanges, "Balanced must not change tier during the Voyage").toEqual([]);
    expect.soft(windows.filter((window: { quality: { tier: string } | null }) => window.quality?.tier !== "balanced"), "Every window, passages included, must sustain Balanced").toEqual([]);
    // Issue #57 specifies the per-window E2 interval threshold for Chrome;
    // Firefox must keep Balanced too. Retain its intervals without changing
    // that acceptance criterion into an additional Firefox performance gate.
    if (browser.browserType().name() === "chromium") {
      expect.soft(windows.filter((window: { p90Ms: number }) => window.p90Ms > 20), "Every Chrome window must sustain p90 ≤ 20 ms").toEqual([]);
    }
    expect.soft(report.scenes.balanced?.drawCalls).toBeLessThanOrEqual(productionBudgets.drawCalls);
    expect.soft(report.scenes.balanced?.triangles).toBeLessThanOrEqual(productionBudgets.triangles);
    expect.soft(report.scenes.balanced?.renderTargets).toBeLessThanOrEqual(productionBudgets.renderTargets);
    expect.soft(report.scenes.balanced?.oceanDraws).toBe(productionBudgets.oceanDraws);
  }
});
