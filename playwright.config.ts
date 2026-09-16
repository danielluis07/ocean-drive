import { defineConfig, devices } from "@playwright/test";

// Engines are pinned by the exact @playwright/test version. Chromium runs every
// journey; Firefox and WebKit run the tagged critical Live Experience journeys.
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.e2e.ts",
  testIgnore: "production-assets.e2e.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } } },
    { name: "firefox", grep: /@critical/, use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", grep: /@critical/, use: { ...devices["Desktop Safari"] } },
  ],
  webServer: { command: "bun run dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
