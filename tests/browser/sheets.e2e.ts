import { expect, type Page } from "@playwright/test";
import { test } from "@/tests/browser/journey-fixture";
import { createInitialVoyageState, serializeVoyageState } from "@/lib/voyage-state";
import {
  chaptersButton,
  enterOcean,
  expectSettledAt,
  expectSheetClosed,
  openChapters,
  openSheet,
  openStopAccount,
  saibaMais,
  stopCard,
  voyageState,
} from "@/tests/browser/editorial-route";

async function sailToFirstStop(page: Page) {
  await enterOcean(page);
  await page.keyboard.press("ArrowDown");
  await expectSettledAt(page, 1);
}

// Start a tab already at the Arrival, as a reload there would.
async function startAtArrival(page: Page) {
  await page.addInitScript((voyage) => {
    if (!sessionStorage.getItem("ocean-drive:voyage:v1")) sessionStorage.setItem("ocean-drive:voyage:v1", voyage);
  }, serializeVoyageState({ ...createInitialVoyageState(), currentStop: "ilha-grande", routeProgress: 4, complete: true }));
  await enterOcean(page, 4);
}

const focusIsInsideSheet = (page: Page) =>
  page.evaluate(() => !!document.activeElement?.closest("[role='dialog']"));

test("the Stop Account is a white Sheet from the right that reads as one continuous scroll", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await sailToFirstStop(page);
  await openStopAccount(page);
  const sheet = openSheet(page);
  await expect(sheet.getByRole("heading", { level: 2, name: "Fernando de Noronha" })).toBeVisible();
  await expect(sheet.getByText("Parada 01 · Dias 2 e 3", { exact: true })).toBeVisible();
  await expect.poll(() => sheet.evaluate((element) => Math.round(element.getBoundingClientRect().right))).toBe(1280);
  const look = await sheet.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
    background: getComputedStyle(element).backgroundColor,
    overflow: getComputedStyle(element).overflowY,
  }));
  expect(look.width).toBeCloseTo(520, -1);
  expect(look.height).toBe(720);
  expect(look.background).toBe("rgb(255, 255, 255)");
  expect(look.overflow).toBe("auto");
  // Intro, three highlights, best season, then the image slots, in that order.
  const account = sheet.locator('[data-slot="stop-account"]');
  await expect(account.getByRole("heading", { level: 3 })).toHaveText(["Destaques", "Melhor época"]);
  await expect(account.getByRole("listitem")).toHaveCount(3);
  await expect(account.locator("figure")).toHaveCount(2);
  await expect(account.getByRole("img").first()).toHaveAccessibleName(/Morro do Pico/);
  const order = await account.evaluate((element) =>
    [...element.querySelectorAll(":scope > div > p, :scope > div > section, :scope > div > figure")].map((child) => child.tagName.toLowerCase()));
  expect(order).toEqual(["p", "section", "section", "figure", "figure"]);
  // The ocean behind is lightly dimmed, not hidden or blurred.
  const overlay = await page.locator('[data-slot="sheet-overlay"]').evaluate((element) => {
    const style = getComputedStyle(element);
    // rgba(r, g, b, a) or oklab(l a b / a): the alpha comes last.
    return { alpha: Number(style.backgroundColor.match(/\/\s*([\d.]+)\)|,\s*([\d.]+)\)$/)?.slice(1).find(Boolean)), filter: style.backdropFilter };
  });
  expect(overlay.alpha).toBeGreaterThan(0);
  expect(overlay.alpha).toBeLessThanOrEqual(0.3);
  expect(overlay.filter).toBe("none");
});

test("a narrow viewport opens the Stop Account from the bottom at nine tenths of the height", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await sailToFirstStop(page);
  await openStopAccount(page);
  const sheet = openSheet(page);
  await expect.poll(() => sheet.evaluate((element) => Math.round(element.getBoundingClientRect().bottom))).toBe(844);
  const box = await sheet.evaluate((element) => element.getBoundingClientRect().toJSON());
  expect(box.left).toBe(0);
  expect(box.width).toBe(390);
  expect(box.height).toBeCloseTo(844 * 0.9, 0);
});

test("Sheets close with X, Escape, and a press on the dimmed ocean, trapping focus and returning it", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await sailToFirstStop(page);
  const sheet = openSheet(page);

  await saibaMais(page).focus();
  await page.keyboard.press("Enter");
  await expect(sheet).toBeVisible();
  await expect.poll(() => focusIsInsideSheet(page)).toBe(true);
  // Tab and Shift+Tab never leave the open Sheet: its focus guards send focus back in.
  for (const key of ["Tab", "Tab", "Tab", "Shift+Tab", "Shift+Tab", "Shift+Tab"]) {
    await page.keyboard.press(key);
    await expect.poll(() => focusIsInsideSheet(page), key).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expectSheetClosed(page);
  await expect(saibaMais(page)).toBeFocused();

  await openStopAccount(page);
  await sheet.getByRole("button", { name: "Fechar", exact: true }).click();
  await expectSheetClosed(page);
  await expect(saibaMais(page)).toBeFocused();

  await openStopAccount(page);
  // The dim covers the ocean to the left of the Sheet.
  await page.mouse.click(120, 360);
  await expectSheetClosed(page);
  await expect(saibaMais(page)).toBeFocused();

  await openChapters(page);
  await page.keyboard.press("Escape");
  await expectSheetClosed(page);
  await expect(chaptersButton(page)).toBeFocused();
  expect((await voyageState(page)).currentStop).toBe("fernando-de-noronha");
});

