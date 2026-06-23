import type { TimelineEvent } from "../data/types";
import { BRANDS, brandForActors } from "../data/brands";
import type { Brand } from "../data/brands";
import { buildTimeScale } from "./timeScale";
import type { TimeScale } from "./timeScale";
import {
  BRANCH_MIN_GAP,
  BRANCH_FAN_STEP,
  BRANCH_FAN_MAX,
  fanLevelCapped,
} from "./layout";

// Pure layout for the org-genealogy branch view (SPEC-branching-org-genealogy §5):
// y = org lane, x = shared time axis, plus genealogy edges between lanes (§2).

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;
const ageOf = (b: Brand) => BRANDS.indexOf(b); // stable registry order, for tie-breaks

// An event placed on a line, fanned vertically off it when dates cluster (§5,
// mirroring the flat view's DOT_MIN_GAP fanning). `yOffset` is px from the line:
// negative = above, positive = below.
export interface PlacedNode {
  e: TimelineEvent;
  x: number;
  yOffset: number;
}

export interface Lane {
  brand: Brand;
  events: TimelineEvent[]; // this org's events, date-sorted (the full set — the
  //                          flagship filter is applied at render time, §11)
  headDate: string; // ISO; the first event — the lane starts here (its clickable head)
  startX: number; // first-node x (the lane's left terminus)
  endX: number; // line end x: last node, extended to a `becomes`/`dissolved` date
}

/**
 * Fan a date-sorted run of events off a single line: consecutive nodes closer
 * than BRANCH_MIN_GAP in x step alternately above/below so their discs stop
 * overlapping. Returns the placed nodes and the up/down vertical extent. Called
 * at render time on the *visible* subset so it responds to the flagship filter.
 */
export function fanLine(
  events: TimelineEvent[],
  xOf: (e: TimelineEvent) => number,
): { nodes: PlacedNode[]; fanUp: number; fanDown: number } {
  const sorted = [...events].sort((a, b) => xOf(a) - xOf(b));
  const nodes: PlacedNode[] = [];
  let prevX = -Infinity;
  let k = 0;
  let fanUp = 0;
  let fanDown = 0;
  for (const e of sorted) {
    const x = xOf(e);
    k = x - prevX < BRANCH_MIN_GAP ? k + 1 : 0;
    prevX = x;
    const yOffset = fanLevelCapped(k, BRANCH_FAN_MAX) * BRANCH_FAN_STEP;
    if (yOffset < 0) fanUp = Math.max(fanUp, -yOffset);
    else fanDown = Math.max(fanDown, yOffset);
    nodes.push({ e, x, yOffset });
  }
  return { nodes, fanUp, fanDown };
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
  field: TimelineEvent[]; // unaffiliated events (no resolvable org) — the ground-line, date-sorted
}

// How hard each edge pulls its two lanes together when ordering. Births
// (spinout/merge) are the structural backbone, so they pull hardest; the soft
// mid-life/sunset edges (acquisition/absorb) pull less, so they bend rather than
// dominate (§13).
const EDGE_PULL: Record<EdgeKind, number> = {
  merge: 1,
  spinout: 1,
  acquisition: 0.6,
  absorb: 0.6,
};

/**
 * Order lanes vertically to minimise total genealogy-edge span (so spinouts,
 * merges, acquisitions and absorptions stay short and read as local moves).
 * Seeded chronologically by lane head, then refined by a best-reinsertion local
 * search: each lane is lifted out and dropped back at its lowest-cost slot until
 * no move improves. Cost is dominated by weighted edge span; chronological
 * deviation is a pure tie-break (so the dense lane count keeps a sensible
 * left-to-right-in-time feel where ordering is otherwise free). A brand's
 * `laneOrderHint` is a hard manual override applied last (§13).
 */
