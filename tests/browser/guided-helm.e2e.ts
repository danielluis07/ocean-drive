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
  expect(await page.evaluate(() => scrollY)).toBe(0);
  // Rotate with the finger still down, then keep sending the old gesture.
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(1200);
  const rotated = await pose(page);
  await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 300, y: 200 }] });
  await page.waitForTimeout(1200);
  expect((await pose(page)).heading).toBe(rotated.heading);
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

test("pointer capture survives leaving the ocean, keyboard takes over, and late pointer release preserves that key", async ({ page }) => {
  await start(page);
  const canvas = page.getByRole("group", { name: /Navegação da embarcação/ });
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 50, box.y + 50);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 20, box.y + 50);
  await page.waitForTimeout(1200);
  const dragged = await pose(page);
  expect(dragged.heading).toBeGreaterThan(0);
  await page.keyboard.down("a");
  await page.mouse.up();
  await expect.poll(async () => (await pose(page)).heading).toBeLessThan(dragged.heading);
  await page.keyboard.up("a");
  await page.getByRole("button", { name: "Pausar expedição" }).click();
  const released = await pose(page);
  await page.getByRole("button", { name: "Retomar expedição" }).click();
  await page.waitForTimeout(1200);
  expect((await pose(page)).heading).toBe(released.heading);
});

test("losing the app pauses navigation and releases gestures until explicit resume", async ({ page }) => {
  await start(page);
  const canvas = page.getByRole("group", { name: /Navegação da embarcação/ });
  await canvas.focus();
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(350);
  // Deliver the OS window-focus boundary; background-tab throttling varies in headless engines.
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByRole("button", { name: "Retomar expedição" })).toBeVisible();
  const suspended = await pose(page);
  await page.waitForTimeout(1200);
  expect(await pose(page)).toEqual(suspended);
  await page.keyboard.up("ArrowRight");
  await page.getByRole("button", { name: "Retomar expedição" }).click();
  await page.waitForTimeout(1200);
  expect((await pose(page)).heading).toBe(suspended.heading);
});

test("reduced-motion 3D stays still after steering and after a portrait-to-landscape reframe", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Preparar 3D com movimento reduzido" }).click();
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await page.getByRole("button", { name: "Iniciar expedição", exact: true }).click();
  const canvas = page.getByRole("group", { name: /Navegação da embarcação/ });
  await canvas.focus();
  await page.keyboard.down("d");
  await page.waitForTimeout(500);
  await page.keyboard.up("d");
  await page.getByRole("button", { name: "Pausar expedição" }).click();
  const still = await canvas.screenshot();
  await page.waitForTimeout(600);
  expect(await canvas.screenshot()).toEqual(still);
  await page.setViewportSize({ width: 844, height: 390 });
  const landscape = await canvas.screenshot({ path: testInfo.outputPath("reduced-motion-landscape.png") });
  await page.waitForTimeout(600);
  expect(await canvas.screenshot()).toEqual(landscape);
});

test("switching from a held key to a pointer releases the previous steering input", async ({ page }) => {
  await start(page);
  const canvas = page.getByRole("group", { name: /Navegação da embarcação/ });
  await canvas.focus();
  await page.keyboard.down("d");
  await page.waitForTimeout(350);
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.waitForTimeout(1200);
  const heldPointer = await pose(page);
  await page.waitForTimeout(1200);
  expect((await pose(page)).heading).toBe(heldPointer.heading);
  await page.mouse.up();
  await page.keyboard.up("d");
});
