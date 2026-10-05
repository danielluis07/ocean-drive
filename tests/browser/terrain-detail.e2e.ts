import { expect, test } from "@playwright/test";
import { createInitialVoyageState, serializeVoyageState } from "@/lib/voyage-state";
import { readFile, writeFile } from "node:fs/promises";
import { oceanConfiguration } from "@/lib/ocean-config";
import { deviceKey } from "@/lib/starting-tier";
import { featureSourceRecord } from "@/scripts/landmark-feature-source";
import { inspectModel } from "@/lib/asset-audit";

const stop = oceanConfiguration.stops.find(entry => entry.id === (process.env.TERRAIN_ISLAND ?? "fernando-de-noronha"));
if (!stop?.landmark) throw new Error("TERRAIN_ISLAND must name an island Stop");
const island = stop.id;
const routeProgress = oceanConfiguration.stops.indexOf(stop);

test.afterEach(async ({ page }, testInfo) => {
  if (page.isClosed()) return;
  const report = await page.evaluate(() => window.__oceanDiagnostics?.exportJSON());
  if (report) {
    const path = testInfo.outputPath("capture-diagnostics.json");
    await writeFile(path, report);
    await testInfo.attach("diagnostics", { path, contentType: "application/json" });
  }
});

for (const view of [
  { name: "desktop-balanced", tier: "balanced", width: 1280, height: 800, maps: "all" },
  { name: "desktop-colour-only", tier: "balanced", width: 1280, height: 800, maps: "colour" },
  { name: "desktop-low", tier: "low", width: 1280, height: 800, maps: "colour" },
  { name: "phone-low", tier: "low", width: 390, height: 844, maps: "colour" },
  { name: "desktop-fallback", tier: "balanced", width: 1280, height: 800, maps: "none" },
] as const) {
  for (const framing of ["aerial", "close"] as const) {
    test(`${view.name} ${framing}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: view.width, height: view.height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const normalRequests: string[] = [];
      page.on("request", request => { if (request.url().includes("-normal.v1.webp")) normalRequests.push(request.url()); });
      if (process.env.TERRAIN_BASELINE) await page.route(new RegExp(`/((models|textures)/landmark-${island}-.*|models/landmark-features.v1.glb)$`), async route => {
        const path = new URL(route.request().url()).pathname;
        const baseline = process.env.TERRAIN_BASELINE === "1" ? ".tmp/issue77-baseline" : process.env.TERRAIN_BASELINE;
        await route.fulfill({ body: await readFile(`${baseline}${path}`), contentType: path.endsWith(".glb") ? "model/gltf-binary" : "image/webp" });
      });
      if (view.maps === "none") await page.route("**/textures/landmark-*.webp", route => route.fulfill({ status: 404, body: "capture without optional map" }));
      if (process.env.TERRAIN_HIDE_FEATURES === "1") await page.route("**/models/landmark-features.v1.glb", async route => {
        const bytes = await readFile("public/models/landmark-features.v1.glb");
        const buffer = new Uint8Array(bytes).buffer;
        const features = inspectModel(buffer).features!;
        await route.fulfill({ body: Buffer.from(featureSourceRecord(buffer, {
          models: features.models, placements: { ...features.placements, [island]: [] },
        })), contentType: "model/gltf-binary" });
      });
      const renderer = view.maps === "colour" ? "Intel UHD Graphics 620" : "generic capture renderer";
      const screen = await page.evaluate(() => ({ width: window.screen.width, height: window.screen.height }));
      const renderDpr = view.tier === "balanced" ? .9 : 1;
      // Start matched art pairs at the same production-supported remembered
      // quality. Adaptive safeguards remain live and must preserve this DPR
      // through readback; these synthetic settings are not device evidence.
      await page.addInitScript(({ key, tier, dpr }) => {
        localStorage.setItem(key, JSON.stringify({ tier, dpr }));
      }, { key: deviceKey(renderer, screen, 1), tier: view.tier, dpr: renderDpr });
      await page.addInitScript(({ state, framing, maps }) => {
        sessionStorage.setItem("ocean-drive:diagnostics", "enabled");
        sessionStorage.setItem("ocean-drive:terrain-preview", framing);
        sessionStorage.setItem("ocean-drive:voyage:v1", state);
        // Exercise the production modest-GPU decision without changing quality
        // or renderer throughput. This is visual emulation, not device evidence.
        const getParameter = WebGL2RenderingContext.prototype.getParameter;
        const getExtension = WebGL2RenderingContext.prototype.getExtension;
        WebGL2RenderingContext.prototype.getExtension = new Proxy(getExtension, { apply(target, receiver, args: [string]) {
          // Unknown GPU + unavailable timing uses the production Balanced
          // promotion ceiling. Adaptive quality stays active; this is art
          // emulation only, never a performance measurement.
          if (args[0] === "EXT_disjoint_timer_query_webgl2") return null;
          return Reflect.apply(target, receiver, args);
        } });
        WebGL2RenderingContext.prototype.getParameter = function (parameter: number) {
          if (parameter === this.RENDERER) return maps === "colour" ? "Intel UHD Graphics 620" : "generic capture renderer";
          return getParameter.call(this, parameter);
        };
      }, { framing, maps: view.maps, state: serializeVoyageState({ ...createInitialVoyageState(), currentStop: island,
        routeProgress, qualityPreference: view.tier === "low" ? "reduced-3d" : "automatic" }) });
      await page.goto("/");
      await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-stage", "ready");
      await expect(page.locator('[data-slot="ocean-loading"]')).toBeHidden();
      await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-quality", view.tier);
      await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-dpr", String(renderDpr));
      const settingsPath = testInfo.outputPath("capture-settings.json");
      await writeFile(settingsPath, JSON.stringify({ island, framing, view, deviceDpr: 1,
        renderDpr: await page.locator("#voyage-ocean").getAttribute("data-dpr"),
        baseline: process.env.TERRAIN_BASELINE ?? null, featuresHidden: process.env.TERRAIN_HIDE_FEATURES === "1" }, null, 2));
      await testInfo.attach("capture-settings", { path: settingsPath, contentType: "application/json" });
      if (view.maps !== "none") await expect.poll(() => page.evaluate(id => JSON.parse(window.__oceanDiagnostics!.exportJSON()).events
        .some((event: { kind: string; detail: string }) => event.kind === "landmark-texture" &&
          JSON.parse(event.detail).id === id && JSON.parse(event.detail).action === "upload"), island)).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      // Close View interaction/card layout belongs to #72. Expose the entire
      // terrain for underside inspection, without changing the production scene.
      if (framing === "close") {
        const card = page.locator('[data-slot="stop-card"][data-visible="true"]');
        await expect(card).toBeVisible();
        // Preserve measured dimensions: display:none makes the production
        // phone layout correctly fall back to the editorial presentation.
        await card.evaluate(card => (card as HTMLElement).style.setProperty("opacity", "0", "important"));
        await expect(card).toHaveCSS("opacity", "0");
      }
      if (view.maps === "colour") expect(normalRequests).toEqual([]);
      if (view.maps === "all") expect(normalRequests.some(url => url.includes(island))).toBe(true);
      await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "three-dimensional");
      const path = testInfo.outputPath(`${view.name}-${framing}.png`);
      await page.screenshot({ path });
      await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "three-dimensional");
      await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-quality", view.tier);
      await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-dpr", String(renderDpr));
      await testInfo.attach("terrain", { path, contentType: "image/png" });
    });
  }
}