export function orderLanes(lanes: Lane[], edges: Edge[]): Lane[] {
  if (lanes.length < 3) return lanes;

  const byKey = new Map(lanes.map((l) => [l.brand.key, l]));
  const chrono = [...lanes].sort(
    (a, b) =>
      a.headDate.localeCompare(b.headDate) || ageOf(a.brand) - ageOf(b.brand),
  );
  const chronoRank = new Map(chrono.map((l, i) => [l.brand.key, i]));

  // Connected components (lanes linked by any genealogy edge). The internal
  // order within a component is what the local search optimises; whole
  // components are then placed chronologically (a glued pair the single-move
  // search can't relocate otherwise would drift to an arbitrary slot).
  const adj = new Map<string, string[]>();
  const linkC = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push(b);
  };
  for (const e of edges) {
    linkC(e.fromKey, e.toKey);
    linkC(e.toKey, e.fromKey);
  }
  const comp = new Map<string, number>();
  let cid = 0;
  for (const l of lanes) {
    if (comp.has(l.brand.key)) continue;
    const stack = [l.brand.key];
    comp.set(l.brand.key, cid);
    while (stack.length) {
      const x = stack.pop()!;
      for (const y of adj.get(x) ?? [])
        if (!comp.has(y)) {
          comp.set(y, cid);
          stack.push(y);
        }
    }
    cid++;
  }

  // Cost of an arrangement: weighted edge span (scaled to dominate) plus the
  // chronological deviation as a sub-unit tie-break.
  const cost = (arr: string[]): number => {
    const pos = new Map(arr.map((k, i) => [k, i]));
    let span = 0;
    for (const e of edges) {
      span +=
        EDGE_PULL[e.kind] * Math.abs(pos.get(e.fromKey)! - pos.get(e.toKey)!);
    }
    let chron = 0;
    arr.forEach((k, i) => (chron += Math.abs(i - chronoRank.get(k)!)));
    return span * 1000 + chron;
  };

  let order = chrono.map((l) => l.brand.key);
  for (let pass = 0; pass < 50; pass++) {
    let improved = false;
    for (let i = 0; i < order.length; i++) {
      const k = order[i];
      const without = [...order.slice(0, i), ...order.slice(i + 1)];
      let best = order;
      let bestCost = cost(order);
      for (let j = 0; j <= without.length; j++) {
        const cand = [...without.slice(0, j), k, ...without.slice(j)];
        const c = cost(cand);
        if (c < bestCost) {
          bestCost = c;
          best = cand;
        }
      }
      if (best !== order) {
        order = best;
        improved = true;
      }
    }
    if (!improved) break;
  }

  // Re-arrange whole components chronologically while preserving each one's
  // span-optimal internal order (inter-component edges don't exist, so this
  // can't worsen span — it only fixes a component's vertical placement).
  const compKeys = new Map<number, string[]>();
  for (const k of order) {
    if (!compKeys.has(comp.get(k)!)) compKeys.set(comp.get(k)!, []);
    compKeys.get(comp.get(k)!)!.push(k);
  }
  const minChrono = (keys: string[]) =>
    Math.min(...keys.map((k) => chronoRank.get(k)!));
  order = [...compKeys.values()]
    .sort((a, b) => minChrono(a) - minChrono(b))
    .flat();

  let result = order.map((k) => byKey.get(k)!);
  // Manual override: a lane with `laneOrderHint` is placed by that key, others
  // keep their computed index (both on the same 0..n scale).
  if (result.some((l) => l.brand.laneOrderHint != null)) {
    const idx = new Map(result.map((l, i) => [l.brand.key, i]));
    result = [...result].sort(
      (a, b) =>
        (a.brand.laneOrderHint ?? idx.get(a.brand.key)!) -
        (b.brand.laneOrderHint ?? idx.get(b.brand.key)!),
    );
  }
  return result;
}

/**
 * Assign events to org lanes, order the lanes vertically, derive the genealogy
 * edges from the registry, and collect unaffiliated events for the "field" line.
 */
export function buildBranchLayout(
  events: TimelineEvent[],
  pxPerYear?: number,
): BranchLayout {
  const scale = buildTimeScale(events, pxPerYear);
  const xAt = (iso: string) =>
    clamp(scale.xOfDate(new Date(iso)), 0, scale.trackWidth);

  const byBrand = new Map<string, TimelineEvent[]>();
  const fieldEvents: TimelineEvent[] = [];
  for (const e of events) {
    const brand = brandForActors(e.actors);
    if (!brand) {
      fieldEvents.push(e);
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
    // The lane starts at its first (clickable) node — not a separate `founded`
    // marker, which only duplicated the founding event and occluded its click.
    const headDate = sorted[0].date;
    const startX = scale.xOf(sorted[0]);
    let endX = Math.max(startX, scale.xOf(sorted[sorted.length - 1]));
    const term = brand.becomes?.date ?? brand.dissolved;
    if (term) endX = Math.max(endX, xAt(term)); // extend the line to its merge/sunset
    lanes.push({ brand, events: sorted, headDate, startX, endX });
  }

  const laneKeys = new Set(lanes.map((l) => l.brand.key));
  const startXOf = (k: string) => lanes.find((l) => l.brand.key === k)!.startX;

  const edges: Edge[] = [];
  for (const { brand: b } of lanes) {
    if (b.parents && b.relation) {
      for (const p of b.parents) {
        if (laneKeys.has(p))
          edges.push({
            kind: b.relation,
            fromKey: p,
            toKey: b.key,
            x: startXOf(b.key),
          });
      }
    }
    if (b.acquired && laneKeys.has(b.acquired.by)) {
      edges.push({
        kind: "acquisition",
        fromKey: b.acquired.by,
        toKey: b.key,
        x: xAt(b.acquired.date),
      });
    }
    if (b.becomes && laneKeys.has(b.becomes.into)) {
      const tgt = BRANDS.find((x) => x.key === b.becomes!.into)!;
      const alreadyMerge =
        tgt.relation === "merge" && tgt.parents?.includes(b.key);
      if (!alreadyMerge) {
        edges.push({
          kind: "absorb",
          fromKey: b.key,
          toKey: b.becomes.into,
          x: xAt(b.becomes.date),
        });
      }
    }
  }

  // Drop single-node lanes that aren't part of any genealogy edge — a lone dot
  // reads as noise (user feedback). Their events fall back to the field line, so
  // they're still present, just not promoted to their own lineage. An org in an
  // edge (e.g. Inflection → Microsoft) keeps its lane even with one node.
  const edgeKeys = new Set<string>();
  for (const e of edges) {
    edgeKeys.add(e.fromKey);
    edgeKeys.add(e.toKey);
  }
  const kept: Lane[] = [];
  for (const lane of lanes) {
    if (lane.events.length >= 2 || edgeKeys.has(lane.brand.key))
      kept.push(lane);
    else fieldEvents.push(...lane.events);
  }

  // Vertical order: minimise total genealogy-edge span (§13).
  lanes = orderLanes(kept, edges);

  fieldEvents.sort((a, b) => a.date.localeCompare(b.date));
  return { scale, lanes, edges, field: fieldEvents };
}
