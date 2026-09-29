import { expect, test } from "@playwright/test";
import { expectSettledAt, openChapters, openSheet, openStopAccount, expectSheetClosed, readingModeLink, returnToOceanButton } from "@/tests/browser/editorial-route";

test("load the ocean, navigate, read a Stop Account, and switch presentations", async ({ page }) => {
  await page.goto("/");
  const ocean = page.locator("#voyage-ocean");
  await expect(ocean).toHaveAttribute("data-stage", "ready");
  await expect(page.locator('[data-slot="ocean-loading"]')).toBeHidden();
  await expectSettledAt(page, 0);
  await openChapters(page);
  await openSheet(page).getByRole("button", { name: /^01 Fernando de Noronha/ }).click();
  await expectSheetClosed(page);
  await expectSettledAt(page, 1);
  await openStopAccount(page);
  await expect(openSheet(page).getByRole("heading", { name: "Fernando de Noronha", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expectSheetClosed(page);
  await readingModeLink(page).click();
  await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "editorial");
  await expect(page.locator("#fernando-de-noronha-title")).toBeVisible();
  await returnToOceanButton(page).click();
  await expect(ocean).toHaveAttribute("data-stage", "ready");
  await expectSettledAt(page, 1);
});

test("a browser without WebGL can still read and navigate the voyage", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "WebGL2RenderingContext", { value: undefined }));
  await page.goto("/");
  await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "editorial");
  await expect(page.locator('[data-slot="ocean-loading"]')).toBeHidden();
  await expect(page.getByRole("heading", { name: /O Brasil visto do mar/ })).toBeVisible();
  await page.locator("#rota").getByRole("button", { name: /^01 Fernando de Noronha/ }).click();
  await expect(page.locator("#fernando-de-noronha-title")).toBeFocused();
  await expect(returnToOceanButton(page)).toHaveCount(0);
});
