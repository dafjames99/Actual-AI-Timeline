# Spec — Iconography + Overview Altitude

**Status:** draft, ready to implement.
**Headline goal:** turn the timeline from a clever *interaction* into a readable
*infographic / primer* — "shows me clearly" at a glance — by (1) giving event
nodes a meaningful visual vocabulary (org logos + event-type glyphs) and (2)
adding an *overview altitude* so a viewer can grasp the whole shape of the field
without scrubbing.

**Out of scope (phase 2, see bottom):** the trends companion band and the
evolving word cloud. This spec is deliberately self-contained around the existing
data + render path so it ships without any new data pipeline.

**Parallel track (not blocked by this spec):** data expansion toward 80–120
sourced events. This spec is designed to *reward* that expansion (more brands,
denser overview) but does not depend on it.

---

## 1. Design problem this solves

Today `color = strand` and every event is an identical 7px dot. That reads as an
abstract scrubber, not a primer. Two upgrades:

1. **Identity per node.** A reader should recognise *who* and *what kind of
   thing* an event is at a glance — OpenAI's mark on the ChatGPT node, a paper
   glyph on "Attention Is All You Need", a gavel on the EU AI Act.
2. **An overview altitude.** The reader should be able to see the *whole shape* —
   eras, density, the post-2022 acceleration — in one view, then drill in.

These reinforce each other: logos only pay off when nodes are big enough to read,
which is exactly what an overview altitude provides.

---

## 2. Node visual model

Replace the single-colour dot with a layered node:

```
        ┌─────────────┐
        │   ╭───────╮  │   ← strand ring  (keeps color = strand encoding)
        │   │ LOGO/ │  │   ← disc: org logo OR event-type glyph
        │   │ GLYPH │  │
        │   ╰───────╯  │
        └─────────────┘
```

- **Ring colour = strand.** This *preserves* the existing strand encoding that
  filtering / dimming / the legend already rely on — nothing downstream breaks.
- **Disc content = identity:**
  - an **org logo** if the event resolves to a known brand (see §3), else
  - an **event-type glyph** derived from the strand (see §4).
- **Selected / active / dimmed states** keep their current meaning, restyled for
  the new node (selected = thicker ring + halo; dimmed = low opacity; active =
  enlarged + label card).

### Size states (resolves the "logo on a 7px dot" problem)

Logos are illegible at scrubber-dot size, so reveal them progressively:

| Context | Node size | Disc content |
|---|---|---|
| Resting dot (scrubbing) | ~14px | strand-colour fill only (as today) |
| **Active** node (nearest centre) | ~32px | logo / glyph + strand ring |
| Title card (already pops up) | — | logo + org name shown prominently |
| **Overview** altitude (§5) | logo-sized | logo / glyph for landmark events |

This is graceful and incremental: Stage A delivers the active-node + title-card
logo with **zero layout change**; the overview altitude (Stage C) is where logos
become pervasive.

---

## 3. Brand registry (org logos)

Most events already name their owner in `actors` (e.g. `actors: [OpenAI]`).
Derive the logo from that — no new required frontmatter field.

New file `src/data/brands.ts`:

```ts
export interface Brand {
  key: string;        // "openai"
  label: string;      // "OpenAI"
  aliases: string[];  // actor strings that map here, e.g. ["OpenAI"]
  icon: string;       // asset/icon ref (see §6)
  colour?: string;    // optional brand accent (NOT used for the strand ring)
}
```

**Resolution order for a node's disc:**
1. explicit `icon:` override in the event frontmatter (escape hatch), else
2. first `actors[]` entry that matches a brand alias → that brand's logo, else
3. the strand's event-type glyph (§4).

Starter registry (extend as data grows): OpenAI, Google / Google DeepMind /
Google Brain, Anthropic, Meta (FAIR), Microsoft, NVIDIA, Hugging Face,
Stability AI, Mistral, Cohere, DeepSeek, Alibaba (Qwen), Baidu (ERNIE),
EU / EU Commission. Universities and one-off actors fall through to glyphs by
design — that's correct, not a gap.

---

## 4. Event-type glyph vocabulary (fallback + non-corporate)

When there's no brand, the **strand** already implies a type, so derive a glyph
from it. Proposed mapping (icons from `lucide-react` — MIT, tree-shakeable):

| Strand | Glyph (lucide) | Reads as |
|---|---|---|
| research | `FileText` / `ScrollText` | a paper |
| labs | `Sparkles` / `BrainCircuit` | a model release |
| products | `AppWindow` / `MousePointerClick` | a shipped product |
| oss | `GitBranch` / `Code` | open source / tooling |
| governance | `Scale` / `Gavel` | policy / law |
| corporate | `Building2` / `Handshake` | company / deal |
| infrastructure | `Cpu` / `Server` | hardware / infra |

(Final icon picks to be eyeballed during Stage B.) An optional `icon:` override
in frontmatter handles the rare event whose strand glyph is misleading.

---

## 5. Overview altitude — *SUPERSEDED*

> **Update:** the overview altitude is now the **org-genealogy branch view** —
> see [`SPEC-branching-org-genealogy.md`](SPEC-branching-org-genealogy.md). The
> density-profile poster described below is **dropped**; it's kept here only for
> the reasoning trail. Iconography Stages A–B (the node model) are unaffected and
> still stand — they feed the lane labelling in the branch spec.

