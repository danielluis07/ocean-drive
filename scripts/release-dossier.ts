import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { acceptanceMatrix, evidencePolicy } from "@/content/acceptance-matrix";
import { manualEvidenceTemplate, renderChecklists, renderDossierMarkdown, renderMatrixMarkdown } from "@/lib/acceptance-report";
import { loadAutomatedEvidence, loadManualEvidence } from "@/lib/evidence-loader";
import { candidateIdentity, commitTime, evidenceDirectory } from "@/lib/evidence-record";
import { evaluateDossier } from "@/lib/release-dossier";

// The Release Dossier workflow.
//
//   bun run acceptance:matrix      regenerate docs/acceptance-matrix.md
//   bun run dossier:checklists     write the manual checklists and evidence template
//   bun run dossier                evaluate the evidence and write the dossier
//
// Options: --candidate <sha> (default HEAD), --evidence <dir> (repeatable,
// default ./evidence), --manual <file> (repeatable, default
// <out>/manual-evidence.json when present), --out <dir> (default
// release-dossier/<candidate>), --require-release (exit 1 unless release-ready).

export const matrixDocument = "docs/acceptance-matrix.md";

function options(args: string[]) {
  const values: Record<string, string[]> = {};
  for (let index = 0; index < args.length; index++) {
    const name = args[index].replace(/^--/, "");
    if (["require-release"].includes(name)) values[name] = ["true"];
    else values[name] = [...(values[name] ?? []), args[++index]];
  }
  return values;
}

if (import.meta.main) {
  const [mode, ...args] = process.argv.slice(2);
  const option = options(args);
  if (mode === "matrix") {
    writeFileSync(matrixDocument, renderMatrixMarkdown(acceptanceMatrix));
    console.log(`Wrote ${matrixDocument}`);
    process.exit(0);
  }
  if (mode !== "checklists" && mode !== "build") {
    console.error("Usage: bun scripts/release-dossier.ts matrix | checklists | build [options]");
    process.exit(2);
  }
  const candidate = option.candidate?.[0] ?? candidateIdentity().candidate;
  const out = option.out?.[0] ?? join("release-dossier", candidate);
  mkdirSync(out, { recursive: true });

  if (mode === "checklists") {
    writeFileSync(join(out, "checklists.md"), renderChecklists(acceptanceMatrix, candidate));
    writeFileSync(join(out, "manual-evidence.template.json"), `${JSON.stringify(manualEvidenceTemplate(acceptanceMatrix, candidate), null, 2)}\n`);
    console.log(`Wrote ${join(out, "checklists.md")} and ${join(out, "manual-evidence.template.json")}`);
    process.exit(0);
  }

  const manual = option.manual ?? [join(out, "manual-evidence.json")].filter(existsSync);
  const dossier = evaluateDossier({
    matrix: acceptanceMatrix,
    candidate,
    committedAt: commitTime(candidate),
    generatedAt: new Date().toISOString(),
    policy: evidencePolicy,
    submissions: [...loadAutomatedEvidence(option.evidence ?? [evidenceDirectory()]), ...loadManualEvidence(manual)],
  });
  const markdown = join(out, "release-dossier.md");
  writeFileSync(join(out, "release-dossier.json"), `${JSON.stringify(dossier, null, 2)}\n`);
  writeFileSync(markdown, renderDossierMarkdown(dossier, acceptanceMatrix, (path) => relative(dirname(resolve(markdown)), resolve(path)).replaceAll("\\", "/")));
  console.log(`Wrote ${markdown}`);
  console.log(`${dossier.verdict === "release-ready" ? "Release-ready" : "Blocked"}: ${dossier.counts.pass} Pass, ${dossier.counts.fail} Fail (${dossier.counts.waived} waived), ${dossier.counts.unvalidated} Unvalidated`);
  if (dossier.blocking.length) console.log(`Blocking rows: ${dossier.blocking.join(", ")}`);
  process.exit(option["require-release"] && dossier.verdict !== "release-ready" ? 1 : 0);
}
