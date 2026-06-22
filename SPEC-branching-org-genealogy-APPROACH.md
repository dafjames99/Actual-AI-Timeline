# Implementation Approach — Branching View (Org Genealogy)

Working notes for [`SPEC-branching-org-genealogy.md`](SPEC-branching-org-genealogy.md).
This is the *how*; the spec is the *what*. Branch: `feat/branching-org-genealogy`.

## What the codebase already gives us (audit)

Read before writing — the spec assumes some extractions that are already done:

| Spec assumption | Reality | Action |
|---|---|---|
| Reuse node-icon resolver (`actors[] → brand`) | Already standalone in [`nodeIconResolver.ts`](src/components/nodeIconResolver.ts) + [`brands.ts`](src/data/brands.ts) | **Reuse verbatim.** No extraction needed. |
| Reuse `eras` | Already standalone in [`eras.ts`](src/data/eras.ts) | Reuse. |
| Extract `scaleTime`/`xOf` from Timeline | **Still inline** in `Timeline.tsx`'s `layout` useMemo ([Timeline.tsx:82](src/components/Timeline.tsx)) | **Extract** (see §1). |
| Extend `mode` with a `view` axis | `mode: "date" \| "even"` is the *spacing* axis only; no view axis | **Add** `view` (see §4). |
| `Brand` carries genealogy fields | Deliberately omitted; `brands.ts` comment says "added when this spec starts" | **Add now** (see §2). |
| Bridge via `centerId`/`centerKey` | Exists: `App.focus(id)` bumps `{id, key}`, Timeline animates to it ([App.tsx:37](src/App.tsx)) | Reuse for the branch→flat bridge. |

So the real net-new work is: (1) one helper extraction, (2) registry genealogy fields, (3) a
new 2D component, (4) a view toggle + bridge. The icon/brand/era plumbing is free.

## 1. Extract the time scale (prerequisite, low-risk)

`Timeline.tsx` builds its x-scale inside `layout` and only exposes it locally. Branch view
needs the *same* date-x mapping. Extract a pure builder:

```
src/components/timeScale.ts
  buildTimeScale(events): {
    d0, d1,                 // padded date extent (shared "one history" axis)
    trackWidth,             // px width at PX_PER_YEAR
    xOfDate(d: Date): number,
    xOf(e: TimelineEvent): number,
    dateAtX(x): Date,
    ticks: { x, label }[],  // year ticks
  }
```

- Only the **date-mode** branch is shared (branch view is inherently proportional; "even"
  spacing is a flat-mode-only concept). Lift just that path.
- Refactor `Timeline.tsx` to call `buildTimeScale` for its date branch, keeping the `even`
  branch inline. **Behaviour-preserving** — verify the flat timeline is pixel-identical
  after (build + lint + typecheck + preview snapshot before/after).
- This is the one change that touches existing code; do it first, in isolation, so a
  regression is obvious and bisectable.

## 2. Registry genealogy fields ([`brands.ts`](src/data/brands.ts))

Extend `Brand` exactly as the spec §4 prescribes (all optional, curate-once):

```ts
founded?: string;        // ISO — lane start (source of truth, NOT events)
parents?: string[];      // brand keys this forked/merged from
relation?: "spinout" | "merge" | "acquisition";
becomes?: { into: string; date: string };  // merge/absorb target
dissolved?: string;      // ISO — lane end if not via `becomes`
laneOrderHint?: number;  // manual vertical-order nudge
colour?: string;         // lane colour (distinct from strand colours)
```

Curation (Stage 2, each **sourced** — add `source_url` per claim in a comment or sidecar):
the ~15 orgs already in `BRANDS` plus a few lane-only orgs that have no events yet but
anchor the genealogy (e.g. **Inflection** → Microsoft; **Google Brain** as a distinct line
that merges into Google DeepMind). Lanes can exist before any event file — the spec is
explicit that founding events are optional flavour.

Known edges to encode (verify dates at curation time):
- spinout: Anthropic ← OpenAI (2021); Mistral ← DeepMind/Meta (2023)
- merge: Google Brain + DeepMind → Google DeepMind (2023-04)
- acquisition: DeepMind ← Google (2014) — rendered softer
- sunset/absorb: Inflection → Microsoft (2024) via `becomes`

**Open question for curation:** Google currently aliases `google brain`, `google research`,
*and* `google deepmind` onto one brand. The genealogy needs Brain and DeepMind as *distinct
lanes* that converge. Plan: split into `google-brain`, `deepmind`, and a post-2023
`google-deepmind` brand; keep `google` for pre-merge generic Google work. This reshapes the
icon resolver's lane assignment but not its node rendering. Flag to confirm before splitting.

