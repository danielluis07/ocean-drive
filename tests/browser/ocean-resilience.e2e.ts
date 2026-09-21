import { expect, test, type Page } from "@playwright/test";
import {
  enterOcean,
  expectOceanReady,
  expectSettledAt,
  openStopAccount,
  returnToOceanButton,
} from "@/tests/browser/editorial-route";
import { test as journey } from "@/tests/browser/journey-fixture";

// Several scenarios fast-forward hundreds of frames at once. At full scale the
// software renderer is still drawing them long after a test ends, which stalls
// the next test's browser context; a quarter scale keeps that backlog short.
test.use({ deviceScaleFactor: 0.25 });

const enter = (page: Page) => enterOcean(page);
const notice = (page: Page) => page.locator('[data-slot="presentation-notice"]');

async function loseContext(page: Page) {
  await page.locator("canvas").evaluate((canvas) => {
    (canvas as HTMLCanvasElement).getContext("webgl2")!.getExtension("WEBGL_lose_context")!.loseContext();
  });
}

// Enter on a clock paused from the first frame, as the journey fixture does, and
// advance it by hand. Quality then measures only steady 16 ms frames, so it never
// re-prepares the scene under a scenario's input; and a clock installed over a
// running ocean could overshoot its pause while software rendering is busy.
async function enterPaused(page: Page) {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.goto("/");
  await expect
    .poll(async () => {
      await page.clock.runFor(100);
      // Read without auto-waiting: the ocean cannot get ready while the clock is held.
      return page.evaluate(() => {
        const ocean = document.getElementById("voyage-ocean");
        return `${ocean?.dataset.stage}:${ocean?.dataset.settledStop}`;
      });
    }, { timeout: 60_000 })
    .toBe("ready:0");
}

test("successful context restoration offers explicit return and a second loss locks the visit", async ({ page }) => {
  await enter(page);
  await loseContext(page);
  await expect(page.getByRole("heading", { name: /O Brasil visto do mar/ })).toBeVisible();
  await expect(page.locator("#voyage-editorial-heading")).toBeFocused();
  await expect(returnToOceanButton(page)).toBeEnabled();
  await returnToOceanButton(page).click();
  await expect(page.locator("#voyage-ocean")).toBeFocused();
  await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "three-dimensional");
  await loseContext(page);
  await expect(notice(page)).toContainText("O oceano em 3D foi interrompido.");
  await expect(returnToOceanButton(page)).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(notice(page)).toContainText("O oceano em 3D foi interrompido.");
  await expect(returnToOceanButton(page)).toHaveCount(0);
  await expect(page.locator("#voyage-ocean")).toHaveCount(0);
});

// Sailing to the Stop is a navigation journey, so it runs on the controlled
// clock: in real time a software renderer can cross the Low fallback before
// the Ship arrives.
journey("loss while reading a Stop Account continues at the same Stop in the editorial text", async ({ page }) => {
  journey.setTimeout(90_000);
  await enter(page);
  await page.keyboard.press("ArrowDown");
  await expectSettledAt(page, 1);
  await openStopAccount(page);
  await loseContext(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("#fernando-de-noronha-title")).toBeFocused();
  await expect(returnToOceanButton(page)).toBeEnabled();
  await expect(page.locator("#fernando-de-noronha-title")).toBeFocused();
  // Returning to the ocean does not reopen the Sheet.
  await returnToOceanButton(page).click();
  await expectSettledAt(page, 1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a missing restoration event times out once while the matching text stays usable", async ({ page }) => {
  await enter(page);
  await page.clock.install();
  await page.locator("canvas").evaluate((canvas) => {
    const extension = (canvas as HTMLCanvasElement).getContext("webgl2")!.getExtension("WEBGL_lose_context")!;
    extension.restoreContext = () => {};
    extension.loseContext();
  });
  await expect(notice(page)).toContainText("Tentando restaurá-lo");
  await expect(returnToOceanButton(page)).toHaveCount(0);
  await page.locator("#rota button").first().click();
  await page.clock.runFor(8500);
  await expect(notice(page).locator("p")).toHaveText(["O oceano em 3D foi interrompido."]);
  await expect(returnToOceanButton(page)).toHaveCount(0);
  await expect(page.locator("#fernando-de-noronha-title")).toBeVisible();
});

test("font and optional vessel detail failures never gate a usable ocean", async ({ page }) => {
  test.setTimeout(120_000);
  await page.route("**/*.woff2", (route) => route.abort());
  await page.route("**/del-mar-low.v1.glb", (route) => route.abort());
  // Steady 25 ms frames: slow enough to drop from Balanced to Low, never unusable.
  // The clock stays paused, so slow real frames from software rendering never count.
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.addInitScript(() => {
    window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(performance.now()), 25);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  });
  await page.goto("/");
  await expect
    .poll(async () => {
      await page.clock.runFor(100);
      // Read without auto-waiting: the ocean cannot appear while the clock is held.
      return page.evaluate(() => document.getElementById("voyage-ocean")?.dataset.stage);
    }, { timeout: 60_000 })
    .toBe("ready");
  await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-quality", "balanced");
  await page.clock.runFor(7000);
  // Low's vessel detail failed to load; the usable Balanced vessel stays in the scene.
  await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-quality", "low");
  await expectOceanReady(page);
  await page.keyboard.press("ArrowDown");
  await page.clock.runFor(8000);
  await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-settled-stop", "1");
});

