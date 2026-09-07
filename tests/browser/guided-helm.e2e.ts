import { expect, test, type Page } from "@playwright/test";
import type { VesselPose } from "@/lib/expedition-state";

async function pose(page: Page): Promise<VesselPose> {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem("ocean-drive:expedition:v1")!).state.vesselCheckpoints.current);
}

async function start(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await page.getByRole("button", { name: "Iniciar expedição", exact: true }).click();
}

test("keyboard and semantic steering move only while sailing and preserve heading on release", async ({ page }) => {
  await start(page);
  const canvas = page.getByRole("group", { name: /Navegação da embarcação/ });
  await canvas.focus();
  await page.keyboard.down("d");
  await page.waitForTimeout(650);
  await page.keyboard.up("d");
  await page.getByRole("button", { name: "Pausar expedição" }).click();
  const turned = await pose(page);
  expect(turned.heading).toBeGreaterThan(0);
  expect(turned.heading).toBeLessThan(Math.PI / 3);
  expect(turned.position.z).toBeLessThan(0);
  await page.getByRole("button", { name: "Retomar expedição" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Pausar expedição" }).click();
  const released = await pose(page);
  expect(released.heading).toBe(turned.heading);
  expect(released.position.z).toBeLessThan(turned.position.z);
  await expect(page.getByRole("button", { name: "Virar à direita" })).toBeDisabled();
  await page.getByRole("button", { name: "Retomar expedição" }).click();
  await page.getByRole("button", { name: "Virar à direita" }).click();
  await page.waitForTimeout(650);
  await page.getByRole("button", { name: "Pausar expedição" }).click();
  expect((await pose(page)).heading - released.heading).toBeCloseTo(0.1745329252);
  await page.getByRole("link", { name: "Versão em texto", exact: true }).click();
  const preserved = await pose(page);
  await page.reload();
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retomar expedição" })).toBeFocused();
  expect(await pose(page)).toEqual(preserved);
});

test("horizontal dragging has a dead zone, keeps heading on release, and excludes interface controls", async ({ page }) => {
  await start(page);
  const canvas = page.getByRole("group", { name: /Navegação da embarcação/ });
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width * 0.3;
  const y = box.y + box.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 4, y + 50);
  await page.waitForTimeout(250);
  await page.mouse.up();
  await page.getByRole("button", { name: "Pausar expedição" }).click();
  expect((await pose(page)).heading).toBe(0);
  await page.getByRole("button", { name: "Retomar expedição" }).click();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 300, y);
  await page.waitForTimeout(500);
  await page.mouse.up();
  await page.getByRole("button", { name: "Pausar expedição" }).click();
  const turned = await pose(page);
  expect(turned.heading).toBeGreaterThan(0);
  expect(turned.heading).toBeLessThan(Math.PI / 3);
  await page.getByRole("button", { name: "Retomar expedição" }).click();
  await page.getByRole("button", { name: "Controles", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: "Pausar expedição" }).click();
  expect((await pose(page)).heading).toBe(turned.heading);
});

test("one-handed touch steering works in portrait and landscape", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await start(page);
  const touch = await context.newCDPSession(page);
  const canvas = page.getByRole("group", { name: /Navegação da embarcação/ });
  const bounds = (await canvas.boundingBox())!;
  const y = bounds.y + bounds.height / 2;
  await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 100, y }] });
  await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 220, y }] });
  await page.waitForTimeout(500);
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.getByRole("button", { name: "Pausar expedição" }).click();
  const turned = await pose(page);
  expect(turned.heading).toBeGreaterThan(0);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("button", { name: "Retomar expedição" }).click();
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: "Pausar expedição" }).click();
  expect((await pose(page)).heading).toBe(turned.heading);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});
