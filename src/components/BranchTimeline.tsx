import { useMemo, useState } from "react";
import type { StrandKey, TimelineEvent } from "../data/types";
import { STRANDS } from "../data/strands";
import { buildBranchLayout } from "./branchLayout";
import type { EdgeKind } from "./branchLayout";
import { NodeIcon } from "./NodeIcon";
import { ICON_GLYPH } from "./layout";

// Org-genealogy branch view — the "overview altitude" (SPEC-branching-org-genealogy).
// x = shared time axis, y = one lane per org, plus a "field" ground-line for
// events with no lab-lineage org. Genealogy edges (SVG béziers) connect the lanes
// but stay quiet until a lane is hovered/selected, so they inform on demand rather
// than clutter. DOM-positioned nodes (like Timeline) over the edge SVG.

const EDGE_DIM = 0.14; // resting opacity for edges when nothing is focused
const EDGE_MUTED = 0.05; // opacity for edges outside the focused lineage

const ROW_H = 72; // px height of one org lane
const PAD_TOP = 36; // px above the first lane
const FIELD_GAP = 28; // gap between the last lane and the field ground-line
const AXIS_H = 34; // year-axis strip at the bottom
const NODE_R = 16; // event-disc radius (matches flat view's active node)
const LANE_MIN_W = 2 * NODE_R; // a one-node lane still draws a visible stub

interface BranchTimelineProps {
  events: TimelineEvent[];
  visibleStrands: Set<StrandKey>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  matchedIds: Set<string>;
  filterActive: boolean;
}

// Edge styling by genealogy type — births solid, acquisition/absorption softer
// and dashed (SPEC-branching-org-genealogy §5, open-decision #2).
const EDGE_STYLE: Record<EdgeKind, { width: number; opacity: number; dash?: string }> = {
  merge: { width: 2.5, opacity: 0.65 },
  spinout: { width: 2, opacity: 0.5 },
  acquisition: { width: 1.75, opacity: 0.32, dash: "5 4" },
  absorb: { width: 1.75, opacity: 0.32, dash: "5 4" },
};

/** A lazy-S connector that leaves and arrives tangent to the horizontal lanes. */
function edgePath(x: number, y1: number, y2: number): string {
  const k = Math.min(30, Math.max(12, Math.abs(y2 - y1) * 0.28));
  return `M ${x},${y1} C ${x + k},${y1} ${x - k},${y2} ${x},${y2}`;
}

