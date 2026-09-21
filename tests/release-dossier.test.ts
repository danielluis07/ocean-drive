import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AcceptanceRow } from "@/content/acceptance-matrix";
import { automatedSubmission, loadAutomatedEvidence, loadManualEvidence, manualSubmission, type ManualRecord } from "@/lib/evidence-loader";
import { sha256File, type EvidenceRecord } from "@/lib/evidence-record";
import { evaluateDossier, type Submission, type Waiver } from "@/lib/release-dossier";

const candidate = "a".repeat(40);
const other = "b".repeat(40);
const policy = { maxAgeDays: 30, clockSkewMinutes: 5 };
const times = { committedAt: "2026-10-01T12:00:00Z", generatedAt: "2026-10-05T12:00:00Z" };

const row = (fields: Partial<AcceptanceRow> & Pick<AcceptanceRow, "id" | "group">): AcceptanceRow => ({
  title: fields.id, criterion: "c", method: "m", evidence: "e", threshold: "t",
  waivable: false, checks: [], captures: [], checklist: [], ...fields,
});
const matrix = [
  row({ id: "A1", group: "A", checks: ["ci/lint", "ci/build"] }),
  row({ id: "B2", group: "B", waivable: true, captures: [{ id: "desktop", label: "Desktop" }] }),
  row({ id: "C1", group: "C", captures: [{ id: "evaluation", label: "Report" }] }),
];

const automated = (check: string, fields: Partial<Submission> = {}): Submission => ({
  source: `evidence/${check}.evidence.json`, key: check, kind: "automated", result: "pass",
  tester: "Automated · test", date: "2026-10-02T09:00:00Z", candidate, environment: "host: test",
  method: "bun test", evidence: ["output.log"], notes: "", waiver: null, problems: [], ...fields,
});
const manual = (key: string, fields: Partial<Submission> = {}): Submission => ({
  ...automated(key), kind: "manual", tester: "Reviewer", date: "2026-10-03", environment: "Chrome 150, 1440×900",
  method: "B1 checklist", evidence: ["capture.png"], ...fields,
});
const allPass = [automated("ci/lint"), automated("ci/build"), manual("B2#desktop"), manual("C1#evaluation")];
const waiver: Waiver = {
  difference: "Coral dot 1px lower", impact: "None on meaning, legibility, interaction, accessibility, or performance",
  owner: "Designer", reason: "Font metrics", followUp: "#99", approvedBy: "Project owner", approvedOn: "2026-10-04",
};
const evaluate = (submissions: Submission[]) => evaluateDossier({ matrix, candidate, policy, submissions, ...times });
const result = (submissions: Submission[], id: string) => evaluate(submissions).rows.find((item) => item.id === id)!;