test("delayed fonts never delay the ocean", async ({ page }) => {
  let releaseFonts!: () => void;
  const fonts = new Promise<void>((resolve) => { releaseFonts = resolve; });
  await page.route("**/*.woff2", async (route) => { await fonts; await route.abort(); });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expectOceanReady(page);
  await expect(page.locator('[data-slot="stop-card"]')).toBeVisible();
  releaseFonts();
  await expect(page.locator('[data-slot="stop-card"]')).toBeVisible();
});

test("a hidden recovery preserves its foreground deadline and never returns to 3D on its own", async ({ page }) => {
  await enterPaused(page);
  await page.locator("canvas").evaluate((canvas) => {
    const extension = (canvas as HTMLCanvasElement).getContext("webgl2")!.getExtension("WEBGL_lose_context")!;
    extension.restoreContext = () => {};
    extension.loseContext();
  });
  await expect(notice(page)).toContainText("Tentando restaurá-lo");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(20_000);
  await expect(notice(page)).toContainText("Tentando restaurá-lo");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(8500);
  await expect(notice(page)).toContainText("O oceano em 3D foi interrompido.");
  await expect(returnToOceanButton(page)).toHaveCount(0);
  await expect(page.locator(".voyage")).toHaveAttribute("data-presentation", "editorial");
});

const storedProgress = (page: Page) =>
  page.evaluate(() => JSON.parse(sessionStorage.getItem("ocean-drive:voyage:v1")!).state.routeProgress as number);

for (const event of ["visibilitychange", "pagehide", "blur"] as const) {
  test(`${event} records the Ship's place, freezes the route, and settles on return`, async ({ page }) => {
    // Software rendering draws every controlled frame, so these journeys run long.
    test.setTimeout(120_000);
    await enterPaused(page);
    await page.locator("#voyage-ocean canvas").evaluate((canvas) => {
      for (let event = 0; event < 16; event++) canvas.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 }));
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
    // Input ended with the page hidden, so the Ship docks at the Stop the
    // Visitor scrolled close to (sixteen notches come within reach of Stop 01).
    await page.clock.runFor(6000);
    await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-settled-stop", "1");
    await expect.poll(() => storedProgress(page)).toBe(1);
  });
}

test("sustained unusable Low rendering falls back to the Accessible Editorial Presentation", async ({ page }) => {
  // A small screen starts in Low, which then renders unusably slowly.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install();
  await page.addInitScript(() => {
    window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(performance.now()), 40);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  });
  await enter(page);
  await expect(page.locator("#voyage-ocean")).toHaveAttribute("data-quality", "low");
  await page.clock.runFor(6400);
  await expect(notice(page).locator("p")).toHaveText(["O oceano em 3D não ficou estável neste dispositivo."]);
  await expect(page.getByRole("heading", { name: /O Brasil visto do mar/ })).toBeVisible();
  await expect(returnToOceanButton(page)).toHaveCount(0);
});

for (const failure of ["effects", "essential", "restored-frame"] as const) {
  test(`${failure} shader failure chooses the approved substitute or reading mode`, async ({ page }) => {
    // The decorative-shader fallback compiles the water twice.
    test.setTimeout(120_000);
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
      await expectOceanReady(page);
      await expect(notice(page)).toHaveCount(0);
    } else {
      if (failure === "restored-frame") {
        await expectOceanReady(page);
        await loseContext(page);
      }
      await expect(notice(page).locator("p")).toHaveText([
        failure === "essential" ? "Não foi possível carregar o oceano em 3D." : "O oceano em 3D foi interrompido.",
      ]);
      await expect(returnToOceanButton(page)).toHaveCount(0);
      await expect(page.getByRole("heading", { name: /O Brasil visto do mar/ })).toBeVisible();
    }
  });
}
