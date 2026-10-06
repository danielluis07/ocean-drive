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
  await expect(stopCard(page).getByRole("heading", { name: "O Brasil visto do mar." })).toBeVisible();
  for (const legacy of [/expedição/i, /Virar/, "Controles", "Reorientar rota", "Explorar em 3D", "Preparar 3D"]) {
    await expect(page.getByRole("button", { name: legacy })).toHaveCount(0);
  }
  await expect(page.getByRole("combobox", { name: "Qualidade" })).toHaveCount(0);
  await expect(page.locator(".presentation-bar, .ocean-caption, .stop-label")).toHaveCount(0);
});

test("the Approach shows Earth and the premise, then descends into the ready ocean", { tag: "@critical" }, async ({ page }) => {
  const releaseVessel = await holdVesselAssets(page);
  await page.goto("/");
  await expect(loading(page)).toBeVisible();
  await expect(loading(page)).toContainText("Travessia");
  await expect(loading(page)).toContainText("Uma viagem pela costa brasileira");
  await expect(loading(page).locator('img[src*="earth-globe"]')).toBeVisible();
  await expect.poll(() => loading(page).locator("img[data-optional]").evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await loading(page).locator("img[data-optional]").evaluateAll(images => Promise.all(images.map(image => (image as HTMLImageElement).decode())));
  const main = page.locator("main");
  await expect(main.getByRole("button")).toHaveCount(0);
  await expect(main.getByRole("heading")).toHaveCount(0);
  await expect(page.getByText("Role para navegar")).toHaveCount(0);
  releaseVessel();
  await expectOceanReady(page);
  await expect(loading(page)).toHaveAttribute("data-reveal", "true");
  await expect(loading(page)).toHaveAttribute("data-descent", "nested");
  await expect(loading(page)).toBeHidden();
  await expect(stopCard(page)).toBeVisible();
});

test("the Approach globe and its sole preload are in server HTML", { tag: "@critical" }, async ({ request }) => {
  const response = await request.get("/");
  const html = await response.text();
  expect(html).toMatch(/<img[^>]+src="\/images\/earth-globe\.v1\.webp"/);
  // React/Next may put resource hints in the HTTP Link header instead of HTML.
  const hints = (response.headers().link ?? "") + html.match(/<link\b[^>]*>/g)?.join("");
  expect(hints).toContain("/images/earth-globe.v1.webp");
  for (const id of ["atlantic", "water"]) {
    expect(html).toMatch(new RegExp(`<img[^>]+src="/images/earth-${id}\\.v1\\.webp"`));
    expect(hints).not.toContain(`/images/earth-${id}.v1.webp`);
  }
});

for (const failure of ["blocked", "late"] as const) {
  test(`${failure} close imagery uses the shorter fallback without holding the descent`, { tag: "@critical" }, async ({ page }) => {
    const releaseVessel = await holdVesselAssets(page);
    let releaseImages!: () => void;
    const pending = new Promise<void>(resolve => { releaseImages = resolve; });
    await page.route("**/images/earth-{atlantic,water}.v1.webp", async route => {
      if (failure === "late") { await pending; await route.continue(); }
      else await route.abort();
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(loading(page)).toBeVisible();
    releaseVessel();
    await expect(loading(page)).toHaveAttribute("data-reveal", "true", { timeout: 60_000 });
    await expect(loading(page)).toHaveAttribute("data-descent", "fallback");
    const elapsed = await loading(page).evaluate(element => {
      const style = getComputedStyle(element);
      return { delay: style.transitionDelay, duration: style.transitionDuration };
    });
    expect(elapsed).toEqual({ delay: "0.4s, 1.2s", duration: "0.8s, 0s" });
    releaseImages();
    await expect(loading(page)).toBeHidden({ timeout: 3000 });
    await expect(loading(page)).toHaveAttribute("data-descent", "fallback");
    await expect(stopCard(page)).toBeVisible();
  });
}

for (const viewport of [{ width: 1440, height: 1200 }, { width: 390, height: 844 }]) {
  test(`every visible Approach layer stays native at DPR 2 (${viewport.width}px)`, { tag: "@critical" }, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
    const page = await context.newPage();
    // Keep only server HTML and CSS: this also proves that the first frame and
    // complete animation do not depend on hydration or the 3D runtime.
    await page.route("**/*.js", route => route.abort());
    try {
      await page.goto("/");
      await expect(loading(page)).toBeVisible();
      await loading(page).locator("img").evaluateAll(images => Promise.all(images.map(image => (image as HTMLImageElement).decode())));
      await loading(page).evaluate(element => {
        element.setAttribute("data-reveal", "true");
        element.setAttribute("data-descent", "nested");
      });
      // Sample actual CSS transforms including both cross-fades, without a
      // running software GPU or timed screenshot race affecting the evidence.
      for (const time of [0, 576, 720, 864, 1100, 1344, 1500, 1632, 2100, 2399]) {
        const layers = await loading(page).evaluate((element, time) => {
          for (const animation of element.getAnimations({ subtree: true })) { animation.pause(); animation.currentTime = time; }
          return Array.from(element.querySelectorAll<HTMLImageElement>("img")).map(image => ({
            width: image.getBoundingClientRect().width * devicePixelRatio,
            height: image.getBoundingClientRect().height * devicePixelRatio,
            native: image.naturalWidth,
            nativeHeight: image.naturalHeight,
            expected: Number(image.getAttribute("width")),
            zoom: new DOMMatrixReadOnly(getComputedStyle(image).transform).a,
            visible: Number(getComputedStyle(image.parentElement!).opacity) > 0,
          }));
        }, time);
        for (const layer of layers.filter(layer => layer.visible)) {
          expect(layer.native).toBe(layer.expected);
          expect(layer.width).toBeLessThanOrEqual(layer.native);
          expect(layer.height).toBeLessThanOrEqual(layer.nativeHeight);
        }
        if (time === 2399) expect(layers[2].zoom).toBeCloseTo(30, 1);
        if ([0, 720, 1100, 1500, 2100, 2399].includes(time)) await page.screenshot({ path: testInfo.outputPath(`approach-${viewport.width}-${time}.png`) });
      }
    } finally { await context.close(); }
  });
}

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
  expect(await loading(page).locator("img").evaluateAll(images => images.map(image => getComputedStyle(image).transform))).toEqual(["none", "none", "none"]);
  // The Low tier fetches only its own simplified meshes: one vessel and one
  // mesh per island Landmark, never a Balanced one.
  expect(models.filter((path) => path.includes("del-mar"))).toEqual(["/models/del-mar-low.v1.glb"]);
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
