import { defineConfig, devices } from "@playwright/test";

// Engines are pinned by the exact @playwright/test version. Chromium runs every
// journey; Firefox and WebKit run the tagged critical Live Experience journeys.
// The evidence reporter records one candidate-bound result per engine and spec.
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.e2e.ts",
  testIgnore: ["production-assets.e2e.ts", "lab-vitals.e2e.ts"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  reporter: [[process.env.CI ? "dot" : "list"], ["./tests/browser/evidence-reporter.ts"]],
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } } },
    { name: "firefox", grep: /@critical/, use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", grep: /@critical/, use: { ...devices["Desktop Safari"] } },
  ],
  webServer: { command: "bun run dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
