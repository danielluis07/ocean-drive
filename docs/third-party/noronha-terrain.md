# Noronha natural terrain — issue #77

Authored on 2026-10-03 by Ocean Drive project contributors. This is deterministic
project source, with no imported artwork, imagery, generated models or service.
The coastline and DEM remain the retained `data/landmarks/fernando-de-noronha.json`
record. Its OSM/ODbL and public-domain SRTM provenance remains in
[open-geodata.md](open-geodata.md). No additional survey was acquired.

The following are **authored presentation**, not measured geography or land cover:

- `terrainTreatment` in `content/landmark-sources.ts` opts Noronha into the benchmark.
  `relief: .22` allows at most ±0.11 world units of erosion-like displacement,
  attenuated to zero at the recorded coastline and on flat inland ground.
  The noise creates small ribs on the DEM's slopes; it does not reconstruct
  named landforms or establish their surveyed shape or height.
- `scrubScale: 5.5` and `rockScale: 9` set world-space patch frequencies.
  Low elevations, gentle slopes and proximity to shore select pale sand;
  steep ground and high coastal ground select exposed rock. The remaining
  ground receives dry scrub crowns and gaps. Those rules are plausible
  stylisation, not mapped beaches, vegetation species or geological strata.
- Colour and weathering height are evaluated independently at every output
  texel: 1024 square for Balanced/High, 512 square for Low. Normal derivatives
  use the actual X/Z texel dimensions, with no duplicated DEM normal.
- The Balanced mesh's existing 24-ray scalar accessibility is rasterised with
  barycentric interpolation and multiplied into linear colour exactly once.
  Fallback vertices retain the palette and the same accessibility. The runtime
  uses one colour treatment at a time; there is no additional shading pass.
- Balanced uses finer shoreline simplification and denser interior samples at
  the coast and where recorded slope exceeds .18. Flat interior ground uses
  fewer samples. Low retains its budgeted topology and shares the bounded relief
  and independently authored colour texture.

All configuration, algorithms, records and output hashes are retained in the
provenance ledger. Build with `bun run landmarks:build`, then
`bun run assets:record`. No Feature model or placement was added or removed.
The unrecoverable #68 work is reconciled in `docs/terrain-detail-assessment.md`.

Visual approval and physical-device evidence are separate from authorship and
licensing. Boipeba, Abrolhos and Ilha Grande retain the legacy treatment until
the Noronha candidate is approved and validated; do not infer approval from
this provenance record or passing automated tests.