describe("Release Dossier evaluation", () => {
  test("without evidence every row is Unvalidated and the candidate is blocked", () => {
    const dossier = evaluate([]);
    expect(dossier.rows.map((item) => item.result)).toEqual(["unvalidated", "unvalidated", "unvalidated"]);
    expect(dossier.verdict).toBe("blocked");
    expect(dossier.blocking).toEqual(["A1", "B2", "C1"]);
    expect(dossier.rows[0].reasons).toContain("ci/lint: no evidence recorded");
  });

  test("every row Pass makes the candidate release-ready", () => {
    const dossier = evaluate(allPass);
    expect(dossier.verdict).toBe("release-ready");
    expect(dossier.counts).toEqual({ pass: 3, fail: 0, unvalidated: 0, waived: 0 });
  });

  test("a row passes only when every check passes; a missing check leaves it Unvalidated and a failed one fails it", () => {
    expect(result([automated("ci/lint")], "A1").result).toBe("unvalidated");
    expect(result([automated("ci/lint"), automated("ci/build", { result: "fail" })], "A1").result).toBe("fail");
    expect(result([automated("ci/build", { result: "unvalidated", notes: "skipped" })], "A1").reasons).toContain("ci/build: recorded Unvalidated: skipped");
  });

  test("evidence for another candidate, stale evidence, and future evidence never count", () => {
    const rejected = [
      automated("ci/lint", { candidate: other }),
      automated("ci/lint", { candidate: "a".repeat(12) }),
      automated("ci/lint", { date: "2026-10-01T09:00:00Z" }),
      automated("ci/build", { date: "2026-10-06T00:00:00Z" }),
      automated("ci/build", { date: "not a date" }),
    ];
    const dossier = evaluate(rejected);
    expect(dossier.rows[0].result).toBe("unvalidated");
    expect(dossier.rejected.map((item) => item.problems[0])).toEqual([
      `candidate mismatch: recorded for ${other.slice(0, 12)}`,
      "names no exact candidate commit",
      "stale: evidence predates the candidate commit",
      "evidence is dated in the future",
      "evidence has no valid date",
    ]);
    const old = evaluateDossier({ matrix, candidate, policy, submissions: [automated("ci/lint", { date: "2026-08-15T00:00:00Z" })], committedAt: "2026-08-01T00:00:00Z", generatedAt: "2026-10-05T00:00:00Z" });
    expect(old.rejected[0].problems).toEqual(["stale: evidence is older than 30 days"]);
  });

  test("a date-only manual record from the commit's own day counts", () => {
    expect(result([manual("C1#evaluation", { date: "2026-10-01" })], "C1").result).toBe("pass");
  });

  test("manual evidence needs a tester, environment, method, and at least one evidence item", () => {
    const dossier = evaluate([manual("C1#evaluation", { tester: "", environment: " ", method: "", evidence: [] })]);
    expect(dossier.rows[2].result).toBe("unvalidated");
    expect(dossier.rejected[0].problems).toEqual(["missing tester", "missing environment", "missing method", "unverifiable: names no evidence"]);
  });

  test("problems found while locating evidence keep it from counting", () => {
    const outcome = result([manual("C1#evaluation", { problems: ["unverifiable: capture.png is missing"] })], "C1");
    expect(outcome.result).toBe("unvalidated");
    expect(outcome.reasons[0]).toContain("unverifiable: capture.png is missing");
  });

  test("the latest acceptable record decides, and earlier records stay in the history", () => {
    const retest = result([manual("C1#evaluation", { result: "fail", date: "2026-10-02" }), manual("C1#evaluation", { date: "2026-10-03" })], "C1");
    expect(retest.result).toBe("pass");
    expect(retest.entries[0].history.map((item) => item.result)).toEqual(["fail"]);
    expect(result([automated("ci/lint"), automated("ci/lint", { result: "fail", date: "2026-10-03T00:00:00Z" }), automated("ci/build")], "A1").result).toBe("fail");
  });

  test("an approved waiver excuses a recorded Fail on a cosmetic row", () => {
    const dossier = evaluate([...allPass.filter((item) => item.key !== "B2#desktop"), manual("B2#desktop", { result: "fail", waiver })]);
    expect(dossier.rows[1]).toMatchObject({ result: "fail", waived: true });
    expect(dossier.verdict).toBe("release-ready");
    expect(dossier.counts.waived).toBe(1);
  });

  test("a waiver never bypasses a nonwaivable row, missing evidence, or its own missing fields", () => {
    const nonwaivable = evaluate([...allPass.filter((item) => item.key !== "C1#evaluation"), manual("C1#evaluation", { result: "fail", waiver })]);
    expect(nonwaivable.rows[2]).toMatchObject({ result: "fail", waived: false });
    expect(nonwaivable.rows[2].reasons).toContain("Report: waiver rejected, C1 is not cosmetic and cannot be waived");
    expect(nonwaivable.verdict).toBe("blocked");

    const unvalidated = result([manual("B2#desktop", { result: "unvalidated", waiver })], "B2");
    expect(unvalidated).toMatchObject({ result: "unvalidated", waived: false });
    expect(unvalidated.reasons).toContain("Desktop: waiver ignored, only a recorded Fail can be waived");

    const incomplete = result([manual("B2#desktop", { result: "fail", waiver: { ...waiver, approvedBy: "" } })], "B2");
    expect(incomplete.waived).toBe(false);
    expect(incomplete.reasons).toContain("Desktop: incomplete waiver: missing approvedBy");

    const early = result([manual("B2#desktop", { result: "fail", waiver: { ...waiver, approvedOn: "2026-09-01" } })], "B2");
    expect(early.waived).toBe(false);
  });

  test("evidence naming nothing in the matrix is rejected", () => {
    expect(evaluate([manual("Z9#nowhere")]).rejected).toEqual([
      { source: "evidence/Z9#nowhere.evidence.json", key: "Z9#nowhere", problems: ["names no row, capture point, or check in the matrix"] },
    ]);
  });

  test("a dossier needs a full candidate commit id", () => {
    expect(() => evaluateDossier({ matrix, candidate: "abc123", policy, submissions: [], ...times })).toThrow();
  });
});

