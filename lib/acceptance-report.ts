import { evidencePolicy, rowGroups, type AcceptanceRow, type RowGroup } from "@/content/acceptance-matrix";
import type { ManualEvidence, ManualRecord } from "@/lib/evidence-loader";
import type { Dossier, EntryOutcome, RowOutcome, Submission, ValidationResult } from "@/lib/release-dossier";

// Markdown views of the Production Acceptance Matrix and the Release Dossier.

const cell = (value: string) => value.replace(/\r?\n/g, " ").replace(/\|/g, "\\|") || "—";
const table = (header: string[], rows: string[][]) =>
  [`| ${header.join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`)].join("\n");
const groups = Object.keys(rowGroups) as RowGroup[];
const resultLabel: Record<ValidationResult, string> = { pass: "Pass", fail: "Fail", unvalidated: "Unvalidated" };
const evidenceKinds = (row: AcceptanceRow) =>
  [row.checks.length ? "Automated" : "", row.captures.length ? "Manual" : ""].filter(Boolean).join(" + ");

export const evidenceRules = [
  "Every row records **Pass**, **Fail**, or **Unvalidated**. Missing evidence is Unvalidated and never counts as a pass.",
  "Evidence counts only when it names the exact 40-character candidate commit. Evidence for another commit, from a working tree that differed from the commit, or from a filtered or interrupted run is rejected.",
  `Evidence is stale, and rejected, when it predates the candidate commit or is older than ${evidencePolicy.maxAgeDays} days when the dossier is generated; evidence dated in the future is rejected too.`,
  "Evidence must be verifiable: every cited file must exist and still match its recorded SHA-256, and a cited JSON file that names a candidate (such as a local diagnostic export) must name the same one.",
  "The latest acceptable record for each check or capture point decides it; superseded records stay in the dossier's history.",
  "A row passes only when every check and capture point it lists passes. Any recorded Fail makes the row Fail; otherwise any missing entry leaves it Unvalidated.",
  "Every row is mandatory. Only rows marked cosmetic may carry a waiver, and only for a recorded Fail with the difference, impact, owner, reason, follow-up, approver, and approval date. A waiver on any other row is rejected and the row still blocks release.",
  "The candidate is release-ready only when every row is Pass or a waived cosmetic Fail. The project owner's verdict (R3) cannot override a blocking row.",
];

export function renderMatrixMarkdown(matrix: AcceptanceRow[]) {
  const lines = [
    "<!-- Generated from content/acceptance-matrix.ts by `bun run acceptance:matrix`. Edit the source, then regenerate. -->",
    "",
    "# Production Acceptance Matrix",
    "",
    "The observable criteria, target states, methods, required evidence, and pass thresholds for one exact Travessia release candidate. It implements [#45](https://github.com/danielluis07/ocean-drive/issues/45), replacing the Instituto Maré Aberta matrix of [#19](https://github.com/danielluis07/ocean-drive/issues/19). [release-dossier.md](release-dossier.md) describes how evidence is recorded and evaluated.",
    "",
    "## Evidence rules",
    "",
    ...evidenceRules.map((rule) => `- ${rule}`),
    "",
    "## Summary",
    "",
    table(["Row", "Title", "Evidence", "Waiver"], matrix.map((row) => [row.id, row.title, evidenceKinds(row), row.waivable ? "Cosmetic: may be waived" : "Not waivable"])),
  ];
  for (const group of groups) {
    const rows = matrix.filter((row) => row.group === group);
    if (!rows.length) continue;
    lines.push("", `## ${group} · ${rowGroups[group]}`);
    for (const row of rows) {
      lines.push(
        "",
        `### ${row.id} · ${row.title}`,
        "",
        `**Criterion.** ${row.criterion}`,
        "",
        `**Method.** ${row.method}`,
        "",
        `**Required evidence.** ${row.evidence}`,
        "",
        `**Pass threshold.** ${row.threshold}`,
        "",
        `**Waiver.** ${row.waivable ? "Cosmetic row: a recorded Fail may carry an owner-approved waiver." : "Not waivable."}`,
      );
      if (row.checks.length) lines.push("", `**Automated evidence.** ${row.checks.map((check) => `\`${check}\``).join(", ")}`);
      if (row.captures.length) lines.push("", `**Capture points.** ${row.captures.map((capture) => `\`${row.id}#${capture.id}\` ${capture.label}`).join("; ")}`);
      if (row.awaiting) lines.push("", `**Awaiting.** ${row.awaiting} Until it lands, the row stays Unvalidated.`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export function manualEvidenceTemplate(matrix: AcceptanceRow[], candidate: string): ManualEvidence {
  return {
    schema: "travessia.manual-evidence/1",
    records: matrix.flatMap((row) =>
      row.captures.map((capture): ManualRecord => ({
        row: row.id,
        capture: capture.id,
        result: "unvalidated",
        tester: "",
        date: "",
        candidate,
        environment: "",
        method: "",
        evidence: [],
        notes: "",
        ...(row.waivable ? { waiver: null } : {}),
      })),
    ),
  };
}

export function renderChecklists(matrix: AcceptanceRow[], candidate: string) {
  const lines = [
    "# Manual validation checklists",
    "",
    `Candidate: \`${candidate}\``,
    "",
    "Record each capture point in `manual-evidence.json` beside this file (start from `manual-evidence.template.json`). Each record needs the result (`pass`, `fail`, or `unvalidated`), tester, date (`YYYY-MM-DD` or an ISO timestamp), this exact candidate, environment, method, and at least one evidence file or URL. Paths are relative to `manual-evidence.json`; add a `sha256` to pin a file. Then run `bun run dossier`.",
    "",
    "Only cosmetic rows may carry a `waiver`, and only for a recorded Fail: `{ difference, impact, owner, reason, followUp, approvedBy, approvedOn }`, approved by the project owner.",
  ];
  for (const group of groups) {
    const rows = matrix.filter((row) => row.group === group && row.captures.length);
    if (!rows.length) continue;
    lines.push("", `## ${group} · ${rowGroups[group]}`);
    for (const row of rows) {
      lines.push("", `### ${row.id} · ${row.title}${row.waivable ? " (cosmetic, waivable)" : ""}`, "", row.criterion, "", `**Pass threshold.** ${row.threshold}`, "", `**Method.** ${row.method}`, "", `**Evidence to capture.** ${row.evidence}`);
      if (row.awaiting) lines.push("", `> Awaiting ${row.awaiting}`);
      lines.push("", "Capture points:", "", ...row.captures.map((capture) => `- [ ] \`${row.id}#${capture.id}\` · ${capture.label}`));
      if (row.checklist.length) lines.push("", "Checklist, at every capture point:", "", ...row.checklist.map((item) => `- [ ] ${item}`));
    }
  }
  return `${lines.join("\n")}\n`;
}

