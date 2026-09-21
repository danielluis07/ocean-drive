import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { arch, cpus, platform, release, totalmem } from "node:os";
import { basename, dirname, join, relative } from "node:path";

// One automated check's outcome for one exact commit. Producers record what they
// observed; only the Release Dossier decides whether the record is acceptable.
export type EvidenceRecord = {
  schema: "travessia.evidence/1";
  check: string;
  // A tree check inspects the working tree itself, so its status is the finding.
  kind: "command" | "suite" | "tree";
  status: "pass" | "fail" | "skipped";
  candidate: string;
  // Whether the working tree matched the candidate commit while the check ran.
  treeClean: boolean;
  // False for filtered or interrupted runs, which cannot speak for a whole check.
  complete: boolean;
  recordedAt: string;
  tester: string;
  environment: Record<string, string>;
  method: string;
  // Relative to the record file, each with the SHA-256 it had when recorded.
  artifacts: { path: string; sha256: string }[];
  notes: string[];
  // The production build the check exercised, when it served one.
  build?: string;
};

export const evidenceDirectory = () => process.env.EVIDENCE_DIR ?? "evidence";

function git(args: string[]) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

export function candidateIdentity() {
  return {
    candidate: git(["rev-parse", "HEAD"]),
    treeClean: treeChanges() === "",
  };
}

// Tracked edits and untracked files both mean the tree is not the commit. The
// comparison is by content: with core.autocrlf, `git status` also flags files a
// generator rewrote with LF endings although their content is unchanged.
export const treeComparison = "git diff --name-status HEAD; git ls-files --others --exclude-standard";

export function treeChanges() {
  const untracked = git(["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean);
  return [git(["diff", "--name-status", "HEAD"]), ...untracked.map((path) => `??\t${path}`)].filter(Boolean).join("\n");
}

export function commitTime(candidate: string) {
  return git(["show", "-s", "--format=%cI", candidate]);
}

export function evidenceTester() {
  if (process.env.GITHUB_ACTIONS) return `Automated · GitHub Actions (${process.env.GITHUB_WORKFLOW ?? "workflow"})`;
  let name = "";
  try { name = git(["config", "user.name"]); } catch { /* No identity configured. */ }
  return `Automated · local run${name ? ` by ${name}` : ""}`;
}

export function evidenceEnvironment(): Record<string, string> {
  const run: Record<string, string> = process.env.GITHUB_RUN_ID
    ? { ciRun: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}/attempts/${process.env.GITHUB_RUN_ATTEMPT ?? "1"}` }
    : {};
  return {
    host: process.env.GITHUB_ACTIONS ? `GitHub Actions ${process.env.RUNNER_OS ?? ""} runner`.replace("  ", " ") : "local",
    os: `${platform()} ${release()} ${arch()}`,
    cpu: `${cpus()[0]?.model.trim() ?? "unknown"} × ${cpus().length}`,
    memory: `${Math.round(totalmem() / 1024 ** 3)} GiB`,
    runtime: process.versions.bun ? `Bun ${process.versions.bun}` : `Node ${process.versions.node}`,
    ...run,
  };
}

export function sha256File(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function slug(value: string) {
  return value.replace(/[^a-z0-9.-]+/gi, "_").replace(/^_+|_+$/g, "");
}

// Records are timestamped so reruns sit beside earlier ones; the dossier keeps
// the latest acceptable record per check and lists the others as history.
export function recordPath(directory: string, check: string, recordedAt: string) {
  return join(directory, ...check.split("/").slice(0, -1).map(slug), `${slug(check.split("/").at(-1)!)}.${recordedAt.replace(/[:.]/g, "-")}.evidence.json`);
}

// Copies an artifact next to the record so the evidence directory travels whole.
export function retainArtifact(record: string, source: string, name = basename(source)) {
  const target = join(dirname(record), `${basename(record, ".evidence.json")}.artifacts`, slug(name));
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  return { path: relative(dirname(record), target).replaceAll("\\", "/"), sha256: sha256File(target) };
}

export function writeEvidenceRecord(path: string, record: EvidenceRecord) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
}
