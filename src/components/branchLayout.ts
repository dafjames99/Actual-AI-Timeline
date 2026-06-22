import type { TimelineEvent } from "../data/types";
import { BRANDS, brandForActors } from "../data/brands";
import type { Brand } from "../data/brands";
import { buildTimeScale } from "./timeScale";
import type { TimeScale } from "./timeScale";

// Pure layout for the org-genealogy branch view (SPEC-branching-org-genealogy §5):
// y = org lane, x = shared time axis. Stage 1 = lanes + nodes only (no edges).

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

const ageOf = (b: Brand) => BRANDS.indexOf(b); // stable registry order, for tie-breaks

export interface Lane {
  brand: Brand;
  events: TimelineEvent[]; // this org's events, date-sorted
  headDate: string; // ISO; `founded`, else earliest event
  startX: number; // lane-head x (clamped into the track)
  endX: number; // last node x (Stage 2: or `becomes`/`dissolved`)
}

export interface BranchLayout {
  scale: TimeScale;
  lanes: Lane[]; // vertically ordered, top → bottom
  field: TimelineEvent[]; // unaffiliated events (no resolvable org) — the ground-line
}

/**
 * Assign events to org lanes via the icon resolver's brand mapping, order the
 * lanes vertically, and collect unaffiliated events for the "field" ground-line.
 *
 * Stage 1 ordering: by lane-head date ascending (born-earlier sits higher), with
 * `laneOrderHint` as an override and registry order as the final tie-break. The
 * spinout-adjacency topological pass arrives with edges in Stage 2.
 */
export function buildBranchLayout(events: TimelineEvent[]): BranchLayout {
  const scale = buildTimeScale(events);

  const byBrand = new Map<string, TimelineEvent[]>();
  const field: TimelineEvent[] = [];
  for (const e of events) {
    const brand = brandForActors(e.actors);
    if (!brand) {
      field.push(e);
      continue;
    }
    const list = byBrand.get(brand.key);
    if (list) list.push(e);
    else byBrand.set(brand.key, [e]);
  }

  const lanes: Lane[] = [];
  for (const [key, evs] of byBrand) {
    const brand = BRANDS.find((b) => b.key === key)!;
    const sorted = [...evs].sort((a, b) => a.date.localeCompare(b.date));
    const headDate = brand.founded ?? sorted[0].date;
    const startX = clamp(scale.xOfDate(new Date(headDate)), 0, scale.trackWidth);
    const lastX = scale.xOf(sorted[sorted.length - 1]);
    lanes.push({ brand, events: sorted, headDate, startX, endX: Math.max(startX, lastX) });
  }

  lanes.sort((a, b) => {
    const ha = a.brand.laneOrderHint;
    const hb = b.brand.laneOrderHint;
    if (ha !== undefined || hb !== undefined) {
      return (ha ?? Number.POSITIVE_INFINITY) - (hb ?? Number.POSITIVE_INFINITY);
    }
    return a.headDate.localeCompare(b.headDate) || ageOf(a.brand) - ageOf(b.brand);
  });

  field.sort((a, b) => a.date.localeCompare(b.date));
  return { scale, lanes, field };
}
