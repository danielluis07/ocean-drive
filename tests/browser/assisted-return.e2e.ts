import { expect, test, type Page } from "@playwright/test";
import type { VesselPose } from "@/lib/expedition-state";

async function pose(page: Page): Promise<VesselPose> {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem("ocean-drive:expedition:v1")!).state.vesselCheckpoints.current);
}

async function sailAway(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await page.getByRole("button", { name: "Iniciar expedição", exact: true }).click();
  await page.getByRole("group", { name: /Navegação da embarcação/ }).focus();
  await page.keyboard.down("ArrowRight");
  await expect.poll(async () => (await pose(page)).heading, { timeout: 25_000 }).toBeGreaterThan(2.8);
  await page.keyboard.up("ArrowRight");
}

test("observed non-progress clarifies bearings before offering a manual reorientation", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await sailAway(page);
  const help = page.getByRole("button", { name: "Reorientar rota", exact: true });
  await expect(page.getByText("A luz das estações está mais forte", { exact: false })).toBeVisible({ timeout: 25_000 });
  await expect(help).toHaveCount(0);
  await expect(page.locator('.beacon-label[data-assisted="true"]')).toHaveCount(1);
  await expect(help).toBeVisible({ timeout: 25_000 });
  const before = await pose(page);
  await help.click();
  await expect(help).toHaveCount(0);
  await expect(page.getByRole("group", { name: /Navegação da embarcação/ })).toBeFocused();
  const after = await pose(page);
  expect(Math.hypot(after.position.x - before.position.x, after.position.z - before.position.z)).toBeLessThan(5);
  expect(Math.cos(after.heading)).toBeGreaterThan(0.5);
  await page.keyboard.down("d");
  await page.waitForTimeout(1200);
  await page.keyboard.up("d");
  await page.getByRole("button", { name: "Pausar expedição" }).click();
  expect((await pose(page)).heading).toBeGreaterThan(after.heading);
  await page.screenshot({ path: testInfo.outputPath("reoriented.png") });
});

test("the visible boundary current returns outward travel to relevant waters", async ({ page }, testInfo) => {
  test.setTimeout(110_000);
  await sailAway(page);
  const current = page.getByText("A corrente na borda curva a embarcação", { exact: false });
  await expect(current).toBeVisible({ timeout: 65_000 });
  const outward = await pose(page);
  await page.screenshot({ path: testInfo.outputPath("boundary-current.png") });
  await expect(current).toBeHidden({ timeout: 25_000 });
  const inward = await pose(page);
  expect(Math.hypot(inward.position.x, inward.position.z + 56)).toBeLessThan(Math.hypot(outward.position.x, outward.position.z + 56));
  expect(Math.abs(inward.heading - outward.heading)).toBeGreaterThan(0.5);
});
