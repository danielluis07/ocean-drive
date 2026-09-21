# Minimal chrome and Stop Cards

Implements [#36](https://github.com/danielluis07/ocean-drive/issues/36). The ocean
scene is the default presentation and carries almost no interface.

## Entry and loading

A new Voyage starts in the 3D presentation, with no entry step. Until the scene is
ready, `components/ocean/ocean-loading.tsx` covers the page with the Approach: the
Earth, the Travessia logo, and the premise line “Uma viagem pela costa brasileira”,
held for at least 2.5 seconds from navigation. Once the scene is ready it descends
toward the northeastern Brazilian coast and the ocean fades in over the last third
of the descent; under reduced motion it only fades. It is server-rendered, so no other content flashes first, and hidden
through `<noscript>`, so visitors without JavaScript read the editorial content.
Quality is chosen automatically (see [ocean-resilience.md](ocean-resilience.md)).

When WebGL is missing or rendering fails, the Accessible Editorial Presentation
opens under `components/ocean/presentation-notice.tsx`, a single explanation line
that is also announced once. While 3D remains available, the same notice offers
“Voltar ao oceano”. “Modo leitura” persists across reload in the same tab. The
page itself is described in [accessibility-and-devices.md](accessibility-and-devices.md).

## Chrome

`components/ocean/voyage-chrome.tsx` renders the only persistent controls over
the ocean:

| Element | Placement | Behaviour |
| --- | --- | --- |
| Travessia logo | Top centre | Mark only below 26rem wide; the name stays available to assistive technology |
| Sound toggle | Top left | `aria-pressed`, off by default; the ambient loop is wired in #42 |
| “Capítulos” pill | Top right | Opens the chapters Sheet (see [sheets.md](sheets.md)) |
| “Modo leitura” link | Bottom left | Switches to the Accessible Editorial Presentation |

The chrome stays under the dim while a Sheet is open; the Sheet is modal.

## Stop Cards

`components/ocean/stop-card.tsx` shows the settled Stop: a mono “Parada 0N” label,
its context line, a large white title, one sentence, and a white “Saiba mais” pill
with a coral dot. Stop 00 shows the Core Promise as its title and the Voyage's premise
(`brand.premise`) without a button, plus a “Role para navegar” cue. `lib/use-scroll-cue.ts` dismisses that
cue on the first navigation for the rest of the tab, including after “Recomeçar
viagem”.

The card fades in when the Ship settles and fades out as soon as it is under way,
keeping its last Stop while it fades. A hidden card is inert. If it held focus,
focus moves to the ocean surface; closing a Stop Account returns focus to “Saiba
mais”. At the Arrival the card becomes the closing card (see
[sheets.md](sheets.md)). Arrivals are announced once through the shared live
region; the card itself is never a live region. Focus order is sound, “Capítulos”, the card, then “Modo
leitura”.

### Placement

Each frame at rest, the scene projects the Ship and the Stop's Landmark to screen
circles (`lib/scene-projection.ts`, runtime only, using the Landmark's recorded
radius from `content/landmarks.json`) and `lib/stage-layout.ts` writes them to the
ocean surface as `--ship-*` and `--landmark-*` custom properties, plus
`data-card-side`. Nothing re-renders React. Matching the camera framing, the card
stands beside the Ship on landscape viewports, clear of the top chrome, and below
it on portrait viewports, clear of “Modo leitura”. Its band begins past whichever
of the two circles reaches further, so an island is never covered by the card
that introduces it; `tests/landmark-placement.test.ts` checks that every
production viewport leaves room for both. Viewports up to 30rem tall use
the compact `short:` type scale. At extreme magnification the card band scrolls,
so keyboard focus still reaches “Saiba mais”.

## Verification

- `tests/browser/stop-cards.e2e.ts` covers the chrome-only overlay, card content
  and fading on settle and on scroll, the Stop 00 cue across reload, single
  announcements, and card placement clear of the Ship, Landmark, and chrome at
  1440×900, 844×390, 568×320, 390×844, and 320×568.
- `tests/browser/ocean-entry.e2e.ts` covers automatic entry, the loading logo
  fade, and the explanation line for unsupported, refused, and failed 3D.
- Keyboard, layout, accessibility, resilience, and presentation-switching suites
  use “Modo leitura”, “Voltar ao oceano”, and “Saiba mais” in place of the removed
  presentation bar.
