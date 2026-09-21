import { expect, type Page } from "@playwright/test";
import { test } from "@/tests/browser/journey-fixture";
import {
  enterOcean,
  expectOceanReady,
  expectSettledAt,
  holdVesselAssets,
  returnToOceanButton,
  stopCard,
  voyageState,
} from "@/tests/browser/editorial-route";

const loading = (page: Page) => page.locator('[data-slot="ocean-loading"]');
const notice = (page: Page) => page.locator('[data-slot="presentation-notice"]');

test("a ready ocean opens without an entry step and shows no legacy controls", { tag: "@critical" }, async ({ page }) => {
  const warnings: string[] = [];
  page.on("console", (message) => { if (message.type() === "warning") warnings.push(message.text()); });
  await enterOcean(page);
  expect(warnings.join("\n")).not.toContain("THREE.Clock");
  // A linked program's info log reaches the Visitor's console as a warning. This
  // host renders through SwiftShader, which is quieter than ANGLE's D3D compiler.
  expect(warnings.join("\n")).not.toContain("Program Info Log");
  await expect(loading(page)).toBeHidden();
  await expect(stopCard(page).getByRole("heading", { name: "Travessia" })).toBeVisible();
  for (const legacy of [/expedição/i, /Virar/, "Controles", "Reorientar rota", "Explorar em 3D", "Preparar 3D"]) {
    await expect(page.getByRole("button", { name: legacy })).toHaveCount(0);
  }
  await expect(page.getByRole("combobox", { name: "Qualidade" })).toHaveCount(0);
  await expect(page.locator(".presentation-bar, .ocean-caption, .stop-label")).toHaveCount(0);
});

test("loading shows Earth and zooms into the ready ocean", { tag: "@critical" }, async ({ page }) => {
  const releaseVessel = await holdVesselAssets(page);
  await page.goto("/");
  await expect(loading(page)).toBeVisible();
  await expect(loading(page)).toContainText("Travessia");
  await expect(loading(page)).toContainText("Preparando a travessia");
  await expect(loading(page).locator('img[src*="earth-intro"]')).toBeVisible();
  const main = page.locator("main");
  await expect(main.getByRole("button")).toHaveCount(0);
  await expect(main.getByRole("heading")).toHaveCount(0);
  await expect(page.getByText("Role para navegar")).toHaveCount(0);
  releaseVessel();
  await expectOceanReady(page);
  await expect(loading(page)).toHaveAttribute("data-reveal", "true");
  await expect(loading(page)).toBeHidden();
  await expect(stopCard(page)).toBeVisible();
});

test("an essential failure while loading opens reading mode with one explanation line", async ({ page }) => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/models/*.glb", async (route) => { await blocked; await route.abort(); });
  await page.goto("/");
  await expect(loading(page)).toBeVisible();
  release();
  await expect(notice(page).locator("p")).toHaveText(["Não foi possível carregar o oceano em 3D."]);
  await expect(loading(page)).toBeHidden();
  await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "editorial");
  await expect(page.locator("#voyage-editorial-heading")).toBeFocused();
  await expect(page.locator("#voyage-announcer")).toHaveText("Não foi possível carregar o oceano em 3D.");
  await expect(returnToOceanButton(page)).toHaveCount(0);
  await page.locator("#rota button").first().click();
  await expect(page.locator("#fernando-de-noronha-title")).toBeFocused();
  await page.reload();
  // The lock lasts for the visit; Voyage State keeps the current Stop.
  await expect(notice(page)).toContainText("Não foi possível carregar o oceano em 3D.");
  await expect(page.locator("#fernando-de-noronha-title")).toBeVisible();
  await expect(returnToOceanButton(page)).toHaveCount(0);
});

test("reduced motion still opens the 3D voyage and loads the mobile vessel and Landmarks", { tag: "@critical" }, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  const models: string[] = [];
  page.on("request", (request) => { if (request.url().endsWith(".glb")) models.push(new URL(request.url()).pathname); });
  await enterOcean(page);
  // The Low tier fetches only its own simplified meshes: one vessel and one
  // mesh per island Landmark, never a Balanced one.
  expect(models.filter((path) => path.includes("mare-mansa"))).toEqual(["/models/mare-mansa-low.v1.glb"]);
  expect(models.filter((path) => path.includes("/landmark-")).sort()).toEqual([
    "/models/landmark-abrolhos-low.v1.glb",
    "/models/landmark-boipeba-low.v1.glb",
    "/models/landmark-fernando-de-noronha-low.v1.glb",
    "/models/landmark-ilha-grande-low.v1.glb",
  ]);
  await expect(stopCard(page)).toBeVisible();
});

for (const capability of ["unsupported", "refused"] as const) {
  test(`${capability} WebGL opens the Accessible Editorial Presentation with one explanation line`, { tag: "@critical" }, async ({ page }) => {
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
    await expect(notice(page).locator("p")).toHaveText([
      capability === "unsupported"
        ? "Este navegador não consegue exibir o oceano em 3D."
        : "O navegador não permitiu iniciar o oceano em 3D.",
    ]);
    await expect(loading(page)).toBeHidden();
    await expect(page.getByRole("heading", { name: /O Brasil visto do mar/ })).toBeVisible();
    await expect(returnToOceanButton(page)).toHaveCount(0);
    await page.locator("#rota button").first().click();
    await expect(page.locator("#fernando-de-noronha-title")).toBeFocused();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}

test("every Stop Account is readable without JavaScript", { tag: "@critical" }, async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(loading(page)).toBeHidden();
  await expect(page.getByRole("heading", { name: /O Brasil visto do mar/ })).toBeVisible();
  const accounts = page.locator('[data-slot="editorial-stop"]');
  await expect(accounts).toHaveCount(4);
  for (const account of await accounts.all()) {
    await expect(account).toBeVisible();
    await expect(account.getByRole("heading", { level: 3 })).toHaveText(["Destaques", "Melhor época"]);
  }
  await expect(page.getByRole("heading", { name: "Roteiro completo" })).toBeVisible();
  await context.close();
});

test("context loss returns to the matching editorial passage", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(90_000);
  await enterOcean(page);
  await page.keyboard.press("ArrowDown");
  await expectSettledAt(page, 1);
  await page.locator("canvas").evaluate((canvas) => {
    (canvas as HTMLCanvasElement).getContext("webgl2")!.getExtension("WEBGL_lose_context")!.loseContext();
  });
  await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "editorial");
  await expect(page.locator("#fernando-de-noronha-title")).toBeFocused();
  await expect(page.locator("#fernando-de-noronha-title")).toBeInViewport();
  // One restoration succeeds and offers an explicit return.
  await expect(returnToOceanButton(page)).toBeVisible();
  expect((await voyageState(page)).currentStop).toBe("fernando-de-noronha");
});
