# Spec — Branching View (Org Genealogy) = the Overview Altitude

**Status:** draft, ready to implement after (or alongside) the iconography work.
**Relationship to other specs:**
- This **supersedes §5 ("Overview altitude")** of
  [`SPEC-iconography-overview.md`](SPEC-iconography-overview.md). The overview
  altitude is now the org-genealogy branch view, *not* the density-profile poster.
- It **depends on** the iconography work: org logos label the lanes, and the
  node-icon resolver (`actors[] → brand`) is reused verbatim for lane assignment.
- It is **rewarded by** the data-expansion track: lanes only look alive once each
  has several nodes (see §9).

**One-line goal:** make the timeline read as the *institutional family tree of
modern AI* — multiple lab "lines" that are born (spinouts), converge (mergers),
and end (sunsets) — so a viewer grasps not just *when* things happened but *who
came from whom*.

---

## 1. The decision this spec locks (overview relationship)

The brief left open whether branching *is* the overview or sits beside the
density poster. **Locked: branching is the overview.**

- **Flat scrubber** ([Timeline.tsx](src/components/Timeline.tsx)) stays the
  *focused / mobile-default* reading mode. Iconography Stages A–B live here.
- **Org-genealogy branch view** is the *zoomed-out altitude* — the "see the whole
  shape" entry the iconography spec wanted, now telling a genealogy story.
- The density-profile poster (old §5) is **dropped**; "pace" reads implicitly
  (lane/node proliferation post-2022) and is delivered richly later by the
  phase-2 trends band.

**Cost acknowledged:** a 2D lane chart is a *new render path*, not a scale
transform of the existing track. More work than the poster — accepted for the
distinctiveness and story value. Stages (§8) keep each step shippable.

---

## 2. What a branch means (semantics)

A branch reads as **lineage**. In org mode:

- **Lane = organisation** (one lab/company line). Lane starts at the org's
  founding date, runs to its last event (or to a merge/sunset).
- **Branching topology comes from genealogy edges**, *not* from the lanes merely
  being parallel. The edges are the thing that makes it feel alive:
  - **Spinout** — a new lane forks *off* a parent at its founding.
    *Anthropic ← OpenAI (2021); Mistral ← DeepMind/Meta (2023).*
  - **Merge** — two lanes converge into one new identity.
    *Google Brain + DeepMind → Google DeepMind (2023).*
  - **Acquisition** — a lane is acquired but keeps running (visually softer than a
    merge). *DeepMind ← Google (2014).*
  - **Sunset / absorption** — a lane ends, optionally with an edge to where the
    team went. *Inflection → Microsoft (2024).*

These four edge types are real, sourced, and curate-once (~15 orgs). They are the
genealogy.

---

## 3. Visual idiom

Aim at a **transit/subway map** crossed with a **phylogenetic tree**:

- one **time axis** (still a single history — the lines just run in parallel),
- coloured **lines = orgs**, **stations = events**, **interchanges = merges /
  spinouts**,
- **org logo at each lane head** → the chart self-labels, no legend needed.

This is a recognisable "infographic" language and directly serves "shows me
clearly."

---

## 4. Org / brand registry (extends the iconography registry)

Extend the `Brand` interface from
[`SPEC-iconography-overview.md`](SPEC-iconography-overview.md) §3 with genealogy
metadata (all optional, curate-once):

```ts
export interface Brand {
  key: string;
  label: string;
  aliases: string[];
  icon: string;
  colour?: string;          // lane colour in branch view

  // --- genealogy (this spec) ---
  founded?: string;         // ISO; lane start
  parents?: string[];       // brand keys this spun out of / merged from
  relation?: "spinout" | "merge" | "acquisition";  // edge style to parent(s)
  becomes?: { into: string; date: string };        // merge/absorb target + when
  dissolved?: string;       // ISO; lane end (if not via `becomes`)
  laneOrderHint?: number;   // optional manual nudge for vertical ordering
}
```

Lane start/end come from the **registry**, not from events — so a lane can exist
even before its first event file is written. A founding *event* (e.g.
[openai-founding.md](events/openai-founding.md)) is optional flavour, not the
source of truth.

---

## 5. Layout model

- **x = time** — reuse the existing `scaleTime` / `xOf` helpers from
  [Timeline.tsx](src/components/Timeline.tsx).
- **y = lane**, one per org. **Ordering:** keep spinout children adjacent to
  parents to minimise edge length (a light topological sort seeded by founding
  date, overridable via `laneOrderHint`). Tune during Stage 1.
- **Lane line:** drawn from `founded` → last node (or `becomes.date` /
  `dissolved`).
- **Edges (Stage 2):** béziers between lanes at the relevant date —
  spinout (parent→child at child.founded), merge/acquisition
  (child→target at `becomes.date`). Acquisition is rendered softer (dashed /
  lower opacity) than a full merge.
- **Nodes:** events on their org's lane, using the iconography node model
  (logo/glyph disc + strand ring).
