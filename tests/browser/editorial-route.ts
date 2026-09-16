import { expect, type Page } from "@playwright/test";
import { settleScroll } from "@/tests/browser/scroll";

export const evidenceRoute = [
  { order: 1, name: "Pulso de Calor", id: "pulso-de-calor" },
  { order: 2, name: "Corais sob Estresse", id: "corais-sob-estresse" },
  { order: 3, name: "Respostas Desiguais", id: "respostas-desiguais" },
  { order: 4, name: "Chegada", id: "convergencia" },
] as const;

type RouteStation = (typeof evidenceRoute)[number];

// The station's own route button, never a locked button that mentions it.
export function routeButton(page: Page, station: RouteStation) {
  return page
    .locator("#rota")
    .getByRole("button", {
      name: new RegExp(`^0${station.order} ${station.name}`),
    });
}

export async function openEditorialStation(page: Page, station: RouteStation) {
  await routeButton(page, station).click();
  await expect(page.locator(`#${station.id}-title`)).toBeFocused();
}

// Advance to a passage and wait for it, so a click never lands on the previous signal.
export async function advanceEditorialSignal(
  page: Page,
  station: RouteStation,
  passage: 2 | 3,
) {
  const article = page.getByRole("article", {
    name: station.name,
    exact: true,
  });
  await settleScroll(page);
  await article
    .getByRole("button", { name: "Próximo sinal", exact: true })
    .click();
  await expect(
    article.getByText(`Sinal ${passage} de 3`, { exact: true }),
  ).toBeVisible();
}

export async function readEditorialStation(
  page: Page,
  station: RouteStation,
  confirm: "Continuar expedição" | "Conectar expedição" | null,
) {
  await openEditorialStation(page, station);
  await advanceEditorialSignal(page, station, 2);
  await advanceEditorialSignal(page, station, 3);
  if (confirm)
    await page
      .getByRole("article", { name: station.name, exact: true })
      .getByRole("button", { name: confirm, exact: true })
      .click();
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
