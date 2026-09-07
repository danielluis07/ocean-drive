import { expect, test, type Page } from "@playwright/test";
import type { ExpeditionState } from "@/lib/expedition-state";
import type { StationId } from "@/content/editorial";
import { oceanConfiguration } from "@/lib/ocean-config";

test.use({ actionTimeout: 15_000 });

async function state(page: Page): Promise<ExpeditionState> {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem("ocean-drive:expedition:v1")!).state);
}

// Navigate through the shipped keyboard controls, using the public persisted pose
// for feedback. No teleports, direct state writes, or renderer test hooks.
async function sailTo(page: Page, id: StationId) {
  const station = oceanConfiguration.stations.find((item) => item.id === id)!;
  const reader = page.getByRole("region", { name: "Voz da estação" });
  await page.getByRole("button", { name: /^(Iniciar|Retomar) expedição$/ }).click();
  await page.getByRole("group", { name: /Navegação da embarcação/ }).focus();
  let held: string | null = null;
  const deadline = Date.now() + 90_000;
  while (!(await reader.isVisible()) && Date.now() < deadline) {
    const pose = (await state(page)).vesselCheckpoints.current;
    const bearing = Math.atan2(station.position[0] - pose.position.x, pose.position.z - station.position[2]);
    const difference = Math.atan2(Math.sin(bearing - pose.heading), Math.cos(bearing - pose.heading));
    const next = Math.abs(difference) < 0.15 ? null : difference > 0 ? "ArrowRight" : "ArrowLeft";
    if (held !== next) {
      if (held) await page.keyboard.up(held);
      if (next) await page.keyboard.down(next);
      held = next;
    }
    await page.waitForTimeout(200);
  }
  if (held) await page.keyboard.up(held);
  await expect(reader).toBeVisible();
  await expect(reader.getByRole("heading", { name: station.name, exact: true })).toBeVisible();
}

async function finishStation(page: Page) {
  const reader = page.getByRole("region", { name: "Voz da estação" });
  await reader.getByRole("button", { name: "Próximo sinal", exact: true }).click();
  await reader.getByRole("button", { name: "Próximo sinal", exact: true }).click();
  await reader.getByRole("button", { name: "Continuar expedição", exact: true }).click();
  await expect(reader).toBeHidden();
}

test("arrival opens a protected reader and completion reveals both middle destinations", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await expect(page.getByRole("button", { name: /Pulso de Calor/ })).toBeDisabled();
  await page.getByRole("button", { name: "Iniciar expedição", exact: true }).click();
  const reader = page.getByRole("region", { name: "Voz da estação" });
  await expect(reader).toBeVisible({ timeout: 60_000 });
  await expect(reader.getByRole("heading", { name: "Pulso de Calor", exact: true })).toBeVisible();
  await reader.getByRole("button", { name: "Próximo sinal", exact: true }).click();
  await reader.getByRole("button", { name: "Próximo sinal", exact: true }).click();
  await reader.getByRole("button", { name: "Continuar expedição", exact: true }).click();
  await expect(reader).toBeHidden();
  await expect(page.getByRole("button", { name: /Corais sob Estresse/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Respostas Desiguais/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Convergência/ })).toHaveCount(0);
});

