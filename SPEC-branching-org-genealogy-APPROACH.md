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
2. **Stage 2 — genealogy edges.** ✅ *Done.* See "Stage 2 — as built" below.
3. **Stage 3 — interaction + bridge.** ✅ *Done.* See "Stage 3 — as built" below.
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

## 8. Stage 2 — as built

**Registry ([brands.ts](src/data/brands.ts)).** `google` split into `google` (generic) /
`google-brain` / `deepmind` / `google-deepmind`; added `xai` and `inflection` (no
simple-icons mark → lettered fallback disc at the lane head). Edges encoded:
- spinout: Anthropic ← OpenAI; Mistral ← DeepMind + Meta
- merge: Google DeepMind ← Google Brain + DeepMind (2023-04)
- acquisition: DeepMind ← Google (2014, mid-life)
- absorb: Inflection → Microsoft (2024)

**Model extension.** Added `acquired?: { by; date }` beyond the spec's §4 model. The spec only
expresses birth (`parents`/`relation`) and death (`becomes`/`dissolved`); DeepMind kept running
after Google acquired it in 2014, a *mid-life* edge neither field could date correctly.
`relation` narrowed to `"spinout" | "merge"` (acquisition is no longer a birth relation).

**Edge derivation ([branchLayout.ts](src/components/branchLayout.ts)).** Edges are computed
from the registry, each attached at a single date-x: births at the child/merged lane's
`founded`, acquisition at its date, absorption at `becomes.date`. An `absorb` edge is
suppressed when the target already claims the source as a merge parent (avoids drawing the
Google merge twice). Lane lines extend to their `becomes`/`dissolved` date so they reach the
convergence point.

**Lane ordering.** Base order is chronological by lane head; a **merge-only** clustering pass
pulls a merged lane and its parents adjacent (so the Google interchange is tight) — spinout/
absorb edges tolerate longer spans and are left in chronological position to avoid tangling
multi-parent cases (e.g. Mistral). `laneOrderHint` remains available for manual nudges.

