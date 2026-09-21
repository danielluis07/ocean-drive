import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join, relative } from "node:path";
import type { FullConfig, FullResult, Reporter, Suite, TestCase } from "@playwright/test/reporter";
import {
  candidateIdentity,
  evidenceDirectory,
  evidenceEnvironment,
  evidenceTester,
  recordPath,
  retainArtifact,
  slug,
  writeEvidenceRecord,
} from "@/lib/evidence-record";
import { sourceFingerprint } from "@/scripts/build-identity";

// Writes one candidate-bound evidence record per project and spec file, as
// `e2e/<project>/<spec>`, with the tests' attachments retained beside it.
// Set `build` for suites served by the production build in `.next`.

// Arguments that run part of a spec file cannot speak for the whole file.
const partialArgument = /^(-g|--grep|--grep-invert|--last-failed|--only-changed|--shard)(=|$)|\.ts:\d+/;

export default class EvidenceReporter implements Reporter {
  private config?: FullConfig;
  private suite?: Suite;
  private started = { candidate: "", treeClean: false };

  constructor(private options: { build?: boolean } = {}) {}

  printsToStdio() {
    return false;
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.config = config;
    this.suite = suite;
    this.started = candidateIdentity();
  }

  onEnd(result: FullResult) {
    if (!this.config || !this.suite) return;
    const ended = candidateIdentity();
    const treeClean = this.started.treeClean && ended.treeClean && this.started.candidate === ended.candidate;
    const filtered = process.argv.slice(2).some((argument) => partialArgument.test(argument))
      || this.config.grep.toString() !== String(/.*/)
      || this.config.grepInvert !== null
      || this.config.shard !== null;
    const interrupted = result.status === "interrupted" || result.status === "timedout";
    const build = this.options.build ? this.build() : undefined;
    const recordedAt = new Date().toISOString();
    for (const project of this.suite.suites) {
      const settings = project.project();
      for (const file of project.suites) {
        const spec = basename(file.location?.file ?? file.title, ".e2e.ts");
        const check = `e2e/${project.title}/${spec}`;
        const tests = file.allTests();
        const outcomes = tests.map((test) => test.outcome());
        const path = recordPath(evidenceDirectory(), check, recordedAt);
        writeEvidenceRecord(path, {
          schema: "travessia.evidence/1",
          check,
          kind: "suite",
          status: outcomes.includes("unexpected") ? "fail" : outcomes.every((outcome) => outcome === "skipped") ? "skipped" : "pass",
          candidate: this.started.candidate,
          treeClean,
          complete: !filtered && !interrupted && tests.every((test) => test.results.length > 0),
          recordedAt,
          tester: evidenceTester(),
          environment: {
            ...evidenceEnvironment(),
            playwright: this.config.version,
            browser: `${settings?.use.browserName ?? "chromium"}${settings?.use.channel ? ` (${settings.use.channel})` : ""}`,
          },
          method: `playwright test --config ${relative(process.cwd(), this.config.configFile ?? "").replaceAll("\\", "/")} --project ${project.title} ${relative(process.cwd(), file.location?.file ?? "").replaceAll("\\", "/")}`,
          artifacts: tests.flatMap((test) => this.attachments(path, test)),
          notes: tests.flatMap((test) => this.note(test)),
          ...(build === undefined ? {} : { build }),
        });
      }
    }
  }

  // A build from other sources than the tree under test is stale even when its
  // commit prefix matches, so local builds carry their source fingerprint.
  private build() {
    if (!existsSync(".next/BUILD_ID")) return "missing";
    const id = readFileSync(".next/BUILD_ID", "utf8").trim();
    const local = /^[0-9a-f]{40}-([0-9a-f]{16})$/.exec(id);
    return local && local[1] !== sourceFingerprint() ? `${id} (built from different sources)` : id;
  }

  private note(test: TestCase) {
    const outcome = test.outcome();
    const title = test.titlePath().slice(3).join(" › ");
    if (outcome === "flaky") return [`passed on retry: ${title}`];
    if (outcome === "unexpected") return [`failed: ${title}`];
    if (outcome !== "skipped") return [];
    const reason = [...test.annotations, ...(test.results.at(-1)?.annotations ?? [])].find((annotation) => annotation.type === "skip")?.description;
    return [`skipped: ${title}${reason ? ` (${reason})` : ""}`];
  }

  private attachments(record: string, test: TestCase) {
    const result = test.results.at(-1);
    if (!result) return [];
    // Short names keep retained paths well inside Windows' 260-character limit.
    const prefix = slug(test.title).slice(0, 24);
    return result.attachments.flatMap((attachment, index) => {
      let source = attachment.path;
      if (!source && attachment.body) {
        source = join(mkdtempSync(join(tmpdir(), "evidence-")), slug(attachment.name));
        writeFileSync(source, attachment.body);
      }
      if (!source || !existsSync(source)) return [];
      const name = slug(attachment.name);
      return [retainArtifact(record, source, `${prefix}-${index}-${name}${extname(name) ? "" : extname(source)}`)];
    });
  }
}
