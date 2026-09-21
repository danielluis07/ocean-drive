// Shared class lists for the Accessible Editorial Presentation, a white page in
// the same language as the Stop Account Sheet.

// The page column, padded clear of device safe areas.
export const editorialShell =
  "mx-auto w-full max-w-[72rem] pr-[max(1.5rem,env(safe-area-inset-right))] pl-[max(1.5rem,env(safe-area-inset-left))]";

// Coral falls below 3:1 on white, so focus rings on the page use ink.
export const editorialFocus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-card-foreground";

// The small mono label above headings, as on the Stop Card and in the Sheets.
export const editorialLabel = "font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase";

// Programmatically focused headings leave room above them for their label.
export const editorialHeading = `scroll-mt-24 rounded-sm ${editorialFocus}`;

// Pill actions on the page.
export const editorialAction = `inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full border border-border px-5 text-sm font-semibold text-card-foreground transition-colors hover:bg-secondary ${editorialFocus}`;
