import { expect } from "@playwright/test";
import { test } from "@/tests/browser/journey-fixture";
import { expectSettledAt, voyageState } from "@/tests/browser/editorial-route";

test("a ready ocean still requires explicit entry and shows no steering controls", { tag: "@critical" }, async ({ page }) => {
  const warnings: string[] = [];
  page.on("console", (message) => { if (message.type() === "warning") warnings.push(message.text()); });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("O oceano está pronto");
  expect(warnings.join("\n")).not.toContain("THREE.Clock");
  await expect(page.getByRole("heading", { name: /O Brasil visto do mar/ })).toBeVisible();
  await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "editorial");
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await expect(page.locator("#voyage-ocean")).toBeFocused();
  for (const legacy of [/expedição/i, /Virar/, "Controles", "Reorientar rota"]) {
    await expect(page.getByRole("button", { name: legacy })).toHaveCount(0);
  }
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
  const passage = page.locator("#fernando-de-noronha-signal-2");
  await expect(passage).toBeFocused();
  release();
  await expect(page.getByRole("status")).toContainText("Não foi possível preparar");
  await expect(passage).toBeVisible();
  await expect(passage).toBeFocused();
  await page.reload();
  // Voyage State keeps the current Stop; signal pagination is not part of it.
  await expect(page.locator("#fernando-de-noronha-signal-1")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Não foi possível preparar");
  await expect(page.getByRole("button", { name: "Explorar em 3D", exact: true })).toBeHidden();
});

test("reduced motion still prepares the 3D voyage and loads the mobile vessel", { tag: "@critical" }, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  const vessels: string[] = [];
  page.on("request", (request) => { if (request.url().endsWith(".glb")) vessels.push(request.url()); });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("O oceano está pronto");
  await expect(page.getByRole("button", { name: /Preparar 3D/ })).toHaveCount(0);
  expect(vessels).toHaveLength(1);
  expect(vessels[0]).toContain("research-vessel-low.v2.glb");
  // Reduced motion alone never switches presentation.
  await expect(page.getByRole("heading", { name: /O Brasil visto do mar/ })).toBeVisible();
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "three-dimensional");
});

for (const capability of ["unsupported", "refused"] as const) {
  test(`${capability} WebGL keeps the editorial Expedition usable`, { tag: "@critical" }, async ({ page }) => {
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
    await expect(page.locator("#fernando-de-noronha-signal-2")).toBeFocused();
  });
}

test("every Stop Account is readable without JavaScript", { tag: "@critical" }, async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator(".signal")).toHaveCount(12);
  for (const signal of await page.locator(".signal").all()) await expect(signal).toBeVisible();
  await expect(page.getByRole("link", { name: "Versão em texto", exact: true })).toBeVisible();
  await context.close();
});

test("context loss returns to the matching editorial passage", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await page.keyboard.press("ArrowDown");
  await expectSettledAt(page, 1);
  await page.getByRole("button", { name: /Parada 01 Fernando de Noronha/ }).click();
  await expect(page.getByRole("region", { name: "Relato da parada" })).toBeVisible();
  await page.getByRole("button", { name: "Próximo sinal", exact: true }).click();
  await page.getByRole("button", { name: "Voltar ao mar", exact: true }).click();
  await page.locator("canvas").evaluate((canvas) => {
    (canvas as HTMLCanvasElement).getContext("webgl2")!.getExtension("WEBGL_lose_context")!.loseContext();
  });
  await expect(page.getByRole("status")).toContainText("conexão gráfica");
  await expect(page.locator("#voyage-editorial-heading")).toBeFocused();
  await expect(page.locator("#fernando-de-noronha-signal-2")).toBeVisible();
  expect((await voyageState(page)).currentStop).toBe("fernando-de-noronha");
});
