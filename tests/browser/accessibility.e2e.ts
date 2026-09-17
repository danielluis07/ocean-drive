import { expect } from "@playwright/test";
import { test } from "@/tests/browser/journey-fixture";
import { expectNoAxeViolations } from "@/tests/browser/accessibility-scan";
import {
  enterOcean,
  expectSettledAt,
  holdVesselAssets,
  openEditorialStop,
  openStopAccount,
  readEditorialStop,
  readingModeLink,
  returnToOceanButton,
  stopReader,
  voyageRoute,
} from "@/tests/browser/editorial-route";

const [noronha, boipeba, abrolhos, ilhaGrande] = voyageRoute;

test(
  "loading and the ocean opening have no automated WCAG violations",
  { tag: "@critical" },
  async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const releaseVessel = await holdVesselAssets(page);
    await page.goto("/");
    await expect(page.locator('[data-slot="ocean-loading"]')).toBeVisible();
    await expectNoAxeViolations(page, testInfo, "loading");
    releaseVessel();
    await expectSettledAt(page, 0, 60_000);
    await expect(page.locator('[data-slot="stop-card"]')).toHaveAttribute("data-visible", "true");
    await expectNoAxeViolations(page, testInfo, "opening");
  },
);

test(
  "editorial Stops, Stop Accounts, Arrival, and sources have no automated WCAG violations",
  { tag: "@critical" },
  async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await enterOcean(page);
    await readingModeLink(page).click();
    await expectNoAxeViolations(page, testInfo, "editorial-entry");
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
  "3D Stop Cards, Stop Account, and Arrival have no automated WCAG violations",
  { tag: "@critical" },
  async ({ page }, testInfo) => {
    test.setTimeout(150_000);
    await enterOcean(page);
    await page.keyboard.press("ArrowDown");
    await expectSettledAt(page, 1);
    await expectNoAxeViolations(page, testInfo, "3d-stop-card");
    await openStopAccount(page);
    await expectNoAxeViolations(page, testInfo, "3d-reader");
    await stopReader(page).locator("summary:visible").click();
    await expectNoAxeViolations(page, testInfo, "3d-caderno");
    await stopReader(page)
      .getByRole("button", { name: "Voltar ao mar", exact: true })
      .click();
    await readingModeLink(page).click();
    await readEditorialStop(page, ilhaGrande);
    await returnToOceanButton(page).click();
    await expect(
      stopReader(page).getByRole("heading", { name: "Viagem concluída.", exact: true }),
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
    await enterOcean(page);
    await expectNoAxeViolations(page, testInfo, "reduced-motion");
    await page.keyboard.press("ArrowDown");
    await expectSettledAt(page, 1);
    await expectNoAxeViolations(page, testInfo, "reduced-motion-3d");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.route("**/models/*.glb", (route) => route.abort());
    await page.goto("/");
    await expect(page.locator('[data-slot="presentation-notice"]')).toContainText(
      "Não foi possível carregar o oceano em 3D.",
    );
    await expectNoAxeViolations(page, testInfo, "failure");
  },
);

test(
  "reduced motion moves focus between stations without animated scrolling",
  { tag: "@critical" },
  async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await enterOcean(page);
    await readingModeLink(page).click();
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
    await enterOcean(page);
    await readingModeLink(page).click();
    await expect(announcer).toHaveText(
      "Modo leitura. Seu lugar na viagem está preservado.",
    );
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
    await returnToOceanButton(page).click();
    await expect(announcer).toHaveText(
      "Oceano em 3D. Role, deslize ou use as setas para navegar entre as paradas.",
    );
    await stopReader(page)
      .getByRole("button", { name: "Voltar ao mar", exact: true })
      .click();
    await page.keyboard.press("ArrowDown");
    await expectSettledAt(page, 2);
    await expect(announcer).toHaveText("Parada 02 · Boipeba.");
    await readingModeLink(page).click();
    await expect(announcer).toHaveText(
      "Modo leitura. Seu lugar na viagem está preservado.",
    );
    await openEditorialStop(page, noronha);
    await expect(announcer).toHaveText("Fernando de Noronha, parada aberta.");
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
    await openEditorialStop(page, noronha);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { announcements: string[] }).announcements,
        ),
      )
      .toEqual(["", "Fernando de Noronha, parada aberta."]);
  },
);
