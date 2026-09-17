import { expect, type Page } from "@playwright/test";
import type { VoyageState } from "@/lib/voyage-state";
import { settleScroll } from "@/tests/browser/scroll";

// Stops 01–04 carry a Stop Account; Stop 00 is the opening.
export const voyageRoute = [
  { order: 1, name: "Fernando de Noronha", id: "fernando-de-noronha" },
  { order: 2, name: "Boipeba", id: "boipeba" },
  { order: 3, name: "Arquipélago de Abrolhos", id: "abrolhos" },
  { order: 4, name: "Ilha Grande", id: "ilha-grande" },
] as const;

type RouteStop = (typeof voyageRoute)[number];

export async function voyageState(page: Page): Promise<VoyageState> {
  return page.evaluate(
    () => JSON.parse(sessionStorage.getItem("ocean-drive:voyage:v1")!).state,
  );
}

export function routeButton(page: Page, stop: RouteStop) {
  return page
    .locator("#rota")
    .getByRole("button", { name: new RegExp(`^0${stop.order} ${stop.name}`) });
}

export async function openEditorialStop(page: Page, stop: RouteStop) {
  await routeButton(page, stop).click();
  await expect(page.locator(`#${stop.id}-title`)).toBeFocused();
}

// Advance to a passage and wait for it, so a click never lands on the previous signal.
export async function advanceEditorialSignal(
  page: Page,
  stop: RouteStop,
  passage: 2 | 3,
) {
  const article = page.getByRole("article", { name: stop.name, exact: true });
  await settleScroll(page);
  await article
    .getByRole("button", { name: "Próximo sinal", exact: true })
    .click();
  await expect(
    article.getByText(`Sinal ${passage} de 3`, { exact: true }),
  ).toBeVisible();
}

export async function readEditorialStop(page: Page, stop: RouteStop) {
  await openEditorialStop(page, stop);
  await advanceEditorialSignal(page, stop, 2);
  await advanceEditorialSignal(page, stop, 3);
}

// The ocean opens on its own once ready, with the Ship at rest on its Stop.
export async function expectOceanReady(page: Page, timeout = 60_000) {
  await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-stage", "ready", { timeout });
  await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "three-dimensional");
}

export async function enterOcean(page: Page, stop = 0) {
  await page.goto("/");
  await expectOceanReady(page);
  await expectSettledAt(page, stop);
}

export function stopCard(page: Page) {
  return page.locator('[data-slot="stop-card"]');
}

export function readingModeLink(page: Page) {
  return page.getByRole("link", { name: "Modo leitura", exact: true });
}

export function returnToOceanButton(page: Page) {
  return page.getByRole("button", { name: "Voltar ao oceano", exact: true });
}

// The Stop Account reader that “Saiba mais” opens until the Stop Account Sheet replaces it.
export function stopReader(page: Page) {
  return page.getByRole("region", { name: "Relato da parada" });
}

export async function openStopAccount(page: Page) {
  await expect(stopCard(page)).toHaveAttribute("data-visible", "true");
  await stopCard(page).getByRole("button", { name: "Saiba mais", exact: true }).click();
  await expect(stopReader(page)).toBeVisible();
}

// Wait for the Ship to come to rest at a Stop in the 3D scene.
export async function expectSettledAt(page: Page, stop: number, timeout = 30_000) {
  await expect(page.locator("#voyage-ocean")).toHaveAttribute(
    "data-settled-stop",
    String(stop),
    { timeout },
  );
}

// Hold vessel assets at the network boundary so loading states stay observable.
export async function holdVesselAssets(page: Page) {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/models/*.glb", async (route) => {
    await held;
    await route.continue();
  });
  return release;
}
