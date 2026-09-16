import { expect, test, type Page } from "@playwright/test";

async function enter(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
}

async function loseContext(page: Page) {
  await page.locator("canvas").evaluate((canvas) => {
    (canvas as HTMLCanvasElement).getContext("webgl2")!.getExtension("WEBGL_lose_context")!.loseContext();
  });
}

test("successful context restoration offers explicit return and a second loss locks the visit", async ({ page }) => {
  await enter(page);
  await loseContext(page);
  await expect(page.getByRole("heading", { name: /O Brasil visto do mar/ })).toBeVisible();
  await expect(page.locator("#voyage-editorial-heading")).toBeFocused();
  await expect(page.getByRole("button", { name: "Explorar em 3D", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await expect(page.locator("#voyage-ocean")).toBeFocused();
  await loseContext(page);
  await expect(page.locator(".presentation-bar")).toContainText("conexão gráfica");
  await expect(page.getByRole("button", { name: "Explorar em 3D", exact: true })).toBeHidden();
  await page.getByRole("combobox", { name: "Qualidade" }).selectOption("reduced-3d");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator(".presentation-bar")).toContainText("conexão gráfica");
  await expect(page.getByRole("button", { name: /Preparar 3D|Explorar em 3D/ })).toHaveCount(0);
});

test("loss while reading restores the matching passage without interrupting its focus", async ({ page }) => {
  await page.goto("/");
  await page.locator("#rota button").first().click();
  await page.getByRole("button", { name: "Próximo sinal", exact: true }).click();
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await loseContext(page);
  await expect(page.locator("#fernando-de-noronha-signal-2")).toBeFocused();
  await expect(page.getByRole("button", { name: "Explorar em 3D", exact: true })).toBeEnabled();
  await expect(page.locator("#fernando-de-noronha-signal-2")).toBeFocused();
});

test("a missing restoration event times out once while the matching text stays usable", async ({ page }) => {
  await enter(page);
  await page.clock.install();
  await page.locator("canvas").evaluate((canvas) => {
    const extension = (canvas as HTMLCanvasElement).getContext("webgl2")!.getExtension("WEBGL_lose_context")!;
    extension.restoreContext = () => {};
    extension.loseContext();
  });
  await expect(page.locator(".presentation-bar")).toContainText("Tentando restaurar");
  await page.locator("#rota button").first().click();
  await page.getByRole("button", { name: "Próximo sinal", exact: true }).click();
  await page.clock.runFor(8500);
  await expect(page.locator(".presentation-bar")).toContainText("seu lugar está preservado");
  await expect(page.getByRole("button", { name: "Explorar em 3D", exact: true })).toBeHidden();
  await expect(page.locator("#fernando-de-noronha-signal-2")).toBeVisible();
});

test("font and optional vessel detail failures never gate reading or a usable ocean", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/*.woff2", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Explorar em 3D", exact: true })).toBeEnabled();
  await page.route("**/research-vessel-low.v2.glb", (route) => route.abort());
  await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
  await page.getByRole("combobox", { name: "Qualidade" }).selectOption("reduced-3d");
  await expect(page.locator(".ocean-world")).toHaveAttribute("data-quality", "low");
  await expect(page.locator(".presentation-bar")).toContainText("O oceano está pronto");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-settled-stop", "1");
  await page.getByRole("combobox", { name: "Qualidade" }).selectOption("text");
  await expect(page.getByRole("heading", { name: /O Brasil visto do mar/ })).toBeVisible();
});

test("delayed vessel readiness preserves reading while delayed fonts remain optional", async ({ page }) => {
  let releaseVessel!: () => void;
  let releaseFonts!: () => void;
  const vessel = new Promise<void>((resolve) => { releaseVessel = resolve; });
  const fonts = new Promise<void>((resolve) => { releaseFonts = resolve; });
  await page.route("**/models/*.glb", async (route) => { await vessel; await route.continue(); });
  await page.route("**/*.woff2", async (route) => { await fonts; await route.abort(); });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".presentation-bar")).toContainText("Carregando");
  await page.locator("#rota button").first().click();
  await page.getByRole("button", { name: "Próximo sinal", exact: true }).click();
  releaseVessel();
  await expect(page.getByRole("button", { name: "Explorar em 3D", exact: true })).toBeEnabled();
  await expect(page.locator("#fernando-de-noronha-signal-2")).toBeFocused();
  releaseFonts();
  await expect(page.locator("#fernando-de-noronha-signal-2")).toBeFocused();
});

