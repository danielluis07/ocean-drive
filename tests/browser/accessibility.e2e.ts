import { expect, type Page } from "@playwright/test";
import { test } from "@/tests/browser/journey-fixture";
import { expectNoAxeViolations } from "@/tests/browser/accessibility-scan";
import { settleScroll } from "@/tests/browser/scroll";

async function readEditorialStation(page: Page, name: string, confirm: "Continuar expedição" | "Conectar expedição" | null) {
  await page.locator("#rota").getByRole("button", { name: new RegExp(`^0\\d ${name}`) }).click();
  const station = page.getByRole("article", { name, exact: true });
  for (const next of [2, 3]) {
    await settleScroll(page);
    await station.getByRole("button", { name: "Próximo sinal", exact: true }).click();
    await expect(station.getByText(`Sinal ${next} de 3`, { exact: true })).toBeVisible();
  }
  if (confirm) await station.getByRole("button", { name: confirm, exact: true }).click();
}

test("editorial entry and loading states have no automated WCAG violations", { tag: "@critical" }, async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/models/*.glb", async (route) => { await blocked; await route.continue(); });
  await page.goto("/");
  await expect(page.locator(".presentation-bar")).toContainText("Carregando");
  await expectNoAxeViolations(page, testInfo, "loading");
  release();
  await expect(page.locator(".presentation-bar")).toContainText("O oceano está pronto");
  await expectNoAxeViolations(page, testInfo, "entry");
});

test("editorial station, Caderno, Convergência, completion, and sources have no automated WCAG violations", { tag: "@critical" }, async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await page.locator("#rota").getByRole("button", { name: /^01 Pulso de Calor/ }).click();
  await expectNoAxeViolations(page, testInfo, "editorial-station");
  await page.locator("#pulso-de-calor summary:visible").click();
  await expectNoAxeViolations(page, testInfo, "editorial-caderno");
  await readEditorialStation(page, "Pulso de Calor", "Continuar expedição");
  await expectNoAxeViolations(page, testInfo, "editorial-route-choice");
  await readEditorialStation(page, "Respostas Desiguais", "Continuar expedição");
  await readEditorialStation(page, "Corais sob Estresse", "Continuar expedição");
  await readEditorialStation(page, "Convergência", null);
  await expectNoAxeViolations(page, testInfo, "editorial-convergencia");
  await page.locator("#convergencia summary:visible").click();
  await expectNoAxeViolations(page, testInfo, "editorial-convergencia-caderno");
  await page.getByRole("button", { name: "Conectar expedição", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Expedição conectada.", exact: true })).toBeFocused();
  await expectNoAxeViolations(page, testInfo, "editorial-completion");
  await page.getByRole("button", { name: "Consultar fontes", exact: true }).click();
  await expectNoAxeViolations(page, testInfo, "editorial-all-sources");
});

test("3D sailing, reader, Caderno, Convergência, and completion have no automated WCAG violations", { tag: "@critical" }, async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await expectNoAxeViolations(page, testInfo, "3d-entry");
  await page.getByRole("button", { name: "Iniciar expedição", exact: true }).click();
  await page.getByRole("button", { name: "Controles", exact: true }).click();
  await expectNoAxeViolations(page, testInfo, "3d-sailing");
  await page.getByRole("button", { name: "Pausar expedição", exact: true }).click();
  await page.getByRole("link", { name: "Versão em texto", exact: true }).click();
  await page.locator("#rota").getByRole("button", { name: /^01 Pulso de Calor/ }).click();
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  const reader = page.getByRole("region", { name: "Voz da estação" });
  await expect(reader).toBeVisible();
  await expectNoAxeViolations(page, testInfo, "3d-reader");
  await reader.locator("summary:visible").click();
  await expectNoAxeViolations(page, testInfo, "3d-caderno");
  await page.getByRole("link", { name: "Versão em texto", exact: true }).click();
  await readEditorialStation(page, "Pulso de Calor", "Continuar expedição");
  await readEditorialStation(page, "Corais sob Estresse", "Continuar expedição");
  await readEditorialStation(page, "Respostas Desiguais", "Continuar expedição");
  await readEditorialStation(page, "Convergência", null);
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await expect(reader.getByRole("button", { name: "Conectar expedição", exact: true })).toBeVisible();
  await expectNoAxeViolations(page, testInfo, "3d-convergencia");
  await reader.getByRole("button", { name: "Conectar expedição", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Expedição conectada.", exact: true })).toBeFocused();
  await expectNoAxeViolations(page, testInfo, "3d-completion");
});

test("reduced-motion and failure states have no automated WCAG violations", { tag: "@critical" }, async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Preparar 3D com movimento reduzido" })).toBeVisible();
  await expectNoAxeViolations(page, testInfo, "reduced-motion");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/models/*.glb", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".presentation-bar")).toContainText("Não foi possível preparar");
  await expectNoAxeViolations(page, testInfo, "failure");
});

test("reduced motion moves focus between stations without animated scrolling", { tag: "@critical" }, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("#rota").getByRole("button", { name: /^01 Pulso de Calor/ }).click();
  await expect(page.locator("#pulso-de-calor-title")).toBeFocused();
  const landed = await page.evaluate(() => scrollY);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => scrollY)).toBe(landed);
  expect(landed).toBeGreaterThan(0);
});

test("both presentations expose named control groups, station progress, and polite announcements", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(90_000);
  const announcer = page.locator("#expedition-announcer");
  await page.goto("/");
  await readEditorialStation(page, "Pulso de Calor", "Continuar expedição");
  await expect(announcer).toHaveText(/Pulso de Calor concluída/);
  await expect(page.getByRole("group", { name: "Navegação dos sinais de Pulso de Calor" })).toHaveCount(1);
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await expect(announcer).toHaveText("Expedição em 3D. A navegação está pausada.");
  await page.getByRole("button", { name: "Voltar ao mar", exact: true }).click();
  const helm = page.getByRole("group", { name: "Controles da embarcação" });
  await expect(helm).toBeVisible();
  await expect(helm.getByText("1 de 3 estações de evidência concluídas", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^(Iniciar|Retomar) expedição$/ }).click();
  await expect(announcer).toHaveText("Expedição em movimento.");
  await page.getByRole("button", { name: "Pausar expedição", exact: true }).click();
  await expect(announcer).toHaveText("Expedição pausada.");
  await page.getByRole("link", { name: "Versão em texto", exact: true }).click();
  await expect(announcer).toHaveText("Versão em texto. Seu lugar na expedição está preservado.");
});
