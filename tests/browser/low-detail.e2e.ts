import { expect, test } from "@playwright/test";
import { createInitialVoyageState, serializeVoyageState } from "@/lib/voyage-state";

// Fixed resting views are visual-review artifacts, not automatic art approval.
for (const view of [
  { name: "desktop-balanced", tier: "balanced", width: 1280, height: 800 },
  { name: "desktop-low", tier: "low", width: 1280, height: 800 },
  { name: "phone-low", tier: "low", width: 390, height: 844 },
] as const) {
  for (const [index, stop] of ["fernando-de-noronha", "boipeba", "abrolhos", "ilha-grande"].entries()) {
    test(`${view.name} Stop 0${index + 1}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: view.width, height: view.height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript((state) => {
        sessionStorage.setItem("ocean-drive:voyage:v1", state);
      }, serializeVoyageState({
        ...createInitialVoyageState(),
        currentStop: stop as ReturnType<typeof createInitialVoyageState>["currentStop"],
        routeProgress: index + 1,
        complete: index === 3,
        qualityPreference: view.tier === "low" ? "reduced-3d" : "automatic",
      }));
      await page.goto("/");
      await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-stage", "ready");
      await expect(page.locator('[data-slot="ocean-loading"]')).toBeHidden();
      await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-quality", view.tier);
      await page.evaluate(() => document.fonts.ready);
      const path = testInfo.outputPath(`${view.name}-stop-0${index + 1}.png`);
      await page.screenshot({ path });
      await testInfo.attach("resting-view", { path, contentType: "image/png" });
    });
  }
}