test("while a Sheet is open, wheel, touch, and keys scroll the Sheet and never move the Ship", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await sailToFirstStop(page);
  await openStopAccount(page);
  const sheet = openSheet(page);
  const scrollTop = () => sheet.evaluate((element) => element.scrollTop);
  await expect.poll(() => focusIsInsideSheet(page)).toBe(true);

  for (const key of ["PageDown", "ArrowDown", "ArrowRight"]) await page.keyboard.press(key);
  await expect.poll(scrollTop).toBeGreaterThan(0);
  const afterKeys = await scrollTop();
  await sheet.hover();
  await page.mouse.wheel(0, 300);
  await expect.poll(scrollTop).toBeGreaterThan(afterKeys);

  // Wheel and touch on the Sheet and on the dimmed ocean never reach the route.
  await page.evaluate(() => {
    const targets = [document.querySelector("[role='dialog']")!, document.querySelector("[data-slot='sheet-overlay']")!];
    for (const target of targets) {
      const { left, top, width, height } = target.getBoundingClientRect();
      const x = left + width / 2;
      const y = top + height * 0.8;
      for (let event = 0; event < 8; event++)
        target.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 200, clientX: x, clientY: y }));
      const touch = (type: string, clientY: number) =>
        target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 9, pointerType: "touch", isPrimary: true, clientX: x, clientY }));
      touch("pointerdown", y);
      for (let step = 1; step <= 10; step++) touch("pointermove", y - step * innerHeight * 0.06);
      touch("pointerup", y - innerHeight * 0.6);
    }
  });
  for (const key of ["PageDown", "ArrowDown", "PageUp", "ArrowUp"]) await page.keyboard.press(key);
  await page.waitForTimeout(1_000);
  await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-settled-stop", "1");
  expect(await voyageState(page)).toMatchObject({ currentStop: "fernando-de-noronha", routeProgress: 1 });
});

test("opening a Stop Account records a Visited Stop, and Capítulos ticks it and marks the current Stop", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(120_000);
  await sailToFirstStop(page);
  expect((await voyageState(page)).visitedStops).toEqual([]);
  await openStopAccount(page);
  await expect.poll(async () => (await voyageState(page)).visitedStops).toEqual(["fernando-de-noronha"]);
  await page.keyboard.press("Escape");
  await expectSheetClosed(page);
  await page.keyboard.press("ArrowDown");
  await expectSettledAt(page, 2);

  await openChapters(page);
  const chapters = openSheet(page).getByRole("navigation", { name: "Paradas da viagem" }).getByRole("button");
  await expect(chapters).toHaveCount(5);
  const names = ["Travessia", "Fernando de Noronha", "Boipeba", "Arquipélago de Abrolhos", "Ilha Grande"];
  for (const [index, name] of names.entries()) {
    const chapter = chapters.nth(index);
    await expect(chapter).toContainText(`0${index}`);
    await expect(chapter).toContainText(name);
    if (index === 1) await expect(chapter).toHaveAccessibleName(/Visitada$/);
    else await expect(chapter).not.toHaveAccessibleName(/Visitada/);
    if (index === 2) {
      await expect(chapter).toHaveAttribute("aria-current", "step");
      await expect(chapter).toContainText("Parada atual");
    } else await expect(chapter).not.toHaveAttribute("aria-current");
  }
  // The tick is a drawn mark, not colour alone.
  await expect(chapters.nth(1).locator("svg")).toHaveCount(1);
});

test("choosing a chapter closes Capítulos and sails the Ship to that Stop without visiting it", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(120_000);
  await enterOcean(page);
  await openChapters(page);
  await openSheet(page).getByRole("button", { name: /^03 Arquipélago de Abrolhos/ }).click();
  await expectSheetClosed(page);
  await expect(chaptersButton(page)).toBeFocused();
  // It sails: the Ship is under way before it settles.
  await expect(page.locator("#voyage-ocean")).not.toHaveAttribute("data-settled-stop", /.*/);
  await expectSettledAt(page, 3, 60_000);
  await expect(stopCard(page).getByRole("heading", { name: "Arquipélago de Abrolhos" })).toBeVisible();
  expect(await voyageState(page)).toMatchObject({ currentStop: "abrolhos", routeProgress: 3, visitedStops: [] });
  await expect(page.locator("#voyage-announcer")).toHaveText("Parada 03 · Arquipélago de Abrolhos.");
});

