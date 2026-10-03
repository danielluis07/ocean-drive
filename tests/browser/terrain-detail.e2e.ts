import { expect, test } from "@playwright/test";
import { createInitialVoyageState, serializeVoyageState } from "@/lib/voyage-state";
import { readFile, writeFile } from "node:fs/promises";

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
      if (process.env.TERRAIN_BASELINE) await page.route(/\/((models|textures)\/landmark-fernando-de-noronha-.*)$/, async route => {
        const path = new URL(route.request().url()).pathname;
        await route.fulfill({ body: await readFile(`.tmp/issue77-baseline${path}`), contentType: path.endsWith(".glb") ? "model/gltf-binary" : "image/webp" });
      });
      if (view.maps === "none") await page.route("**/textures/landmark-*.webp", route => route.fulfill({ status: 404, body: "capture without optional map" }));
      await page.addInitScript(({ state, framing, maps }) => {
        sessionStorage.setItem("ocean-drive:diagnostics", "enabled");
        sessionStorage.setItem("ocean-drive:terrain-preview", framing);
        sessionStorage.setItem("ocean-drive:voyage:v1", state);
        // Exercise the production modest-GPU decision without changing quality
        // or renderer throughput. This is visual emulation, not device evidence.
        const getParameter = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function (parameter: number) {
          if (parameter === this.RENDERER) return maps === "colour" ? "Intel UHD Graphics 620" : "generic capture renderer";
          return getParameter.call(this, parameter);
        };
      }, { framing, maps: view.maps, state: serializeVoyageState({ ...createInitialVoyageState(), currentStop: "fernando-de-noronha",
        routeProgress: 1, qualityPreference: view.tier === "low" ? "reduced-3d" : "automatic" }) });
      await page.goto("/");
      await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-stage", "ready");
      await expect(page.locator('[data-slot="ocean-loading"]')).toBeHidden();
      await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-quality", view.tier);
      if (view.maps !== "none") await expect.poll(() => page.evaluate(() => JSON.parse(window.__oceanDiagnostics!.exportJSON()).events
        .some((event: { kind: string; detail: string }) => event.kind === "landmark-texture" &&
          JSON.parse(event.detail).id === "fernando-de-noronha" && JSON.parse(event.detail).action === "upload"))).toBe(true);
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
      if (view.maps === "all") expect(normalRequests.some(url => url.includes("fernando-de-noronha"))).toBe(true);
      await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "three-dimensional");
      const path = testInfo.outputPath(`${view.name}-${framing}.png`);
      await page.screenshot({ path });
      await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "three-dimensional");
      await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-quality", view.tier);
      await testInfo.attach("terrain", { path, contentType: "image/png" });
    });
  }
}