**Rendering ([BranchTimeline.tsx](src/components/BranchTimeline.tsx)).** A single SVG layer
behind the nodes draws lazy-S béziers; births solid, acquisition/absorption dashed + lower
opacity (open-decision #2). A small dot marks each edge's source tap.

## 9. Post-Stage-2 refinements (user feedback)

- **Lane heads unified with the founding node.** The separate logo lane-head disc was removed:
  it duplicated the founding event node, occluded its click (a "dud"), and could sit offset
  when the registry `founded` date disagreed with the founding event's date. Lanes now start at
  their first event, which is the clickable head; the org label sits above it. `founded` no
  longer drives geometry (kept as metadata / future fallback).
- **Single-node lanes dropped unless they carry an edge.** A lone dot reads as noise, so an org
  needs ≥2 events *or* participation in a genealogy edge to get a lane; otherwise its events
  fall to the field line (relabelled "papers, policy & tooling"). With current data this demotes
  Hugging Face and xAI; Inflection keeps its lane for the Microsoft sunset edge.
- **Edges are quiet by default, loud on focus.** All edges rest at low opacity; hovering or
  selecting a lane lights up just that org's lineage and mutes the rest — edges inform on demand
  instead of cluttering. This is the interaction-gating that the full Stage 3 bridge builds on.

**Remaining caveat (Stage 3+ polish):** ~~same-lane node overlap when dates cluster~~ — resolved in
§11 (node fanning).

## 10. Stage 3 — as built

**Branch→flat bridge.** Decided (user): a node click in branch view keeps the Stage-2 behaviour
(opens the detail panel + lights the org's lineage) — it does *not* auto-jump. Instead the
[EventPanel](src/components/EventPanel.tsx) grows a **"Show on timeline →"** button, rendered only
when an `onShowOnTimeline` handler is passed. [App](src/App.tsx) passes it solely in a branch view
(`view !== "flat"`), so the button is absent in flat view (verified). The handler is
`setView("flat") + select(id) + focus(id)`: the flat `Timeline` then centres on the event via its
existing init-centre path ([Timeline.tsx:228](src/components/Timeline.tsx)) on mount and the
`centerId`/`centerKey` scrub. Returning to the overview is the existing View toggle (no separate
"zoom out" button needed). Deep-link `?event=` updates as normal.

**Branch zoom.** Decided (user): stepped **+ / − zoom controls** (not fit-to-width). `buildTimeScale`
and `buildBranchLayout` now take an optional `pxPerYear`; [BranchTimeline](src/components/BranchTimeline.tsx)
holds a `zoom` multiplier (×`PX_PER_YEAR`, clamped 0.45–3, step 1.3) and recomputes the layout. Only
the x (time) axis stretches — discs stay a fixed pixel size. A floating top-right control shows
`−  NN%  +`; clicking the percentage resets to 100%. Zoom **preserves the viewport-centre point**:
the centred content-fraction is captured before the scale change and the matching `scrollLeft`
restored in a `useLayoutEffect` after the new track lays out. Pan remains native scroll.

Verified: build + lint + typecheck clean; preview at desktop and 390px phone width — zoom in/out
(focal point held), the bridge round-trip (CUDA node → flat view scrubbed to Jun 2007), and the
button's absence in flat view all confirmed; no console errors.

## 11. Stage 3 — density & vertical-fit refinements (user feedback)

After Stage 3 landed, the full dataset (104 events → 13 lanes + a large field line) read as too
dense and too tall. Three fixes:

- **Node fanning (the deferred §8 caveat, now done).** `fanLevel` moved to [layout.ts](src/components/layout.ts)
  (shared with the flat view, no duplication) plus `BRANCH_MIN_GAP`/`BRANCH_FAN_STEP`/`BRANCH_FAN_MAX`.
  [branchLayout.ts](src/components/branchLayout.ts) gained a pure `fanLine()` that fans any date-sorted
  run (each lane *and* the field line): consecutive nodes closer than `BRANCH_MIN_GAP` in x step
  alternately above/below (`±22px`/level) so discs stop overlapping. Each `Lane` now carries `nodes`
  (x-sorted with `yOffset`) plus `fanUp`/`fanDown` extents. Because fan x-gaps are measured at the
  *zoomed* scale, fanning recomputes with zoom. The fan saturates at `±BRANCH_FAN_MAX` (3) levels so a
  very dense cluster — or a zoomed-*out* overview, where everything bunches — can't blow lane height
  open (zoom-out content height dropped 1536→1272px after the cap).
- **Variable-height lanes + left labels (vertical fit).** Fixed `ROW_H` replaced by cumulative
  stacking: each lane reserves only `NODE_R + fan` room, so sparse lanes stay compact and only dense
  lanes grow. Org labels moved from *above* the head node to the *left* of it (right-anchored, on the
  lane line), removing the per-lane caption row that previously forced ~72px pitch regardless of
  density.
- **Sticky year axis + bounded stage.** The date ruler is now a `position: sticky; bottom: 0` strip
  inside the scroll container — always visible no matter how tall the stack gets, while still panning
  horizontally with the track. The stage is capped at `78vh` so it never dominates the page; overflow
  is internal scroll.

## 12. Flagship filter (user's #2 — built)

Even compressed, 13 lanes + the field overflow one screen at 100% with all 104 events. The fix is a
"main events only, expand from there" filter. Decided (user): a **curated flag**, with a **global
toggle + per-lane expand**.

- **Data.** Added optional `flagship?: boolean` to [TimelineEvent](src/data/types.ts), parsed in
  [getAllEvents](src/data/getAllEvents.ts) (`data.flagship === true`). **32 landmark events** tagged
  `flagship: true` in their frontmatter — curated so every lane keeps coverage in flagship mode
  (foundations, each lab's defining models, the merge/sunset structural events, key research / infra /
  governance milestones). Flat view ignores the flag entirely.
- **Filter is render-time, structure is stable.** `buildBranchLayout` now derives lanes/edges/field
  membership and line extents from the **full** set (so the genealogy never reshapes with the filter);
  `fanLine` is exported and re-run on the **visible** subset by a pure `layoutGeometry()` in
  [BranchTimeline](src/components/BranchTimeline.tsx), which fans each lane/field on what's shown and
  stacks variable heights accordingly.
- **UX.** `flagshipOnly` lives in [App](src/App.tsx), **defaults on** for the lineage overview, and
  has a "Show: Flagship / All events" segmented control in [Controls](src/components/Controls.tsx)
  (branch-only, mirroring the flat-only Spacing control). Each lane's left label doubles as the
  expand control — a `+N` badge (collapsed) / `− less` (expanded) toggles a per-lane override held in
  `BranchTimeline` (persists across flagship on/off). The field line's label expands the field the
  same way.

Verified: flagship default shows 32 nodes (content 1074→726px, ≈ fits a laptop stage); per-lane
expand (OpenAI 32→51) and collapse; "All events" → 104 with no badges; toggle round-trips; build +
lint + typecheck clean; no console errors.

## 13. Lane ordering — edge-span minimisation (user feedback)

The chronological-seed + merge-only clustering left spinout/acquisition/absorb edges long: worst was
Mistral, whose spinout parents (DeepMind, Meta) sat **9 and 7 rows away**. Replaced with a proper
`orderLanes()` ([branchLayout.ts](src/components/branchLayout.ts)) that minimises **total weighted
edge span**:

1. Edges are weighted by kind via `EDGE_PULL` — births (spinout/merge) pull at 1, soft mid-life/
   sunset edges (acquisition/absorb) at 0.6 so they bend rather than dominate.
2. **Best-reinsertion local search**: seeded chronologically by lane head, each lane is lifted out
   and reinserted at its lowest-cost slot until no move improves. Cost = weighted span (×1000) +
   chronological deviation (sub-unit tie-break, so free orderings keep a time feel).
3. **Components placed chronologically.** Connected components are ordered internally by the search,
   then whole components are sorted by their earliest member — otherwise a glued pair the single-move
   search can't relocate (Microsoft↔Inflection) drifts to an arbitrary slot.
4. `laneOrderHint` (registry) remains a hard manual override applied last, for any case the optimiser
   doesn't arrange to taste.

Result: total weighted span **11 → 7.2**; every edge now spans ≤2 rows. Order top→bottom: NVIDIA ·
Google Brain · Google DeepMind · Google · DeepMind · Mistral · Meta · OpenAI · Anthropic · Microsoft
· Inflection · LangChain · DeepSeek — i.e. DeepMind·Mistral·Meta, OpenAI·Anthropic and
Microsoft·Inflection all adjacent, the Google cluster tight, read chronologically. (The optimiser
keeps Google *between* GDM and DeepMind rather than GDM between DeepMind and Google, because sharing
DeepMind with the tighter Mistral spinout makes that the lower-span choice; a `laneOrderHint` can
force the alternative if preferred.)
