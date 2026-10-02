# Production assets and budget evidence

Issue #29 implements the inventory and constraints in issues #14 and #20.
`content/asset-manifest.json` is the production inventory and provenance ledger.
Every public file, local font and procedural visual source has an accountable
source, retained rights record, transformation description and SHA-256 hash.
`docs/third-party/dependencies.json` binds dependency notices to `bun.lock`.

The six Stop Account images under `public/images/` are AI-generated
photographic visuals, allowed by the superseded asset policy in issue #33.
Their provenance is `docs/third-party/ai-generated-images.md`; regenerating
the manifest after adding or replacing one still goes through
`bun run assets:record`.

The eight island Landmark GLBs under `public/models/` are built from open
coastline and elevation data recorded under `data/landmarks/`, also allowed by
issue #33. Their provenance is `docs/third-party/open-geodata.md`, the recorded
source data carries its own ledger entries, and the pipeline is described in
[landmarks.md](landmarks.md). The shared Feature file beside them,
`landmark-features.v1.glb`, holds the models placed on the islands, generated in
code by the same build with no imported artwork, and where each instance stands
(`docs/third-party/project-assets.md`).

## Reproduce and govern assets

Use Bun 1.4.1 and the frozen lockfile:

```sh
bun install --frozen-lockfile
bun run assets:ship
bun run landmarks:build
bun run assets:identity
bun run assets:audit
```

Generation uses code/vector masters, the retained licensed Ship glTF and font
bytes, and recorded coastline/elevation data under `data/`, with no network requests.
`bun run landmarks:fetch` is the one command that reaches an outside service; it
is a maintenance step that re-records `data/landmarks/`, and its output is
committed and reviewed like any other asset change. The Ship GLBs retain their
shared footprint, waterline origin and -Z bow. High uses the Balanced GLB. Both
have one opaque material and one embedded texture, with no animation or skin.
See [ship.md](ship.md) for the source adaptation, per-tier measurements, texture
limits and wake. Navigation geometry never depends on LOD.

The identity family contains horizontal, compact, monochrome and reversed SVG
lockups, a symbol-only master, SVG/PNG favicons, an Apple touch icon and a 1200×630
social SVG/PNG pair. Preserve symbol proportions and at least half a symbol width
of surrounding space; keep the descriptor line smaller than the Travessia
wordmark. Use ink on pale backgrounds and reversed salt on dark backgrounds.
Do not add a second Travessia symbol.

Geist's retained variable Latin WOFF2 serves 400 and 600 with one request.
Geist Mono 500 and Source Serif 4 Italic 400 complete the 59,608-byte font package.
OFLs, original distribution URLs and retrieved CSS are under `docs/third-party/fonts`.
The UI retains system fallbacks; missing decorative assets never gate entry.
Set `SITE_URL` to the deployment origin at build time for social metadata.

After an intentional asset change, review its source and rights, then run
`bun run assets:record` and inspect the manifest diff. CI never regenerates the
ledger to excuse a mismatch. After a dependency change, run
`bun scripts/record-dependencies.mjs`, review upstream license evidence and inspect
the notices diff. This maintenance command retrieves missing upstream notices;
normal builds and asset generation need no external font or artwork service.
The dependency record conservatively includes unused installed dependencies;
selective Drei imports prevent its optional physics, media and statistics
packages from entering the browser runtime.

## Automated gate

The `verify` job of `.github/workflows/acceptance.yml` checks rights/hash
reconciliation, reproducible outputs, types, lint, unit tests, a production build
and Chromium request/scene measurements, recording each as candidate-bound
evidence for the [Release Dossier](release-dossier.md) (matrix rows A10 and A11).
The production test uses cold browser storage, starts in reduced-motion reading
mode so route JavaScript is measured before the lazy 3D runtime, returns to the
ocean, opens all four Stop Accounts, and covers completion, Low substitution and
context restoration. Its JSON reports, diagnostics and aerial screenshots are
retained with its evidence record, bound to the served build.

| Measurement                          |                   Maximum |
| ------------------------------------ | ------------------------: |
| Server/editorial JavaScript          |                   200 KiB |
| Additional lazy 3D JavaScript        |                   350 KiB |
| Minimum sailable payload             |                     2 MiB |
| Complete first visit                 |                     5 MiB |
| Minimum-sailable authored visuals    |                  1.25 MiB |
| All in-experience authored visuals   |                   1.8 MiB |
| Fonts                                |                   160 KiB |
| High/Balanced vessel                 | 12,000 triangles; 250 KiB |
| Low vessel                           |  4,000 triangles; 120 KiB |
| Landmark, High/Balanced              |  15,000 triangles; 250 KiB; |
|                                      |     3 draws; optional maps  |
| Landmark Features, High/Balanced     |  160 instances and 3,000  |
|                                      |  triangles per Landmark,  |
|                                      |     in its third draw     |
| Shared Feature file, High/Balanced   |      200 KiB; one 1024 px atlas  |
| Landmark, Low                        |  1,300 triangles; 28 KiB; |
|                                      |     2 draws; 512 px colour; |
|                                      |              no Features  |
| Balanced visible draws               |            Fewer than 100 |
| Balanced visible triangles           |        Fewer than 150,000 |
| Ocean draws                          |               Exactly one |
| Balanced retained off-screen targets |               At most two |
| Low retained off-screen targets      |                      Zero |

