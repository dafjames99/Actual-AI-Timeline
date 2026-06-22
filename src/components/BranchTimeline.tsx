import { useMemo } from "react";
import type { StrandKey, TimelineEvent } from "../data/types";
import type { Brand } from "../data/brands";
import { STRANDS } from "../data/strands";
import { buildBranchLayout } from "./branchLayout";
import type { EdgeKind } from "./branchLayout";
import { NodeIcon } from "./NodeIcon";
import { ICON_GLYPH } from "./layout";

// Org-genealogy branch view — the "overview altitude" (SPEC-branching-org-genealogy).
// Stage 1: static lanes + nodes (no genealogy edges yet). x = shared time axis,
// y = one lane per org, plus a "field" ground-line for unaffiliated events.
// DOM-positioned (like Timeline); the SVG bézier edge layer arrives in Stage 2.

const ROW_H = 72; // px height of one org lane
const PAD_TOP = 36; // px above the first lane
const FIELD_GAP = 28; // gap between the last lane and the field ground-line
const AXIS_H = 34; // year-axis strip at the bottom
const NODE_R = 16; // event-disc radius (matches flat view's active node)
const HEAD_R = 17; // lane-head logo-disc radius
const LANE_MIN_W = 2 * HEAD_R; // a one-node lane still draws a visible stub

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

/** Brand logo for a lane head — the mark only (no strand ring), tinted to ink. */
function BrandMark({ brand, size }: { brand: Brand; size: number }) {
  const viewBox = brand.icon ? "0 0 24 24" : brand.mark?.viewBox;
  const path = brand.icon?.path ?? brand.mark?.path;
  if (!viewBox || !path) {
    return <span className="font-display text-xs font-semibold text-ink">{brand.label[0]}</span>;
  }
  return (
    <svg viewBox={viewBox} width={size} height={size} fill="var(--color-ink)" aria-hidden>
      <path d={path} />
    </svg>
  );
}

export default function BranchTimeline({
  events,
  visibleStrands,
  selectedId,
  onSelect,
  matchedIds,
  filterActive,
}: BranchTimelineProps) {
  const layout = useMemo(() => (events.length ? buildBranchLayout(events) : null), [events]);

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
  const renderNode = (e: TimelineEvent, cy: number) => {
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
            return (
              <g key={`edge-${i}`} opacity={s.opacity}>
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
              {/* lane-head logo + label */}
              <div
                className="absolute z-[2] -translate-y-1/2 font-label text-[11px] font-semibold uppercase tracking-[0.1em] text-secondary"
                style={{ left: lane.startX + HEAD_R + 8, top: y - HEAD_R - 4 }}
              >
                {lane.brand.label}
              </div>
              <div
                className="absolute z-[2] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ink bg-paper"
                style={{ left: lane.startX, top: y, width: HEAD_R * 2, height: HEAD_R * 2 }}
              >
                <BrandMark brand={lane.brand} size={ICON_GLYPH} />
              </div>
              {/* events */}
              {lane.events.map((e) => renderNode(e, y))}
            </div>
          );
        })}

        {/* "Field" ground-line — unaffiliated papers & policy (SPEC §5 default). */}
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
              The field · papers & policy
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
