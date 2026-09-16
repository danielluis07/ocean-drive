import { expect, type Locator, type Page } from "@playwright/test";
import { test } from "@/tests/browser/journey-fixture";
import { openEditorialStop, voyageRoute } from "@/tests/browser/editorial-route";

type Box = { x: number; y: number; width: number; height: number };

const checkpoints = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "portrait phone", width: 390, height: 844 },
  { name: "landscape phone", width: 844, height: 390 },
  { name: "200% zoom of 1280×1024", width: 640, height: 512 },
  { name: "200% zoom of 1920×1080", width: 960, height: 540 },
  { name: "400% reflow of 1280×1024", width: 320, height: 256 },
] as const;

// WCAG 1.4.12 text-spacing overrides.
const textSpacing = `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
p { margin-bottom: 2em !important; }`;

async function expectNoOverflowOrClipping(page: Page, state: string) {
  const problems = await page.evaluate(() => {
    const found: string[] = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) found.push(`page overflow ${document.documentElement.scrollWidth} > ${innerWidth}`);
    for (const element of document.querySelectorAll<HTMLElement>("main *")) {
      if (element.closest(".visually-hidden, [aria-hidden='true'], canvas") || !element.checkVisibility()) continue;
      const style = getComputedStyle(element);
      const clips = ["hidden", "clip"].includes(style.overflowX);
      const text = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim());
      if (clips && text && element.scrollWidth > element.clientWidth + 1) {
        found.push(`clipped ${element.tagName.toLowerCase()}.${element.className}: ${element.textContent!.trim().slice(0, 30)}`);
      }
    }
    return found;
  });
  expect(problems, state).toEqual([]);
}

// A control is reachable when it can be scrolled to and receives the pointer at its center.
async function expectReachable(locator: Locator, state: string) {
  await locator.scrollIntoViewIfNeeded();
  const box = (await locator.boundingBox())!;
  const viewport = locator.page().viewportSize()!;
  expect(box.x, state).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, state).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y, state).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height, state).toBeLessThanOrEqual(viewport.height + 1);
  const hit = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return !!target && (element === target || element.contains(target));
  });
  expect(hit, `${state}: pointer reaches control`).toBe(true);
}

function overlaps(a: Box, b: Box) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

for (const checkpoint of checkpoints) {
  test(`${checkpoint.name}: both presentations fit, stay reachable, and never collide`, { tag: "@critical" }, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: checkpoint.width, height: checkpoint.height });
    await page.goto("/");
    await expect(page.locator(".presentation-bar")).toContainText("O oceano está pronto");
    await expectNoOverflowOrClipping(page, "editorial entry");
    await openEditorialStop(page, voyageRoute[0]);
    await page.locator("#fernando-de-noronha .logbook summary:visible").click();
    await expectReachable(page.getByRole("link", { name: /Acessar fonte/ }).first(), "editorial source");
    await expectNoOverflowOrClipping(page, "editorial Caderno");

    await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
    const reader = page.getByRole("region", { name: "Relato da parada" });
    await expect(reader).toBeVisible();
    await expectReachable(reader.getByRole("button", { name: "Voltar ao mar", exact: true }), "3D reader departure");
    await reader.locator(".logbook summary:visible").click();
    await expectReachable(reader.getByRole("link", { name: /Acessar fonte/ }).first(), "3D reader source");
    await expectReachable(reader.getByRole("button", { name: "Voltar ao sinal", exact: true }), "3D Caderno return");
    await expectNoOverflowOrClipping(page, "3D Caderno");
    await reader.getByRole("button", { name: "Voltar ao sinal", exact: true }).click();
    await reader.getByRole("button", { name: "Voltar ao mar", exact: true }).click();
    await expect(reader).toBeHidden();
    // Back on the route, the settled Stop's opener stands clear of the chrome.
    const opener = page.getByRole("button", { name: /Parada 01 Fernando de Noronha/ });
    await expect(opener).toBeVisible();
    await expectReachable(opener, "Stop opener");
    expect(overlaps((await opener.boundingBox())!, (await page.locator(".presentation-bar").boundingBox())!), "Stop opener obscured").toBe(false);
    await expectReachable(page.getByRole("link", { name: "Versão em texto", exact: true }), "text version");
    await expectNoOverflowOrClipping(page, "3D waters");
  });
}

test("text spacing and system-font fallback keep content unclipped at phone width", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(90_000);
  await page.route("**/*.woff2", (route) => route.abort());
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await page.addStyleTag({ content: textSpacing });
  await expectNoOverflowOrClipping(page, "editorial entry with text spacing");
  await openEditorialStop(page, voyageRoute[0]);
  await page.locator("#fernando-de-noronha .logbook summary:visible").click();
  await expectNoOverflowOrClipping(page, "Caderno with text spacing");
  await expectReachable(page.getByRole("button", { name: "Voltar ao sinal", exact: true }), "Caderno return with text spacing");
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await expectNoOverflowOrClipping(page, "3D reader with text spacing");
  await expectReachable(page.getByRole("button", { name: "Voltar ao mar", exact: true }), "3D departure with text spacing");
});

test("the viewport extends into safe areas so edge controls can respect insets", { tag: "@critical" }, async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /viewport-fit=cover/);
});
