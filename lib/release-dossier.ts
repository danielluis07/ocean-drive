import type { AcceptanceRow, RowGroup } from "@/content/acceptance-matrix";

// The Release Dossier's evaluation: which evidence counts for one exact candidate,
// and the resulting Validation Result of every matrix row. Missing, stale,
// unverifiable, or candidate-mismatched evidence is rejected, so the row stays
// Unvalidated; nothing here can turn absent evidence into a Pass.

export type ValidationResult = "pass" | "fail" | "unvalidated";

export type Waiver = {
  difference: string;
  impact: string;
  owner: string;
  reason: string;
  followUp: string;
  approvedBy: string;
  approvedOn: string;
};

export const waiverFields = ["difference", "impact", "owner", "reason", "followUp", "approvedBy", "approvedOn"] as const;

// One piece of located evidence, automated or manual, in the dossier's terms.
export type Submission = {
  source: string;
  // A check id (automated) or `<row>#<capture>` (manual).
  key: string;
  kind: "automated" | "manual";
  result: ValidationResult;
  tester: string;
  date: string;
  candidate: string;
  environment: string;
  method: string;
  evidence: string[];
  notes: string;
  waiver: Waiver | null;
  // Verification problems found while locating the evidence on disk.
  problems: string[];
};

export type EntryOutcome = {
  key: string;
  label: string;
  result: ValidationResult;
  reason: string | null;
  selected: Submission | null;
  // Accepted but superseded by later evidence for the same key, newest first.
  history: Submission[];
  rejected: { submission: Submission; problems: string[] }[];
};

export type RowOutcome = {
  id: string;
  group: RowGroup;
  title: string;
  waivable: boolean;
  awaiting?: string;
  result: ValidationResult;
  waived: boolean;
  reasons: string[];
  entries: EntryOutcome[];
};

export type Dossier = {
  candidate: string;
  committedAt: string;
  generatedAt: string;
  policy: { maxAgeDays: number; clockSkewMinutes: number };
  verdict: "release-ready" | "blocked";
  blocking: string[];
  counts: Record<ValidationResult | "waived", number>;
  rows: RowOutcome[];
  rejected: { source: string; key: string; problems: string[] }[];
};

const hour = 3_600_000;
const day = 24 * hour;

// A date-only value may have been written anywhere on Earth that day.
function dateSpan(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const start = Date.parse(`${value}T00:00:00Z`);
    return Number.isNaN(start) ? null : { earliest: start - 14 * hour, latest: start + day + 12 * hour };
  }
  const time = /^\d{4}-\d{2}-\d{2}T/.test(value) ? Date.parse(value) : NaN;
  return Number.isNaN(time) ? null : { earliest: time, latest: time };
}

const short = (candidate: string) => candidate.slice(0, 12);

type Context = { candidate: string; committedAt: number; generatedAt: number; policy: Dossier["policy"] };

function datingProblems(value: string, what: string, context: Context) {
  const span = dateSpan(value);
  if (!span) return [`${what} has no valid date`];
  const skew = context.policy.clockSkewMinutes * 60_000;
  if (span.latest < context.committedAt - skew) return [`stale: ${what} predates the candidate commit`];
  if (span.latest < context.generatedAt - context.policy.maxAgeDays * day) return [`stale: ${what} is older than ${context.policy.maxAgeDays} days`];
  if (span.earliest > context.generatedAt + skew) return [`${what} is dated in the future`];
  return [];
}

export function submissionProblems(submission: Submission, context: Context) {
  const problems = [...submission.problems];
  if (!/^[0-9a-f]{40}$/.test(submission.candidate)) problems.push("names no exact candidate commit");
  else if (submission.candidate !== context.candidate) problems.push(`candidate mismatch: recorded for ${short(submission.candidate)}`);
  problems.push(...datingProblems(submission.date, "evidence", context));
  if (!["pass", "fail", "unvalidated"].includes(submission.result)) problems.push("result is not Pass, Fail, or Unvalidated");
  if (submission.kind === "manual") {
    for (const field of ["tester", "environment", "method"] as const) {
      if (!submission[field].trim()) problems.push(`missing ${field}`);
    }
    if (submission.evidence.length === 0) problems.push("unverifiable: names no evidence");
  }
  return problems;
}

export function waiverProblems(waiver: Waiver, context: Context) {
  const missing = waiverFields.filter((field) => typeof waiver[field] !== "string" || !waiver[field].trim());
  if (missing.length) return [`incomplete waiver: missing ${missing.join(", ")}`];
  return datingProblems(waiver.approvedOn, "waiver approval", context);
}

