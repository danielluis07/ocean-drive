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

const editorialHeading = "#voyage-editorial-heading";
const ocean = "#voyage-ocean";

// Voyage State is presentation-independent: everything but the active
// presentation must survive a switch.
function presentationIndependentState(
  state: VoyageState,
): Partial<VoyageState> {
  const copy: Partial<VoyageState> = { ...state };
  delete copy.presentation;
  return copy;
}

// Switch presentation with “Modo leitura” or “Voltar ao oceano”, checking focus,
// that no Sheet is open, and unchanged Voyage State, including a moment later.
async function switchPresentation(page: Page, focus: string) {
  const before = await voyageState(page);
  const toReading = before.presentation === "three-dimensional";
  await (toReading ? readingModeLink(page) : returnToOceanButton(page)).click();
  await expect(page.locator(focus)).toBeFocused();
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
    await switchPresentation(page, editorialHeading);
    // The approved identity disclosure is not an optional source disclosure.
    await expect(page.locator("main details.disclosure[open]")).toHaveCount(1);
    await switchPresentation(page, ocean);
    await page.keyboard.press("ArrowDown");
    await expectSettledAt(page, 1);
    await switchPresentation(page, editorialHeading);
    await switchPresentation(page, ocean);
    await expectSettledAt(page, 1);
    await switchPresentation(page, editorialHeading);

    for (const stop of voyageRoute) {
      await openEditorialStop(page, stop);
      // The Stop read in the editorial text is where the Ship waits in the ocean.
      await switchPresentation(page, ocean);
      await expectSettledAt(page, stop.order);
      await openStopAccount(page);
      await page.keyboard.press("Escape");
      await expectSheetClosed(page);
      await switchPresentation(page, editorialHeading);
    }
    await expect(
      page.getByRole("heading", { name: "Roteiro completo", exact: true }),
    ).toBeVisible();
    expect(await voyageState(page)).toMatchObject({
      complete: true,
      currentStop: "ilha-grande",
      visitedStops: voyageRoute.map((stop) => stop.id),
    });
    await switchPresentation(page, ocean);
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
    await switchPresentation(page, editorialHeading);
    const reading = await voyageState(page);
    await page.reload();
    await expect(returnToOceanButton(page)).toBeVisible();
    await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "editorial");
    expect(await voyageState(page)).toEqual(reading);
    await switchPresentation(page, ocean);
    await expectOceanReady(page);
    await expectSettledAt(page, 1);

    await page.locator("canvas").evaluate((canvas) => {
      (canvas as HTMLCanvasElement)
        .getContext("webgl2")!
        .getExtension("WEBGL_lose_context")!
        .loseContext();
    });
    await expect(page.locator(editorialHeading)).toBeFocused();
    await expect(returnToOceanButton(page)).toBeEnabled();
    expect((await voyageState(page)).threeDAvailability.status).toBe(
      "available",
    );
    await switchPresentation(page, ocean);
    await switchPresentation(page, editorialHeading);
  },
);
