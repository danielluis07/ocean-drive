import { expect } from "@playwright/test";
import { test } from "@/tests/browser/journey-fixture";
import { expectNoAxeViolations } from "@/tests/browser/accessibility-scan";
import {
  evidenceRoute,
  holdVesselAssets,
  openEditorialStation,
  readEditorialStation,
} from "@/tests/browser/editorial-route";

const [pulso, corais, respostas, convergencia] = evidenceRoute;

test(
  "editorial entry and loading states have no automated WCAG violations",
  { tag: "@critical" },
  async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const releaseVessel = await holdVesselAssets(page);
    await page.goto("/");
    await expect(page.locator(".presentation-bar")).toContainText("Carregando");
    await expectNoAxeViolations(page, testInfo, "loading");
    releaseVessel();
    await expect(page.locator(".presentation-bar")).toContainText(
      "O oceano está pronto",
    );
    await expectNoAxeViolations(page, testInfo, "entry");
  },
);

test(
  "editorial stops, Stop Accounts, Arrival, completion, and sources have no automated WCAG violations",
  { tag: "@critical" },
  async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.goto("/");
    await openEditorialStation(page, pulso);
    await expectNoAxeViolations(page, testInfo, "editorial-station");
    await page.locator("#pulso-de-calor summary:visible").click();
    await expectNoAxeViolations(page, testInfo, "editorial-caderno");
    await readEditorialStation(page, pulso, "Continuar expedição");
    await expectNoAxeViolations(page, testInfo, "editorial-route-choice");
    await readEditorialStation(page, respostas, "Continuar expedição");
    await readEditorialStation(page, corais, "Continuar expedição");
    await readEditorialStation(page, convergencia, null);
    await expectNoAxeViolations(page, testInfo, "editorial-convergencia");
    await page.locator("#convergencia summary:visible").click();
    await expectNoAxeViolations(
      page,
      testInfo,
      "editorial-convergencia-caderno",
    );
    await page
      .getByRole("button", { name: "Conectar expedição", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Expedição conectada.", exact: true }),
    ).toBeFocused();
    await expectNoAxeViolations(page, testInfo, "editorial-completion");
    await page
      .getByRole("button", { name: "Consultar fontes", exact: true })
      .click();
    await expectNoAxeViolations(page, testInfo, "editorial-all-sources");
  },
);

test(
  "3D sailing, Stop Account, Arrival, and completion have no automated WCAG violations",
  { tag: "@critical" },
  async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.goto("/");
    await page
      .getByRole("button", { name: "Explorar em 3D", exact: true })
      .click();
    await expectNoAxeViolations(page, testInfo, "3d-entry");
    await page
      .getByRole("button", { name: "Iniciar expedição", exact: true })
      .click();
    await page.getByRole("button", { name: "Controles", exact: true }).click();
    await expectNoAxeViolations(page, testInfo, "3d-sailing");
    await page
      .getByRole("button", { name: "Pausar expedição", exact: true })
      .click();
    await page
      .getByRole("link", { name: "Versão em texto", exact: true })
      .click();
    await openEditorialStation(page, pulso);
    await page
      .getByRole("button", { name: "Explorar em 3D", exact: true })
      .click();
    const reader = page.getByRole("region", { name: "Voz da estação" });
    await expect(reader).toBeVisible();
    await expectNoAxeViolations(page, testInfo, "3d-reader");
    await reader.locator("summary:visible").click();
    await expectNoAxeViolations(page, testInfo, "3d-caderno");
    await page
      .getByRole("link", { name: "Versão em texto", exact: true })
      .click();
    await readEditorialStation(page, pulso, "Continuar expedição");
    await readEditorialStation(page, corais, "Continuar expedição");
    await readEditorialStation(page, respostas, "Continuar expedição");
    await readEditorialStation(page, convergencia, null);
    await page
      .getByRole("button", { name: "Explorar em 3D", exact: true })
      .click();
    await expect(
      reader.getByRole("button", { name: "Conectar expedição", exact: true }),
    ).toBeVisible();
    await expectNoAxeViolations(page, testInfo, "3d-convergencia");
    await reader
      .getByRole("button", { name: "Conectar expedição", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Expedição conectada.", exact: true }),
    ).toBeFocused();
    await expectNoAxeViolations(page, testInfo, "3d-completion");
  },
);

test(
  "reduced-motion text, reduced-motion 3D, and failure states have no automated WCAG violations",
  { tag: "@critical" },
  async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Preparar 3D com movimento reduzido" }),
    ).toBeVisible();
    await expectNoAxeViolations(page, testInfo, "reduced-motion");
    await page
      .getByRole("button", { name: "Preparar 3D com movimento reduzido" })
      .click();
    await page
      .getByRole("button", { name: "Explorar em 3D", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Iniciar expedição", exact: true })
      .click();
    await expectNoAxeViolations(page, testInfo, "reduced-motion-3d");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.route("**/models/*.glb", (route) => route.abort());
    await page.goto("/");
    await expect(page.locator(".presentation-bar")).toContainText(
      "Não foi possível preparar",
    );
    await expectNoAxeViolations(page, testInfo, "failure");
  },
);

test(
  "reduced motion moves focus between stations without animated scrolling",
  { tag: "@critical" },
  async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await openEditorialStation(page, pulso);
    const landed = await page.evaluate(() => scrollY);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => scrollY)).toBe(landed);
    expect(landed).toBeGreaterThan(0);
  },
);

test(
  "both presentations expose named control groups, station progress, and polite announcements",
  { tag: "@critical" },
  async ({ page }) => {
    test.setTimeout(90_000);
    const announcer = page.locator("#expedition-announcer");
    await page.goto("/");
    await readEditorialStation(page, pulso, "Continuar expedição");
    await expect(announcer).toHaveText(/Pulso de Calor concluída/);
    await expect(
      page.getByRole("group", {
        name: "Navegação dos sinais de Pulso de Calor",
      }),
    ).toHaveCount(1);
    await page
      .getByRole("button", { name: "Explorar em 3D", exact: true })
      .click();
    await expect(announcer).toHaveText(
      "Expedição em 3D. A navegação está pausada.",
    );
    await page
      .getByRole("button", { name: "Voltar ao mar", exact: true })
      .click();
    const helm = page.getByRole("group", { name: "Controles da embarcação" });
    await expect(helm).toBeVisible();
    await expect(
      helm.getByText("1 de 3 estações de evidência concluídas", {
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /^(Iniciar|Retomar) expedição$/ })
      .click();
    await expect(announcer).toHaveText("Expedição em movimento.");
    await page
      .getByRole("button", { name: "Pausar expedição", exact: true })
      .click();
    await expect(announcer).toHaveText("Expedição pausada.");
    await page
      .getByRole("link", { name: "Versão em texto", exact: true })
      .click();
    await expect(announcer).toHaveText(
      "Versão em texto. Seu lugar na expedição está preservado.",
    );
    // Assistive technology can ignore whitespace-only live-region changes, so a
    // repeated message must clear the region and then restore the exact text.
    await announcer.evaluate((region) => {
      const history: string[] = [];
      (window as unknown as { announcements: string[] }).announcements =
        history;
      new MutationObserver(() =>
        history.push(region.textContent ?? ""),
      ).observe(region, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    });
    await page
      .getByRole("link", { name: "Versão em texto", exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { announcements: string[] }).announcements,
        ),
      )
      .toEqual([
        "",
        "Versão em texto. Seu lugar na expedição está preservado.",
      ]);
  },
);
