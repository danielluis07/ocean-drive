import { expect, type Page } from "@playwright/test";
import { test } from "@/tests/browser/journey-fixture";
import { ambientSoundBudget } from "@/lib/production-budgets";
import { enterOcean, expectOceanReady, readingModeLink, returnToOceanButton } from "@/tests/browser/editorial-route";

// Observe real Web Audio nodes without replacing playback, decode or automation.
async function observeAudio(page: Page) {
  test.skip(!await page.evaluate(() => typeof AudioContext === "function"),
    "This browser build does not expose Web Audio; the unsupported-audio journey covers its fallback.");
  await page.addInitScript(() => {
    const contexts: AudioContext[] = [];
    const gains: GainNode[] = [];
    const sources: AudioBufferSourceNode[] = [];
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor(options?: AudioContextOptions) { super(options); contexts.push(this); }
      createGain() { const node = super.createGain(); gains.push(node); return node; }
      createBufferSource() { const node = super.createBufferSource(); sources.push(node); return node; }
    };
    Object.assign(window, { soundProbe: { contexts, gains, sources } });
  });
}

async function audioState(page: Page) {
  return page.evaluate(() => {
    const probe = (window as unknown as { soundProbe: {
      contexts: AudioContext[]; gains: GainNode[]; sources: AudioBufferSourceNode[];
    } }).soundProbe;
    return {
      contexts: probe.contexts.length,
      state: probe.contexts.at(-1)?.state,
      gain: probe.gains.at(-1)?.gain.value ?? 0,
      loop: probe.sources.at(-1)?.loop,
      duration: probe.sources.at(-1)?.buffer?.duration,
      sources: probe.sources.length,
    };
  });
}

async function visibility(page: Page, hidden: boolean) {
  await page.evaluate(value => {
    Object.defineProperty(document, "hidden", { configurable: true, value });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

test("sound is opt-in, lazy, quiet and reuses one seamless buffer", { tag: "@critical" }, async ({ page }) => {
  await observeAudio(page);
  const requests: string[] = [];
  page.on("request", request => { if (request.url().includes("/audio/")) requests.push(request.url()); });
  await enterOcean(page);
  const toggle = page.getByRole("button", { name: "Som desligado", exact: true });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(requests).toHaveLength(0);
  expect((await audioState(page)).contexts).toBe(0);
  const response = page.waitForResponse(response => response.url().endsWith("/audio/ocean-engine.v1.wav"));
  await toggle.click();
  expect((await (await response).body()).length).toBeLessThanOrEqual(ambientSoundBudget);
  await expect(page.getByRole("button", { name: "Som ligado", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await audioState(page)).gain).toBeCloseTo(0.22, 3);
  expect(await audioState(page)).toMatchObject({ loop: true, duration: 12, state: "running", sources: 1 });
  await page.getByRole("button", { name: "Som ligado", exact: true }).click();
  await expect.poll(async () => (await audioState(page)).state).toBe("suspended");
  expect((await audioState(page)).gain).toBeCloseTo(0, 4);
  await toggle.click();
  await expect.poll(async () => (await audioState(page)).gain).toBeCloseTo(0.22, 3);
  expect(requests).toHaveLength(1);
  expect((await audioState(page)).sources).toBe(1);
});

test("sound fades while hidden or reading and resumes only while enabled", { tag: "@critical" }, async ({ page }) => {
  await observeAudio(page);
  await enterOcean(page);
  await page.getByRole("button", { name: "Som desligado", exact: true }).click();
  await expect.poll(async () => (await audioState(page)).gain).toBeCloseTo(0.22, 3);
  await visibility(page, true);
  await expect.poll(async () => (await audioState(page)).state).toBe("suspended");
  expect((await audioState(page)).gain).toBeCloseTo(0, 4);
  await visibility(page, false);
  await expect.poll(async () => (await audioState(page)).gain).toBeCloseTo(0.22, 3);
  await readingModeLink(page).click();
  await expect.poll(async () => (await audioState(page)).state).toBe("suspended");
  await returnToOceanButton(page).click();
  await expectOceanReady(page);
  await expect(page.getByRole("button", { name: "Som ligado", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await audioState(page)).gain).toBeCloseTo(0.22, 3);
  await page.getByRole("button", { name: "Som ligado", exact: true }).click();
  await visibility(page, true);
  await visibility(page, false);
  await expect.poll(async () => (await audioState(page)).state).toBe("suspended");
  expect((await audioState(page)).gain).toBeCloseTo(0, 4);
});

test("sound preference survives reload in the tab and load failures allow retry", { tag: "@critical" }, async ({ page }) => {
  test.setTimeout(90_000);
  await observeAudio(page);
  await enterOcean(page);
  await page.route("**/audio/*", route => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.getByRole("button", { name: "Som desligado", exact: true }).click();
  await expect(page.locator("#voyage-announcer")).toContainText("Não foi possível iniciar o som ambiente");
  await expect(page.getByRole("button", { name: "Som desligado", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.unroute("**/audio/*");
  await page.getByRole("button", { name: "Som desligado", exact: true }).click();
  await expect.poll(async () => (await audioState(page)).gain).toBeCloseTo(0.22, 3);
  await page.reload();
  await expectOceanReady(page);
  await expect(page.getByRole("button", { name: "Som ligado", exact: true })).toHaveAttribute("aria-pressed", "true");
  // Some engines require a new gesture after reload, despite prior tab opt-in.
  await page.locator("#voyage-ocean").click({ position: { x: 8, y: 80 } });
  await expect.poll(async () => (await audioState(page)).gain).toBeCloseTo(0.22, 3);
  await page.getByRole("button", { name: "Som ligado", exact: true }).click();
  await page.reload();
  await expectOceanReady(page);
  await expect(page.getByRole("button", { name: "Som desligado", exact: true })).toHaveAttribute("aria-pressed", "false");
  expect((await audioState(page)).contexts).toBe(0);
});

test("disabling during a slow first load never starts audible playback", { tag: "@critical" }, async ({ page }) => {
  await observeAudio(page);
  await enterOcean(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/audio/*", async route => { await pending; await route.continue(); });
  await page.getByRole("button", { name: "Som desligado", exact: true }).click();
  await page.getByRole("button", { name: "Som ligado", exact: true }).click();
  release();
  await expect.poll(async () => (await audioState(page)).sources).toBe(1);
  await expect.poll(async () => (await audioState(page)).state).toBe("suspended");
  expect((await audioState(page)).gain).toBeCloseTo(0, 4);
});

test("a browser without Web Audio keeps the voyage usable and sound off", { tag: "@critical" }, async ({ page }) => {
  test.skip(await page.evaluate(() => typeof AudioContext === "function"), "Web Audio is available in this browser build.");
  await enterOcean(page);
  await page.getByRole("button", { name: "Som desligado", exact: true }).click();
  await expect(page.getByRole("button", { name: "Som desligado", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#voyage-announcer")).toContainText("Não foi possível iniciar o som ambiente");
  await expectOceanReady(page);
});
