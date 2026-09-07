# Minimum sailable Expedition

Implementation scope: [issue #24](https://github.com/danielluis07/ocean-drive/issues/24).

`OceanPresentation` is the client-only entry point and accepts a serializable
`OceanConfiguration`. Its dynamic import has SSR disabled. Three, Fiber, the GLTF
loader, and the selective Drei `Html` import live in the lazy runtime. The
renderer-independent Expedition provider shares the existing state model with
the editorial page. Frame state stays in refs; checkpoints are saved once per
second while sailing and at pause, reading, presentation, and failure boundaries.

Readiness follows real capability checking, module/GLB loading, shader compilation,
and a rendered frame with a connected station label and input handlers. It never
changes presentation or starts movement. Reduced motion defers preparation until
requested. Hidden tabs pause movement; restoration opens text and requires explicit
3D entry and resume. Essential startup failures and context loss lock 3D for the
visit while preserving editorial reading and Expedition State.

The initial scene includes the first Field Station and its semantic reading action.
The existing editorial story remains the reading surface. The complete spatial
station journey belongs to #25; assisted navigation and bounded waters to #26;
adaptive quality and one-attempt context restoration to #27. This implementation
uses a conservative initial Balanced/Low selection, not the adaptive controller.

## Reproducible vessel assets

Run `bun run assets:vessels` to reproduce both versioned, same-origin GLBs from
`scripts/generate-vessels.mjs`. They share origin, footprint, proportions, and
negative-Z forward direction. The generator uses original geometric construction,
with no imported models, textures, stock images, or scientific imagery.

| Asset | Triangles | Uncompressed bytes | Materials |
| --- | ---: | ---: | ---: |
| `research-vessel-balanced.v1.glb` | 360 | 41,028 | 2 opaque |
| `research-vessel-low.v1.glb` | 184 | 22,016 | 2 opaque |

The project source is the editable vessel master. Ivory and ochre working parts
share a vertex-colored material; the blue hull uses the second material. Low
omits small rail details and reduces curved hull segments. Ocean, wake, haze,
beacon, and approach ring are procedural. Physical-device silhouette and performance
validation remain part of the release gate.

## Dependency provenance

Retrieved 2026-09-07 from the official npm packages, with exact direct versions and
integrity hashes retained in `bun.lock`. No external assets are fetched at runtime.
All three libraries permit commercial use and modification under MIT; retained
copyright and license notices are in `third-party/graphics-notices.md`.

| Dependency | Version | Creator / canonical source | Transformation |
| --- | --- | --- | --- |
| Three.js | 0.185.1 | three.js authors; https://github.com/mrdoob/three.js | Bundled renderer and GLTF loader; exporter used locally |
| React Three Fiber | 9.7.0 | Poimandres; https://github.com/pmndrs/react-three-fiber | Bundled web renderer |
| Drei | 10.7.8 | react-spring / Poimandres; https://github.com/pmndrs/drei | Selective `web/Html` import only |

## Verification

Use Bun for project commands:

```sh
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun test
bunx playwright install chromium
bun run test:browser
bun run build
```

Browser tests exercise the public Live Experience and its persisted Expedition
State: explicit entry/start, delayed and failed loading, unsupported/refused WebGL,
reduced motion, no-JavaScript reading, keyboard, pointer, semantic and touch
steering, preserved heading, reload, and context-loss fallback. Chromium is pinned
by Playwright 1.58.2. Software WebGL verifies behavior, not physical GPU performance.
Full cross-browser and target-device certification remains outside this ticket.

The implementation checks passed for 18 state tests and all 10 Chromium browser
journeys (three controls tests and seven entry/fallback tests), plus typechecking
and lint. The full browser run exposed a disposal race that could replace an
asset-loading failure with a context-loss reason; preserving the first failure
resolved it, and the complete seven-test entry/fallback file passed on retest.
The standards review found no issues; the spec review's semantic turn-rate finding
was fixed and confirmed resolved. These are implementation checks, not a Release
Dossier or physical-device certification.

Fiber 9.7.0 still uses Three's deprecated `Clock` internally, producing a development
warning with Three 0.185.1. Application code does not construct a `Clock`. A missing
`KHR_parallel_shader_compile` extension uses Three's supported compilation fallback.

On the restricted Windows environment used during implementation, Playwright's
browser installer required Node to run its Windows subprocess helper:
`node node_modules/playwright/cli.js install chromium`. The app, dependency manager,
asset generator, and unit tests still use Bun. Temporary browser/cache paths can
be set through `PLAYWRIGHT_BROWSERS_PATH`, `TEMP`, `TMPDIR`, and
`BUN_INSTALL_CACHE_DIR`; they are not production configuration.
