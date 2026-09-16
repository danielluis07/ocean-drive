# Production assets and budget evidence

Issue #29 implements the inventory and constraints in issues #14 and #20.
`content/asset-manifest.json` is the production inventory and provenance ledger.
Every public file, local font and procedural visual source has an accountable
source, retained rights record, transformation description and SHA-256 hash.
`docs/third-party/dependencies.json` binds dependency notices to `bun.lock`.

## Reproduce and govern assets

Use Bun 1.4.1 and the frozen lockfile:

```sh
bun install --frozen-lockfile
bun run assets:vessels
bun run assets:identity
bun run assets:audit
```

Generation uses code/vector masters and the retained font bytes, with no network
requests. The GLBs retain their shared outline, origin, -Z bow and collision
footprint. High uses the Balanced GLB. Both have two opaque materials, no textures,
animation, interiors or fine rigging. Navigation geometry never depends on LOD.

The identity family contains horizontal, compact, monochrome and reversed SVG
lockups, a symbol-only master, SVG/PNG favicons, an Apple touch icon and a 1200×630
social SVG/PNG pair. Preserve symbol proportions and at least half a symbol width
of surrounding space; keep the descriptor line smaller than the Travessia
wordmark. Use ink on pale backgrounds and reversed salt on dark backgrounds.
Do not add a second Travessia symbol. The editorial vignette is decorative;
its bow/cabin/working-deck and beacon shapes carry no unique information.

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

`.github/workflows/production-budgets.yml` checks rights/hash reconciliation,
reproducible outputs, types, lint, unit tests, a production build and Chromium
request/scene measurements. The production test uses cold browser storage,
reduced-motion editorial entry, explicit 3D preparation, all twelve passages and
source panels, completion, Low substitution and context restoration.
It saves JSON reports, build identity, traces and aerial screenshots.

| Measurement                          |                   Maximum |
| ------------------------------------ | ------------------------: |
| Server/editorial JavaScript          |                   200 KiB |
| Additional lazy 3D JavaScript        |                   350 KiB |
| Minimum sailable payload             |                   1.5 MiB |
| Complete first visit                 |                     5 MiB |
| Minimum-sailable authored visuals    |                   500 KiB |
| All in-experience authored visuals   |                   750 KiB |
| Fonts                                |                   160 KiB |
| High/Balanced vessel                 | 12,000 triangles; 250 KiB |
| Low vessel                           |  4,000 triangles; 120 KiB |
| Balanced visible draws               |            Fewer than 100 |
| Balanced visible triangles           |        Fewer than 150,000 |
| Ocean draws                          |               Exactly one |
| Balanced retained off-screen targets |               At most one |
| Low retained off-screen targets      |                      Zero |

Text, JavaScript, CSS and SVG response bodies are measured using standard gzip;
already compressed fonts, PNG and GLB requests use their full response-body size.
This conservative, reproducible payload measure excludes HTTP headers. GLB asset
limits are additionally checked with gzip. Request bodies are hashed against the
ledger, including Next's renamed font outputs. Next-generated JS/CSS and the
server HTML are classified as application output; all requests must stay on the
application origin. Source-link destinations are external editorial references,
not runtime assets; the gate opens their local source panels without downloading
external publisher pages. Missing measurements fail rather than counting as zero.
Scene counts come from actual renderer draws and retained target disposal events,
with per-tier maxima spanning rendered states; they are not estimates from JSX.

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
performance certification. Camera-distance recognition while turning, target-device
label clearance, five-minute thermal/frame behavior, rights/editorial review and
release approval still require candidate-bound human evidence. No deployment or
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
current quality, tier/DPR/preference changes, two-second active-frame p90 windows,
per-tier scene maxima, preparation milestones, lifecycle and context events.
Hidden/paused time never enters active frame samples. History is bounded to 512
events and 180 timing windows; event eviction is reported. Exported local JSON
can be attached to the exact candidate's release dossier by its reviewer.
