# Abrolhos terrain — issue #70

The retained OSM coastlines and SRTM elevation in `data/landmarks/abrolhos.json`
remain unchanged; [open-geodata.md](open-geodata.md) records their rights.
The separate island outlines and inter-island water are retained in both tiers.
No new bathymetry, land-cover survey or satellite imagery is introduced.

The [retained licensed shore references](../../data/landmarks/features/abrolhos/README.md)
show low exposed rocky tables, weathered cliff strata and sparse short grass.
The configured `bareTables` treatment interprets this appearance independently
of Noronha's scrub crowns and Boipeba's coastal vegetation. Most ground is rock;
thin irregular dry-grass patches occupy gentle inland ground. Narrow pale beach
coverage is restricted to very low gentle shoreline pockets. Joint/strata signals
and muted weathered rock tones remain readable without normals. These are
authored surface masks, not surveyed geology or habitat boundaries.

Native 1024px colour/normal and independently evaluated 512px colour use the
existing single scalar accessibility bake in linear light. Vertex colours carry
the same pigment and occlusion for missing-texture fallback. Bounded authored
relief is at most ±0.045 world units, tapered to zero at the retained waterline.
The displayed maximum elevation is 1.55 world units above the swell clearance.
Broad 6.8-unit reef shallows use the existing shoreline-distance band; this
interprets reef-fringed water rather than claiming measured reef boundaries.
No trees or vegetation meshes are added.

Selective Balanced sampling spends geometry on coastlines and slopes; Low
retains the existing 1,200-triangle initial sampling target with no Features or
normals. Balanced uses a 0.80 fraction and Low a 0.97 fraction of its sampling cap to leave
byte headroom for the six coastlines, broader shallows and the measured 2 MiB
minimum-sailable transfer cap. Selective coast/slope sampling remains active. Every other
island's terrain must remain byte-identical. The named lighthouse is integrated
after terrain-only review, using the reconstruction record above. Close framing
is configured at 48° pitch, north bearing and half aerial distance; #72 owns
the user interaction. Loading, preparation, retention and adaptive safeguards
remain in force. Build offline twice with `bun run landmarks:build`, record
hashes with `bun run assets:record`, and retain production-camera/device evidence.
