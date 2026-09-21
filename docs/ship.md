# Del Mar

Issue #40 replaces the procedural research vessel with an adapted, licensed
glTF passenger ship. The retained observation lounge, open foredeck, tenders,
deck furniture, windows and stepped decks give the expedition Ship a readable
silhouette from the 80° production camera. Its bow faces -Z, the origin is at
the waterline, and both tiers share a 2.65 × 6.4 world-unit footprint.

Source, licence, retained evidence and modifications are documented in
[third-party/ship-model.md](third-party/ship-model.md). Source artwork lives in
`data/ship/`, outside the served assets. The browser only loads the selected
same-origin GLB; High reuses Balanced. No remote texture, model service, or
geometry decoder is requested.

## Reproduction and CI

```sh
bun install --frozen-lockfile
bun run assets:ship
bun run assets:record
bun run assets:audit
```

The build reads the retained source, simplifies geometry with UV-aware
Meshoptimizer, locks the footprint extrema, quantizes vertex attributes, and
resizes the embedded texture. It writes both GLBs and `content/ship.json`.
`content/ship-source.ts` records the source and enforced budgets. The production
workflow rebuilds offline and compares GLBs and the measurement record against
the checkout; it never regenerates the provenance ledger to accept a change.

| Measurement | Balanced | Low |
| --- | ---: | ---: |
| Triangles / maximum | 3,986 / 12,000 | 3,078 / 4,000 |
| GLB bytes / maximum | 183,648 / 256,000 | 107,388 / 122,880 |
| Gzip bytes / maximum | 104,781 / 256,000 | 49,077 / 122,880 |
| Opaque materials / maximum | 1 / 2 | 1 / 2 |
| Draws / maximum | 1 / 2 | 1 / 2 |
| Embedded textures / maximum | 1 / 1 | 1 / 1 |
| Texture dimensions / maximum | 512 × 512 | 256 × 256 |

`assets:audit` measures the actual GLBs, including decoded node transforms and
embedded image dimensions, and reconciles each measurement with the record.
It also requires source and rights evidence in the SHA-256 provenance ledger.
The raw byte limits account for hosts that serve GLBs without compression;
the whole-scene transfer and draw budgets remain unchanged.

## Placement and wake

The runtime samples swell beneath the bow, stern, port and starboard hull to
set pitch and roll. Its centre follows wave height, with the keel below the
water. Under reduced motion, pitch and roll are zero and every placement clears
the wake, including short cuts. Quality substitutions preserve the footprint
and retain the loaded model until its replacement arrives. Replaced models
release their GPU textures and ImageBitmaps as well as geometry and materials.

Balanced uses 32 remembered world-space points for its spreading, foaming wake;
High uses 48. Low uses eight points and a cheaper foam calculation, with no extra
draws or render targets. The trail follows actual travel, including reverse
sailing, stays in the water as the Ship moves, and expires nine seconds after
emission stops. Pausing to read freezes the scene and its wake together.

## Visual checks

Check both 1280 × 800 desktop and 390 × 844 phone views at production camera
distance. The bow, observation lounge, working deck and side tenders should
remain distinct. Sail forward, reverse and settle; look for a wake behind the
direction of travel, fading after rest, and no trail across reduced-motion cuts.
The production browser gate captures `balanced-aerial.png` and `low-aerial.png`
and verifies loaded assets, whole-visit transfer, shader readiness and scene
counts. These browser checks do not replace physical-device release testing.
