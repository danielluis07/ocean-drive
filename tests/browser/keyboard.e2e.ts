import { expect, type Page } from "@playwright/test";
import { test } from "@/tests/browser/journey-fixture";
import { settleScroll } from "@/tests/browser/scroll";
import {
  enterOcean,
  expectSettledAt,
  expectSheetClosed,
  openEditorialStop,
  openSheet,
  openStopAccount,
  readingModeLink,
  returnToOceanButton,
  saibaMais,
  voyageRoute,
} from "@/tests/browser/editorial-route";

// Playwright's WebKit follows Safari: sequential focus skips links unless full
// keyboard access is used, and its Windows build keeps links out even then.
const keepsLinksOutOfTabOrder = () => test.info().project.name === "webkit";

type FocusStop = { label: string; indicated: boolean; unobscured: boolean };

// Read what a sighted keyboard user sees at the focused element: a real
// outline, and at least part of the element not covered by sticky UI.
async function focusStop(page: Page): Promise<FocusStop> {
  // Measure focus styles at rest, not mid-transition (the skip link slides in).
  await page.evaluate(() => Promise.all((document.activeElement?.getAnimations() ?? []).map((animation) => animation.finished)));
  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const points = [[0.5, 0.5], [0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]]
      .map(([x, y]) => [rect.left + rect.width * x, rect.top + rect.height * y])
      .filter(([x, y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight);
    return {
      label: `${element.tagName.toLowerCase()} ${(element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 40)}`,
      indicated: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2,
      unobscured: points.some(([x, y]) => {
        const hit = document.elementFromPoint(x, y);
        return !!hit && (element === hit || element.contains(hit) || hit.contains(element));
      }),
    };
  });
}

async function tabThrough(page: Page, stops: number) {
  const seen: FocusStop[] = [];
  const tab = keepsLinksOutOfTabOrder() ? "Alt+Tab" : "Tab";
  await page.getByRole("link", { name: "Pular para o conteúdo" }).focus();
  for (let index = 0; index < stops; index++) {
    await page.keyboard.press(tab);
    // Measure where focus scrolling comes to rest, not mid smooth-scroll.
    await settleScroll(page);
    // Engines differ after the last control: focus wraps, moves to browser UI, or,
    // in development only, enters the Next.js overlay, which is not shipped content.
    if (await page.evaluate(() => !document.hasFocus() || document.activeElement === document.body
      || document.activeElement?.tagName === "NEXTJS-PORTAL")) {
      seen.push({ label: "(outside page content)", indicated: true, unobscured: true });
      continue;
    }
    seen.push(await focusStop(page));
  }
  return seen;
}

test("editorial keyboard focus is always visible, unobscured, and never trapped", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(120_000);
  await enterOcean(page);
  await readingModeLink(page).click();
  await openEditorialStop(page, voyageRoute[0]);
  const stops = await tabThrough(page, 30);
  expect(stops.filter((stop) => !stop.indicated || !stop.unobscured)).toEqual([]);
  expect(stops.map((stop) => stop.label)).toContain("button Voltar ao oceano");
  // Reaching the final link and leaving it proves the document has no trap.
  const labels = stops.map((stop) => stop.label);
  const finalControl = keepsLinksOutOfTabOrder() ? "button Recomeçar viagem" : "a Voltar ao início";
  const last = labels.indexOf(finalControl);
  expect(last).toBeGreaterThanOrEqual(0);
  expect(labels.slice(last + 1).some((label) => label === "(outside page content)" || label === labels[0])).toBe(true);
});

test("3D chrome and the Stop Card are keyboard reachable in order, with visible focus and no traps", { tag: "@critical" }, async ({ page }) => {
  // Every Tab waits for scrolling and focus styles to settle over a rendering ocean.
  test.setTimeout(180_000);
  await enterOcean(page);
  await page.keyboard.press("ArrowDown");
  await expectSettledAt(page, 1);
  const stops = await tabThrough(page, 8);
  const labels = stops.map((stop) => stop.label);
  const order = ["Som ambiente", "Capítulos", "Saiba mais", ...(keepsLinksOutOfTabOrder() ? [] : ["Modo leitura"])]
    .map((name) => labels.findIndex((label) => label.includes(name)));
  expect(order.every((index) => index >= 0)).toBe(true);
  expect(order).toEqual([...order].sort((a, b) => a - b));
  expect(stops.filter((stop) => !stop.indicated || !stop.unobscured)).toEqual([]);
  expect(labels.some((label) => label === "(outside page content)" || label === labels[0])).toBe(true);
  // Route keys never capture Tab, and Tab never moves the Ship.
  expect((await page.evaluate(() => JSON.parse(sessionStorage.getItem("ocean-drive:voyage:v1")!).state)).currentStop).toBe("fernando-de-noronha");

  // Enter on “Saiba mais” opens the Stop Account; a key that sails hands focus back to the ocean.
  const action = page.getByRole("button", { name: "Saiba mais", exact: true });
  await action.focus();
  await page.keyboard.press("Enter");
  await expect(openSheet(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expectSheetClosed(page);
  await expect(action).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#voyage-ocean")).toBeFocused();
  await expectSettledAt(page, 2);
});

test("Escape closes only the open Sheet and never changes presentation", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(90_000);
  await enterOcean(page);
  await page.keyboard.press("ArrowDown");
  await expectSettledAt(page, 1);
  await openStopAccount(page);
  await page.keyboard.press("Escape");
  await expectSheetClosed(page);
  await expect(saibaMais(page)).toBeFocused();
  // With nothing open, Escape does nothing.
  await page.keyboard.press("Escape");
  await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "three-dimensional");
  await expect(saibaMais(page)).toBeFocused();

  await readingModeLink(page).click();
  await openEditorialStop(page, voyageRoute[0]);
  await page.keyboard.press("Escape");
  await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "editorial");
  await expect(page.locator("#fernando-de-noronha-title")).toBeFocused();
  await expect(returnToOceanButton(page)).toBeVisible();
});