describe("Locating evidence", () => {
  const root = mkdtempSync(join(tmpdir(), "dossier-"));
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  const record = (fields: Partial<EvidenceRecord> = {}): EvidenceRecord => ({
    schema: "travessia.evidence/1", check: "ci/lint", kind: "command", status: "pass", candidate,
    treeClean: true, complete: true, recordedAt: "2026-10-02T09:00:00Z", tester: "Automated · test",
    environment: { host: "test" }, method: "bun run lint", artifacts: [], notes: [], ...fields,
  });

  test("an automated record's artifacts must still exist and match their hashes", () => {
    const directory = join(root, "automated");
    mkdirSync(join(directory, "ci"), { recursive: true });
    writeFileSync(join(directory, "ci", "output.log"), "ok");
    const artifacts = [{ path: "output.log", sha256: sha256File(join(directory, "ci", "output.log")) }];
    writeFileSync(join(directory, "ci", "lint.evidence.json"), JSON.stringify(record({ artifacts })));
    expect(loadAutomatedEvidence([directory])[0].problems).toEqual([]);
    writeFileSync(join(directory, "ci", "output.log"), "changed");
    expect(loadAutomatedEvidence([directory])[0].problems[0]).toContain("no longer matches its recorded SHA-256");
    rmSync(join(directory, "ci", "output.log"));
    expect(loadAutomatedEvidence([directory])[0].problems[0]).toContain("is missing");
  });

  test("a dirty tree, a partial run, or a stale build makes automated evidence unverifiable", () => {
    const source = join(root, "record.evidence.json");
    expect(automatedSubmission(record({ treeClean: false }), source).problems).toEqual(["unverifiable: the working tree differed from the candidate commit while the check ran"]);
    expect(automatedSubmission(record({ kind: "tree", treeClean: false, status: "fail" }), source)).toMatchObject({ result: "fail", problems: [] });
    expect(automatedSubmission(record({ complete: false }), source).problems[0]).toContain("partial");
    expect(automatedSubmission(record({ build: `${other}-1-1` }), source).problems[0]).toContain("is not the recorded commit");
    expect(automatedSubmission(record({ build: `${candidate}-123-1` }), source).problems).toEqual([]);
    expect(automatedSubmission(record({ status: "skipped" }), source)).toMatchObject({ result: "unvalidated", notes: "skipped" });
    expect(automatedSubmission({}, source).problems[0]).toBe("unverifiable: unrecognised evidence schema");
  });

  test("a cited JSON file that names another candidate is a mismatch; URLs are accepted as locators", () => {
    writeFileSync(join(root, "diagnostics.json"), JSON.stringify({ candidate: other, timing: {} }));
    const entry: ManualRecord = {
      row: "E2", capture: "iphone-safari", result: "pass", tester: "Tester", date: "2026-10-03", candidate,
      environment: "iPhone", method: "E2", evidence: ["diagnostics.json", "https://example.com/recording"],
    };
    const source = join(root, "manual-evidence.json");
    const [mismatch, ...more] = manualSubmission(entry, source).problems;
    expect(more).toEqual([]);
    expect(mismatch).toMatch(new RegExp(`^candidate mismatch: .*diagnostics[.]json names ${other.slice(0, 12)}$`));
    expect(manualSubmission({ ...entry, evidence: ["https://example.com/recording"] }, source).problems).toEqual([]);
    expect(manualSubmission({ ...entry, evidence: [{ path: "absent.png" }] }, source).problems[0]).toContain("is missing");
  });

  test("untouched template records are not evidence", () => {
    const file = join(root, "manual.json");
    const blank: ManualRecord = { row: "C1", capture: "evaluation", result: "unvalidated", tester: "", date: "", candidate, environment: "", method: "", evidence: [] };
    writeFileSync(file, JSON.stringify({ schema: "travessia.manual-evidence/1", records: [blank, { ...blank, result: "fail", tester: "Reviewer" }] }));
    expect(loadManualEvidence([file]).map((item) => item.result)).toEqual(["fail"]);
    writeFileSync(file, JSON.stringify({ records: [] }));
    expect(() => loadManualEvidence([file])).toThrow();
  });
});
