import { expect, type Page } from "@playwright/test";
import { test } from "@/tests/browser/journey-fixture";
import {
  enterOcean,
  expectSettledAt,
  openStopAccount,
  stopCard,
  stopReader,
  voyageState,
} from "@/tests/browser/editorial-route";

test.use({ actionTimeout: 15_000 });

// The ocean opens on its own; the Visitor never needs an entry step.
const enter = (page: Page) => enterOcean(page);

// A burst of wheel events in one task, like a trackpad gesture. Sending them one
// round-trip at a time would let the controlled clock settle between events.
async function wheelOverOcean(page: Page, deltaY: number, events = 1) {
  await page.locator("#voyage-ocean canvas").evaluate(
    (canvas, { deltaY, events }) => {
      const { left, top, width, height } = canvas.getBoundingClientRect();
      for (let event = 0; event < events; event++)
        canvas.dispatchEvent(
          new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            deltaY,
            clientX: left + width * 0.8,
            clientY: top + height * 0.8,
          }),
        );
    },
    { deltaY, events },
  );
}

test(
  "scrolling sails the Ship along the route and settles on the nearest Stop",
  { tag: "@critical" },
  async ({ page }) => {
    test.setTimeout(90_000);
    await enter(page);
    const ocean = page.locator("#voyage-ocean");
    // Several small wheel steps, like a trackpad, carry the Ship past halfway.
    await wheelOverOcean(page, 110, 6);
    // Under way, the Ship is between Stops.
    await expect(ocean).not.toHaveAttribute("data-settled-stop", /.*/);
    await expectSettledAt(page, 1);
    await expect(page.locator("#voyage-announcer")).toHaveText(
      "Parada 01 · Fernando de Noronha.",
    );
    await expect
      .poll(async () => (await voyageState(page)).currentStop)
      .toBe("fernando-de-noronha");
    expect((await voyageState(page)).routeProgress).toBe(1);
    // A short scroll back that does not reach halfway returns to the same Stop.
    await wheelOverOcean(page, -300);
    await expect(ocean).not.toHaveAttribute("data-settled-stop", /.*/);
    await expectSettledAt(page, 1);
    // A longer scroll back settles on the previous Stop.
    await wheelOverOcean(page, -110, 6);
    await expectSettledAt(page, 0);
    expect((await voyageState(page)).currentStop).toBe("partida");
    expect(
      await page.evaluate(() => document.documentElement.scrollTop),
    ).toBe(0);
  },
);

test(
  "arrow and page keys move exactly one Stop",
  { tag: "@critical" },
  async ({ page }) => {
    test.setTimeout(120_000);
    await enter(page);
    await page.keyboard.press("ArrowDown");
    await expectSettledAt(page, 1);
    await page.keyboard.press("PageDown");
    await expectSettledAt(page, 2);
    await page.keyboard.press("ArrowRight");
    await expectSettledAt(page, 3);
    await page.keyboard.press("PageUp");
    await expectSettledAt(page, 2);
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowLeft");
    await expectSettledAt(page, 0);
    expect((await voyageState(page)).currentStop).toBe("partida");
  },
);

test(
  "touch swipes sail the Ship without steering it",
  { tag: "@critical" },
  async ({ page }) => {
    test.setTimeout(90_000);
    await enter(page);
    await page.locator("#voyage-ocean").evaluate((ocean) => {
      const { left, top, width, height } = ocean.getBoundingClientRect();
      const x = left + width / 2;
      const fire = (type: string, y: number, dx = 0) =>
        ocean
          .querySelector("canvas")!
          .dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              pointerId: 7,
              pointerType: "touch",
              isPrimary: true,
              clientX: x + dx,
              clientY: y,
            }),
          );
      const start = top + height * 0.85;
      fire("pointerdown", start);
      // Sideways travel is ignored: only progress along the route changes.
      for (let step = 1; step <= 10; step++)
        fire("pointermove", start - step * innerHeight * 0.05, step * 30);
      fire("pointerup", start - innerHeight * 0.5, 300);
    });
    await expectSettledAt(page, 1);
    expect((await voyageState(page)).currentStop).toBe("fernando-de-noronha");
  },
);

