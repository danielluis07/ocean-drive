import { writeFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { settleAnimations } from "@/tests/browser/animations";

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

// Automated rules certify only what they can decide. Incomplete results are
// recorded per state for manual classification; they never count as a pass.
export async function expectNoAxeViolations(page: Page, testInfo: TestInfo, state: string) {
  // Park the pointer so a hover color transition is not sampled mid-animation;
  // hover end states are still covered wherever the pointer rests in a journey.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);
  await settleAnimations(page);
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  const incomplete = results.incomplete.map((rule) => ({
    rule: rule.id,
    impact: rule.impact,
    help: rule.help,
    targets: rule.nodes.map((node) => node.target.join(" ")),
  }));
  const report = testInfo.outputPath(`axe-${state}.json`);
  await writeFile(report, JSON.stringify({ state, engine: testInfo.project.name, incomplete }, null, 2));
  await testInfo.attach(`axe-${state}.json`, { path: report, contentType: "application/json" });
  for (const rule of incomplete) {
    testInfo.annotations.push({ type: "axe-incomplete", description: `${state}: ${rule.rule} (${rule.targets.length})` });
  }
  expect(
    results.violations.flatMap((rule) => rule.nodes.map((node) =>
      `${state} · ${rule.id}: ${node.target.join(" ")} — ${[...node.any, ...node.all, ...node.none].map((check) => check.message).join("; ")}`)),
  ).toEqual([]);
}
