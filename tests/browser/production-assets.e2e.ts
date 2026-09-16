import { expect, test, type Response } from "@playwright/test";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { readFile, writeFile } from "node:fs/promises";
import manifest from "@/content/asset-manifest.json";
import { checkBudgets } from "@/lib/production-budgets";
import { createInitialVoyageState, serializeVoyageState } from "@/lib/voyage-state";
import type { SceneCounts } from "@/lib/local-diagnostics";

type RequestRecord = {
  path: string;
  type: string;
  bytes: number;
  sha256: string;
};

async function measureResponse(response: Response): Promise<RequestRecord> {
  const body = await response.body();
  const type = response.request().resourceType();
  const compressed = /javascript|json|text|svg/.test(
    response.headers()["content-type"] ?? "",
  );
  return {
    path: new URL(response.url()).pathname,
    type,
    bytes: compressed ? gzipSync(body).length : body.length,
    sha256: createHash("sha256").update(body).digest("hex"),
  };
}

test("production requests, provenance, scene budgets and local diagnostics reconcile", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.config.configFile?.endsWith("playwright.config.ts") ?? false,
    "Requires the production build and port 3100 config",
  );
  const requests: Promise<RequestRecord>[] = [];
  const external: string[] = [];
  const failed: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== "http://localhost:3100")
      external.push(request.url());
  });
  page.on("requestfailed", (request) => {
    failed.push(request.url());
  });
  page.on("response", (response) => {
    if (response.ok()) requests.push(measureResponse(response));
    else failed.push(`${response.status()} ${response.url()}`);
  });
  await page.addInitScript((voyage) => {
    sessionStorage.setItem("ocean-drive:diagnostics", "enabled");
    // Start from the text preference so the lazy 3D runtime waits for an
    // explicit request and route JavaScript can be measured on its own.
    if (!sessionStorage.getItem("ocean-drive:voyage:v1"))
      sessionStorage.setItem("ocean-drive:voyage:v1", voyage);
  }, serializeVoyageState({ ...createInitialVoyageState(), qualityPreference: "text" }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("status")).toContainText(
    "Versão em texto selecionada.",
  );
  const route = await Promise.all(requests);
  expect(route.some((request) => request.path.endsWith(".glb"))).toBe(false);
  await page.getByRole("button", { name: "Preparar 3D", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Explorar em 3D", exact: true }),
  ).toBeEnabled();
  const minimum = await Promise.all(requests);
  await page
    .getByRole("button", { name: "Explorar em 3D", exact: true })
    .click();
  await page.screenshot({ path: testInfo.outputPath("balanced-aerial.png") });
  await page.clock.install();
  await page.keyboard.press("ArrowDown");
  await page.clock.runFor(2400);
  await page
    .getByRole("link", { name: "Versão em texto", exact: true })
    .click();
  for (const stop of [
    "Fernando de Noronha",
    "Boipeba",
    "Arquipélago de Abrolhos",
    "Ilha Grande",
  ]) {
    await page
      .locator("#rota")
      .getByRole("button", { name: new RegExp(`^0[1-4] ${stop}`) })
      .click();
    for (let passage = 0; passage < 3; passage++) {
      const sources = page.locator(".signal:visible summary");
      await sources.click();
      await expect(
        page.getByRole("link", { name: /Acessar fonte/ }).first(),
      ).toBeVisible();
      await sources.click();
      if (passage < 2)
        await page
          .getByRole("button", { name: "Próximo sinal", exact: true })
          .click();
    }
    await page.clock.runFor(100);
  }
  await page
    .getByRole("button", { name: "Explorar em 3D", exact: true })
    .click();
  await page.clock.runFor(100);
  await page
    .getByRole("combobox", { name: "Qualidade" })
    .selectOption("reduced-3d");
  await expect
    .poll(async () =>
      (await Promise.all(requests)).some((request) =>
        request.path.includes("-low.v2.glb"),
      ),
    )
    .toBe(true);
  await page.clock.runFor(100);
  await page.screenshot({ path: testInfo.outputPath("low-aerial.png") });
  await page
    .locator("canvas")
    .evaluate((canvas) =>
      (canvas as HTMLCanvasElement)
        .getContext("webgl2")!
        .getExtension("WEBGL_lose_context")!
        .loseContext(),
    );
  await page.clock.runFor(300);
  await expect(
    page.getByRole("button", { name: "Explorar em 3D", exact: true }),
  ).toBeEnabled();
  const diagnostics = await page.evaluate(() =>
    JSON.parse(window.__oceanDiagnostics!.exportJSON()),
  );
  const diagnosticPath = testInfo.outputPath("local-diagnostics.json");
  await writeFile(diagnosticPath, JSON.stringify(diagnostics, null, 2));
  await testInfo.attach("local-diagnostics", {
    path: diagnosticPath,
    contentType: "application/json",
  });
  expect(diagnostics.build).toBe(
    (await readFile(".next/BUILD_ID", "utf8")).trim(),
  );
  expect(diagnostics.candidate).toMatch(/^[a-f0-9]{40}$/);
  expect(diagnostics.events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "readiness", detail: "ready" }),
      expect.objectContaining({ kind: "context", detail: "lost" }),
      expect.objectContaining({ kind: "context", detail: "restored" }),
      expect.objectContaining({
        kind: "quality",
        detail: expect.objectContaining({ tier: "low" }),
      }),
    ]),
  );
  expect(diagnostics.timing.frames).toBeGreaterThan(0);
  expect(diagnostics.timing.windows.length).toBeGreaterThan(0);
  const complete = await Promise.all(requests);
  expect(external).toEqual([]);
  expect(failed).toEqual([]);
  for (const request of complete) {
    if (
      request.path === "/" ||
      /\/_next\/static\/.*\.(js|css)$/.test(request.path)
    )
      continue;
    const asset = manifest.assets.find(
      (asset) => asset.sha256 === request.sha256,
    );
    expect(
      asset,
      `Unregistered deployed request ${request.path}`,
    ).toBeDefined();
  }
  const sum = (records: RequestRecord[]) =>
    records.reduce((total, request) => total + request.bytes, 0);
  const js = (records: RequestRecord[]) =>
    records.filter((request) => request.type === "script");
  const visuals = (records: RequestRecord[]) =>
    records.filter((request) =>
      manifest.assets.some(
        (asset) => asset.kind === "authored" && asset.sha256 === request.sha256,
      ),
    );
  const measurements = {
    routeJavaScript: sum(js(route)),
    lazyThreeJavaScript: sum(
      js(minimum).filter(
        (request) => !route.some((initial) => initial.path === request.path),
      ),
    ),
    minimumSailable: sum(minimum),
    completeVisit: sum(complete),
    minimumVisuals: sum(visuals(minimum)),
    allVisuals: sum(visuals(complete)),
    fonts: sum(complete.filter((request) => request.type === "font")),
    ...(diagnostics.scenes.balanced as SceneCounts),
  };
  expect(diagnostics.scenes.balanced.oceanDraws).toBe(1);
  expect(diagnostics.scenes.low.oceanDraws).toBe(1);
  expect(diagnostics.scenes.low.renderTargets).toBe(0);
  const reportPath = testInfo.outputPath("production-budget-report.json");
  await writeFile(
    reportPath,
    JSON.stringify({ measurements, requests: complete, diagnostics }, null, 2),
  );
  await testInfo.attach("production-budget-report", {
    path: reportPath,
    contentType: "application/json",
  });
  expect(checkBudgets(measurements)).toEqual([]);
});

test("diagnostic export is absent without an explicit local opt-in", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.config.configFile?.endsWith("playwright.config.ts") ?? false,
    "Production config only",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Explorar em 3D", exact: true }),
  ).toBeEnabled();
  expect(await page.evaluate(() => typeof window.__oceanDiagnostics)).toBe(
    "undefined",
  );
});
