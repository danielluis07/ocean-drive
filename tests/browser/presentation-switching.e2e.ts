import { expect, type Page } from "@playwright/test";
import { test } from "@/tests/browser/journey-fixture";
import type { ExpeditionState } from "@/lib/expedition-state";
import { advanceEditorialSignal, evidenceRoute, holdVesselAssets, openEditorialStation } from "@/tests/browser/editorial-route";

const editorialHeading = "#expedition-editorial-heading";
const movementControl = "#expedition-movement";

async function state(page: Page): Promise<ExpeditionState> {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem("ocean-drive:expedition:v1")!).state);
}

// Expedition State is presentation-independent: everything but the active
// presentation must survive a switch.
function presentationIndependentState(state: ExpeditionState): Partial<ExpeditionState> {
  const copy: Partial<ExpeditionState> = { ...state };
  delete copy.presentation;
  return copy;
}

async function expectOptionalDisclosuresClosed(page: Page) {
  await expect(page.locator("main details.logbook[open]")).toHaveCount(0);
  await expect(page.locator("#fontes-da-expedicao")).toBeHidden();
}

// Switch away and back, checking focus, closed disclosures, paused sailing, and
// unchanged Expedition State in both directions.
async function switchAndReturn(page: Page, focus: { away: string; back: string }, { sailing = false } = {}) {
  const before = await state(page);
  const toText = page.getByRole("link", { name: "Versão em texto", exact: true });
  const to3D = page.getByRole("button", { name: "Explorar em 3D", exact: true });
  const fromThreeD = before.presentation === "three-dimensional";
  await (fromThreeD ? toText : to3D).click();
  await expect(page.locator(focus.away)).toBeFocused();
  await expectOptionalDisclosuresClosed(page);
  const switched = await state(page);
  expect(switched.presentation).toBe(fromThreeD ? "editorial" : "three-dimensional");
  if (sailing) {
    // The persisted pose lags live sailing; the switch itself must freeze it.
    const unmoved = presentationIndependentState(before);
    delete unmoved.vesselCheckpoints;
    expect(presentationIndependentState(switched)).toMatchObject({ ...unmoved, pauseState: "paused" });
    await page.waitForTimeout(600);
    expect(presentationIndependentState(await state(page))).toEqual(presentationIndependentState(switched));
  } else {
    expect(presentationIndependentState(switched)).toEqual({ ...presentationIndependentState(before), pauseState: "paused" });
  }
  await (fromThreeD ? to3D : toText).click();
  await expect(page.locator(focus.back)).toBeFocused();
  expect(presentationIndependentState(await state(page))).toEqual(presentationIndependentState(switched));
  await expect(page.getByRole("button", { name: "Pausar expedição" })).toBeHidden();
}

async function openCaderno(page: Page) {
  await page.locator("main .logbook summary:visible").click();
  await expect(page.locator("main details.logbook[open]")).toHaveCount(1);
}

test("switching presentations is atomic at entry, sailing, every Field Station, Caderno, and completion", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto("/");
  await expect(page.locator(".presentation-bar")).toContainText("O oceano está pronto");
  // The approved identity disclosure is not an optional source disclosure.
  await expect(page.locator("main details.disclosure[open]")).toHaveCount(1);
  await switchAndReturn(page, { away: movementControl, back: editorialHeading });
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await page.getByRole("button", { name: "Iniciar expedição", exact: true }).click();
  await page.waitForTimeout(600);
  await switchAndReturn(page, { away: editorialHeading, back: movementControl }, { sailing: true });
  await page.getByRole("link", { name: "Versão em texto", exact: true }).click();

  for (const station of evidenceRoute) {
    const passage = `#${station.id}-signal-2`;
    await openEditorialStation(page, station);
    await advanceEditorialSignal(page, station, 2);
    await openCaderno(page);
    await switchAndReturn(page, { away: passage, back: passage });
    await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
    await openCaderno(page);
    await switchAndReturn(page, { away: passage, back: passage });
    await page.getByRole("link", { name: "Versão em texto", exact: true }).click();
    await advanceEditorialSignal(page, station, 3);
    const confirm = station.id === "convergencia" ? "Conectar expedição" : "Continuar expedição";
    await page.getByRole("button", { name: confirm, exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Expedição conectada.", exact: true })).toBeFocused();
  expect((await state(page)).connected).toBe(true);
  await page.getByRole("button", { name: "Consultar fontes", exact: true }).click();
  await expect(page.locator("#fontes-da-expedicao")).toBeVisible();
  await switchAndReturn(page, { away: "#convergencia-signal-3", back: "#convergencia-signal-3" });
});

test("switching during loading and after a recovered context loss changes nothing canonical", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(90_000);
  const releaseVessel = await holdVesselAssets(page);
  await page.goto("/");
  await expect(page.locator(".presentation-bar")).toContainText("Carregando");
  await expect(page.getByRole("button", { name: "Explorar em 3D", exact: true })).toBeDisabled();
  const loading = await state(page);
  await page.getByRole("link", { name: "Versão em texto", exact: true }).click();
  await expect(page.locator(editorialHeading)).toBeFocused();
  expect(await state(page)).toEqual(loading);
  releaseVessel();
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await page.getByRole("button", { name: "Iniciar expedição", exact: true }).click();
  await page.locator("canvas").evaluate((canvas) => {
    (canvas as HTMLCanvasElement).getContext("webgl2")!.getExtension("WEBGL_lose_context")!.loseContext();
  });
  await expect(page.locator(editorialHeading)).toBeFocused();
  await expect(page.getByRole("button", { name: "Explorar em 3D", exact: true })).toBeEnabled();
  expect((await state(page)).threeDAvailability.status).toBe("available");
  await switchAndReturn(page, { away: movementControl, back: editorialHeading });
});
