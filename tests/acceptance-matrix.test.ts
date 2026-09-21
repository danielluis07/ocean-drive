import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { acceptanceMatrix, deviceSuite, evidencePolicy, rowGroups } from "@/content/acceptance-matrix";
import { manualEvidenceTemplate, renderChecklists, renderMatrixMarkdown } from "@/lib/acceptance-report";
import { evaluateDossier } from "@/lib/release-dossier";
import { matrixDocument } from "@/scripts/release-dossier";

const workflow = readFileSync(".github/workflows/acceptance.yml", "utf8");
const spec = (name: string) => `tests/browser/${name}.e2e.ts`;
// Which suite each Playwright project runs, per playwright.config.ts and
// playwright.production.config.ts.
const projects: Record<string, (name: string) => boolean> = {
  chromium: (name) => !["production-assets", "lab-vitals"].includes(name),
  firefox: (name) => readFileSync(spec(name), "utf8").includes("@critical"),
  webkit: (name) => readFileSync(spec(name), "utf8").includes("@critical"),
  production: (name) => name === "production-assets",
  "lab-vitals": (name) => name === "lab-vitals",
};

describe("Production Acceptance Matrix", () => {
  test("every row is complete, uniquely identified, and backed by evidence", () => {
    const ids = acceptanceMatrix.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const row of acceptanceMatrix) {
      expect(row.id.startsWith(row.group)).toBe(true);
      for (const field of ["title", "criterion", "method", "evidence", "threshold"] as const) expect(row[field].length).toBeGreaterThan(0);
      expect(row.checks.length + row.captures.length).toBeGreaterThan(0);
      expect(new Set(row.captures.map((capture) => capture.id)).size).toBe(row.captures.length);
      // Manual rows produce checklists for the reviewer.
      if (row.captures.length) expect(row.checklist.length).toBeGreaterThan(0);
    }
    expect(Object.keys(rowGroups)).toEqual([...new Set(acceptanceMatrix.map((row) => row.group))]);
  });

  test("every automated check is one the workflow actually records", () => {
    for (const row of acceptanceMatrix) {
      for (const check of row.checks) {
        const [source, project, name] = check.split("/");
        if (source === "ci") {
          expect(workflow, `${row.id} needs ${check} in CI`).toMatch(new RegExp(`evidence(\\.ts)? (run|tree) ${check}\\b`));
          continue;
        }
        expect(source).toBe("e2e");
        expect(Object.keys(projects)).toContain(project);
        if (!existsSync(spec(name))) {
          expect(row.awaiting, `${check} has no spec and ${row.id} names no awaited work`).toBeDefined();
          continue;
        }
        expect(projects[project](name), `${project} does not run ${spec(name)}`).toBe(true);
      }
    }
  });

  test("only the cosmetic visual-direction row can be waived", () => {
    expect(acceptanceMatrix.filter((row) => row.waivable).map((row) => row.id)).toEqual(["B2"]);
  });

  test("the rows cover every area the Travessia release must prove", () => {
    const text = acceptanceMatrix.map((row) => `${row.title} ${row.criterion} ${row.threshold}`).join(" ");
    for (const area of [
      "scroll", "touch", "arrow keys", "Capítulos", "settles", "Stop Card", "Stop Account", "Voyage State",
      "Arrival", "sound", "reduced-motion", "Accessible Editorial Presentation", "WebGL", "Evidence Boundary",
      "Landmark", "Ship", "water", "budgets", "LCP", "INP", "CLS", "WCAG 2.2", "First-time",
    ]) expect(text, area).toContain(area);
    expect(deviceSuite.map((device) => device.id)).toEqual([
      "iphone-safari", "android-a-chrome", "android-b-chrome", "windows-chrome", "windows-firefox", "macbook-safari",
    ]);
  });

  test("without evidence no row passes, so the real matrix can never certify itself", () => {
    const dossier = evaluateDossier({
      matrix: acceptanceMatrix,
      candidate: "c".repeat(40),
      committedAt: "2026-10-01T00:00:00Z",
      generatedAt: "2026-10-02T00:00:00Z",
      policy: evidencePolicy,
      submissions: [],
    });
    expect(dossier.verdict).toBe("blocked");
    expect(dossier.rows.every((row) => row.result === "unvalidated")).toBe(true);
  });

  test("checklists and the evidence template cover every manual capture point", () => {
    const candidate = "d".repeat(40);
    const template = manualEvidenceTemplate(acceptanceMatrix, candidate);
    const captures = acceptanceMatrix.flatMap((row) => row.captures.map((capture) => `${row.id}#${capture.id}`));
    expect(template.records.map((record) => `${record.row}#${record.capture}`)).toEqual(captures);
    expect(template.records.every((record) => record.candidate === candidate && record.result === "unvalidated")).toBe(true);
    expect(template.records.filter((record) => "waiver" in record).map((record) => record.row)).toEqual(["B2", "B2"]);
    const checklists = renderChecklists(acceptanceMatrix, candidate);
    for (const capture of captures) expect(checklists).toContain(`\`${capture}\``);
  });

  test(`${matrixDocument} is generated from the matrix`, () => {
    expect(readFileSync(matrixDocument, "utf8").replaceAll("\r\n", "\n")).toBe(renderMatrixMarkdown(acceptanceMatrix));
  });
});
