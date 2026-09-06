import { mkdir } from "node:fs/promises";
import { chromium, type Page } from "@playwright/test";

const output = "docs/prototypes/field-station-copy-citations";

async function openReader(page: Page, variant: "A" | "B" | "C") {
  await page.goto(`http://localhost:3003/?variant=${variant}`, {
    waitUntil: "networkidle",
  });
  await page.locator(".reader-overlay[open]").waitFor();
  await page.waitForTimeout(400);
}

await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=swiftshader"],
});
const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await desktop.emulateMedia({ reducedMotion: "no-preference" });

for (const variant of ["A", "B", "C"] as const) {
  await openReader(desktop, variant);
  await desktop.screenshot({ path: `${output}/${variant}-desktop.png` });

  if (variant === "A") {
    await desktop.locator(".reader-citation").click();
    await desktop.locator(".source-card").scrollIntoViewIfNeeded();
    await desktop.waitForTimeout(250);
    await desktop.screenshot({ path: `${output}/${variant}-sources-desktop.png` });
  }

  if (variant === "C") {
    await desktop.locator(".reader-logbook-open").click();
    await desktop.waitForTimeout(250);
    await desktop.screenshot({ path: `${output}/${variant}-sources-desktop.png` });
  }
}

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.emulateMedia({ reducedMotion: "no-preference" });

for (const variant of ["A", "B", "C"] as const) {
  await openReader(mobile, variant);

  if (variant === "C") {
    await mobile.locator(".reader-logbook-open").click();
    await mobile.waitForTimeout(250);
  }

  await mobile.screenshot({ path: `${output}/${variant}-mobile.png` });
}

await browser.close();
