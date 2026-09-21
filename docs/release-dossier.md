# Release Dossier workflow

Implements [#45](https://github.com/danielluis07/ocean-drive/issues/45). The
[Production Acceptance Matrix](acceptance-matrix.md) lists every criterion a
Travessia release candidate must meet. This workflow gathers evidence for one
exact commit and evaluates every row as Pass, Fail, or Unvalidated in a Release
Dossier. Certifying a candidate is [#46](https://github.com/danielluis07/ocean-drive/issues/46).

## Pieces

| Piece | Role |
| --- | --- |
| `content/acceptance-matrix.ts` | The matrix: criteria, methods, evidence, thresholds, waivability, automated checks, capture points, checklists |
| `docs/acceptance-matrix.md` | Generated from the matrix by `bun run acceptance:matrix`; a unit test fails if it is out of date |
| `scripts/evidence.ts` (`bun run evidence`) | Runs a command or compares the tree, and writes a candidate-bound evidence record |
| `tests/browser/evidence-reporter.ts` | Writes one evidence record per Playwright project and spec file |
| `tests/browser/lab-vitals.e2e.ts` (`bun run test:vitals`) | Lab Core Web Vitals against the production build |
| `lib/evidence-loader.ts` | Locates evidence and verifies files, hashes, and embedded candidates |
| `lib/release-dossier.ts` | Decides which evidence counts and evaluates every row |
| `scripts/release-dossier.ts` (`bun run dossier`, `bun run dossier:checklists`) | Writes the manual checklists and the dossier |

## Evidence records

Automated evidence lands under `evidence/` (ignored by git; override with
`EVIDENCE_DIR`). Each record names its check, status, the commit at `HEAD`,
whether the working tree matched that commit, whether the run was complete, the
time, tester, environment, method, and its artifacts with their SHA-256. Records
are timestamped, so reruns sit beside earlier ones.

- `bun run evidence run <check> [--artifact <file>]... -- <command...>` runs the
  command, keeps its output as `output.log`, and exits with the command's status.
- `bun run evidence tree <check>` passes only when `git diff HEAD` and the list of
  untracked, unignored files are both empty. The comparison is by content, so a
  generator that rewrites a file with LF endings under `core.autocrlf` is not a change.
- Every `bun run test:browser`, `bun run test:production`, and `bun run test:vitals`
  records `e2e/<project>/<spec>` for each spec file it ran, with the tests'
  attachments (axe reports, budget reports, diagnostics, screenshots, traces)
  copied beside the record. Production records also carry the `.next/BUILD_ID`
  they were served from.

A record is only a claim. The dossier decides whether it counts.

## When evidence counts

The dossier rejects, and so leaves Unvalidated:

- evidence for another commit, or naming no full 40-character commit;
- evidence from a working tree that differed from the commit (tree checks
  excepted: a changed tree is their finding);
- a filtered (`-g`, `file:line`, `--last-failed`, `--only-changed`, `--shard`) or
  interrupted run;
- a production build whose `BUILD_ID` is not the recorded commit, or a local build
  made from other sources than the tree under test;
- evidence that predates the candidate commit, is older than 30 days, or is dated
  in the future (five minutes of clock skew are allowed);
- a cited file that is missing, no longer matches its SHA-256, or is JSON naming
  another candidate (a local diagnostic export names its candidate);
- manual evidence without a tester, environment, method, or evidence item.

For each check or capture point, the latest acceptable record decides; the dossier
lists superseded ones. A row passes when every check and capture point it lists
passes; any recorded Fail fails it; anything missing leaves it Unvalidated.

Only B2 (visual direction) is cosmetic. A recorded Fail there may carry a waiver
with `difference`, `impact`, `owner`, `reason`, `followUp`, `approvedBy`, and
`approvedOn`. A waiver on any other row, on missing evidence, or with a missing
field is rejected and the row still blocks. The candidate is release-ready only
when every row is Pass or a waived B2 Fail; the owner's verdict (R3) is itself a
row and cannot override a blocking one.

## Automated evidence in CI

`.github/workflows/acceptance.yml` runs on every push and pull request:

1. **verify**: frozen install, asset audit, Ship and Landmark regeneration with a
   tree comparison (`ci/reproducible-assets`), typecheck, lint, unit tests, the
   production build, a final tree comparison (`ci/generated-diff`), and the
   production gate (`e2e/production/production-assets`).
2. **browser**: the full Chromium suite and the `@critical` journeys in Firefox and
   WebKit, one job per engine.
3. **dossier**: downloads every job's `evidence/`, writes the checklists and the
   dossier, adds the dossier to the run summary, and uploads both.

Each check in **verify** runs even after an earlier one fails, so a single failure
does not leave the other rows without evidence; the job still fails.

In CI the manual rows (B–F, R) stay Unvalidated, and so does A12: runners have no
GPU, and the lab suite withholds its result on a software renderer. A13 and B4
wait for the ambient loop in [#42](https://github.com/danielluis07/ocean-drive/issues/42).

## Lab Core Web Vitals

```sh
bun run build
bun run test:vitals
```

Five cold-cache runs per profile, each in a fresh browser context, load the
Visitor's default entry, wait for the Stop 00 card, then make the first
interactions a Visitor makes: open and close “Capítulos”, press ArrowDown
(desktop), and choose “Modo leitura”. LCP is read before the first input, INP
comes from Event Timing, and CLS is the largest session window. Mobile and desktop
p75 (nearest rank) must each meet LCP ≤2.5 s, INP ≤200 ms, and CLS ≤0.1.

| Profile | Viewport | Throttling |
| --- | --- | --- |
| Mobile | 412×823 at 1.75× DPR, touch | 4× CPU; 562.5 ms latency, 1,474.56 kbps down, 675 kbps up |
| Desktop | 1350×940 at 1× DPR | None |

The suite runs full Chromium in its new headless mode so WebGL uses the host's GPU.
On a software renderer (SwiftShader, llvmpipe) it skips with the reason, which
keeps A12 Unvalidated: software rasterisation of the ocean would measure the
host's CPU, not the page. Run it on a machine with a GPU, such as the
integrated-graphics Windows laptop in the device suite, with a clean tree at the
candidate. Each `lab-vitals-<profile>.json` records every run, the profile, the
renderer, host, browser, and Playwright versions, and the p75 calculation, and is
labelled lab evidence. It is never field data about real Visitors.

## Certifying a candidate

1. Push the candidate and let the workflow finish. Download the
   `release-dossier-<commit>` artifact, which holds `evidence/` and
   `release-dossier/<commit>/`, into a clean checkout of that commit.
2. On a GPU machine at the same commit: `bun run build && bun run test:vitals`.
3. `bun run dossier:checklists` writes `release-dossier/<commit>/checklists.md`
   and `manual-evidence.template.json`. Copy the template to
   `manual-evidence.json` in the same folder and record every capture point as it
   is validated, keeping screenshots, recordings, and diagnostic exports beside it.
4. `bun run dossier` writes `release-dossier.md` and `release-dossier.json`. Add
   `--require-release` to exit non-zero unless the candidate is release-ready.

Options: `--candidate <sha>`, `--evidence <dir>` (repeatable), `--manual <file>`
(repeatable), `--out <dir>`.

A manual record looks like this:

```json
{
  "row": "E2",
  "capture": "windows-chrome",
  "result": "pass",
  "tester": "Name",
  "date": "2026-10-02",
  "candidate": "<the full commit id>",
  "environment": "Lenovo IdeaPad 5, Windows 11 24H2, Chrome 150, 1920×1080, plugged in",
  "method": "E2 checklist: five active minutes with the diagnostic export",
  "evidence": ["e2-windows-chrome-diagnostics.json", { "path": "e2-windows-chrome.mp4", "sha256": "…" }],
  "notes": "Balanced p90 16.7 ms; no tier change after the first minute."
}
```

Any fix makes a new candidate: every record, automated or manual, starts again.
