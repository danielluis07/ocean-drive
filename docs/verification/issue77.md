# Issue #77 — Noronha terrain candidate

## Status

Implementation candidate, **human visual approval received on 2026-10-03**.
The owner reviewed the result and confirmed: "the result was good", authorising
a pull request. Rollout to Boipeba, Abrolhos and Ilha Grande remains separate work.
Physical-phone
performance remains unvalidated. The phone captures emulate a viewport on
desktop Chromium; they are not a physical-device result.

The #68 reconciliation was already settled by the owner: the reported
uncommitted implementation is lost. The current checkout is the baseline.
No Feature asset or placement was removed, recreated or added by this change.

## Candidate and method

- Baseline assets: commit `a16ac6253832c740842a3f994dabe13ce2afd9b5`.
- Final production build: `a16ac6253832c740842a3f994dabe13ce2afd9b5-5b26003b5277657d`.
- [Exact candidate visual hashes](issue77/candidate-assets.json).
- Native 1024px colour/normal and independent 512px colour-only baking;
  irregular authored scrub crowns, exposed rock joints and pale coastal sand.
- The existing scalar mesh accessibility is rasterised into linear colour once.
  Vertex palette/AO fallback and the optional preparation safeguards remain.
- Selective coast/slope sampling and bounded authored erosion relief, with
  retained provenance in [noronha-terrain.md](../third-party/noronha-terrain.md).
  The geographic source record is unchanged. Added relief is not survey data.
- Only Noronha's two meshes and three maps changed. Every other visual,
  including the shared Feature GLB, matches the baseline hashes.

Before/after views use the same production camera, frozen reduced-motion ocean,
viewport and DPR 1. Desktop is 1280×800; phone is 390×844. Close View uses the
diagnostic preview at 48° pitch, north bearing and half the aerial distance,
centred on Noronha. The harness preserves the ordinary aerial layout measurements
and hides the Stop Card with opacity for close captures; #72's
interaction and responsive close-card layout are not implemented here.

The capture harness sets a generic renderer classification for full Balanced,
and the production modest-GPU classification for colour-only Balanced. It
asserts that normal maps are requested in the former and omitted in the latter.
These are host-GPU Chrome art captures with emulated capability classification,
not physical-phone performance claims. Full-resolution software-rendered Close
View sometimes triggered the real adaptive-quality fallback during readback;
the art project therefore uses the host GPU without disabling that safeguard.
The separate production/loading suites continue to use software rendering. Baseline
captures serve the retained commit's original Noronha GLBs/WebPs through
Playwright routes, with the same preview framing and camera as the candidate.
The harness asserts that the experience remains in 3D before and after capture.
[Capture settings](issue77/capture-settings.json) verify matching tier and DPR
for every pair. The retained diagnostics include adaptive wake-sample changes;
these resting reduced-motion views have no active wake.

## Visual review

| Treatment | Aerial before / after | Close before / after |
| --- | --- | --- |
| Desktop Balanced | [Before](issue77/before/desktop-balanced-aerial.png) / [After](issue77/after/desktop-balanced-aerial.png) | [Before](issue77/before/desktop-balanced-close.png) / [After](issue77/after/desktop-balanced-close.png) |
| Balanced colour-only | [Before](issue77/before/desktop-colour-only-aerial.png) / [After](issue77/after/desktop-colour-only-aerial.png) | [Before](issue77/before/desktop-colour-only-close.png) / [After](issue77/after/desktop-colour-only-close.png) |
| Desktop Low | [Before](issue77/before/desktop-low-aerial.png) / [After](issue77/after/desktop-low-aerial.png) | [Before](issue77/before/desktop-low-close.png) / [After](issue77/after/desktop-low-close.png) |
| Phone Low | [Before](issue77/before/phone-low-aerial.png) / [After](issue77/after/phone-low-aerial.png) | [Before](issue77/before/phone-low-close.png) / [After](issue77/after/phone-low-close.png) |
| Missing textures | [Before](issue77/before/desktop-fallback-aerial.png) / [After](issue77/after/desktop-fallback-aerial.png) | [Before](issue77/before/desktop-fallback-close.png) / [After](issue77/after/desktop-fallback-close.png) |

The owner's visual approval is recorded above. These retained views document
the beaches, cliffs, scrub and shoreline/underside for review. Automated capture
success alone does not establish artistic acceptance.

