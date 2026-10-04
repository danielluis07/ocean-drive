# Island detail: current baseline and implementation direction

The project owner approved removing constraints that obstruct better island
assets on 2026-10-02. This document reconciles the current checkout with issues
#68–#71, #74 and #77. It supersedes older placeholder-only guidance locally.

## Requirements that no longer apply

- The former 4,400-triangle Balanced terrain target is removed. Sampling now
  follows the current 15,000-triangle allowance, including land, skirt and
  shallows. Low retains its 1,200-triangle sampling target to leave shoreline
  transfer headroom within its 1,300-triangle / 28 KiB allowance.
- Features need not be untextured, vertex-coloured or limited to the single
  Abrolhos placeholder. The shared library accepts finished textured models.
  Tests must validate configuration, placement and resource limits rather than
  freezing a placeholder count or requiring zero textures.
- The owner need not supply models. Agents may reconstruct full 3D geometry
  from suitable licensed reference photographs, use licensed base models, or
  generate assets when tooling and usage rights are available. Missing
  generation credits alone do not block reference-based reconstruction.
- Offline procedural shading is the current terrain implementation, not a
  permanent restriction on asset authoring. Licensed imagery, authored surface
  masks and textures, and better recorded elevation may be used when their
  redistribution rights and transformations are retained. Acquiring sources is
  a maintenance step; runtime loading remains same-origin and builds must be
  reproducible from retained inputs. Do not present authored detail as surveyed
  geography or use images without adequate rights.

The current budgets remain practical starting limits, not an artistic target.
Change them deliberately when a reviewed visual comparison and device profiling
show a need; keep the documentation, build, audit and runtime limits consistent.
The reference-device performance requirement, optional asset loading, bounded
texture retention, attribution and honest provenance remain in force.

The initial-load caps are raised from 530 KiB to 1.25 MiB for essential visuals
and from 1.5 MiB to 2 MiB for the minimum-sailable payload. The old caps rejected
the expanded terrain allowance because all four initial terrain meshes currently
gate entry. The production browser measurement before adjusting these caps was
1,030,348 bytes of essential visuals and 1,830,217 bytes of initial transfer;
complete-visit transfer was 2,720,487 bytes, within the retained 5 MiB allowance.
This explicitly trades additional initial transfer for richer geometry. Optional
maps still do not gate entry. Scene counts and transfer checks are automated;
the original baseline did not establish sustained physical-device performance
or art approval. Noronha's subsequent candidate evidence is recorded below.

## Baseline reconciliation

Issue #68's comment dated 2026-10-02 reports five reconstructed Noronha Features,
reference records, Close View configuration and captures awaiting art approval.
Those assets and records are absent from this checkout: `featureFile.source` is
null, only the built-in placeholder model is configured, and Noronha has no
Feature placements. The available branches, stash and registered worktrees do
not contain that implementation. A reflog entry records a checkout of
`feat/issue-68-noronha-surface`, but does not establish that its uncommitted
assets were retained.

The project owner confirmed on 2026-10-02 that the reported #68 implementation
is lost and unrecoverable. Recovery is no longer a prerequisite: do not spend
further work searching for that implementation or block #77 on it. Use the
current checked-out assets as the baseline.

The historical comment is not evidence of available assets, integrated work or
art approval. Complete Noronha's natural-terrain benchmark in #77 first, then
rebuild the missing named Features as new work under #68's scope, or its
replacement task if the issue itself is unavailable. Retain new references,
source files, rights evidence and modelling records; previous validation and
provenance claims do not transfer to the replacement assets.

## Next terrain work: Noronha first

Issue #77 remains the shared terrain quality task. The owner approved Noronha's
visual result on 2026-10-03. Its same-hardware desktop sailing comparison passed;
physical-phone performance remains unvalidated. See the
[candidate report and retained evidence](verification/issue77.md) before extending
the treatment to the other island reworks.

1. Review Noronha's native-resolution candidate: it evaluates sand, exposed
   rock and irregular scrub crowns independently at 1024/512 px. Other islands
   retain the old enlarged 256 px field until approval and validation.
2. The candidate rasterises the existing scalar mesh occlusion into linear
   colour before encoding, preserving the same depth cues while vertex colours
   remain an independent fallback. Review that treatment in the colour-only tiers.
3. Spend geometry on visible coastline, cliffs and ridges. The larger allowance
   now enables denser sampling, but interpolation of the same coarse elevation
   does not recover missing landforms. The candidate concentrates samples on
   coast/steep ground and adds bounded authored relief, documented separately
   from the unchanged survey in `docs/third-party/noronha-terrain.md`.
4. Compare Noronha before and after at the same camera, viewport, tier and DPR:
   desktop Balanced, modest-GPU Balanced without normals, desktop Low and phone
   Low. Also preview the planned Close View framing. Natural terrain must read
   convincingly without buildings; Low has no Features or normal maps.
5. Obtain human visual approval and compare representative sailing performance
   on the same physical hardware before extending the surface treatment to the
   remaining islands. Automated captures and passing tests are not art approval.

## Verification

Boipeba now has a separate #69 candidate using native low-coast masks, Moreré
reef-pool colour and textured palm reconstructions. See
[its verification report](verification/issue69.md). The owner approved the
terrain-and-palms visuals on 2026-10-04. The named village church now has a
separate reconstruction using retained licensed front, roof and aerial references;
see [village verification](verification/issue69-village.md) for its own review.
The owner confirmed that no phone is available, so physical-phone
validation remains explicitly unvalidated and rollout is not complete.

Use Bun. After changing generated inputs, run `bun run landmarks:build` and
`bun run assets:record`. Run `bun test`, `bun run lint`, `bun run typecheck` and
`bun run assets:audit`; use production browser asset-art and budget checks for
visual candidates. A second offline build must reproduce the generated files.
Record measured payload, scene counts and device performance for the exact
candidate. New physical-device performance is unvalidated until measured;
historical #74 evidence does not certify a denser mesh or new texture treatment.