- **Unaffiliated events** (academic papers, policy — no resolvable org): **decide
  in Stage 1.** Default proposal: a persistent **"field" ground-line** at the
  bottom for papers/governance, so they're not lost but don't pollute org lanes.
  Alternative: hide in org mode (they're still in flat mode). Flagged in §10.

### DAG, not tree — controlling spaghetti

Real history is a DAG (Google DeepMind has two parents; Mistral has two). To keep
it legible: **curate the genealogy edges as a near-spanning structure** and treat
any extra cross-influence as optional, dimmed links (or omit). Faithfulness is
deliberately traded for clarity.

---

## 6. Architecture — separate component, shared helpers

Do **not** cram 2D lanes into [Timeline.tsx](src/components/Timeline.tsx) — its
1D centre-playhead/jog-wheel interaction is a poor fit. Instead:

- New `src/components/BranchTimeline.tsx` (or `OverviewTimeline.tsx`) with its own
  layout + interaction (2D pan/zoom or fit-to-width + tap).
- **Shared, extracted** between the two: the `scaleTime`/`xOf` builders, the
  node-icon resolver (`src/components/nodeIcon.*` from the iconography spec), the
  brands registry, eras. Factor these out of `Timeline.tsx` so both consume them.
- **Mode switch** in [Controls.tsx](src/components/Controls.tsx): extend the
  existing `mode` pattern with a view axis, e.g.
  `view: "flat" | "branch-org"` (room for `"branch-lineage"` later — §11). This
  mirrors the existing `TimelineMode` ("date" | "even") precedent.

### Bridge between views

Tapping an org's lane head or an event in branch view → switch to flat scrubber
focused on that org/event (reuse the existing `centerId` / `centerKey` focus
mechanism in [App.tsx](src/App.tsx)). A "zoom out" affordance returns to branch.

---

## 7. Mobile strategy (the hard part)

8–12 horizontal lanes do not fit a portrait phone. Options, **to prototype in
Stage 4**:

1. **Orientation flip (recommended to try first):** on portrait mobile, put
   **time on Y** (vertical scroll — the native phone gesture) and **orgs as
   columns on X**. Subway maps go vertical on mobile for exactly this reason.
2. **Pannable subset:** keep horizontal-time, render top-N orgs by event count,
   reuse the existing strand-filter UI pattern as an **org filter** so the user
   picks lanes; canvas pans in 2D.
3. **Branch = desktop/landscape only**, with flat scrubber as the mobile primary.

Recommendation: try (1); fall back to (2). Decide with real pixels.

---

## 8. Implementation stages (each shippable)

- **Stage 1 — Lane model + static render (no edges).** Extend registry with
  `founded`; extract shared scale/resolver helpers; new `BranchTimeline` placing
  events on org lanes, time-x, logos at lane heads. Resolve the unaffiliated-event
  question. *Validates layout + data.*
- **Stage 2 — Genealogy edges.** spinout / merge / acquisition / sunset edges +
  the registry fields that drive them. *This is the actual "branching."*
- **Stage 3 — Interaction + mode toggle.** view switch in Controls; pan/zoom or
  fit + tap; bridge into the flat scrubber via `centerId`.
- **Stage 4 — Responsive.** mobile orientation flip / org filter (§7).
- **(Parallel) data expansion** — fill lanes so they don't look sparse (§9).

**Verification per stage:** build + lint + typecheck, then preview snapshot +
screenshots at phone and desktop widths; live Pages URL on a phone is the real
test (per PLAN.md design philosophy).

---

## 9. Dependency on data density

A lane with one dot looks broken. Branch view only comes alive when major orgs
have several events each, so prioritise the data-expansion track on **breadth
across the registry orgs** (OpenAI, Anthropic, Google DeepMind, Meta, Mistral,
DeepSeek, …). This is the strongest argument for running data expansion *now*.

---

## 10. Open decisions (carry into implementation)

1. **Unaffiliated events** (papers/policy) in org mode — "field" ground-line vs
   hide vs grouped lane (§5). Default: ground-line.
2. **Acquisition vs merge** visual distinction — dashed/soft vs full convergence
   (§5).
3. **Mobile orientation** — vertical-time flip vs pannable subset (§7).
4. **Lane ordering heuristic** — topological-by-founding vs manual hints (§5).
5. **Separate component vs extend Timeline** — recommended separate (§6); confirm.

---

## 11. Future — idea-lineage mode (the aspirational toggle)

The richest version (branch = research/idea genealogy: Transformer → GPT / BERT /
diffusion …) is deferred. It needs what org mode doesn't:

- **Directed edges** per event (`derives_from: [ids]`) — today `related_ids` is
  undirected and sparse, so this is a real data-model + authoring lift.
- **DAG layout** (ideas have multiple parents) — likely a layout lib (dagre /
  elk) rather than hand-rolled lanes.

Keep `view: "branch-lineage"` reserved in the mode union so the architecture is
ready when the directed-edge data exists.