The brief left the altitude identity ("overview-first poster" vs
"scrubber-first") to be decided here. **Reality check that drives the
recommendation:** at phone width (~380px), fitting ~20 years × 80–120 events into
one view is a ~0.15× scale — logos would be unreadable and nodes would collide
into mush. So a single "fit everything with logos" view is not viable on mobile.

**Recommendation: a two-tier zoom, built as a *zoom state of the existing track*
(not a parallel render path).**

- **Macro (whole timeline) — the "poster":**
  era bands emphasised + a **density profile** (events-per-year as a faint
  area/bar under the track) + **landmark logos only** (the few most significant
  events; everything else is a tick/dot). This conveys *shape, eras and
  acceleration* at a glance — the infographic payoff — without pretending to show
  120 legible logos. Note: this density profile shares the time axis and is the
  literal substrate the phase-2 trends band will slot into. Forward-compatible by
  construction.
- **Focused (current scrubber):** unchanged, now with logos on the active node.
- **Bridge:** tap an era band (macro) → animate into the scrubber focused on that
  era's first event. A toggle / "zoom out" affordance returns to macro.

**Why this over a from-scratch poster:** it reuses all existing geometry — the
macro view is the same `translateX` track with an added scale factor and a
swapped emphasis (bands up, dots down, landmarks logoed). One rendering path,
much lower risk, and it still delivers "see the whole shape."

**On overview-first vs scrubber-first:** ship overview as a *reachable zoom
state* first (Stage C). If it lands well, promoting it to the **default landing
view** is essentially a one-line default change — so we get the data to make that
call instead of guessing now. Recommended: **scrubber-first in Stage C, revisit
promoting overview to default once it's real.**

**Landmark selection** needs a notion of importance. Add optional frontmatter
`landmark: true` (default false). Macro altitude shows logos for landmarks only;
a sensible fallback if none are tagged is "one per era" or top-N by a future
weight. Keep it optional so data expansion isn't gated on it.

---

## 6. Assets & licensing (flagged decision)

- **Brand marks:** prefer monochrome **SVG** so they tint against the
  ink-on-paper palette. Candidate source: Simple Icons (large brand-mark set) or
  self-hosted SVGs under `src/assets/brands/`. Inline-SVG / icon component for
  theming + tree-shaking.
- **Generic glyphs:** `lucide-react` (MIT) — already React-friendly, no asset
  pipeline.
- **Trademark note (assumption to confirm):** using company logos in an
  educational/editorial infographic is generally defensible nominative use, but
  it *is* a judgement call. Default plan: use recognisable marks for brands,
  self-evident generic glyphs elsewhere, and keep an easy switch to "glyph-only"
  if you'd rather avoid logos entirely. **Confirm before we ship logos.**

---

## 7. Data-model / schema changes

Minimal and backwards-compatible (all optional):

- `src/data/types.ts`: add `icon?: string` (brand/glyph override) and
  `landmark?: boolean`.
- `src/data/getAllEvents.ts`: parse the two optional fields (keep the loader
  boundary — nothing else reads files).
- `src/data/brands.ts`: **new** — the brand registry (§3).
- New render helper, e.g. `src/components/nodeIcon.ts(x)`: pure resolver
  `(event) → { kind: "brand" | "glyph", ref, brand? }` so `Timeline.tsx` stays
  readable and the logic is unit-testable.
- Frontmatter additions are optional; existing 11 event files keep working
  untouched.

---

## 8. Implementation stages (each independently shippable)

- **Stage A — Node icon system, no layout change.**
  Brand registry + resolver + render the logo/glyph on the **active** node and in
  the **title card**; strand becomes the **ring**. Pure visible win, low risk.
- **Stage B — Glyph vocabulary + state polish.**
  Finalise the per-strand glyph set; ensure selected / dimmed / filtered / fanned
  states all still read with the new node; accessibility (`aria-label` already
  carries title+date — keep it).
- **Stage C — Macro overview altitude.**
  Zoom-out state: scaled fit-to-width track, era bands emphasised, density
  profile, landmark logos, tap-era-to-focus, toggle back. Then decide whether to
  promote it to the default landing view.
- **Stage D — Data expansion (parallel/ongoing).**
  Grow toward 80–120 sourced events; backfill `actors` so brand resolution lands;
  tag `landmark:` on the anchors. Feeds, doesn't block, A–C.

**Verification per stage:** `npm run build` + lint + typecheck, then the preview
tools (snapshot + screenshot at phone and desktop widths; check console). The
live GitHub Pages URL on a phone remains the real visual test (per PLAN.md design
philosophy).

---

## 9. Open decisions (carry into implementation)

1. **Logos vs glyph-only** — confirm we're comfortable shipping brand marks (§6).
2. **Landmark tagging** — explicit `landmark:` vs derived top-N (§5). Default:
   explicit, optional.
3. **Overview as default landing** — defer until Stage C is real (§5).
4. **Icon source** — Simple Icons vs self-hosted SVG set for brands (§6).

---

## 10. Phase 2 (explicitly deferred, noted for forward-compat)

- **Trends companion band** — shared-`scaleTime` public-attention curve under the
  track. Best data source: **Wikipedia Pageviews API** (official, free, per-
  article daily counts back to mid-2015) over Google Trends (no official API;
  `pytrends` is unofficial + returns relative indices). Bake to static JSON via a
  Python/`uv` pipeline. The Stage C density profile is its substrate.
- **Evolving word cloud** — AI vocabulary over time from arXiv abstract term
  frequency (free, on-theme) or Google Books Ngrams (to 2019), driven by the
  scrub position. Most ambitious; own page or shared jog-wheel.
