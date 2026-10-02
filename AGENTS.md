<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Runtime

Use Bun

# Language

All code, comments, and commit messages are in English.
User-facing copy is in Brazilian Portuguese.

# Conventions

Prefer the @ alias for imports (see docs/CONVENTIONS.md)

# Island asset quality

Read docs/terrain-detail-assessment.md before changing island assets. Use
content/landmark-sources.ts and lib/production-budgets.ts as the executable
budget sources. Placeholder counts, untextured Features and the former 4,400
triangle target are not quality requirements. Agents may author or reconstruct
assets from suitable licensed references; the owner need not supply models.
Preserve provenance, loading safeguards and device validation, and judge visual
quality using production-camera captures rather than automated checks alone.
