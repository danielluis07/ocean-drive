import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { cpus, platform, release } from "node:os";
import type { measureOceanFeatures } from "@/tests/browser/ocean-feature-lab";

declare global { interface Window { __measureOceanFeatures: typeof measureOceanFeatures } }

test("records interleaved GPU feature ablations of Balanced water", async ({ page, browser }, testInfo) => {
  test.setTimeout(120_000);
  execFileSync("bun", ["build", "tests/browser/ocean-feature-lab.ts", "--target", "browser", "--outfile", ".tmp/ocean-feature-lab.js"], { windowsHide: true });
  // No running app competes with this standalone water-only measurement.
  await page.goto("about:blank");
  await page.addScriptTag({ type: "module", content: await readFile(".tmp/ocean-feature-lab.js", "utf8") });
  await page.waitForFunction(() => typeof window.__measureOceanFeatures === "function");
  const report = await page.evaluate(() => window.__measureOceanFeatures());
  for (const capture of report.captures) await testInfo.attach(`water-${capture.state}.png`, {
    body: Buffer.from(capture.dataURL.split(",")[1], "base64"), contentType: "image/png",
  });
  await testInfo.attach("ocean-feature-costs.json", { body: JSON.stringify({
    browser: browser.version(), host: { os: `${platform()} ${release()}`, cpu: cpus()[0]?.model.trim() },
    drawingBuffer: report.drawingBuffer, displayTransform: "ACESFilmicToneMapping + sRGB", rows: report.rows,
  }, null, 2), contentType: "application/json" });
  expect(report.rows).toHaveLength(21);
});