function selectEntry(key: string, label: string, submissions: Submission[], context: Context): EntryOutcome {
  const accepted: Submission[] = [];
  const rejected: EntryOutcome["rejected"] = [];
  for (const submission of submissions) {
    if (submission.key !== key) continue;
    const problems = submissionProblems(submission, context);
    if (problems.length) rejected.push({ submission, problems });
    else accepted.push(submission);
  }
  // The latest acceptable evidence speaks for the key; earlier records stay visible.
  const ordered = accepted
    .map((submission, index) => ({ submission, index, at: dateSpan(submission.date)!.earliest }))
    .sort((a, b) => b.at - a.at || b.index - a.index)
    .map(({ submission }) => submission);
  const selected = ordered[0] ?? null;
  const reason = selected
    ? selected.result === "pass"
      ? null
      : selected.result === "fail"
        ? "recorded Fail"
        : `recorded Unvalidated${selected.notes ? `: ${selected.notes}` : ""}`
    : rejected.length
      ? `no acceptable evidence (${rejected.length} rejected: ${[...new Set(rejected.flatMap((item) => item.problems))].join("; ")})`
      : "no evidence recorded";
  return { key, label, result: selected?.result ?? "unvalidated", reason, selected, history: ordered.slice(1), rejected };
}

export function evaluateRow(row: AcceptanceRow, submissions: Submission[], context: Context): RowOutcome {
  const entries = [
    ...row.checks.map((check) => selectEntry(check, check, submissions, context)),
    ...row.captures.map((capture) => selectEntry(`${row.id}#${capture.id}`, capture.label, submissions, context)),
  ];
  const result: ValidationResult = entries.some((entry) => entry.result === "fail")
    ? "fail"
    : entries.length > 0 && entries.every((entry) => entry.result === "pass")
      ? "pass"
      : "unvalidated";
  const reasons = entries.flatMap((entry) => (entry.reason ? [`${entry.label}: ${entry.reason}`] : []));
  if (row.awaiting && result !== "pass") reasons.unshift(`Awaiting ${row.awaiting}`);

  // A waiver can excuse only a recorded Fail on a cosmetic row, never missing evidence.
  for (const entry of entries) {
    const waiver = entry.selected?.waiver;
    if (!waiver) continue;
    if (!row.waivable) reasons.push(`${entry.label}: waiver rejected, ${row.id} is not cosmetic and cannot be waived`);
    else if (entry.result !== "fail") reasons.push(`${entry.label}: waiver ignored, only a recorded Fail can be waived`);
    else reasons.push(...waiverProblems(waiver, context).map((problem) => `${entry.label}: ${problem}`));
  }
  const waived = row.waivable && result === "fail"
    && entries.every((entry) => entry.result !== "unvalidated")
    && entries.every((entry) => entry.result !== "fail" || (entry.selected?.waiver && waiverProblems(entry.selected.waiver, context).length === 0));
  return { id: row.id, group: row.group, title: row.title, waivable: row.waivable, awaiting: row.awaiting, result, waived, reasons, entries };
}

export function evaluateDossier(input: {
  matrix: AcceptanceRow[];
  candidate: string;
  committedAt: string;
  generatedAt: string;
  policy: Dossier["policy"];
  submissions: Submission[];
}): Dossier {
  const context: Context = {
    candidate: input.candidate,
    committedAt: Date.parse(input.committedAt),
    generatedAt: Date.parse(input.generatedAt),
    policy: input.policy,
  };
  if (!/^[0-9a-f]{40}$/.test(input.candidate) || Number.isNaN(context.committedAt) || Number.isNaN(context.generatedAt))
    throw new Error("A Release Dossier needs a full candidate commit id and valid commit and generation times");
  const rows = input.matrix.map((row) => evaluateRow(row, input.submissions, context));
  const known = new Set(input.matrix.flatMap((row) => [...row.checks, ...row.captures.map((capture) => `${row.id}#${capture.id}`)]));
  const rejected = [
    ...input.submissions
      .filter((submission) => !known.has(submission.key))
      .map((submission) => ({ source: submission.source, key: submission.key, problems: ["names no row, capture point, or check in the matrix"] })),
    ...new Map(rows.flatMap((row) => row.entries.flatMap((entry) => entry.rejected))
      .map(({ submission, problems }) => [submission, { source: submission.source, key: submission.key, problems }])).values(),
  ];
  const blocking = rows.filter((row) => row.result !== "pass" && !row.waived).map((row) => row.id);
  const counts = { pass: 0, fail: 0, unvalidated: 0, waived: 0 };
  for (const row of rows) {
    counts[row.result]++;
    if (row.waived) counts.waived++;
  }
  return {
    candidate: input.candidate,
    committedAt: input.committedAt,
    generatedAt: input.generatedAt,
    policy: input.policy,
    verdict: blocking.length === 0 ? "release-ready" : "blocked",
    blocking,
    counts,
    rows,
    rejected,
  };
}