test(
  "the settled Stop opens its account, which pauses the route and records a visit",
  { tag: "@critical" },
  async ({ page }) => {
    test.setTimeout(90_000);
    await enter(page);
    // The opening has no account to open.
    await expect(stopCard(page).getByRole("button")).toHaveCount(0);
    await page.keyboard.press("ArrowDown");
    await expectSettledAt(page, 1);
    await openStopAccount(page);
    await expect(page.locator("#fernando-de-noronha-signal-1")).toBeFocused();
    await expect
      .poll(async () => (await voyageState(page)).visitedStops)
      .toEqual(["fernando-de-noronha"]);
    // While reading, keys and wheel belong to the reader, never to the route.
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("PageDown");
    await page.waitForTimeout(800);
    expect((await voyageState(page)).currentStop).toBe("fernando-de-noronha");
    await page.keyboard.press("Escape");
    await expect(stopReader(page)).toBeHidden();
    // Focus returns to the card's “Saiba mais”.
    await expect(
      stopCard(page).getByRole("button", { name: "Saiba mais", exact: true }),
    ).toBeFocused();
    expect((await voyageState(page)).routeProgress).toBe(1);
  },
);

test(
  "Voyage State survives reload and history, completes at the Arrival, and clears on restart",
  { tag: "@critical" },
  async ({ page }) => {
    test.setTimeout(180_000);
    await enter(page);
    for (let stop = 0; stop < 4; stop++) await page.keyboard.press("ArrowDown");
    await expectSettledAt(page, 4, 60_000);
    await expect
      .poll(async () => (await voyageState(page)).complete)
      .toBe(true);
    const arrived = await voyageState(page);
    expect(arrived).toMatchObject({
      currentStop: "ilha-grande",
      visitedStops: [],
      routeProgress: 4,
      presentation: "three-dimensional",
    });

    // A reload returns to the ocean at the same Stop.
    await page.reload();
    await expectSettledAt(page, 4, 60_000);
    await expect(stopCard(page).getByRole("heading", { name: "Ilha Grande" })).toBeVisible();
    expect(await voyageState(page)).toEqual(arrived);

    // The controlled test clock does not drive a document restored by history,
    // so read the persisted Voyage State there and reload before sailing on.
    await page.goto("about:blank");
    await page.goBack();
    await expect
      .poll(async () => (await voyageState(page)).currentStop)
      .toBe("ilha-grande");
    expect((await voyageState(page)).complete).toBe(true);
    await page.reload();
    await expectSettledAt(page, 4, 60_000);

    await openStopAccount(page);
    await stopReader(page)
      .getByRole("button", { name: "Recomeçar viagem", exact: true })
      .click();
    await expect(stopReader(page)).toBeHidden();
    await expectSettledAt(page, 0);
    await expect
      .poll(async () => (await voyageState(page)).complete)
      .toBe(false);
    expect(await voyageState(page)).toMatchObject({
      currentStop: "partida",
      visitedStops: [],
      routeProgress: 0,
    });
  },
);

test(
  "reduced motion keeps the 3D voyage and cuts between Stops instead of sailing",
  { tag: "@critical" },
  async ({ page }) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await enter(page);
    // Sample the Ship's place on every frame: it is only ever at a Stop.
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
    await page.keyboard.press("ArrowDown");
    await expectSettledAt(page, 1, 3_000);
    await page.keyboard.press("ArrowDown");
    await expectSettledAt(page, 2, 3_000);
    const seen = await page.evaluate(
      () => (window as unknown as { seen: (string | null)[] }).seen,
    );
    expect(seen.filter((stop) => stop === null)).toEqual([]);
    await expect(page.locator(".voyage")).toHaveAttribute(
      "data-presentation",
      "three-dimensional",
    );
  },
);