## 3. New component `BranchTimeline.tsx`

Separate component per spec §6 (do **not** extend `Timeline.tsx` — its 1D playhead/jog model
is a poor fit). Layout:

- **x = time** via `buildTimeScale` (shared single history axis).
- **y = lane**, one row per org. `laneOf(event) = brandForActors(event.actors)?.key`.
- **Lane geometry** from the *registry*: line from `founded` → (`becomes.date` | `dissolved`
  | last node x). Logo disc at the lane head (`founded` x), reusing `NodeIcon`/the resolver.
- **Nodes**: events placed at `(xOf(date), laneY)` using the existing node-icon disc + strand
  ring model.
- **Unaffiliated events** (no resolvable brand): default to a persistent **"field"
  ground-line** at the bottom (spec §5 / open-decision #1 default). Implement behind a small
  flag so "hide" is a one-line switch if it looks noisy.

### Lane ordering (§5)

Light topological sort: seed order by `founded` ascending; pull spinout children adjacent to
their parent to minimise edge length; `laneOrderHint` overrides. Pure function
`orderLanes(brands): brandKey[]` — unit-testable, tune visually in Stage 1.

### SVG vs DOM — decided during Stage 1

`Timeline.tsx` is DOM-divs-on-a-translated-track. **Decision (implemented):** Stage 1 keeps
nodes/lanes as **absolute-positioned DOM** so the strand-ringed `NodeIcon` disc is reused
verbatim (no nested-SVG / `foreignObject` friction), inside an `overflow-auto` container
(pan = native scroll). The crossing **edges** in Stage 2 will be a single absolutely-positioned
**SVG layer behind the nodes** (lanes can move there too if it reads better). This gets the
edges into one coordinate space without rewriting the node rendering.

## 4. View toggle + bridge

- Add a **view axis** to App state: `const [view, setView] = useState<"flat" | "branch-org">("flat")`.
  Reserve `"branch-lineage"` in the union for the deferred idea-lineage mode (spec §11).
- `Controls.tsx`: add a View segmented control next to Spacing (mirror `ModeButton`). On
  mobile it sits in the same horizontally-scrollable row.
- `App.tsx` `<main>`: render `Timeline` when `view==="flat"`, `BranchTimeline` when
  `"branch-org"`. Spacing/era/tour controls are flat-only — gate or relabel them in branch view.
- **Bridge**: tap a lane head or node in branch view → `setView("flat")` + `focus(id)` (and
  `select(id)` for a node). The existing `centerId`/`centerKey` then scrubs the flat timeline
  to it. A "zoom out" button returns to branch.

## 5. Staging (mirrors spec §8, each shippable)

1. **Stage 1 — lane model + static render (no edges).** §1 extraction, §2 `founded` only,
   `BranchTimeline` placing events on lanes with lane-head logos, resolve unaffiliated default,
   add the view toggle. *Validates layout + data.*
2. **Stage 2 — genealogy edges.** Remaining registry fields + spinout/merge/acquisition/sunset
   béziers. Acquisition softer (dashed/low-opacity). *The actual branching.*
3. **Stage 3 — interaction + bridge.** Pan/zoom or fit-to-width + tap; branch→flat bridge.
4. **Stage 4 — responsive.** Try the portrait orientation flip (time→Y, orgs→columns); fall
   back to top-N org filter reusing the strand-filter UI pattern (spec §7).

**Verify each stage:** build + lint + typecheck, then preview snapshot + screenshots at phone
and desktop widths (PLAN.md mobile-first philosophy).

## 6. Dependency on data expansion (§9)

Branch lanes look broken with one dot each, so this work is paced by the parallel
data-expansion track (breadth across registry orgs). **Sync plan:** expansion runs in a
separate worktree on branch **`feat/data-expansion`**, adding sourced event `.md` files under
`events/`. When that branch is pushed (the user will signal), `git fetch` then merge
`origin/feat/data-expansion` into this branch so we build against the fullest dataset. Stage 1
can proceed against the current 11 events (it validates layout, not richness); Stages 2–4 want
the fuller set, so merge before Stage 2.

## 7. Open decisions to confirm (from spec §10) — my proposed defaults

1. Unaffiliated events → **field ground-line** (behind a flag).
2. Acquisition vs merge → **dashed/softer** for acquisition.
3. Mobile → **orientation flip first**, fall back to org filter.
4. Lane ordering → **topological-by-founding + `laneOrderHint`** overrides.
5. Separate component → **yes, `BranchTimeline.tsx`** (confirmed by the audit above).
6. *New:* split the `google` brand into Brain / DeepMind / Google DeepMind lanes (§2).
