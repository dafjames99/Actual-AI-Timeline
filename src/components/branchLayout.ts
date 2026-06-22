import type { TimelineEvent } from "../data/types";
import { BRANDS, brandForActors } from "../data/brands";
import type { Brand } from "../data/brands";
import { buildTimeScale } from "./timeScale";
import type { TimeScale } from "./timeScale";

// Pure layout for the org-genealogy branch view (SPEC-branching-org-genealogy §5):
// y = org lane, x = shared time axis, plus genealogy edges between lanes (§2).

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const ageOf = (b: Brand) => BRANDS.indexOf(b); // stable registry order, for tie-breaks

export interface Lane {
  brand: Brand;
  events: TimelineEvent[]; // this org's events, date-sorted
  headDate: string; // ISO; `founded`, else earliest event
  startX: number; // lane-head x (clamped into the track)
  endX: number; // line end x: last node, extended to a `becomes`/`dissolved` date
}

// A genealogy connection drawn between two lanes at a single date-x (§2).
//   spinout/merge → drawn at the child/merged lane's birth x
//   acquisition   → soft edge at the mid-life acquisition date
//   absorb        → soft edge where a sunsetting lane's team lands
export type EdgeKind = "spinout" | "merge" | "acquisition" | "absorb";
export interface Edge {
  kind: EdgeKind;
  fromKey: string; // parent / acquirer / dissolving source lane
  toKey: string; // child / merged / absorbing target lane
  x: number;
}

export interface BranchLayout {
  scale: TimeScale;
  lanes: Lane[]; // vertically ordered, top → bottom
  edges: Edge[];
  field: TimelineEvent[]; // unaffiliated events (no resolvable org) — the ground-line
}

/**
 * Assign events to org lanes, order the lanes vertically, derive the genealogy
 * edges from the registry, and collect unaffiliated events for the "field" line.
 */
export function buildBranchLayout(events: TimelineEvent[]): BranchLayout {
  const scale = buildTimeScale(events);
  const xAt = (iso: string) => clamp(scale.xOfDate(new Date(iso)), 0, scale.trackWidth);

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

  let lanes: Lane[] = [];
  for (const [key, evs] of byBrand) {
    const brand = BRANDS.find((b) => b.key === key)!;
    const sorted = [...evs].sort((a, b) => a.date.localeCompare(b.date));
    const headDate = brand.founded ?? sorted[0].date;
    const startX = xAt(headDate);
    let endX = Math.max(startX, scale.xOf(sorted[sorted.length - 1]));
    const term = brand.becomes?.date ?? brand.dissolved;
    if (term) endX = Math.max(endX, xAt(term)); // extend the line to its merge/sunset
    lanes.push({ brand, events: sorted, headDate, startX, endX });
  }

  // Base order: chronological by lane head, registry order as tie-break.
  lanes.sort(
    (a, b) => a.headDate.localeCompare(b.headDate) || ageOf(a.brand) - ageOf(b.brand),
  );

  // Cluster merges: pull a merged lane and its parents adjacent so the
  // convergence reads as one interchange rather than long crossing edges (§5).
  // Spinout/absorb stay in chronological position (their edges tolerate length).
  const has = (k: string) => lanes.some((l) => l.brand.key === k);
  for (const child of lanes.filter((l) => l.brand.relation === "merge" && l.brand.parents)) {
    const parents = child.brand.parents!.filter(has).map((k) => lanes.find((l) => l.brand.key === k)!);
    if (!parents.length) continue;
    const group = [...parents, child];
    const at = Math.min(...group.map((l) => lanes.indexOf(l)));
    lanes = lanes.filter((l) => !group.includes(l));
    lanes.splice(at, 0, ...group);
  }

  const laneKeys = new Set(lanes.map((l) => l.brand.key));
  const startXOf = (k: string) => lanes.find((l) => l.brand.key === k)!.startX;

  const edges: Edge[] = [];
  for (const { brand: b } of lanes) {
    if (b.parents && b.relation) {
      for (const p of b.parents) {
        if (laneKeys.has(p)) edges.push({ kind: b.relation, fromKey: p, toKey: b.key, x: startXOf(b.key) });
      }
    }
    if (b.acquired && laneKeys.has(b.acquired.by)) {
      edges.push({ kind: "acquisition", fromKey: b.acquired.by, toKey: b.key, x: xAt(b.acquired.date) });
    }
    if (b.becomes && laneKeys.has(b.becomes.into)) {
      const tgt = BRANDS.find((x) => x.key === b.becomes!.into)!;
      const alreadyMerge = tgt.relation === "merge" && tgt.parents?.includes(b.key);
      if (!alreadyMerge) {
        edges.push({ kind: "absorb", fromKey: b.key, toKey: b.becomes.into, x: xAt(b.becomes.date) });
      }
    }
  }

  field.sort((a, b) => a.date.localeCompare(b.date));
  return { scale, lanes, edges, field };
}