for (const firstMiddle of ["corais-sob-estresse", "respostas-desiguais"] as const) {
  test(`complete Live Experience via ${firstMiddle}, sources, bookmarks, revisit and deliberate synthesis`, async ({ page, context }, testInfo) => {
    test.setTimeout(300_000);
    const mobile = firstMiddle === "respostas-desiguais";
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
    await page.goto("/");
    await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
    await sailTo(page, "pulso-de-calor");
    const reader = page.getByRole("region", { name: "Voz da estação" });
    const beforeReading = await state(page);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(400);
    expect((await state(page)).vesselCheckpoints.current).toEqual(beforeReading.vesselCheckpoints.current);
    expect((await state(page)).pauseState).toBe("paused");
    await reader.locator("summary:visible").click();
    await expect(reader.getByText("Limite da evidência", { exact: true }).first()).toBeVisible();
    const source = reader.getByRole("link", { name: /Acessar fonte/ }).first();
    const sourceUrl = (await source.getAttribute("href"))!;
    await context.route((url) => url.href === sourceUrl, (route) => route.fulfill({ contentType: "text/html", body: "<title>Source boundary</title>Source record" }));
    const popupPromise = page.waitForEvent("popup");
    await source.click();
    const popup = await popupPromise;
    await popup.close();
    await page.bringToFront();
    await expect(source).toBeFocused();
    expect((await state(page)).bookmarks).toEqual(beforeReading.bookmarks);
    expect((await state(page)).completedStations).toEqual([]);
    await reader.getByRole("button", { name: "Voltar ao sinal", exact: true }).click();
    await expect(page.locator("#pulso-de-calor-signal-1")).toBeFocused();
    await reader.getByRole("button", { name: "Próximo sinal", exact: true }).click();
    await reader.locator("summary:visible").click();
    await page.keyboard.press("Escape");
    await expect(reader).toBeVisible();
    await expect(page.locator("#pulso-de-calor-signal-2")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(reader).toBeHidden();
    await expect(page.getByRole("button", { name: "Retomar expedição", exact: true })).toBeFocused();
    expect((await state(page)).completedStations).toEqual([]);
    await page.getByRole("button", { name: /Primeira estação Pulso de Calor/ }).click();
    await expect(page.locator("#pulso-de-calor-signal-2")).toBeFocused();
    await reader.getByRole("button", { name: "Próximo sinal", exact: true }).click();
    await reader.getByRole("button", { name: "Continuar expedição", exact: true }).click();
    await expect(page.getByRole("button", { name: /Corais sob Estresse/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Respostas Desiguais/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Corais sob Estresse/ })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("button", { name: /Respostas Desiguais/ })).toBeInViewport({ ratio: 1 });
    await page.getByRole("button", { name: /Concluída · revisite Pulso de Calor/ }).click();
    await expect(page.locator("#pulso-de-calor-signal-3")).toBeFocused();
    await expect(reader.getByRole("button", { name: "Continuar expedição", exact: true })).toHaveCount(0);
    await reader.getByRole("button", { name: "Voltar ao mar", exact: true }).click();
    await sailTo(page, firstMiddle);
    await page.screenshot({ path: testInfo.outputPath(`${mobile ? "mobile" : "desktop"}.png`), fullPage: true });
    const beforeSwitch = await state(page);
    await reader.locator("summary:visible").click();
    await page.getByRole("link", { name: "Versão em texto", exact: true }).click();
    await expect(page.locator(`#${firstMiddle}-signal-1`)).toBeFocused();
    await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
    await expect(page.locator(`#${firstMiddle}-signal-1`)).toBeFocused();
    await expect(reader.locator("details[open]")).toHaveCount(0);
    expect((await state(page)).vesselCheckpoints).toEqual(beforeSwitch.vesselCheckpoints);
    expect((await state(page)).bookmarks).toEqual(beforeSwitch.bookmarks);
    await finishStation(page);
    await expect(page.getByRole("button", { name: /Convergência/ })).toHaveCount(0);
    const secondMiddle = firstMiddle === "corais-sob-estresse" ? "respostas-desiguais" : "corais-sob-estresse";
    await sailTo(page, secondMiddle);
    await finishStation(page);
    expect((await state(page)).middleOrder).toEqual([firstMiddle, secondMiddle]);
    expect((await state(page)).connected).toBe(false);
    expect((await state(page)).currentStation).toBe(secondMiddle);
    await expect(page.getByRole("button", { name: /Conectar expedição/ })).toHaveCount(0);
    await sailTo(page, "convergencia");
    await reader.getByRole("button", { name: "Próximo sinal", exact: true }).click();
    await reader.getByRole("button", { name: "Próximo sinal", exact: true }).click();
    expect((await state(page)).connected).toBe(false);
    await reader.getByRole("button", { name: "Conectar expedição", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Expedição conectada.", exact: true })).toBeFocused();
    expect((await state(page)).connected).toBe(true);
    await reader.getByRole("button", { name: "Revisitar estações", exact: true }).click();
    await expect(page.getByRole("button", { name: /Concluída · revisite Convergência/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Expedição conectada.", exact: true })).toBeVisible();
    expect((await state(page)).pauseState).toBe("paused");
  });
}
