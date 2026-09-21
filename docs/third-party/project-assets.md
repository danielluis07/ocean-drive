# Project-authored asset provenance

The Travessia symbol is retained from components/expedition/institute-mark.tsx
at commit 050de01837e97f2a6fb1e23abc134e9ef6483986. The vessel geometry is a
simplification of the repository master at that commit; that procedural vessel
and its generator were replaced in issue #40. The current licensed Maré Mansa
model is documented separately in [ship-model.md](ship-model.md).
Identity derivatives and outlined lettering
are deterministic code/vector work in scripts/generate-identity.mjs (the symbol now
lives in components/voyage/travessia-mark.tsx). The placeholder Stop markers,
water, wake and lighting are repository-authored procedural code. These identity
and procedural assets contain no imported artwork. They are project source contributions, not commissioned external
artwork; there is no third-party artwork transfer agreement to invent.

Island surface grain and the surf material are also project-authored procedural
code in `lib/landmark-material.ts` and `lib/landmark-surf.ts`. They use no imported
textures. The underlying island geometry uses the separately attributed open
geodata documented in `open-geodata.md`.

The project owner's instruction to implement issue #29 authorizes creating and
modifying these repository assets for the Live Experience. The retained sources
and Git history document authorship and transformations. No external asset
rights are claimed for project-authored source. External typography remains
under its own OFL terms, including commercial use, modification, redistribution,
and retention of license/copyright notices. See fonts/\*-OFL.txt and sources.json.

The retired Vessel v2 removed fine rails, fittings, rigging and texture-like window details;
used a common hull outline, waterline origin, -Z forward direction, and a shared
2.8 by 6.4 collision footprint; and exported two opaque vertex-color materials.
The navigation collision/approach calculations are independent of rendering LOD.
SVG lettering is outlined from the unmodified retained Geist font. PNGs are
rasterized from those SVGs with the lockfile-pinned Sharp version.

This record establishes source provenance, not a physical-device or aesthetic
release sign-off. Camera-distance recognition, turning silhouette, label
clearance and five-minute device measurements remain release-dossier checks.