function evidenceCell(submission: Submission, link: (path: string) => string) {
  return submission.evidence.map((path) => `[${path.split("/").at(-1)}](${/^https?:/.test(path) ? path : link(path)})`).join(", ");
}

function waiverCell(submission: Submission | null) {
  const waiver = submission?.waiver;
  return waiver ? `${waiver.difference}; impact: ${waiver.impact}; owner: ${waiver.owner}; approved by ${waiver.approvedBy} on ${waiver.approvedOn}; follow-up: ${waiver.followUp}` : "";
}

function entryRow(entry: EntryOutcome, link: (path: string) => string) {
  const selected = entry.selected;
  return [
    entry.key.includes("#") ? `\`${entry.key}\` ${entry.label}` : `\`${entry.key}\``,
    resultLabel[entry.result],
    selected?.tester ?? "",
    selected?.date ?? "",
    selected ? `\`${selected.candidate.slice(0, 12)}\`` : "",
    selected?.environment ?? "",
    selected?.method ?? "",
    selected ? evidenceCell(selected, link) : "",
    selected?.notes ?? entry.reason ?? "",
    waiverCell(selected),
  ];
}

function rowStatus(row: RowOutcome) {
  return row.waived ? "Fail (waived, cosmetic)" : resultLabel[row.result];
}

export function renderDossierMarkdown(dossier: Dossier, matrix: AcceptanceRow[], link: (path: string) => string = (path) => path) {
  const blocking = dossier.blocking.length;
  const lines = [
    "# Release Dossier",
    "",
    table(["Field", "Value"], [
      ["Candidate", `\`${dossier.candidate}\``],
      ["Committed", dossier.committedAt],
      ["Generated", dossier.generatedAt],
      ["Verdict", dossier.verdict === "release-ready"
        ? "**Release-ready**: every row is Pass or a waived cosmetic Fail."
        : `**Blocked**: ${blocking} of ${dossier.rows.length} rows are not Pass (${dossier.blocking.join(", ")}).`],
      ["Results", `${dossier.counts.pass} Pass · ${dossier.counts.fail} Fail (${dossier.counts.waived} waived) · ${dossier.counts.unvalidated} Unvalidated`],
      ["Evidence policy", `Exact candidate only; stale before the commit or after ${dossier.policy.maxAgeDays} days; ${dossier.policy.clockSkewMinutes} minutes of clock skew allowed.`],
    ]),
    "",
    "Lab Core Web Vitals (A12) are synthetic lab measurements against the production build. They are never field data about real Visitors.",
    "",
    "## Summary",
    "",
    table(["Row", "Title", "Result"], dossier.rows.map((row) => [row.id, row.title, rowStatus(row)])),
  ];
  for (const group of groups) {
    const rows = dossier.rows.filter((row) => row.group === group);
    if (!rows.length) continue;
    lines.push("", `## ${group} · ${rowGroups[group]}`);
    for (const row of rows) {
      const spec = matrix.find((item) => item.id === row.id)!;
      lines.push("", `### ${row.id} · ${row.title}: ${rowStatus(row)}`, "", `**Pass threshold.** ${spec.threshold}`, "");
      lines.push(table(["Evidence", "Result", "Tester", "Date", "Candidate", "Environment", "Method", "Evidence files", "Notes", "Waiver"], row.entries.map((entry) => entryRow(entry, link))));
      if (row.reasons.length && !(row.result === "pass" || row.waived)) lines.push("", "Not passing because:", "", ...row.reasons.map((reason) => `- ${reason}`));
      const history = row.entries.flatMap((entry) => entry.history.map((submission) => `- \`${entry.key}\` ${resultLabel[submission.result]} on ${submission.date} (${submission.source})`));
      if (history.length) lines.push("", "Superseded evidence:", "", ...history);
    }
  }
  if (dossier.rejected.length) {
    lines.push("", "## Rejected evidence", "", "These records were found but do not count for this candidate.", "");
    lines.push(table(["Source", "For", "Problems"], dossier.rejected.map((item) => [item.source, `\`${item.key}\``, item.problems.join("; ")])));
  }
  return `${lines.join("\n")}\n`;
}
