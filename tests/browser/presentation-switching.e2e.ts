import { expect, type Page } from "@playwright/test";
import { test } from "@/tests/browser/journey-fixture";
import type { VoyageState } from "@/lib/voyage-state";
import {
  advanceEditorialSignal,
  expectSettledAt,
  holdVesselAssets,
  openEditorialStop,
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

async function expectOptionalDisclosuresClosed(page: Page) {
  await expect(page.locator("main details.logbook[open]")).toHaveCount(0);
  await expect(page.locator("#fontes-da-expedicao")).toBeHidden();
}

// Switch away and back, checking focus, closed disclosures, and unchanged
// Voyage State in both directions.
async function switchAndReturn(
  page: Page,
  focus: { away: string; back: string },
) {
  const before = await voyageState(page);
  const toText = page.getByRole("link", {
    name: "Versão em texto",
    exact: true,
  });
  const to3D = page.getByRole("button", {
    name: "Explorar em 3D",
    exact: true,
  });
  const fromThreeD = before.presentation === "three-dimensional";
  await (fromThreeD ? toText : to3D).click();
  await expect(page.locator(focus.away)).toBeFocused();
  await expectOptionalDisclosuresClosed(page);
  const switched = await voyageState(page);
  expect(switched.presentation).toBe(
    fromThreeD ? "editorial" : "three-dimensional",
  );
  expect(presentationIndependentState(switched)).toEqual(
    presentationIndependentState(before),
  );
  await page.waitForTimeout(600);
  expect(presentationIndependentState(await voyageState(page))).toEqual(
    presentationIndependentState(switched),
  );
  await (fromThreeD ? to3D : toText).click();
  await expect(page.locator(focus.back)).toBeFocused();
  expect(presentationIndependentState(await voyageState(page))).toEqual(
    presentationIndependentState(switched),
  );
}

async function openCaderno(page: Page) {
  await page.locator("main .logbook summary:visible").click();
  await expect(page.locator("main details.logbook[open]")).toHaveCount(1);
}

test(
  "switching presentations is atomic at entry, at a Stop, in every Stop Account, and at the Arrival",
  { tag: "@critical" },
  async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/");
    await expect(page.locator(".presentation-bar")).toContainText(
      "O oceano está pronto",
    );
    // The approved identity disclosure is not an optional source disclosure.
    await expect(page.locator("main details.disclosure[open]")).toHaveCount(1);
    await switchAndReturn(page, { away: ocean, back: editorialHeading });
    await page
      .getByRole("button", { name: "Explorar em 3D", exact: true })
      .click();
    await page.keyboard.press("ArrowDown");
    await expectSettledAt(page, 1);
    await switchAndReturn(page, { away: editorialHeading, back: ocean });
    await page
      .getByRole("link", { name: "Versão em texto", exact: true })
      .click();

    for (const stop of voyageRoute) {
      const passage = `#${stop.id}-signal-2`;
      await openEditorialStop(page, stop);
      await advanceEditorialSignal(page, stop, 2);
      await openCaderno(page);
      await switchAndReturn(page, { away: passage, back: passage });
      await page
        .getByRole("button", { name: "Explorar em 3D", exact: true })
        .click();
      await openCaderno(page);
      await switchAndReturn(page, { away: passage, back: passage });
      await page
        .getByRole("link", { name: "Versão em texto", exact: true })
        .click();
    }
    await expect(
      page.getByRole("heading", { name: "Viagem concluída.", exact: true }),
    ).toBeVisible();
    expect(await voyageState(page)).toMatchObject({
      complete: true,
      currentStop: "ilha-grande",
      visitedStops: voyageRoute.map((stop) => stop.id),
    });
    await page
      .getByRole("button", { name: "Consultar fontes", exact: true })
      .click();
    await expect(page.locator("#fontes-da-expedicao")).toBeVisible();
    await switchAndReturn(page, {
      away: "#ilha-grande-signal-2",
      back: "#ilha-grande-signal-2",
    });
  },
);

test(
  "switching during loading and after a recovered context loss changes nothing canonical",
  { tag: "@critical" },
  async ({ page }) => {
    test.setTimeout(90_000);
    const releaseVessel = await holdVesselAssets(page);
    await page.goto("/");
    await expect(page.locator(".presentation-bar")).toContainText("Carregando");
    await expect(
      page.getByRole("button", { name: "Explorar em 3D", exact: true }),
    ).toBeDisabled();
    const loading = await voyageState(page);
    await page
      .getByRole("link", { name: "Versão em texto", exact: true })
      .click();
    await expect(page.locator(editorialHeading)).toBeFocused();
    expect(await voyageState(page)).toEqual(loading);
    releaseVessel();
    await page
      .getByRole("button", { name: "Explorar em 3D", exact: true })
      .click();
    await page.locator("canvas").evaluate((canvas) => {
      (canvas as HTMLCanvasElement)
        .getContext("webgl2")!
        .getExtension("WEBGL_lose_context")!
        .loseContext();
    });
    await expect(page.locator(editorialHeading)).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Explorar em 3D", exact: true }),
    ).toBeEnabled();
    expect((await voyageState(page)).threeDAvailability.status).toBe(
      "available",
    );
    await switchAndReturn(page, { away: ocean, back: editorialHeading });
  },
);