Text, JavaScript, CSS and SVG response bodies are measured using standard gzip;
already compressed fonts, PNG and GLB requests use their full response-body size.
This conservative, reproducible payload measure excludes HTTP headers. GLB asset
limits are additionally checked with gzip. Request bodies are hashed against the
ledger, including Next's renamed font outputs. Next-generated JS/CSS and the
server HTML are classified as application output; all requests must stay on the
application origin. Missing measurements fail rather than counting as zero.
Scene counts come from actual renderer draws and retained target disposal events,
with per-tier maxima spanning rendered states; they are not estimates from JSX.
Each Landmark's budget is enforced twice: the build refuses to write a mesh over
it, and `bun run assets:audit` re-measures the shipped GLB, checks that it still
carries its `island` and `surf` parts, and reconciles its triangle and byte
counts with `content/landmarks.json`. A Landmark's third draw is everything
standing on it, expanded from the shared Feature file; the build and the audit
both hold that file to 200 KiB and each Landmark's instances to its allowance,
and the audit reconciles them with the same record. The minimum-sailable budgets remain unchanged; all authored visuals allow
1.8 MiB ([#74](https://github.com/danielluis07/ocean-drive/issues/74)). Low never
requests the Feature file.

The production gate records desktop and phone requests separately. The phone
tab verifies Low's initial transfer and scene counts; its responses are audited
against the same manifest but do not add a second visit to the desktop's
complete-visit byte totals. Shared assets requested by both tabs are retained
in both reports rather than counted twice against one Visitor's budget.

The general sailing regression fixture advances each 16 ms browser frame at no
more than real-time pace and uses quarter-resolution software rendering. Its
pacing accounts for time already spent rendering rather than doubling that wait.
A touch-capable context selects the conservative Low initial tier for these
navigation traces, while retaining mouse/keyboard controls and CSS viewports.
This avoids expiring journey deadlines while the simulated clock barely advances;
CSS viewports, input coordinates and navigation assertions remain unchanged.
The separate production gate retains its own half-resolution configuration.

Run locally after a production build:

```sh
bun run build
bun run test:production
```

This is software-rendered behavioral and payload evidence, not physical GPU
performance certification. Lab Core Web Vitals (`bun run test:vitals`, row A12)
need a GPU host. Landmark recognition, target-device card clearance, five-minute
thermal/frame behavior, rights/editorial review and release approval still require
candidate-bound human evidence (rows B–F and R of the
[Production Acceptance Matrix](acceptance-matrix.md)). No deployment or
physical-device pass is implied by this gate.

## Local diagnostic export

In DevTools on the application origin, enable recording then reload:

```js
sessionStorage.setItem("ocean-drive:diagnostics", "enabled");
location.reload();
```

After exercising the experience, copy JSON locally from DevTools:

```js
copy(window.__oceanDiagnostics.exportJSON());
```

To stop, remove the session key and reload. No URL switch, public UI, endpoint,
remote analytics, upload, session replay, input trace or persistent diagnostic
storage exists. Only this tab's explicit opt-in creates the export object.
The report carries the candidate commit, a stable source fingerprint/build ID,
current quality, tier/DPR/preference changes, two-second active-frame p90 windows
(each with the ocean's GPU p90 as `gpuP90Ms`, or null without timer queries),
per-tier scene maxima, preparation milestones, lifecycle and context events.
Hidden/paused time never enters active frame samples. History is bounded to 512
events and 180 timing windows; event eviction is reported. Exported local JSON
can be attached to the exact candidate's release dossier by its reviewer.

Issue #74 adds optional baked terrain WebPs: each Balanced/High Landmark has one 1024 px colour and one 1024 px normal map within 150 KiB together; Low has one 512 px colour and no normal. Maps derive offline from recorded elevation, slope, distance inland and palette, never satellite imagery. They are non-essential in payload reports, retained for at most the current and next Landmark, and prepared while settled. Modest GPUs shed normal maps. The complete first visit remains 5 MiB. Human Feature sources and their rights evidence are retained and hash-pinned; see [landmarks.md](landmarks.md).
