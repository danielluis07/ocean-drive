import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  candidateIdentity,
  evidenceDirectory,
  evidenceEnvironment,
  evidenceTester,
  recordPath,
  retainArtifact,
  sha256File,
  treeChanges,
  treeComparison,
  writeEvidenceRecord,
  type EvidenceRecord,
} from "@/lib/evidence-record";

// Records candidate-bound evidence for one automated check.
//
//   bun run evidence run <check> [--artifact <path>]... -- <command> [args...]
//   bun run evidence tree <check>
//
// `run` executes the command, keeps its output as a log artifact, and exits with
// the command's own status. `tree` passes only when the working tree's content,
// including untracked files, still matches the candidate commit.

const [mode, check, ...rest] = process.argv.slice(2);
if (!check || !["run", "tree"].includes(mode)) {
  console.error("Usage: bun run evidence run <check> [--artifact <path>]... -- <command...> | bun run evidence tree <check>");
  process.exit(2);
}

const identity = candidateIdentity();
const recordedAt = new Date().toISOString();
const path = recordPath(evidenceDirectory(), check, recordedAt);
const artifacts = join(dirname(path), `${basename(path, ".evidence.json")}.artifacts`);
mkdirSync(artifacts, { recursive: true });
const keep = (name: string, contents: string) => {
  const file = join(artifacts, name);
  writeFileSync(file, contents);
  return { path: `${basename(artifacts)}/${name}`, sha256: sha256File(file) };
};
const base = {
  schema: "travessia.evidence/1",
  check,
  candidate: identity.candidate,
  treeClean: identity.treeClean,
  recordedAt,
  tester: evidenceTester(),
  environment: evidenceEnvironment(),
} as const;

if (mode === "tree") {
  const changes = treeChanges();
  const diff = Bun.spawnSync(["git", "diff"]).stdout.toString();
  writeEvidenceRecord(path, {
    ...base,
    kind: "tree",
    status: changes === "" ? "pass" : "fail",
    complete: true,
    method: treeComparison,
    artifacts: [keep("tree.txt", `${changes || "(no changes)"}\n\n${diff}`)],
    notes: changes === "" ? [] : [`${changes.split("\n").length} changed or untracked path(s)`],
  });
  if (changes) console.error(`${check}: the working tree differs from ${identity.candidate}\n${changes}`);
  process.exit(changes === "" ? 0 : 1);
}

const separator = rest.indexOf("--");
const command = separator === -1 ? [] : rest.slice(separator + 1);
const declared: string[] = [];
for (let index = 0; index < (separator === -1 ? rest.length : separator); index++) {
  if (rest[index] === "--artifact" && rest[index + 1]) declared.push(rest[++index]);
}
if (command.length === 0) {
  console.error("Missing the command to run after --");
  process.exit(2);
}

const child = Bun.spawn(command, { stdout: "pipe", stderr: "pipe", stdin: "inherit" });
const output: Uint8Array[] = [];
const pump = async (stream: ReadableStream<Uint8Array>, sink: NodeJS.WriteStream) => {
  const reader = stream.getReader();
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    sink.write(chunk.value);
    output.push(chunk.value);
  }
};
await Promise.all([pump(child.stdout, process.stdout), pump(child.stderr, process.stderr)]);
const code = await child.exited;
const missing = declared.filter((artifact) => !existsSync(artifact));
const record: EvidenceRecord = {
  ...base,
  kind: "command",
  status: code === 0 && missing.length === 0 ? "pass" : "fail",
  complete: true,
  method: command.join(" "),
  artifacts: [
    keep("output.log", Buffer.concat(output).toString("utf8")),
    ...declared.filter(existsSync).map((artifact) => retainArtifact(path, artifact)),
  ],
  notes: [`exit code ${code}`, ...missing.map((artifact) => `declared artifact ${artifact} was not produced`)],
};
writeEvidenceRecord(path, record);
process.exit(code === 0 && missing.length ? 1 : code);
