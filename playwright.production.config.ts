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
