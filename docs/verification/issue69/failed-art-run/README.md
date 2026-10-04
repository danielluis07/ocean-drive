# Earlier art-harness failure

The intermediate `terrain-detail` run passed 9 captures and failed
`desktop-fallback aerial`: the generic GPU classification with live timer
queries promoted the scene from Balanced to High during warm-up, so it could
not satisfy the requested Balanced capture. The retained diagnostics show
that transition at 1736.5 ms. No successful screenshot was produced for that
test. Its diagnostic export, page snapshot and [full trace](trace.zip) are
retained here.

The final art harness emulates unavailable timer queries alongside the generic
renderer, exercising the production unknown-GPU Balanced ceiling. It also
seeds production-supported remembered DPR (.9 for Balanced, 1 for Low), and
asserts that DPR and tier survive screenshot readback. An earlier comparison
had .9/1 DPR variation between pairs and was superseded. The final matched
before/after sets pass all ten views with identical settings.

These are explicitly synthetic art settings. The isolated physical-GPU
performance test uses the real renderer and GPU timer queries, with no such
overrides. No production adaptive-quality rule was changed for these captures.
