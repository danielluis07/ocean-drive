import { expect, type Page } from "@playwright/test";
import { test } from "@/tests/browser/journey-fixture";
import { settleScroll } from "@/tests/browser/scroll";
import { expectSettledAt, openEditorialStop, voyageRoute } from "@/tests/browser/editorial-route";

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
  await page.goto("/");
  await expect(page.locator(".presentation-bar")).toContainText("O oceano está pronto");
  await openEditorialStop(page, voyageRoute[0]);
  const stops = await tabThrough(page, 30);
  expect(stops.filter((stop) => !stop.indicated || !stop.unobscured)).toEqual([]);
  // Reaching the final link and leaving it proves the document has no trap.
  const labels = stops.map((stop) => stop.label);
  const finalControl = keepsLinksOutOfTabOrder() ? "button Voltar à rota" : "a Voltar ao início";
  const last = labels.indexOf(finalControl);
  expect(last).toBeGreaterThanOrEqual(0);
  expect(labels.slice(last + 1).some((label) => label === "(outside page content)" || label === labels[0])).toBe(true);
});

test("3D keyboard focus reaches the Stop opener without traps and stays visible", { tag: "@critical" }, async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await page.keyboard.press("ArrowDown");
  await expectSettledAt(page, 1);
  const stops = await tabThrough(page, 12);
  const labels = stops.map((stop) => stop.label);
  expect(labels).toEqual(expect.arrayContaining([
    expect.stringContaining("Versão em texto"),
    expect.stringContaining("Fernando de Noronha"),
  ]));
  expect(stops.filter((stop) => !stop.indicated || !stop.unobscured)).toEqual([]);
  // Route keys never capture Tab, and Tab never moves the Ship.
  expect((await page.evaluate(() => JSON.parse(sessionStorage.getItem("ocean-drive:voyage:v1")!).state)).currentStop).toBe("fernando-de-noronha");
});

test("Escape closes Caderno before the reader and never changes presentation", { tag: "@critical" }, async ({ page }) => {
  await page.goto("/");
  await openEditorialStop(page, voyageRoute[0]);
  const summary = page.locator("#fernando-de-noronha .logbook summary:visible");
  // Escape elsewhere on the page never closes a Caderno or pulls focus to it.
  await summary.click();
  await expect(page.locator("main details.logbook[open]")).toHaveCount(1);
  const quality = page.getByRole("combobox", { name: "Qualidade" });
  await quality.focus();
  await page.keyboard.press("Escape");
  await expect(page.locator("main details.logbook[open]")).toHaveCount(1);
  await expect(quality).toBeFocused();
  await summary.focus();
  await page.keyboard.press("Escape");
  await expect(page.locator("main details.logbook[open]")).toHaveCount(0);
  await expect(page.locator("#fernando-de-noronha-signal-1")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "editorial");
  await expect(page.locator("#fernando-de-noronha-signal-1")).toBeVisible();

  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  const reader = page.getByRole("region", { name: "Relato da parada" });
  await reader.locator(".logbook summary:visible").focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(reader).toBeVisible();
  await expect(page.locator("#fernando-de-noronha-signal-1")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(reader).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "three-dimensional");
  await expect(page.locator("#voyage-ocean")).toBeFocused();
});
