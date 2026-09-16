import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "production-assets.e2e.ts",
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: "http://localhost:3100", viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.5,
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
    trace: "retain-on-failure",
  },
  webServer: { command: "bun run start --port 3100", url: "http://localhost:3100", reuseExistingServer: false, timeout: 60_000 },
});
