import { defineConfig } from "@playwright/test";

// Small production-build check for PRs; full release suites use their own configs.
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "smoke.e2e.ts",
  forbidOnly: !!process.env.CI,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  reporter: "list",
  use: {
    baseURL: "http://localhost:3200",
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 0.5,
    contextOptions: { reducedMotion: "reduce" },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  webServer: { command: "bun run start --port 3200", url: "http://localhost:3200", reuseExistingServer: false, timeout: 60_000 },
});
