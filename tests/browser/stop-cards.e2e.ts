import { expect, type Page } from "@playwright/test";
import { test } from "@/tests/browser/journey-fixture";
import {
  enterOcean,
  expectSettledAt,
  readingModeLink,
  stopCard,
} from "@/tests/browser/editorial-route";

type Box = { left: number; top: number; right: number; bottom: number };

function overlaps(a: Box, b: Box) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

// The scene writes where the settled Ship and Landmark appear as custom
// properties on the ocean surface; read them as screen boxes.
async function stageBoxes(page: Page) {
  return page.locator("#voyage-ocean").evaluate((ocean) => {
    const style = getComputedStyle(ocean);
    const circle = (name: string) => {
      const [x, y, radius] = ["x", "y", "radius"].map((axis) => parseFloat(style.getPropertyValue(`--${name}-${axis}`)));
      return Number.isFinite(x) ? { left: x - radius, top: y - radius, right: x + radius, bottom: y + radius } : null;
    };
    const box = (element: Element) => {
      const { left, top, right, bottom } = element.getBoundingClientRect();
      return { left, top, right, bottom };
    };
    return {
      ship: circle("ship")!,
      landmark: circle("landmark"),
      card: box(ocean.querySelector('[data-slot="stop-card"]')!),
      chrome: [...ocean.querySelectorAll("header button, header span, a")]
        .filter((element) => element.checkVisibility())
        .map((element) => ({ name: element.textContent || element.getAttribute("aria-label"), ...box(element) })),
    };
  });
}

// A burst of wheel events in one task, like a trackpad gesture.
async function wheelOverOcean(page: Page, deltaY: number, events = 1) {
  await page.locator("#voyage-ocean canvas").evaluate((canvas, { deltaY, events }) => {
    const { left, top, width, height } = canvas.getBoundingClientRect();
    for (let event = 0; event < events; event++)
      canvas.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY, clientX: left + width * 0.8, clientY: top + height * 0.8 }));
  }, { deltaY, events });
}

test("nothing but the chrome and the current Stop Card stands over the ocean", { tag: "@critical" }, async ({ page }) => {
  await enterOcean(page);
  const ocean = page.locator("#voyage-ocean");
  await expect(ocean.getByText("Travessia", { exact: true }).first()).toBeVisible();
  await expect(ocean.getByRole("button", { name: "Som ambiente" })).toHaveAttribute("aria-pressed", "false");
  const buttons = await ocean.getByRole("button").evaluateAll((elements) =>
    elements.filter((element) => element.checkVisibility()).map((element) => element.getAttribute("aria-label") ?? element.textContent));
  expect(buttons).toEqual(["Som ambiente", "Capítulos"]);
  const links = await page.getByRole("link").evaluateAll((elements) =>
    elements.filter((element) => element.checkVisibility() && !element.matches(".skip-link")).map((element) => element.textContent));
  expect(links).toEqual(["Modo leitura"]);
  // The only other visible content over the ocean is the current Stop Card.
  const content = await ocean.evaluate((section) =>
    [...section.querySelectorAll("p, h2, h3, span")]
      .filter((element) => element.checkVisibility({ visibilityProperty: true }) && !element.closest("header, [data-slot='stop-card']"))
      .map((element) => element.textContent));
  expect(content).toEqual([]);
  await expect(page.locator("main > :not(#voyage-ocean):visible")).toHaveCount(0);
  for (const legacy of ["Explorar em 3D", "Preparar 3D", "Versão em texto"]) {
    await expect(page.getByText(legacy)).toHaveCount(0);
  }
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.getByText("Mar aberto")).toHaveCount(0);
});

test("a Stop Card fades in when the Ship settles and out when scrolling resumes", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(90_000);
  await enterOcean(page);
  const card = stopCard(page);
  await page.keyboard.press("ArrowDown");
  // Under way, the card fades out.
  await expect(card).toHaveAttribute("data-visible", "false");
  await expectSettledAt(page, 1);
  await expect(card).toHaveAttribute("data-visible", "true");
  await expect(card).toBeVisible();
  const transition = await card.evaluate((element) => {
    const style = getComputedStyle(element);
    return { property: style.transitionProperty, duration: parseFloat(style.transitionDuration) };
  });
  expect(transition.property).toContain("opacity");
  expect(transition.duration).toBeGreaterThan(0);
  await expect.poll(() => card.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");

  await expect(card.getByText("Parada 01", { exact: true })).toBeVisible();
  await expect(card.getByText("Pernambuco · Dia 2", { exact: true })).toBeVisible();
  await expect(card.getByRole("heading", { level: 2, name: "Fernando de Noronha" })).toBeVisible();
  await expect(card.getByText(/^Um arquipélago vulcânico/)).toBeVisible();
  const label = card.getByText("Parada 01", { exact: true });
  expect(await label.evaluate((element) => getComputedStyle(element).fontFamily)).toMatch(/Geist Mono|monospace/i);
  const action = card.getByRole("button", { name: "Saiba mais", exact: true });
  await expect(action).toBeVisible();
  const look = await action.evaluate((button) => {
    const dot = button.querySelector("span[aria-hidden='true']")!;
    const style = getComputedStyle(button);
    return {
      background: style.backgroundColor,
      radius: parseFloat(style.borderRadius),
      height: button.getBoundingClientRect().height,
      dot: getComputedStyle(dot).backgroundColor,
    };
  });
  // A white pill with a coral dot.
  expect(look.background).toBe("rgb(255, 255, 255)");
  expect(look.radius).toBeGreaterThanOrEqual(look.height / 2);
  expect(look.dot).toBe("rgb(255, 107, 74)");

  await wheelOverOcean(page, 110, 16);
  // Hiding makes the card inert at once, then it fades out while under way.
  await expect
    .poll(() => card.evaluate((element) => element.dataset.visible === "false" && (element as HTMLElement).inert))
    .toBe(true);
  await expectSettledAt(page, 2);
  await expect(card.getByRole("heading", { name: "Boipeba" })).toBeVisible();
});

