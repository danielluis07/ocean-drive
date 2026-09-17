# Stop Accounts, Capítulos, and the Arrival

Implements [#37](https://github.com/danielluis07/ocean-drive/issues/37). Reading
happens in white shadcn Sheets over the paused ocean, replacing the dark “Voz da
estação” reader, signal pagination, logbook and source cards, and completion
buttons. Copy is placeholder until the Travessia content lands.

## Sheets

`components/ocean/voyage-sheet.tsx` wraps the shadcn Sheet (a Base UI dialog)
for every Sheet:

| Viewport | Side | Size |
| --- | --- | --- |
| 48rem and wider | Right | Full height, 520px (32.5rem) wide |
| Narrower | Bottom | 90% of the viewport height |

A light dim in the ocean ground colour covers the scene, without blur. Each Sheet
has a sticky header with a mono eyebrow, its title, and a “Fechar” button, and
scrolls as one column. X, Escape, and a press on the dimmed ocean close it. Base UI
traps focus while it is open and hides the page from assistive technology; the
polite live region stays exposed. On close, focus returns to the control that
opened the Sheet: “Saiba mais”, “Capítulos”, or “Ver roteiro completo”. Focus
rings inside a Sheet use ink, since coral on white falls below 3:1.

Only one Sheet is open at a time. Which one is `sheet` in `useVoyage()`: it is not
Voyage State, it only shows in the ocean scene, and it closes when the scene gives
way to the Accessible Editorial Presentation. The scene renders on demand while a
Sheet is open.

The Sheets render outside the ocean surface, so wheel and touch over a Sheet or
the dim never reach route input, and route keys are disabled while one is open.
Keys scroll the Sheet from its focused control.

## Stop Account

“Saiba mais” on a Stop Card opens `components/ocean/stop-account-sheet.tsx` for
the settled Stop and records it as a Visited Stop. The eyebrow is “Parada 0N ·”
and the day label; the body, `components/voyage/stop-account.tsx`, is one
continuous scroll: intro, three highlights, best season, and one or two image
slots. Each slot keeps its place and alt text until the illustrative images
arrive. The Accessible Editorial Presentation renders the same body for every
Stop.

## Capítulos

The “Capítulos” pill opens `components/ocean/chapters-sheet.tsx`, listing Stops
00–04. Visited Stops carry a drawn tick and the accessible suffix “Visitada”; the
current Stop has `aria-current="step"`, a filled background, and the words
“Parada atual”. Choosing a Stop closes the Sheet and calls `goToStop`, so the Ship
sails there, or cuts under reduced motion; choosing never visits it. The Sheet
also offers “Modo leitura” and “Recomeçar viagem”, which clears Voyage State and
cuts back to Stop 00.

## Arrival

At Stop 04 the Stop Card becomes the closing card: “Parada 04 · Chegada”, the
context line and title, and “Próxima partida · setembro de 2027”. “Ver roteiro
completo” is its white pill; below it, quieter text buttons offer “Saiba mais” (so
the Arrival can still be visited) and “Recomeçar viagem”. “Ver roteiro completo”
opens `components/ocean/itinerary-sheet.tsx` with the day-by-day itinerary from
`content/editorial.ts`. Restarting from the card
moves focus to the ocean surface. The editorial presentation ends with the same
itinerary and restart. Nothing on the page collects personal data.

## Verification

- `tests/browser/sheets.e2e.ts` covers Sheet placement on wide and narrow
  viewports, content order, closing with X, Escape, and the dim, the focus trap
  and focus return, scrolling without moving the Ship, visited ticks and the
  current Stop, chapter jumps (sailing and reduced-motion cuts), restart and
  “Modo leitura” from Capítulos, and the Arrival's closing card and itinerary.
- Accessibility, keyboard, layout, charted-route, presentation-switching, and
  resilience suites open and close Sheets in place of the removed reader.
