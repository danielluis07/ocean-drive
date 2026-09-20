import { expect, test } from "@playwright/test";
import { CALM_WAVE_RATE, CALM_WAVE_STRENGTH } from "@/lib/ocean-daylight";
import { productionBudgets } from "@/lib/production-budgets";
import { createInitialVoyageState, serializeVoyageState } from "@/lib/voyage-state";
import { observeWater } from "@/tests/browser/ocean-water-probe";

test.use({ deviceScaleFactor: 0.25 });

for (const tier of ["balanced", "high", "low"] as const) {
  test(`${tier} daylight compiles within budgets and keeps calmer surf on the water`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    if (tier === "low") await page.setViewportSize({ width: 390, height: 844 });
    await observeWater(page);
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.addInitScript(({ voyage, fast }) => {
      sessionStorage.setItem("ocean-drive:diagnostics", "enabled");
      sessionStorage.setItem("ocean-drive:voyage:v1", voyage);
      // High is reached through the real controller's ten seconds of fast frames.
      if (fast) {
        window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(performance.now()), 12);
        window.cancelAnimationFrame = (id) => window.clearTimeout(id);
      }
    }, { voyage: serializeVoyageState({ ...createInitialVoyageState(), currentStop: "fernando-de-noronha", routeProgress: 1 }), fast: tier === "high" });
    await page.goto("/");
    await expect.poll(async () => {
      await page.clock.runFor(tier === "high" ? 1000 : 100);
      return page.evaluate(() => {
        const ocean = document.getElementById("voyage-ocean");
        return `${ocean?.dataset.stage}:${ocean?.dataset.quality}`;
      });
    }, { timeout: 90_000 }).toBe(`ready:${tier}`);
    await page.clock.runFor(500);
    const normal = await page.evaluate(() => window.__waterSamples());
    const water = normal.find((sample) => sample.kind === tier)!;
    const surf = normal.find((sample) => sample.kind === "surf")!;
    expect(water).toBeDefined();
    expect(surf).toBeDefined();
    expect(water.strength).toBe(1);
    expect(surf.time).toBe(water.time);
    expect(surf.white).toEqual(water.white);
    expect(water.white.every((channel) => channel > .8)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${tier}-daylight.png`) });

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.runFor(100);
    const calmStart = await page.evaluate(() => window.__waterSamples().find((sample) => sample.kind !== "surf")!.time);
    await page.clock.runFor(480);
    const calm = await page.evaluate(() => window.__waterSamples());
    const calmWater = calm.find((sample) => sample.kind === tier)!;
    const calmSurf = calm.find((sample) => sample.kind === "surf")!;
    expect(calmWater.strength).toBeCloseTo(CALM_WAVE_STRENGTH);
    expect(calmSurf.strength).toBe(calmWater.strength);
    expect(calmSurf.time).toBe(calmWater.time);
    expect(calmWater.time - calmStart).toBeCloseTo(.48 * CALM_WAVE_RATE, 3);
    expect(calmWater.sun).toEqual(water.sun);
    await page.screenshot({ path: testInfo.outputPath(`${tier}-calm.png`) });

    // A route change must preserve the same daylight and shoreline contract.
    for (let stop = 2; stop <= 4; stop++) {
      await page.keyboard.press("ArrowDown");
      await page.clock.runFor(100);
      await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-settled-stop", String(stop));
    }
    expect(await page.evaluate(() => window.__waterSamples().find((sample) => sample.kind !== "surf")!.sun)).toEqual(water.sun);
    const report = await page.evaluate(() => JSON.parse(window.__oceanDiagnostics!.exportJSON()));
    const counts = report.scenes[tier];
    expect(counts.oceanDraws).toBe(1);
    expect(counts.renderTargets).toBe(tier === "low" ? 0 : 1);
    expect(counts.drawCalls).toBeLessThanOrEqual(productionBudgets.drawCalls);
    expect(counts.triangles).toBeLessThanOrEqual(productionBudgets.triangles);
    await testInfo.attach("scene-budgets", { body: JSON.stringify(report.scenes, null, 2), contentType: "application/json" });
    expect(errors).toEqual([]);
  });
}
