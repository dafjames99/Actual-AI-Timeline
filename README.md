# AI Progress Timeline

An interactive, multi-strand timeline of AI milestones — research breakthroughs,
model releases, products, open-source tooling, governance, industry events, and
infrastructure — designed to be scannable at a glance and explorable in depth.

**Live:** https://dafjames99.github.io/Actual-AI-Timeline/

## Features

- **Multi-strand swim lanes**, colour-coded by category, with toggles to show/hide each.
- **Date** (proportional) vs **Even** (equal-per-event) spacing.
- **Era bands** (Pre-deep-learning → Post-ChatGPT) with one-tap era jumps.
- **Click an event** for a detail panel (summary, significance, actors, tags,
  related events, source link).
- **Search** (title / tags / actors) and **tag filtering** — non-matches dim
  rather than disappear.
- **Guided tour** that walks through curated milestones.
- **Deep-linking** via `?event=<id>`; keyboard accessible (Esc, arrow keys, Tab trap).
- **Mobile-first** responsive design.

## Tech stack

React + TypeScript + Vite, D3 (scales/time), Tailwind CSS v4, framer-motion.
Events are Markdown files with YAML frontmatter, loaded at build time.

## Local development

Requires Node 20+.

```bash
npm install      # install dependencies
npm run dev      # start the dev server (prints a local URL)
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build locally
npm run lint     # run ESLint
```

## Adding an event

Adding an event is a single-file operation — no code changes needed. Create a new
Markdown file in [`events/`](./events), e.g. `events/my-event.md`:

```markdown
---
id: my-event
title: "Short display label"
date: "2024-01-15"            # ISO 8601; use the earliest credible public date
strand: research              # research | labs | products | oss | governance | corporate | infrastructure
summary: "1–3 sentence plain-English explanation of what happened."
significance: "1–3 sentences on why it mattered."
actors:
  - Some Org
tags:
  - example
source_url: "https://example.com/source"   # mandatory — no unsourced events
related_ids:                  # optional cross-links to other event ids
  - another-event
---

Optional extended notes (Markdown) go here, and may be left empty.
```

The loader validates required fields and skips files that are missing any, so a
malformed entry won't break the build.

## Architecture note

All event loading is encapsulated behind `src/data/getAllEvents.ts` (and
`getEventById.ts`). Nothing else in the app knows how files are read, so porting
to another framework (e.g. Next.js) means changing only that one file.

## Deployment

Pushing to the working branch triggers `.github/workflows/deploy.yml`, which
builds and publishes to GitHub Pages automatically.
