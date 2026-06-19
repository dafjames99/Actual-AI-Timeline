# AI Progress Timeline — Implementation Plan

Derived from `PRD AI Timeline` (Draft v0.2). This document is the staged build
plan; it does not restate the PRD, only the engineering approach and sequencing.

## Tech decisions (locking the PRD's recommendations)

| Concern | Decision | Why |
|---|---|---|
| Build | **Vite + React + TypeScript** | PRD's standalone target; fast HMR |
| Viz | **D3** (scales / axis / zoom) rendered into **SVG**, driven by React | PRD §6; SVG is sufficient for ~120 nodes |
| Styling | **Tailwind** for chrome, CSS custom properties for strand colours | strand colours must be data-driven |
| Data | **Markdown + YAML frontmatter** in `/events`, parsed via `import.meta.glob` + `gray-matter` | PRD §5 / §6 |
| Animation | **framer-motion** for panels/tooltips (DOM); D3 transitions inside SVG | PRD §6 |
| Deploy | **GitHub Pages** (static SPA via GitHub Actions) | PRD §8 ("Deployment: GitHub Pages, static export") |

### The one architectural rule

Everything loads through `src/data/getAllEvents.ts` (and siblings like
`getEventById.ts`). Nothing else in the app touches the filesystem or
`import.meta.glob`. This is the single file that changes if the project is later
embedded in Next.js (PRD §6 "Framework portability").

## Decisions on the PRD's open questions (§9)

- **Default spacing (Q2):** ship **proportional / date-accurate** as the default;
  era-mode is the toggle added in Stage 4. Conveying *pace* is the project's point.
- **Guided tour (Q3):** `src/data/tour.ts` — an ordered array of `event_id`s with
  optional per-step commentary. Version-controlled, no curation UI.
- **Deep-linking (§10):** `?event=<id>` query param, wired in Stage 2 so it is
  "free" by the time we polish in Stage 5. Using a query param (not a path route)
  also means GitHub Pages needs no SPA 404-fallback hack.
- **Coverage (Q5):** the seed set deliberately includes non-Western milestones
  (e.g. ERNIE, DeepSeek, Qwen) alongside the widely-known events.
- **Seed dataset strategy:** start small (~20–30 high-confidence, fully-sourced
  core events) and grow the dataset toward the 80–120 target over time. The data
  format makes each addition a single-file change.

## Proposed file structure

```
/events/                      # one .md per event (YAML frontmatter + optional body)
/src
  /data
    types.ts                  # TimelineEvent, StrandKey
    strands.ts                # strand config: key -> { label, colour, order }
    getAllEvents.ts           # THE loader boundary (import.meta.glob + gray-matter)
    getEventById.ts
    tour.ts                   # guided-tour step list (Stage 4)
  /components
    Timeline.tsx              # SVG swim-lane chart (D3 scales)
    EventNode.tsx
    EventPanel.tsx            # detail panel (framer-motion)
    Tooltip.tsx
    FilterBar.tsx             # strand toggles + search
  /hooks                      # useSelectedEvent (URL sync), useZoomPan, ...
  App.tsx / main.tsx
index.html
```

---

## Stages of increasing complexity

### Stage 0 — Scaffold + data layer (foundation)
- Vite / React / TS project; Tailwind; ESLint + Prettier; folder structure above.
- `TimelineEvent` type + `StrandKey` union + strand config (colour, label, order).
- `getAllEvents()` / `getEventById()` behind the loader boundary: `import.meta.glob`
  + `gray-matter`, date-sorted, with frontmatter validation (warn on missing
  `source_url` or unknown `strand`).
- ~10 sample events to exercise the pipeline end-to-end.
- **Exit check:** `getAllEvents()` returns typed, sorted, validated events.

### Stage 1 — Static visual (validates data model + design)
- **1a:** Horizontal multi-strand SVG. D3 `scaleTime` x-axis with year ticks; one
  swim lane per strand; nodes positioned by date; colour by strand. No interaction.
  Filter-bar / legend shell present but inert.
- **1b:** Curate the **core seed set (~20–30 events)**, 2006→present, all sourced.
  Grow toward 80–120 incrementally after MVP.
- **Exit check:** the §7 "The Log" layout renders accurately and stays legible
  across the full date range.

### Stage 2 — Interaction layer (completes the MVP)
- Click node → detail panel (framer-motion slide-in): title, date, strand badge,
  summary, significance, actors, source link, related events (clickable).
- Hover → minimal tooltip (title + date).
- Strand toggles collapse the lane and reclaim space.
- Horizontal scroll / pan.
- Deep-linking: `?event=<id>` opens that event on load and updates on selection.
- **Exit check:** MVP — browse, inspect, toggle strands, share a link to an event.

### Stage 3 — Search + filter
- Keyword search over title / tags / actors; non-matching events **dim** rather
  than disappear (PRD §7). Tag filter.

### Stage 4 — Era mode + guided tour
- Toggle proportional ↔ equal-spaced-per-event spacing.
- Era grouping: Pre-deep-learning / Deep-learning / LLM / Post-ChatGPT.
- Guided tour: steps through `tour.ts`, panning/zooming to each event and
  auto-opening its panel.

### Stage 5 — Polish + deploy
- Responsive layout; keyboard accessibility (focusable nodes, ARIA, panel focus
  trap); <2s load target; perf pass.
- **Deploy to GitHub Pages:** set Vite `base` to the repo path (e.g.
  `/Actual-AI-Timeline/`); add a GitHub Actions workflow
  (`actions/upload-pages-artifact` + `actions/deploy-pages`) that builds on push
  to the default branch and publishes. Custom domain optional later.

---

**MVP = Stages 0–2.** Stages 3–5 are strongly desirable for v1 but can slip
(per PRD §8). Each stage boundary is a commit on
`claude/prd-implementation-plan-vtkbdx`.