export default function BranchTimeline({
  events,
  visibleStrands,
  selectedId,
  onSelect,
  matchedIds,
  filterActive,
}: BranchTimelineProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const layout = useMemo(() => (events.length ? buildBranchLayout(events) : null), [events]);

  // The lane (org) whose lineage should light up: a hovered lane wins, else the
  // lane that owns the selected event.
  const selectedKey = useMemo(
    () => layout?.lanes.find((l) => l.events.some((e) => e.id === selectedId))?.brand.key ?? null,
    [layout, selectedId],
  );
  const activeKey = hovered ?? selectedKey;

  if (!layout) {
    return (
      <div className="rounded-lg border border-ink bg-panel p-6 text-muted">No events to show.</div>
    );
  }

  const { scale, lanes, edges, field } = layout;
  const laneY = (i: number) => PAD_TOP + i * ROW_H + ROW_H / 2;
  const rowOf = new Map(lanes.map((l, i) => [l.brand.key, i]));
  const lanesBottom = PAD_TOP + lanes.length * ROW_H;
  const fieldY = lanesBottom + FIELD_GAP + 20;
  const axisY = fieldY + 36;
  const contentHeight = axisY + AXIS_H;

  // A single event disc — strand-ringed logo/glyph; shared by lanes and the field.
  const renderNode = (e: TimelineEvent, cy: number, laneKey?: string) => {
    if (!visibleStrands.has(e.strand)) return null;
    const strand = STRANDS[e.strand];
    const selected = e.id === selectedId;
    const dimmed = filterActive && !matchedIds.has(e.id);
    return (
      <button
        key={e.id}
        type="button"
        aria-label={`${e.title}, ${e.date}`}
        onClick={() => onSelect(e.id)}
        onMouseEnter={() => setHovered(laneKey ?? null)}
        onMouseLeave={() => setHovered(null)}
        title={e.title}
        className="absolute z-[1] flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full"
        style={{
          left: scale.xOf(e),
          top: cy,
          width: NODE_R * 2,
          height: NODE_R * 2,
          backgroundColor: "var(--color-panel)",
          border: `2.5px solid ${strand.colour}`,
          opacity: dimmed ? 0.25 : 1,
          boxShadow: selected
            ? `0 0 0 3px var(--color-panel), 0 0 0 5px ${strand.colour}`
            : "0 1px 3px rgba(33,28,21,0.18)",
        }}
      >
        <NodeIcon event={e} size={ICON_GLYPH} />
      </button>
    );
  };

  return (
    <div className="overflow-auto rounded-lg border border-ink bg-panel">
      <div className="relative" style={{ width: scale.trackWidth, height: contentHeight }}>
        {/* Faint per-year vertical gridlines tie dates across all lanes together. */}
        {scale.ticks.map((t, i) => (
          <div
            key={`grid-${t.label}-${i}`}
            className="absolute top-0 w-px bg-hairline"
            style={{ left: t.x, height: axisY }}
          />
        ))}

        {/* Genealogy edges — drawn behind the lanes/nodes (SPEC §2). */}
        <svg
          className="pointer-events-none absolute left-0 top-0"
          width={scale.trackWidth}
          height={contentHeight}
          fill="none"
          stroke="var(--color-ink)"
        >
          {edges.map((e, i) => {
            const r1 = rowOf.get(e.fromKey);
            const r2 = rowOf.get(e.toKey);
            if (r1 === undefined || r2 === undefined) return null;
            const y1 = laneY(r1);
            const y2 = laneY(r2);
            const s = EDGE_STYLE[e.kind];
            const inLineage = e.fromKey === activeKey || e.toKey === activeKey;
            const opacity = activeKey ? (inLineage ? s.opacity : EDGE_MUTED) : EDGE_DIM;
            return (
              <g key={`edge-${i}`} opacity={opacity}>
                <path d={edgePath(e.x, y1, y2)} strokeWidth={s.width} strokeDasharray={s.dash} />
                <circle cx={e.x} cy={y1} r={2.5} fill="var(--color-ink)" stroke="none" />
              </g>
            );
          })}
        </svg>

        {/* Org lanes */}
        {lanes.map((lane, i) => {
          const y = laneY(i);
          const width = Math.max(LANE_MIN_W, lane.endX - lane.startX);
          return (
            <div key={lane.brand.key}>
              {/* lane line */}
              <div
                className="absolute rounded-full bg-edge"
                style={{ left: lane.startX, top: y - 1.5, width, height: 3 }}
              />
              {/* org label, above the lane's first (head) node */}
              <div
                className="absolute z-[2] whitespace-nowrap font-label text-[11px] font-semibold uppercase tracking-[0.1em] text-secondary"
                style={{ left: lane.startX - NODE_R, top: y - NODE_R - 19 }}
              >
                {lane.brand.label}
              </div>
              {/* events — the first one is the clickable lane head */}
              {lane.events.map((e) => renderNode(e, y, lane.brand.key))}
            </div>
          );
        })}

        {/* "Field" ground-line — events without a lab-lineage lane: papers, policy,
            and tooling/sparse orgs demoted from their own lane (SPEC §5). */}
        {field.length > 0 && (
          <>
            <div
              className="absolute border-t border-dashed border-edge"
              style={{ left: 0, top: fieldY, width: scale.trackWidth }}
            />
            <div
              className="absolute z-[2] font-label text-[11px] font-semibold uppercase tracking-[0.1em] text-muted"
              style={{ left: 8, top: fieldY - 22 }}
            >
              The field · papers, policy & tooling
            </div>
            {field.map((e) => renderNode(e, fieldY))}
          </>
        )}

        {/* Year axis */}
        {scale.ticks.map((t, i) => (
          <div
            key={`axis-${t.label}-${i}`}
            className="absolute -translate-x-1/2 text-center"
            style={{ left: t.x, top: axisY }}
          >
            <div className="mx-auto h-2 w-px bg-edge" />
            <div className="mt-1 font-mono text-[10px] text-muted">{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