test("under reduced motion, a chapter jump is a cut", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enterOcean(page);
  await page.evaluate(() => {
    const ocean = document.getElementById("voyage-ocean")!;
    const seen: (string | null)[] = [];
    (window as unknown as { seen: typeof seen }).seen = seen;
    const sample = () => {
      seen.push(ocean.getAttribute("data-settled-stop"));
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await openChapters(page);
  await openSheet(page).getByRole("button", { name: /^04 Ilha Grande/ }).click();
  await expectSheetClosed(page);
  await expectSettledAt(page, 4, 3_000);
  const seen = await page.evaluate(() => (window as unknown as { seen: (string | null)[] }).seen);
  expect(seen.filter((stop) => stop === null)).toEqual([]);
  expect(seen.filter((stop) => stop !== "0" && stop !== "4")).toEqual([]);
});

test("“Recomeçar viagem” in Capítulos clears Voyage State and returns to Stop 00", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(90_000);
  await sailToFirstStop(page);
  await openStopAccount(page);
  await page.keyboard.press("Escape");
  await expectSheetClosed(page);
  await expect.poll(async () => (await voyageState(page)).visitedStops).toEqual(["fernando-de-noronha"]);
  await openChapters(page);
  await openSheet(page).getByRole("button", { name: "Recomeçar viagem", exact: true }).click();
  await expectSheetClosed(page);
  await expectSettledAt(page, 0);
  await expect(stopCard(page).getByRole("heading", { name: "Travessia" })).toBeVisible();
  expect(await voyageState(page)).toMatchObject({ currentStop: "partida", visitedStops: [], routeProgress: 0, complete: false });
  await expect(chaptersButton(page)).toBeFocused();
  await expect(page.locator("#voyage-announcer")).toHaveText("Viagem reiniciada. De volta ao início.");
});

test("“Modo leitura” in Capítulos opens the Accessible Editorial Presentation", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(90_000);
  await sailToFirstStop(page);
  const before = await voyageState(page);
  await openChapters(page);
  await openSheet(page).getByRole("button", { name: "Modo leitura", exact: true }).click();
  await expectSheetClosed(page);
  await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "editorial");
  await expect(page.locator("#voyage-editorial-heading")).toBeFocused();
  expect(await voyageState(page)).toEqual({ ...before, presentation: "editorial" });
});

test("the Arrival's closing card opens the itinerary and restarts the Voyage, with no personal-data form", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(90_000);
  await startAtArrival(page);
  const card = stopCard(page);
  await expect(card).toHaveAttribute("data-visible", "true");
  await expect(card.getByText("Parada 04 · Chegada", { exact: true })).toBeVisible();
  await expect(card.getByRole("heading", { level: 2, name: "Ilha Grande" })).toBeVisible();
  await expect(card.getByText("Próxima partida · setembro de 2027", { exact: true })).toBeVisible();
  await expect(card.getByRole("button")).toHaveText(["Ver roteiro completo", "Saiba mais", "Recomeçar viagem"]);
  // The itinerary is the closing card's white pill with a coral dot.
  expect(await card.getByRole("button", { name: "Ver roteiro completo" }).evaluate((button) => getComputedStyle(button).backgroundColor)).toBe("rgb(255, 255, 255)");

  const itinerary = card.getByRole("button", { name: "Ver roteiro completo", exact: true });
  await itinerary.click();
  const sheet = openSheet(page);
  await expect(sheet.getByRole("heading", { level: 2, name: "Roteiro completo" })).toBeVisible();
  await expect(sheet.getByText("Próxima partida · setembro de 2027", { exact: true })).toBeVisible();
  await expect(sheet.getByRole("listitem")).toHaveCount(9);
  await expect(sheet.getByRole("listitem").last()).toContainText("Angra dos Reis");
  await expect(page.locator("form, input, select, textarea, [contenteditable]")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expectSheetClosed(page);
  await expect(itinerary).toBeFocused();

  // The Arrival's own account stays open to visit.
  await openStopAccount(page);
  await expect(openSheet(page).getByRole("heading", { level: 2, name: "Ilha Grande" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expectSheetClosed(page);
  await expect.poll(async () => (await voyageState(page)).visitedStops).toEqual(["ilha-grande"]);

  await card.getByRole("button", { name: "Recomeçar viagem", exact: true }).click();
  await expectSettledAt(page, 0);
  await expect(card.getByRole("heading", { name: "Travessia" })).toBeVisible();
  await expect(page.locator("#voyage-ocean")).toBeFocused();
  expect(await voyageState(page)).toMatchObject({ currentStop: "partida", visitedStops: [], routeProgress: 0, complete: false });
});
