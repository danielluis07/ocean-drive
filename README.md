# Travessia

Travessia is a standalone interactive voyage commissioned as a fictional small-ship expedition along the Brazilian coast. Visitors move through a fixed Charted Route, pause at coastal Stops, and open each Stop Account over the ocean scene.

The project is written in English internally and presents user-facing copy in Brazilian Portuguese. Its Accessible Editorial Presentation remains available when 3D rendering is unavailable or reduced motion is preferred.

## Development

Use Bun 1.4.1:

```sh
bun install --frozen-lockfile
bun dev
```

Open `http://localhost:3000`.

## Checks

```sh
bun test
bun run lint
bun run typecheck
bun run assets:audit
bun run build
bun run test:browser
```

Production browser checks require the Playwright browsers installed locally. Asset generation is deterministic and does not require a network connection:

```sh
bun run assets:ship
bun run assets:identity
bun run assets:record
bun run assets:audit
```

## Structure

- `app/` contains the Next.js route and global rules.
- `components/` contains the voyage presentation and ocean scene.
- `content/` contains authored voyage copy.
- `lib/` contains state transitions, route geometry, and rendering helpers.
- `tests/` contains unit and browser journeys.
- `docs/` contains project and asset guidance.
