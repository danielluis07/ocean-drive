import { expect, test } from "@playwright/test";

test("a ready ocean still requires explicit entry and first movement", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("O oceano está pronto");
  await expect(page.getByRole("heading", { name: /Conduza a expedição/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar expedição", exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  const start = page.getByRole("button", { name: "Iniciar expedição", exact: true });
  await expect(start).toBeFocused();
  await expect(page.getByRole("button", { name: "Pausar expedição" })).toBeHidden();
  await start.click();
  await expect(page.getByRole("button", { name: "Pausar expedição" })).toBeVisible();
  await page.getByRole("button", { name: "Pausar expedição" }).click();
  await expect(page.getByRole("button", { name: "Retomar expedição" })).toBeVisible();
});

test("reading and focus survive delayed vessel preparation and an essential failure", async ({ page }) => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/models/*.glb", async (route) => { await blocked; await route.abort(); });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("Carregando");
  await expect(page.getByRole("button", { name: "Explorar em 3D", exact: true })).toBeDisabled();
  await page.locator("#rota button").first().click();
  await page.getByRole("button", { name: "Próximo sinal", exact: true }).click();
  const passage = page.locator("#pulso-de-calor-signal-2");
  await expect(passage).toBeFocused();
  release();
  await expect(page.getByRole("status")).toContainText("Não foi possível preparar");
  await expect(passage).toBeVisible();
  await expect(passage).toBeFocused();
  await page.reload();
  await expect(passage).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Não foi possível preparar");
  await expect(page.getByRole("button", { name: "Explorar em 3D", exact: true })).toBeHidden();
});

test("reduced motion defers graphics until requested and loads the mobile vessel", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  const vessels: string[] = [];
  page.on("request", (request) => { if (request.url().endsWith(".glb")) vessels.push(request.url()); });
  await page.goto("/");
  const prepare = page.getByRole("button", { name: "Preparar 3D com movimento reduzido" });
  await expect(prepare).toBeVisible();
  expect(vessels).toEqual([]);
  await prepare.click();
  await expect(page.getByRole("status")).toContainText("O oceano está pronto");
  expect(vessels).toHaveLength(1);
  expect(vessels[0]).toContain("research-vessel-low.v1.glb");
  await expect(page.getByRole("heading", { name: /Conduza a expedição/ })).toBeVisible();
});

for (const capability of ["unsupported", "refused"] as const) {
  test(`${capability} WebGL keeps the editorial Expedition usable`, async ({ page }) => {
    await page.addInitScript((mode) => {
      if (mode === "unsupported") Object.defineProperty(window, "WebGL2RenderingContext", { value: undefined });
      else {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
          if (String(args[0]).startsWith("webgl")) return null;
          return original.apply(this, args);
        } as typeof original;
      }
    }, capability);
    await page.goto("/");
    await expect(page.getByRole("status")).toContainText(capability === "unsupported" ? "não oferece" : "não permitiu");
    await page.locator("#rota button").first().click();
    await page.getByRole("button", { name: "Próximo sinal", exact: true }).click();
    await expect(page.locator("#pulso-de-calor-signal-2")).toBeFocused();
  });
}

test("the complete scientific story is readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator(".signal")).toHaveCount(12);
  for (const signal of await page.locator(".signal").all()) await expect(signal).toBeVisible();
  await expect(page.getByRole("link", { name: "Versão em texto", exact: true })).toBeVisible();
  await context.close();
});

test("context loss returns to the matching editorial passage with sailing paused", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await page.getByRole("button", { name: /Primeira estação Pulso de Calor/ }).click();
  await page.getByRole("button", { name: "Próximo sinal", exact: true }).click();
  await page.getByRole("button", { name: "Voltar ao mar", exact: true }).click();
  await page.getByRole("button", { name: "Iniciar expedição", exact: true }).click();
  await page.locator("canvas").evaluate((canvas) => {
    (canvas as HTMLCanvasElement).getContext("webgl2")!.getExtension("WEBGL_lose_context")!.loseContext();
  });
  await expect(page.getByRole("status")).toContainText("conexão gráfica");
  await expect(page.locator("#pulso-de-calor-signal-2")).toBeFocused();
  await expect(page.getByRole("button", { name: "Pausar expedição" })).toBeHidden();
});