test("a hidden recovery preserves its foreground deadline and never returns to 3D on its own", async ({ page }) => {
  await enter(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.locator("canvas").evaluate((canvas) => {
    const extension = (canvas as HTMLCanvasElement).getContext("webgl2")!.getExtension("WEBGL_lose_context")!;
    extension.restoreContext = () => {};
    extension.loseContext();
  });
  await expect(page.locator(".presentation-bar")).toContainText("Tentando restaurar");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(20_000);
  await expect(page.locator(".presentation-bar")).toContainText("Tentando restaurar");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(8500);
  await expect(page.getByRole("button", { name: "Explorar em 3D", exact: true })).toBeHidden();
  await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "editorial");
});

const storedProgress = (page: Page) =>
  page.evaluate(() => JSON.parse(sessionStorage.getItem("ocean-drive:voyage:v1")!).state.routeProgress as number);

for (const event of ["visibilitychange", "pagehide", "blur"] as const) {
  test(`${event} records the Ship's place, freezes the route, and settles on return`, async ({ page }) => {
    await enter(page);
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.locator("#voyage-ocean canvas").evaluate((canvas) => {
      for (let event = 0; event < 4; event++) canvas.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 }));
    });
    // Hide while still under way, before the settle delay ends.
    await page.clock.runFor(200);
    await page.evaluate((kind) => {
      if (kind === "visibilitychange") {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event(kind));
      } else window.dispatchEvent(new Event(kind));
    }, event);
    await expect.poll(() => storedProgress(page)).toBeGreaterThan(0);
    const checkpoint = await storedProgress(page);
    expect(checkpoint).toBeLessThan(1);
    await page.clock.runFor(20_000);
    expect(await storedProgress(page)).toBe(checkpoint);
    await page.evaluate((kind) => {
      if (kind === "visibilitychange") {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
        document.dispatchEvent(new Event(kind));
      } else window.dispatchEvent(new Event(kind === "pagehide" ? "pageshow" : "focus"));
    }, event);
    // Input ended with the page hidden, so the Ship settles on the Stop nearest
    // to where the Visitor scrolled (four notches pass the halfway point).
    await page.clock.runFor(6000);
    await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-settled-stop", "1");
    await expect.poll(() => storedProgress(page)).toBe(1);
  });
}

test("sustained unusable Low rendering falls back even after choosing reduced 3D", async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => {
    window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(performance.now()), 40);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  });
  await enter(page);
  await page.getByRole("combobox", { name: "Qualidade" }).selectOption("reduced-3d");
  await page.clock.runFor(6400);
  await expect(page.locator(".presentation-bar")).toContainText("não está estável");
  await expect(page.getByRole("heading", { name: /O Brasil visto do mar/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Explorar em 3D", exact: true })).toBeHidden();
});

for (const failure of ["effects", "essential", "restored-frame"] as const) {
  test(`${failure} shader failure chooses the approved substitute or text`, async ({ page }) => {
    await page.addInitScript((mode) => {
      const original = WebGL2RenderingContext.prototype.shaderSource;
      let lost = false;
      window.addEventListener("webglcontextlost", () => { lost = true; }, true);
      WebGL2RenderingContext.prototype.shaderSource = function (shader, source) {
        const corrupt = mode === "essential" || (mode === "effects" && source.includes("uniform float wakeDetail;")) || (mode === "restored-frame" && lost);
        original.call(this, shader, corrupt ? `${source}\nINVALID_SHADER` : source);
      };
    }, failure);
    await page.goto("/");
    if (failure === "effects") {
      await expect(page.getByRole("button", { name: "Explorar em 3D", exact: true })).toBeEnabled();
      await expect(page.locator(".presentation-bar")).toContainText("O oceano está pronto");
    } else {
      if (failure === "restored-frame") {
        await page.getByRole("button", { name: "Explorar em 3D", exact: true }).click();
        await loseContext(page);
      }
      await expect(page.getByRole("button", { name: "Explorar em 3D", exact: true })).toBeHidden();
      await expect(page.locator(".presentation-bar")).toContainText(failure === "essential" ? "Não foi possível preparar" : "conexão gráfica");
      await expect(page.getByRole("heading", { name: /O Brasil visto do mar/ })).toBeVisible();
    }
  });
}
