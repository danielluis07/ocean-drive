# Project Structure

The application follows a feature-oriented component structure while keeping
shared data and logic in top-level folders.

```text
app/                         Next.js routes, layouts, and global styles
components/
  expedition/                Editorial expedition UI and interaction shell
  ocean/                     3D ocean presentation and runtime
content/                     Editorial records and other authored content
lib/                         State transitions, configuration, and pure helpers
providers/                   React context providers shared across features
public/                      Static assets served by Next.js
scripts/                     Bun scripts for asset generation and maintenance
tests/browser/               Playwright end-to-end tests
docs/                        Project guidance, research, and technical notes
```

Keep route files such as `app/page.tsx` small. They should compose the feature
entry points that live under `components/`.

Within a feature folder, split components by page section or clear UI
responsibility. The `components/expedition/expedition.tsx` file owns the client
state and coordinates the editorial expedition, while its sibling files render
the route, stations, signals, sources, and static sections.

Put reusable logic that does not render JSX in `lib/`. For example,
`lib/expedition-state.ts` owns the expedition state machine and persistence,
and `lib/expedition-view.ts` contains display-oriented helpers used by the
expedition components. Put authored copy and evidence records in `content/` so
components do not become data stores.

Use the `@/` alias for imports across top-level folders. Use relative imports
only when a file is tightly coupled to a sibling and an alias would obscure
that relationship.
