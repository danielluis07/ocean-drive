# Project Structure

The application follows a feature-oriented component structure while keeping
shared data and logic in top-level folders.

```text
app/                         Next.js routes, layouts, and global styles
components/
  voyage/                    Editorial voyage UI and interaction shell
  ocean/                     3D ocean presentation and runtime
content/                     Editorial records and other authored content
data/                        Recorded third-party source data, never served
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
responsibility. The `components/voyage/voyage.tsx` file owns the client state
and coordinates both presentations, while its sibling files render the route,
Stops, Stop Accounts, the itinerary, and static sections. The white Sheets read
over the ocean live beside the scene in `components/ocean/`.

`data/` holds open source data recorded once from an outside service and
committed, such as the coastline and elevation records the island Landmarks are
built from. Nothing under `data/` is served to the browser; generation scripts
read it offline so builds stay reproducible. See [landmarks.md](landmarks.md).

Put reusable logic that does not render JSX in `lib/`. For example,
`lib/voyage-state.ts` owns Voyage State and its persistence,
`lib/charted-route.ts` and `lib/route-motion.ts` own the Charted Route and the
Ship's movement along it, and `lib/voyage-view.ts` contains display-oriented
helpers used by the voyage components. Put authored copy and evidence records in `content/` so
components do not become data stores.

Use the `@/` alias for imports across top-level folders. Use relative imports
only when a file is tightly coupled to a sibling and an alias would obscure
that relationship.