## Asset measurements

| Noronha resource | Baseline | Candidate | Limit |
| --- | ---: | ---: | ---: |
| Balanced triangles, including skirt/shallows | 11,844 | 14,059 | 15,000 |
| Balanced mesh bytes | 213,664 | 255,416 | 256,000 |
| Low triangles, including skirt/shallows | 1,223 | 1,223 | 1,300 |
| Low mesh bytes | 27,440 | 27,440 | 28,672 |
| Balanced colour + normal bytes | 62,932 | 67,132 | 153,600 |
| Low colour bytes | 11,752 | 9,320 | 153,600 |

No budgets, DPR settings, real-time shadow passes or optional-loading policies
were expanded. Balanced remains close to its transfer limit; future source or
geometry changes must be rebuilt and remeasured.

The [production browser report](issue77/production-budget-report.json) records
these measurements for the final build (bytes as measured by the existing suite):

| Measurement | Candidate | Limit |
| --- | ---: | ---: |
| Minimum-sailable transfer | 1,876,371 | 2,097,152 |
| Complete visit | 2,766,641 | 5,242,880 |
| Essential visuals | 1,072,100 | 1,310,720 |
| All authored visuals | 1,411,664 | 1.8 MiB |
| Balanced scene triangles / draws / render targets | 46,845 / 5 / 2 | 149,999 / 99 / 2 |
| Phone Low minimum-sailable transfer | 972,651 | 2,097,152 |
| Phone Low scene triangles / draws / render targets | 8,222 / 2 / 0 | 149,999 / 99 / 2 |

## Verification

- `bun test`: 245 passed, including native-frequency/linear-AO integration,
  selective sampling, exact accelerated shoreline queries, fallback materials,
  placement, preparation and existing geometry checks.
- `bun run lint`, `bun run typecheck`, `bun run build`: passed.
- `bun run assets:audit`: 74 provenance records passed.
- Repeated `bun run landmarks:build`: all 23 model/texture files reproduced
  identical SHA-256 hashes. Other islands and the Feature file stayed unchanged.
- Both sets of 10 art captures passed. Final production request/provenance/budget
  checks and the three optional-texture browser checks passed. The isolated
  physical-GPU sailing check passed; the earlier failed run is retained below.

## Physical-GPU comparison

Same AMD Radeon RX Vega 10 / Ryzen 7 3700U host, Chrome 154.0.8037.93,
1522×632 viewport, device DPR 1.25 and the existing five-active-minute route.
Both runs began at Balanced / render DPR .9; adaptive quality remained enabled.

| Measurement | [Baseline](issue77/before-performance.json) | [Isolated candidate](issue77/after-performance.json) |
| --- | ---: | ---: |
| Active measured seconds | 323.40 | 323.56 |
| Complete scored windows | 159 | 159 |
| Worst window frame-interval p90 | 17.10 ms | 17.40 ms |
| Windows above the 20 ms target | 0 | 0 |
| Worst window GPU p90 | 8.29 ms | 8.50 ms |
| Tier changes | 0 | 0 |
| Observed render DPR values | .9, 1 | .9, 1, 1.25 |
| Recorded quality events | 22 | 24 |
| Peak scene triangles / draws / render targets | 56,629 / 8 / 2 | 58,347 / 8 / 2 |

The [first candidate run](issue77/after-performance-first-run.json) failed:
9 of 160 windows exceeded 20 ms, worst p90 45.60 ms, worst GPU p90 14.76 ms.
All failing windows occurred in the first 80 seconds, including open water
before Noronha. Validation/capture-retention work overlapped that run. The
unchanged candidate then passed when the benchmark ran alone. This is evidence
of sensitivity to host workload, not proof of a specific external cause; the
failed measurement is retained rather than discarded. Neither run changed tier.

This establishes a passing local desktop lab result for the exact candidate.
Human visual approval is recorded separately above; physical-phone validation
and clean-release sign-off remain outstanding.

Commands to repeat the visual and browser checks:

```powershell
bun run landmarks:build
bun run assets:record
bun run build
bunx playwright test --config playwright.production.config.ts --project terrain-detail --project production --project landmark-textures
bunx playwright test --config playwright.production.config.ts --project ocean-voyage-chrome
```

The physical run must be isolated from software-rendered captures/builds and
use the same hardware, viewport, DPR and browser for a valid comparison.
