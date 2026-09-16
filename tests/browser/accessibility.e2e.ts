import { expect } from "@playwright/test";
import { test } from "@/tests/browser/journey-fixture";
import { expectNoAxeViolations } from "@/tests/browser/accessibility-scan";
import {
  expectSettledAt,
  holdVesselAssets,
  openEditorialStop,
  readEditorialStop,
  voyageRoute,
} from "@/tests/browser/editorial-route";

const [noronha, boipeba, abrolhos, ilhaGrande] = voyageRoute;

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
  "editorial Stops, Stop Accounts, Arrival, and sources have no automated WCAG violations",
  { tag: "@critical" },
  async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.goto("/");
    await openEditorialStop(page, noronha);
    await expectNoAxeViolations(page, testInfo, "editorial-stop");
    await page.locator("#fernando-de-noronha summary:visible").click();
    await expectNoAxeViolations(page, testInfo, "editorial-caderno");
    await readEditorialStop(page, boipeba);
    await readEditorialStop(page, abrolhos);
    await readEditorialStop(page, ilhaGrande);
    await expect(
      page.getByRole("heading", { name: "Viagem concluída.", exact: true }),
    ).toBeVisible();
    await expectNoAxeViolations(page, testInfo, "editorial-arrival");
    await page.locator("#ilha-grande summary:visible").click();
    await expectNoAxeViolations(page, testInfo, "editorial-arrival-caderno");
    await page
      .getByRole("button", { name: "Consultar fontes", exact: true })
      .click();
    await expectNoAxeViolations(page, testInfo, "editorial-all-sources");
  },
);

test(
  "3D voyage, Stop Account, and Arrival have no automated WCAG violations",
  { tag: "@critical" },
  async ({ page }, testInfo) => {
    test.setTimeout(150_000);
    await page.goto("/");
    await page
      .getByRole("button", { name: "Explorar em 3D", exact: true })
      .click();
    await expectNoAxeViolations(page, testInfo, "3d-entry");
    await page.keyboard.press("ArrowDown");
    await expectSettledAt(page, 1);
    await expectNoAxeViolations(page, testInfo, "3d-stop");
    await page
      .getByRole("button", { name: /Parada 01 Fernando de Noronha/ })
      .click();
    const reader = page.getByRole("region", { name: "Relato da parada" });
    await expect(reader).toBeVisible();
    await expectNoAxeViolations(page, testInfo, "3d-reader");
    await reader.locator("summary:visible").click();
    await expectNoAxeViolations(page, testInfo, "3d-caderno");
    await page
      .getByRole("link", { name: "Versão em texto", exact: true })
      .click();
    await readEditorialStop(page, ilhaGrande);
    await page
      .getByRole("button", { name: "Explorar em 3D", exact: true })
      .click();
    await expect(
      reader.getByRole("heading", { name: "Viagem concluída.", exact: true }),
    ).toBeVisible();
    await expectNoAxeViolations(page, testInfo, "3d-arrival");
  },
);

test(
  "reduced-motion 3D and failure states have no automated WCAG violations",
  { tag: "@critical" },
  async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".presentation-bar")).toContainText(
      "O oceano está pronto",
    );
    await expectNoAxeViolations(page, testInfo, "reduced-motion");
    await page
      .getByRole("button", { name: "Explorar em 3D", exact: true })
      .click();
    await page.keyboard.press("ArrowDown");
    await expectSettledAt(page, 1);
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
    await openEditorialStop(page, noronha);
    const landed = await page.evaluate(() => scrollY);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => scrollY)).toBe(landed);
    expect(landed).toBeGreaterThan(0);
  },
);

test(
  "both presentations expose named control groups, Stop progress, and polite announcements",
  { tag: "@critical" },
  async ({ page }) => {
    test.setTimeout(90_000);
    const announcer = page.locator("#voyage-announcer");
    await page.goto("/");
    await openEditorialStop(page, noronha);
    await expect(announcer).toHaveText("Fernando de Noronha, parada aberta.");
    await expect(
      page.getByText("1 de 4 paradas visitadas", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("group", {
        name: "Navegação dos sinais de Fernando de Noronha",
      }),
    ).toHaveCount(1);
    await page
      .getByRole("button", { name: "Explorar em 3D", exact: true })
      .click();
    await expect(announcer).toHaveText(
      "Viagem em 3D. Role ou use as setas para navegar entre as paradas.",
    );
    await page
      .getByRole("button", { name: "Voltar ao mar", exact: true })
      .click();
    await page.keyboard.press("ArrowDown");
    await expectSettledAt(page, 2);
    await expect(announcer).toHaveText("Parada 02 · Boipeba.");
    await page
      .getByRole("link", { name: "Versão em texto", exact: true })
      .click();
    await expect(announcer).toHaveText(
      "Versão em texto. Seu lugar na viagem está preservado.",
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
        "Versão em texto. Seu lugar na viagem está preservado.",
      ]);
  },
);