test("Stop 00 opens with the brand and Core Promise, and its scroll cue never returns in the same tab", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(120_000);
  await enterOcean(page);
  const card = stopCard(page);
  await expect(card.getByRole("heading", { level: 2, name: "Travessia" })).toBeVisible();
  await expect(card.getByText("O Brasil visto do mar.", { exact: true })).toBeVisible();
  await expect(card.getByRole("button")).toHaveCount(0);
  const cue = card.getByText("Role para navegar", { exact: true });
  await expect(cue).toBeVisible();
  await expect(page.getByText("Role para navegar")).toHaveCount(1);

  await page.keyboard.press("ArrowDown");
  await expectSettledAt(page, 1);
  await page.keyboard.press("ArrowUp");
  await expectSettledAt(page, 0);
  await expect(card.getByRole("heading", { name: "Travessia" })).toBeVisible();
  await expect(cue).toHaveCount(0);

  await page.reload();
  await expectSettledAt(page, 0, 60_000);
  await expect(card).toHaveAttribute("data-visible", "true");
  await expect(card.getByRole("heading", { name: "Travessia" })).toBeVisible();
  await expect(page.getByText("Role para navegar")).toHaveCount(0);
});

test("each Stop change is announced once through the live region", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(90_000);
  await enterOcean(page);
  const announcer = page.locator("#voyage-announcer");
  await announcer.evaluate((region) => {
    const history: string[] = [];
    (window as unknown as { announcements: string[] }).announcements = history;
    new MutationObserver(() => history.push(region.textContent ?? "")).observe(region, { childList: true, characterData: true, subtree: true });
  });
  const announcements = () => page.evaluate(() => (window as unknown as { announcements: string[] }).announcements.filter(Boolean));
  await page.keyboard.press("ArrowDown");
  await expectSettledAt(page, 1);
  await expect.poll(announcements).toEqual(["Parada 01 · Fernando de Noronha."]);
  // Sailing a little way out and back to the same Stop announces nothing new.
  await wheelOverOcean(page, 200);
  await expect(page.locator("#voyage-ocean")).not.toHaveAttribute("data-settled-stop", /.*/);
  await wheelOverOcean(page, -200);
  await expectSettledAt(page, 1);
  await page.waitForTimeout(600);
  expect(await announcements()).toEqual(["Parada 01 · Fernando de Noronha."]);
  // The card itself is never a live region.
  await expect(page.locator("#voyage-ocean [aria-live], #voyage-ocean [role='status']")).toHaveCount(0);
});

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "landscape phone", width: 844, height: 390 },
  { name: "small landscape phone", width: 568, height: 320 },
  { name: "portrait phone", width: 390, height: 844 },
  { name: "narrow portrait phone", width: 320, height: 568 },
] as const;

for (const viewport of viewports) {
  test(`${viewport.name}: Stop Cards sit beside the Ship, clear of it, its Landmark, and the chrome`, { tag: "@critical" }, async ({ page }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await enterOcean(page);
    for (let stop = 0; stop <= 4; stop++) {
      if (stop > 0) {
        await page.keyboard.press("ArrowDown");
        await expectSettledAt(page, stop);
      }
      await expect(stopCard(page)).toHaveAttribute("data-visible", "true");
      await expect(stopCard(page)).toBeVisible();
      const { ship, landmark, card, chrome } = await stageBoxes(page);
      const state = `${viewport.name} · Stop 0${stop}`;
      expect(card.left, state).toBeGreaterThanOrEqual(0);
      expect(card.top, state).toBeGreaterThanOrEqual(0);
      expect(card.right, state).toBeLessThanOrEqual(viewport.width);
      expect(card.bottom, state).toBeLessThanOrEqual(viewport.height);
      expect(overlaps(card, ship), `${state}: card covers the Ship`).toBe(false);
      if (landmark) expect(overlaps(card, landmark), `${state}: card covers the Landmark`).toBe(false);
      for (const control of chrome) expect(overlaps(card, control), `${state}: card covers ${control.name}`).toBe(false);
      // Beside on landscape, below on portrait.
      if (viewport.width > viewport.height) expect(card.left, state).toBeGreaterThanOrEqual(ship.right);
      else expect(card.top, state).toBeGreaterThanOrEqual(ship.bottom);
    }
    await expect(readingModeLink(page)).toBeVisible();
  });
}
