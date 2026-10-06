# NASA Blue Marble Approach imagery

The Approach uses NASA's 2002 Blue Marble surface/ocean/ice map and separate
cloud composite. These are U.S. Government works in the public domain. Credit:
NASA Goddard Space Flight Center; Reto Stöckli (surface, shallow water, clouds)
and Robert Simmon (ocean colour and compositing). No NASA logo is used and no
NASA endorsement is implied.

Source and credits:
<https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/>.
NASA media usage guidelines:
<https://www.nasa.gov/nasa-brand-center/images-and-media/>.
Exact upstream URLs, retrieval dates and SHA-256 hashes are retained in
`data/earth/sources.json`, alongside the upstream raster bytes and snapshots of
the source and usage pages. These are historical satellite composites, not
evidence of present-day weather, coast conditions or ocean colour.

`bun run earth:fetch` is the explicit network maintenance command. Review and
commit its recorded outputs. `bun run earth:build` verifies their hashes and
rebuilds all three WebPs offline using the lockfile's Sharp encoder. The inverse
orthographic projection is centred at 30° W, 4° S, in open water east of Fernando
de Noronha. The same camera basis and bilinear map sampling create a complete
globe and crops at 3× and 14×. All outputs are 4096 square pixels. Only the globe
composites NASA's real cloud layer. The thin atmosphere rim, restrained navy
grade and final plain deep-water centre are authored transformations. There is
no generated geography, AI imagery or runtime projection.

`content/earth-approach.ts` records native dimensions, crop factors, zoom limits
and the 450 KiB globe / 250 KiB combined optional-image budgets. Only the globe is essential and
preloaded. Next image resizing is disabled to retain the native pixels needed
during the descent. The close images load eagerly in the server HTML while the
premise is read; neither their network requests nor their decoding can delay
ocean readiness. The choice is locked at the first descent paint. A missing or
undecoded close image uses a 2× globe zoom and a 1.2 s fade instead of the nested
2.4 s descent. Reduced motion fades in 480 ms without zooming.

At the maximum 896 CSS-pixel Earth width and DPR 2, the three maximum rendered
image widths are 3943, 4062 and 3840 physical pixels, below 4096. Smaller phone
viewports use less. The outgoing image stops scaling when fully transparent.
The coastal crop anchors inland to the left/bottom viewport edges and pans
offshore; its northern and offshore edges fade. This avoids depicting its cropped inland
boundary as an island. The open-water crop uses a radial mask. The final crop
centre and `--approach-water` token share the opening camera's water reference;
the ocean cross-fades over the final 800 ms, including the vessel and its wake.
