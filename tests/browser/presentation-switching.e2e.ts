import { expect, type Page } from "@playwright/test";
import { test } from "@/tests/browser/journey-fixture";
import type { ExpeditionState } from "@/lib/expedition-state";

async function state(page: Page): Promise<ExpeditionState> {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem("ocean-drive:expedition:v1")!).state);
}

// Everything except the presentation itself is canonical and must survive a switch.
function canonical(state: ExpeditionState): Partial<ExpeditionState> {
  const copy: Partial<ExpeditionState> = { ...state };
  delete copy.presentation;
  return copy;
}

async function switchAndReturn(page: Page, focusTarget: string, { sailing = false } = {}) {
  const before = await state(page);
  const toText = page.getByRole("link", { name: "Versão em texto", exact: true });
  const to3D = page.getByRole("button", { name: "Explorar em 3D", exact: true });
  const threeD = before.presentation === "three-dimensional";
  await (threeD ? toText : to3D).click();
  await expect(page.locator(focusTarget.replace("@editorial", "#expedition-editorial-heading").replace("@3d", "#expedition-movement"))).toBeFocused();
  await expect(page.locator("main details.logbook[open]")).toHaveCount(0);
  const switched = await state(page);
  expect(switched.presentation).toBe(threeD ? "editorial" : "three-dimensional");
  if (sailing) {
    // The persisted pose lags live sailing; the switch itself must freeze it.
    const unmoved = canonical(before);
    delete unmoved.vesselCheckpoints;
    expect(canonical(switched)).toMatchObject({ ...unmoved, pauseState: "paused" });
    await page.waitForTimeout(600);
    expect(canonical(await state(page))).toEqual(canonical(switched));
  } else {
    expect(canonical(switched)).toEqual({ ...canonical(before), pauseState: "paused" });
  }
  await (threeD ? to3D : toText).click();
  const returned = await state(page);
  expect(canonical(returned)).toEqual(canonical(switched));
  await expect(page.getByRole("button", { name: "Pausar expedição" })).toBeHidden();
}

async function openCaderno(page: Page) {
  await page.locator("main .logbook summary:visible").click();
  await expect(page.locator("main details.logbook[open]")).toHaveCount(1);
}

test("switching presentations is atomic at entry, sailing, every Field Station, Caderno, and completion", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/");
  await expect(page.locator(".presentation-bar")).toContainText("O oceano está pronto");
  await expect(page.locator("main details.disclosure[open]")).toHaveCount(1);
  await switchAndReturn(page, "@3d");
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await page.getByRole("button", { name: "Iniciar expedição", exact: true }).click();
  await page.waitForTimeout(600);
  await switchAndReturn(page, "@editorial", { sailing: true });

  for (const [index, name, id] of [
    [1, "Pulso de Calor", "pulso-de-calor"],
    [2, "Corais sob Estresse", "corais-sob-estresse"],
    [3, "Respostas Desiguais", "respostas-desiguais"],
    [4, "Convergência", "convergencia"],
  ] as const) {
    if ((await state(page)).presentation === "three-dimensional") {
      await page.getByRole("link", { name: "Versão em texto", exact: true }).click();
    }
    await page.locator("#rota").getByRole("button", { name: new RegExp(`^0${index} ${name}`) }).click();
    const station = page.getByRole("article", { name, exact: true });
    await station.getByRole("button", { name: "Próximo sinal", exact: true }).click();
    await openCaderno(page);
    await switchAndReturn(page, `#${id}-signal-2`);
    await openCaderno(page);
    await switchAndReturn(page, `#${id}-signal-2`);
    await page.getByRole("button", { name: "Próximo sinal", exact: true }).click();
    const confirm = index === 4 ? "Conectar expedição" : "Continuar expedição";
    await page.getByRole("button", { name: confirm, exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Expedição conectada.", exact: true })).toBeVisible();
  expect((await state(page)).connected).toBe(true);
  await switchAndReturn(page, "#convergencia-signal-3");
});

test("switching during loading and after a recovered context loss changes nothing canonical", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(90_000);
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/models/*.glb", async (route) => { await blocked; await route.continue(); });
  await page.goto("/");
  await expect(page.locator(".presentation-bar")).toContainText("Carregando");
  await expect(page.getByRole("button", { name: "Explorar em 3D", exact: true })).toBeDisabled();
  const loading = await state(page);
  await page.getByRole("link", { name: "Versão em texto", exact: true }).click();
  await expect(page.locator("#expedition-editorial-heading")).toBeFocused();
  expect(await state(page)).toEqual(loading);
  release();
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await page.getByRole("button", { name: "Iniciar expedição", exact: true }).click();
  await page.locator("canvas").evaluate((canvas) => {
    (canvas as HTMLCanvasElement).getContext("webgl2")!.getExtension("WEBGL_lose_context")!.loseContext();
  });
  await expect(page.locator("#expedition-editorial-heading")).toBeFocused();
  await expect(page.getByRole("button", { name: "Explorar em 3D", exact: true })).toBeEnabled();
  expect((await state(page)).threeDAvailability.status).toBe("available");
  await switchAndReturn(page, "@3d");
});
