import { expect, type Page } from "@playwright/test";
import { test } from "@/tests/browser/journey-fixture";
import type { VoyageState } from "@/lib/voyage-state";
import {
  enterOcean,
  expectOceanReady,
  expectSettledAt,
  expectSheetClosed,
  openEditorialStop,
  openSheet,
  openStopAccount,
  readingModeLink,
  returnToOceanButton,
  voyageRoute,
  voyageState,
} from "@/tests/browser/editorial-route";

const ocean = "#voyage-ocean";

// Reading mode opens at the current Stop's passage, or its heading at Stop 00.
function editorialPassage(state: VoyageState) {
  return state.currentStop === "partida" ? "#voyage-editorial-heading" : `#${state.currentStop}-title`;
}

// Voyage State is presentation-independent: everything but the active
// presentation must survive a switch.
function presentationIndependentState(
  state: VoyageState,
): Partial<VoyageState> {
  const copy: Partial<VoyageState> = { ...state };
  delete copy.presentation;
  return copy;
}

// Switch presentation with “Modo leitura” or “Voltar ao oceano”, checking focus
// and scroll position, that no Sheet is open, and unchanged Voyage State,
// including a moment later.
async function switchPresentation(page: Page) {
  const before = await voyageState(page);
  const toReading = before.presentation === "three-dimensional";
  await (toReading ? readingModeLink(page) : returnToOceanButton(page)).click();
  const focus = page.locator(toReading ? editorialPassage(before) : ocean);
  await expect(focus).toBeFocused();
  await expect(focus).toBeInViewport();
  await expect(openSheet(page)).toHaveCount(0);
  const switched = await voyageState(page);
  expect(switched.presentation).toBe(
    toReading ? "editorial" : "three-dimensional",
  );
  expect(presentationIndependentState(switched)).toEqual(
    presentationIndependentState(before),
  );
  await page.waitForTimeout(600);
  expect(presentationIndependentState(await voyageState(page))).toEqual(
    presentationIndependentState(switched),
  );
}

test(
  "switching presentations is atomic at the opening, at a Stop, around every Stop Account, and at the Arrival",
  { tag: "@critical" },
  async ({ page }) => {
    test.setTimeout(240_000);
    await enterOcean(page);
    await switchPresentation(page);
    // The fictional-project disclosure appears exactly once, always shown.
    await expect(page.locator('main [data-slot="disclosure"]')).toHaveCount(1);
    await switchPresentation(page);
    await page.keyboard.press("ArrowDown");
    await expectSettledAt(page, 1);
    await switchPresentation(page);
    await switchPresentation(page);
    await expectSettledAt(page, 1);
    await switchPresentation(page);

    for (const stop of voyageRoute) {
      await openEditorialStop(page, stop);
      // The Stop read in the editorial text is where the Ship waits in the ocean.
      await switchPresentation(page);
      await expectSettledAt(page, stop.order);
      await openStopAccount(page);
      await page.keyboard.press("Escape");
      await expectSheetClosed(page);
      await switchPresentation(page);
    }
    await expect(
      page.getByRole("heading", { name: "Roteiro completo", exact: true }),
    ).toBeVisible();
    expect(await voyageState(page)).toMatchObject({
      complete: true,
      currentStop: "ilha-grande",
      visitedStops: voyageRoute.map((stop) => stop.id),
    });
    await switchPresentation(page);
  },
);

test(
  "reading mode lasts across reload, and a recovered context loss changes nothing canonical",
  { tag: "@critical" },
  async ({ page }) => {
    test.setTimeout(120_000);
    await enterOcean(page);
    await page.keyboard.press("ArrowDown");
    await expectSettledAt(page, 1);
    await switchPresentation(page);
    const reading = await voyageState(page);
    await page.reload();
    await expect(returnToOceanButton(page)).toBeVisible();
    await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "editorial");
    expect(await voyageState(page)).toEqual(reading);
    await switchPresentation(page);
    await expectOceanReady(page);
    await expectSettledAt(page, 1);

    await page.locator("canvas").evaluate((canvas) => {
      (canvas as HTMLCanvasElement)
        .getContext("webgl2")!
        .getExtension("WEBGL_lose_context")!
        .loseContext();
    });
    await expect(page.locator("#fernando-de-noronha-title")).toBeFocused();
    await expect(returnToOceanButton(page)).toBeEnabled();
    expect((await voyageState(page)).threeDAvailability.status).toBe(
      "available",
    );
    await switchPresentation(page);
    await switchPresentation(page);
  },
);
