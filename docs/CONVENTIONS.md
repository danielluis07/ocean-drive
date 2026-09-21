# Component Structure

A .tsx component file should contain only what is needed to render it. Do not define standalone helper functions, formatters, validators, or business logic inside a component file. Extract them to a dedicated utility, hook, or module file.

# UI components

New UI is built with Tailwind utility classes and [shadcn/ui](https://ui.shadcn.com) components (`components.json`, style `base-nova`, base `@base-ui/react`). Add components with `bunx --bun shadcn@latest add <component>`; they resolve through the `@/components/ui` alias. All UI is built this way: `app/globals.css` holds only the tokens and a few element defaults in the base layer (link underlines, a `currentColor` focus ring, reduced-motion scrolling), with no component classes.

## Design tokens

Colour, radius, and font tokens are Tailwind v4 `@theme` tokens defined once in `app/globals.css` and consumed as semantic Tailwind classes (`bg-background`, `text-foreground`, `bg-primary`, `rounded-lg`, `font-sans`, …). Never hardcode a raw hex/oklch value in a component — reference the token.

**Colour** — the Travessia palette:

| Token | Value | Role |
| --- | --- | --- |
| `--background` / `--foreground` | `--ocean-950` `#071019` / `--ocean-050` `#f4f7f8` | Near-black navy ocean ground with white type (contrast 17.8:1). |
| `--card`, `--popover`, `--sidebar` / their `-foreground` | `#ffffff` / `--surface-ink` `#0b1b22` | White surfaces (Sheet, Card, Popover) with near-black ink text (contrast 17.6:1). |
| `--primary`, `--ring`, `--sidebar-primary` | `--coral-500` `#ff6b4a` | The single coral accent. Foreground on coral is `--surface-ink`, not white (white-on-coral fails AA). Coral never carries meaning alone — always pair it with text or an icon. |
| `--secondary`, `--muted`, `--accent` / `-foreground` | `--surface-neutral-100` `#eef2f3` / `--surface-ink` | Neutral grey fills on white surfaces. |
| `--muted-foreground` | `--surface-neutral-600` `#5b6b70` | Secondary text on white surfaces (contrast 5.6:1). |
| `--border`, `--input` | `--surface-neutral-300` `#dde4e6` | Neutral grey hairlines on white surfaces. |

All text pairings above meet WCAG 2.2 AA (4.5:1 for body text).

**Radius** — one base scale in `--radius` (`0.625rem`), exposed as `--radius-sm` … `--radius-4xl`. Use the Tailwind `rounded-*` utilities; never a literal `border-radius`.

**Font** — self-hosted via `next/font/local` in `fonts/index.ts`, licences recorded in `docs/third-party/fonts/` and `content/asset-manifest.json`:

- `--font-sans` (`font-sans`) — Manrope (grotesk, variable weight 400–800), for headlines and body copy.
- `--font-mono` (`font-mono`) — Geist Mono, for small labels.


