import { defineConfig } from "@playwright/test";

// Suites served by the production build in `.next`. The evidence reporter binds
// each record to that build and rejects one built from other sources.
export default defineConfig({
  testDir: "./tests/browser",
  forbidOnly: !!process.env.CI,
  workers: 1,
  reporter: [[process.env.CI ? "dot" : "list"], ["./tests/browser/evidence-reporter.ts", { build: true }]],
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    {
      name: "landmark-textures",
      testMatch: "landmark-textures.e2e.ts",
      timeout: 120_000,
      expect: { timeout: 30_000 },
      use: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: .5,
        launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } },
    },
    {
      name: "ocean-features",
      testMatch: "ocean-features.e2e.ts",
      use: { channel: "chrome" },
    },
    {
      name: "asset-art",
      testMatch: "low-detail.e2e.ts",
      timeout: 120_000,
      expect: { timeout: 30_000 },
      use: {
        deviceScaleFactor: 1,
        launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
      },
    },
    {
      // Request, provenance, and scene budgets under software rendering.
      name: "production",
      testMatch: "production-assets.e2e.ts",
      timeout: 120_000,
      expect: { timeout: 20_000 },
      use: {
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 0.5,
        launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
      },
    },
    {
      name: "ocean-voyage-chrome",
      testMatch: "ocean-voyage.e2e.ts",
      use: { channel: "chrome", viewport: { width: 1522, height: 632 }, deviceScaleFactor: 1.25, trace: "off" },
    },
    {
      name: "ocean-voyage-firefox",
      testMatch: "ocean-voyage.e2e.ts",
      // Firefox explicitly disables hardware compositing in headless mode,
      // even with a physical WebGL renderer. This physical-device lab needs
      // a normal browser window; software suites remain headless.
      use: {
        browserName: "firefox", headless: false,
        viewport: { width: 1522, height: 632 }, deviceScaleFactor: 1.25, trace: "off",
        // Windows occlusion backs off RAF by 1/2/4/8/... seconds while the
        // foreground tab still reports visible. Keep this active-rendering lab
        // comparable to Chromium's disable-backgrounding-occluded-windows flag.
        launchOptions: { firefoxUserPrefs: { "widget.windows.window_occlusion_tracking.enabled": false } },
      },
    },
    {
      // Lab Core Web Vitals on the host's own GPU through full Chromium's headless
      // mode. Software WebGL stays enabled only so the page can still start; the
      // suite withholds its result on a software renderer.
      name: "lab-vitals",
      testMatch: "lab-vitals.e2e.ts",
      timeout: 20 * 60_000,
      expect: { timeout: 20_000 },
      use: { channel: "chromium", launchOptions: { args: ["--enable-unsafe-swiftshader"] } },
    },
  ],
  webServer: { command: "bun run start --port 3100", url: "http://localhost:3100", reuseExistingServer: false, timeout: 60_000 },
});
