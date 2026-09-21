import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { sha256File, type EvidenceRecord } from "@/lib/evidence-record";
import type { Submission, ValidationResult, Waiver } from "@/lib/release-dossier";

// Locates evidence on disk and reports what cannot be verified. Whether the
// evidence then counts for the candidate is the dossier's decision.

export type ManualRecord = {
  row: string;
  capture: string;
  result: ValidationResult;
  tester: string;
  date: string;
  candidate: string;
  environment: string;
  method: string;
  // A URL, or a path relative to the evidence file, optionally with its SHA-256.
  evidence: (string | { path: string; sha256?: string })[];
  notes?: string;
  waiver?: Waiver | null;
};

export type ManualEvidence = { schema: "travessia.manual-evidence/1"; records: ManualRecord[] };

const display = (path: string) => relative(process.cwd(), path).replaceAll("\\", "/");
const isUrl = (value: string) => /^https?:\/\//.test(value);

// A JSON evidence file that names a candidate, such as a local diagnostic export,
// must name the same one as the record that cites it.
function fileProblems(path: string, candidate: string, sha256?: string) {
  if (!existsSync(path)) return [`unverifiable: ${display(path)} is missing`];
  if (sha256 && sha256File(path) !== sha256) return [`unverifiable: ${display(path)} no longer matches its recorded SHA-256`];
  if (!path.endsWith(".json")) return [];
  try {
    const named = JSON.parse(readFileSync(path, "utf8"))?.candidate;
    if (typeof named === "string" && named !== candidate) return [`candidate mismatch: ${display(path)} names ${named.slice(0, 12)}`];
  } catch {
    return [`unverifiable: ${display(path)} is not valid JSON`];
  }
  return [];
}

export function automatedSubmission(record: Partial<EvidenceRecord>, source: string): Submission {
  const base = dirname(source);
  const problems: string[] = [];
  if (record.schema !== "travessia.evidence/1") problems.push("unverifiable: unrecognised evidence schema");
  if (record.kind !== "tree" && record.treeClean !== true) problems.push("unverifiable: the working tree differed from the candidate commit while the check ran");
  if (record.complete !== true) problems.push("unverifiable: a filtered, partial, or interrupted run cannot speak for the whole check");
  if (record.build !== undefined && !record.build.startsWith(`${record.candidate}-`)) problems.push(`candidate mismatch: the served build ${record.build} is not the recorded commit`);
  const artifacts = Array.isArray(record.artifacts) ? record.artifacts : [];
  for (const artifact of artifacts) problems.push(...fileProblems(join(base, artifact.path), record.candidate ?? "", artifact.sha256));
  return {
    source: display(source),
    key: record.check ?? "",
    kind: "automated",
    result: record.status === "pass" ? "pass" : record.status === "fail" ? "fail" : "unvalidated",
    tester: record.tester ?? "",
    date: record.recordedAt ?? "",
    candidate: record.candidate ?? "",
    environment: Object.entries(record.environment ?? {}).map(([name, value]) => `${name}: ${value}`).join("; "),
    method: record.method ?? "",
    evidence: artifacts.map((artifact) => display(join(base, artifact.path))),
    notes: [...(record.status === "skipped" ? ["skipped"] : []), ...(record.notes ?? [])].join(" "),
    waiver: null,
    problems,
  };
}

export function manualSubmission(record: ManualRecord, source: string): Submission {
  const base = dirname(source);
  const locators = Array.isArray(record.evidence) ? record.evidence : [];
  const problems = locators.flatMap((locator) => {
    const path = typeof locator === "string" ? locator : locator.path;
    if (typeof path !== "string" || !path.trim()) return ["unverifiable: an evidence entry names no file or URL"];
    if (isUrl(path)) return [];
    return fileProblems(resolve(base, path), record.candidate, typeof locator === "string" ? undefined : locator.sha256);
  });
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  return {
    source: display(source),
    key: `${record.row}#${record.capture}`,
    kind: "manual",
    result: record.result,
    tester: text(record.tester),
    date: text(record.date),
    candidate: text(record.candidate),
    environment: text(record.environment),
    method: text(record.method),
    evidence: locators.map((locator) => {
      const path = typeof locator === "string" ? locator : locator?.path ?? "";
      return isUrl(path) ? path : display(resolve(base, path));
    }),
    notes: text(record.notes),
    waiver: record.waiver ?? null,
    problems,
  };
}

// Evidence records are found anywhere under the given directories, so CI
// artifacts can be downloaded side by side.
export function loadAutomatedEvidence(directories: string[]) {
  return directories.filter(existsSync).flatMap((directory) =>
    readdirSync(directory, { recursive: true, encoding: "utf8" })
      .filter((path) => path.endsWith(".evidence.json"))
      .sort()
      .map((path) => {
        const source = join(directory, path);
        try {
          return automatedSubmission(JSON.parse(readFileSync(source, "utf8")), source);
        } catch {
          return automatedSubmission({}, source);
        }
      }),
  );
}

// An untouched template record claims nothing, so it is not evidence at all.
const untouched = (record: ManualRecord) =>
  record.result === "unvalidated" && !record.tester && !record.date && (record.evidence ?? []).length === 0;

export function loadManualEvidence(files: string[]) {
  return files.flatMap((file) => {
    const evidence: ManualEvidence = JSON.parse(readFileSync(file, "utf8"));
    if (evidence.schema !== "travessia.manual-evidence/1" || !Array.isArray(evidence.records))
      throw new Error(`${file} is not a travessia.manual-evidence/1 file`);
    return evidence.records.filter((record) => !untouched(record)).map((record) => manualSubmission(record, file));
  });
}
