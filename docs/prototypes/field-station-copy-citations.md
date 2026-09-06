# Field Station copy and citations — throwaway source-treatment study

Decision ticket: [Finalize the Field Station copy and citations](https://github.com/danielluis07/ocean-drive/issues/16).

Status: awaiting human review. This branch extends the selected **C — Voz da estação** presentation only to decide final Brazilian Portuguese copy, fictional-wrapper disclosure, passage sizing, and claim-to-source treatment. Production implementation remains outside the Wayfinder map.

## Run

```sh
bun install
bun run prototype
```

Open <http://localhost:3003/?variant=A>. From the original checkout, run `bun --cwd .prototypes/field-station-copy-citations run prototype`.

The default opens beside **Pulso de Calor** with the vessel stationary. Switch A/B/C with the floating arrows, or with keyboard arrows while the comparison control has focus. The URL keeps the chosen citation treatment across reloads. Use the development-only **Inspecionar** shortcuts after leaving the reader to open the other Field Stations without replaying the route.

## Question

Which claim-to-source treatment makes the final-draft copy feel both cinematic and trustworthy while keeping the exact evidence boundary easy to inspect?

## Shared editorial draft

All three treatments use the same content so the comparison isolates citation behavior:

- three short, visitor-paced signals per Field Station;
- two discrete claims per signal, each mapped to one or more exact source records;
- a persistent **“Pesquisa histórica · expedição fictícia”** disclosure that expands in place;
- direct external links labelled as opening in a new tab;
- a source record that names its kind, bibliographic identity, locator, supported claim, and Evidence Boundary;
- identical copy and sources in the independent semantic text presentation.

The full wrapper disclosure is:

> Esta experiência é uma composição retrospectiva criada a partir de pesquisas sobre Abrolhos em 2019. O Instituto Maré Aberta, a embarcação, as estações e o percurso são fictícios. Lugares, datas, organismos, medições e observações vêm das fontes indicadas. A experiência não mostra as condições atuais dos recifes.

The twelve passage titles form the final-draft arc:

| Field Station | Signal 1 | Signal 2 | Signal 3 |
| --- | --- | --- | --- |
| Pulso de Calor | Um calor que se acumula. | Cinquenta dias sob pressão. | O registro vem antes do encontro. |
| Corais sob Estresse | Branquear ainda é estar vivo. | Um coral voltou à cor. | Seis seguiram outro caminho. |
| Respostas Desiguais | O mesmo calor, respostas diferentes. | O lugar muda o número. | Outro organismo, outro desfecho. |
| Convergência | Um evento, mais de uma resposta. | Ler o oceano exige contexto. | Conectar sem apagar diferenças. |

Exact claims and source records live in [`station-content.ts`](../../app/_prototype/station-content.ts). They preserve the evidence dossier's distinctions between satellite heat exposure, transect classifications, fixed-colony trajectories, bleaching, mortality, taxon-specific percentages, and current conditions.

## The comparison

The approved petroleum, jade, mist, ochre, and salt palette remains unchanged. Georgia italic carries the station voice; the existing sans serif carries claims and evidence detail. The signature is a quiet transition from a poetic signal to the exact record that supports it, while the vessel remains beside the buoy.

| Variant | Structure | Tradeoff to judge |
| --- | --- | --- |
| A — Sinais no texto | Small numbered markers sit after each factual claim. One action expands the matching records below the passage in the same reader. | Strongest immediate claim-to-source traceability with the least spatial cost; the markers add an academic note to the poetic voice. |
| B — Ficha aberta | A second column keeps numbered claims and their source records visible beside the passage. It stacks below the copy on phones. | Maximum transparency with no disclosure action; the evidence density competes most with the ocean and slows a short visit. |
| C — Caderno de bordo | The passage stays visually clean. A strong row opens a dedicated source view for the current signal, replacing the passage until the Visitor returns. | Strongest cinematic reading and most comfortable source detail; the claim and source cannot be viewed side by side. |

**Design recommendation:** carry **A — Sinais no texto** forward. It protects the selected narrow ocean composition, makes sourcing discoverable at the exact claim, and still gives Evidence Boundaries enough room in an in-place expansion. B is too dominant for a bounded three-to-five-minute Expedition; C makes the copy most elegant but temporarily separates evidence from the claim it qualifies.

## Captured views

| Treatment | Desktop, 1440 × 1000 | Portrait, 390 × 844 |
| --- | --- | --- |
| A — Sinais no texto | [Passage](field-station-copy-citations/A-desktop.png) · [expanded source](field-station-copy-citations/A-sources-desktop.png) | [Portrait](field-station-copy-citations/A-mobile.png) |
| B — Ficha aberta | [Desktop](field-station-copy-citations/B-desktop.png) | [Portrait](field-station-copy-citations/B-mobile.png) |
| C — Caderno de bordo | [Passage](field-station-copy-citations/C-desktop.png) · [source view](field-station-copy-citations/C-sources-desktop.png) | [Portrait source view](field-station-copy-citations/C-mobile.png) |

## Human review prompt

1. Read all three signals at **Pulso de Calor** in A, then open the source treatment.
2. Compare that same first signal in B and C, especially the transition from the claim to its Evidence Boundary.
3. Use **Inspecionar** to read **Corais sob Estresse**, signal 2, and **Respostas Desiguais**, signal 2; these are the densest sample and percentage passages.
4. On a narrow viewport, confirm whether the three-signal rhythm and persistent wrapper disclosure remain comfortable.
5. Choose A, B, C, or a precise combination, and call out any sentence that should change before the decision is recorded.

## Verification and limits

Scoped ESLint, TypeScript, whitespace, and a production build pass. Headless Chrome walkthroughs at 1440 × 1000 and 390 × 844 captured all three treatments, A's expanded source, and C's source view with software WebGL. The inherited Three.js Clock deprecation warning remains.

The prototype does not establish scientific peer review of new prose, physical-phone comfort, full accessibility conformance, production architecture, or complete Expedition timing. The evidence itself remains bounded by the approved dossier; the human verdict on wording and citation treatment is intentionally still open.
