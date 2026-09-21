# Accessibility and devices

Implements [#43](https://github.com/danielluis07/ocean-drive/issues/43). The
Travessia voyage has two presentations over one Voyage State: the 3D ocean scene
and the Accessible Editorial Presentation (“Modo leitura”). This document covers
the editorial page and the accessibility contracts shared by both. The ocean's
chrome, Sheets, and failure handling are in [minimal-chrome.md](minimal-chrome.md),
[sheets.md](sheets.md), and [ocean-resilience.md](ocean-resilience.md).

## The editorial page

A full white page in the language of the Stop Account Sheet: white ground, ink
type, neutral grey hairlines, small mono labels, and coral only as a dot beside
text. It is semantic HTML rendered on the server, never imports Three, and is
complete without JavaScript or WebGL.

| Order | Section | Component | Heading |
| --- | --- | --- | --- |
| — | “Voltar ao oceano” notice | `components/ocean/presentation-notice.tsx` | — |
| Stop 00 | Brand, Core Promise, fictional-project disclosure, data and ship credits | `components/voyage/opening.tsx` | `h1` “O Brasil visto do mar.” |
| — | The route: Stops 01–04 with progress and status | `components/voyage/route-navigation.tsx` | `h2` |
| Stops 01–04 | Each Stop with its full Stop Account | `components/voyage/stop.tsx`, `stop-account.tsx` | `h2` Stop, `h3` Destaques / Melhor época, `h4` highlights |
| Arrival | Next departure, itinerary, “Recomeçar viagem” | `components/voyage/arrival.tsx` | `h2` “Roteiro completo” |
| — | Footer with “Voltar ao início” | `components/voyage/closing.tsx` | — |

The disclosure appears once here and once in the 3D presentation (the itinerary
Sheet). Shared class lists live in `components/voyage/editorial-styles.ts`.

Every Stop is always shown; nothing is collapsed or gated. Choosing a Stop in the
route opens it: the Ship moves there, it is recorded as a Visited Stop, focus and
scroll move to its heading, and the live region says “<Stop>, parada aberta.”
This mirrors “Saiba mais” in the ocean scene. Scrolling past a Stop, switching
presentations, or reloading never visits one.

## When it opens

- **“Modo leitura”**, the link in the ocean chrome or the button in Capítulos.
  It persists across reload in the same tab.
- **Automatically**, only when WebGL is unavailable, the browser refuses a
  context, an essential asset fails, rendering loses its context, or quality
  cannot stay usable. The notice states the reason in one line, which is also
  announced once.
- **Not** for reduced motion. `prefers-reduced-motion` keeps the 3D voyage and
  replaces sailing with cuts; see [charted-route.md](charted-route.md).

“Voltar ao oceano” in the notice at the top of the page returns to the 3D voyage
whenever it is still available. It is the page's first control after the skip
link. After a failure that locks 3D for the visit, the notice keeps its
explanation and has no return button.

## Switching

Switching keeps every Voyage State field except the presentation itself, closes
any open Sheet, and never marks a Stop visited. Entering the editorial page
focuses and scrolls instantly to the current Stop's heading (`editorialTarget`
and `revealEditorialStop` in `lib/voyage-view.ts`), or to the `h1` at Stop 00.
A failure lands in the same place, so an open Stop Account continues as the same
Stop in the text. Returning to the ocean focuses the ocean surface with the Ship
at the current Stop.

## Contracts

- **Semantics.** One polite live region (`#voyage-announcer`) serves both
  presentations. Each message clears the region and is restored next frame, so
  repeats are announced. Route progress is text (“1 de 4 paradas visitadas”)
  labelling a `progress` element; each route entry states “Na rota”, “Parada
  atual”, or “Visitada” in words, with `aria-current="step"` on the current Stop.
- **Focus.** Focus rings on the white page are 3px ink, since coral on white is
  below 3:1. Route entries draw the ring inside their tile. The skip link is a
  white pill with an inset ink ring, visible over both the ocean and the page.
  The page has no sticky UI, so nothing covers focus.
- **Layout.** The page column pads with `env(safe-area-inset-*)`, reflows to one
  column below `sm`, and has no fixed heights, so 400% zoom and WCAG 1.4.12 text
  spacing do not clip.
- **Contrast.** Ink on white is 17.6:1; secondary text is 5.6:1 on white and
  about 5:1 on the Arrival's grey band.
- **Motion.** Route jumps scroll smoothly unless reduced motion is preferred;
  presentation switches jump instantly.

## Automated evidence

`bun run test:browser` covers the page in Chromium and the `@critical` journeys
in Firefox and WebKit:

- `accessibility.e2e.ts`: axe-core WCAG 2.0–2.2 A/AA scans of editorial entry, an
  opened Stop, the Arrival, and the failure notice, plus reduced-motion focus
  scrolling and the live-region messages.
- `presentation-switching.e2e.ts`: switching at Stop 00, at a Stop, around every
  Stop Account, and at the Arrival. Each switch checks focus, that the target is
  in the viewport, and unchanged Voyage State. It also checks that the disclosure
  appears once.
- `ocean-entry.e2e.ts`: unsupported and refused WebGL, asset failure, reduced
  motion staying in 3D, every Stop Account readable without JavaScript, and
  context loss landing on the matching Stop.
- `keyboard.e2e.ts`: a Tab walk through the whole page with visible, unobscured
  focus and no trap.
- `layout.e2e.ts`: desktop, phone portrait and landscape, 200% and 400% zoom, and
  text spacing with web fonts blocked.

Zero axe violations are allowed. Incomplete rules are recorded per state as
`axe-<state>.json` and are never counted as passes.

## Keyboard and screen-reader walkthrough notes

Recorded while building #43, from the DOM and the accessibility tree in
Chromium, not from a physical screen reader:

- Tab order: “Pular para o conteúdo” → “Voltar ao oceano” → “Ver a rota” → the
  two credit links → the four route entries → each Stop's “Voltar à rota” →
  “Recomeçar viagem” → “Voltar ao início”. Every stop shows a ring, and the walk
  leaves the page.
- Route entries are named as they read, for example “01 Fernando de Noronha
  Pernambuco · Dia 2 Na rota”. Each Stop is an `article` named by its heading.
- Headings form one outline: `h1`, then `h2` for the route, each Stop, and the
  itinerary, with `h3` and `h4` inside each Stop Account. No level is skipped.
- Images carry Portuguese alt text and captions. The logo mark is decorative;
  the “Travessia” wordmark is text.

NVDA with Firefox, VoiceOver on macOS and iPhone, and TalkBack walkthroughs on
real devices remain Release Dossier gates (#46).
