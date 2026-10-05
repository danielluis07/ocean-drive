# Ilha Grande terrain interpretation — issue #71

The retained `data/landmarks/ilha-grande.json` coastline and SRTM elevation grid
are unchanged. They retain the rights recorded in `open-geodata.md`. The build
does not fetch satellite imagery or claim a new elevation or land-cover survey.

Ilha Grande opts into the shared native 1024px Balanced colour/normal and
independent 512px Low colour baker. Its configuration adds overlapping dense
Atlantic canopy crowns, forest to ordinary coastal slopes, pale mapped beach
pockets and granite on steep high ridges. Forest density, colours, crown scale,
beach widths and shallows depth falloff are artistic interpretations. References
and geographic beach outlines are retained under
`data/landmarks/features/ilha-grande/references/`; see that directory's README.

Beach masks follow selected sea-facing points from the retained OSM outlines
of Lopes Mendes, Abraão, Dois Rios and Aventureiro. They use exactly the mesh's
geographic projection and cannot move the coast. Their display widths are
broadened for the production camera. Lopes Mendes is part of the full terrain
mesh and its independently baked Low texture, rather than an extra floating
beach object. This keeps its long white strip readable without Feature loading.
Low additionally spends a few interior support samples along the mapped Lopes
Mendes path: its ordinary coarse grid otherwise submerges the sand between
coast vertices. The same recorded height function and submerged coastline are
preserved, and the samples count against the unchanged Low transfer/triangle cap.

The island's shoreline transition is 0.08 world units rather than the shared
0.5: the compressed footprint otherwise submerges the mapped Abraão church and
beach strip. The waterline offset used by the shallows follows the same ratio;
the submerged dip and skirt remain. Recorded beach masks tolerate the coarse
SRTM coastal slope/height mixture instead of classifying known sand as a cliff.
This is a display interpretation, not a modified geographic source or new DEM.

Bounded erosion relief is at most ±0.08 world units, following existing slopes
and tapering to zero at the waterline. Selective Balanced sampling spends its
allowance on the recorded coastline and steep ground. This interpretation is
distinct from the retained metre samples. Terrain accessibility is rasterised
into linear colour once before sRGB encoding; vertex colour/AO remains the
independent missing-texture fallback. No AO texture or extra render pass is added.

The close framing uses 48° pitch, half aerial distance, 270° bearing and a
1.2-unit target height, looking west from the island's eastern shore. This
keeps the long axis receding into the frame, including on the phone viewport.
The configuration supports art diagnostics and #72's future interaction.
Optional loading, preparation only while settled, two-island texture retention,
adaptive quality and recovery are unchanged. Low requests neither normal maps
nor the shared Feature file. Human art approval and physical-device validation
remain separate from automated checks.
