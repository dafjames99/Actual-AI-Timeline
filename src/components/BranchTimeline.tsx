import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { StrandKey, TimelineEvent } from "../data/types";
import { STRANDS } from "../data/strands";
import { buildBranchLayout, fanLine } from "./branchLayout";
import type { BranchLayout, EdgeKind } from "./branchLayout";
import { NodeIcon } from "./NodeIcon";
import { ICON_GLYPH, PX_PER_YEAR } from "./layout";

// Org-genealogy branch view — the "overview altitude" (SPEC-branching-org-genealogy).
// x = shared time axis, y = one lane per org, plus a "field" ground-line for
// events with no lab-lineage org. Genealogy edges (SVG béziers) connect the lanes
// but stay quiet until a lane is hovered/selected, so they inform on demand rather
// than clutter. DOM-positioned nodes (like Timeline) over the edge SVG.

const EDGE_DIM = 0.14; // resting opacity for edges when nothing is focused
const EDGE_MUTED = 0.05; // opacity for edges outside the focused lineage

const NODE_R = 16; // event-disc radius (matches flat view's active node)
const LANE_MIN_W = 2 * NODE_R; // a one-node lane still draws a visible stub
const PAD_TOP = 28; // px above the first lane
const LANE_GAP = 16; // min vertical gap between adjacent lanes' fan extents
const FIELD_GAP = 30; // gap between the last lane and the field ground-line
const AXIS_H = 40; // sticky year-axis strip at the bottom
const STAGE_MAX_H = "78vh"; // bound the stage so it doesn't dominate the page

// Zoom (Stage 3) — multiplies the shared time axis' px-per-year. Only x gaps
// stretch; discs keep a fixed size. Stepped in/out around the flat default.
const ZOOM_MIN = 0.45;
const ZOOM_MAX = 3;
const ZOOM_STEP = 1.3;
const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

const FIELD_KEY = "__field__"; // expand key for the field ground-line

/**
 * Place lanes and the field on the current (possibly flagship-filtered) subset:
 * fan each visible run, stack lanes with variable heights, and return the
 * geometry the render needs. Pure — kept out of the component body so the
 * per-lane height accumulation isn't a render-scope mutation.
 */
function layoutGeometry(
  layout: BranchLayout,
  flagshipOnly: boolean,
  expanded: Set<string>,
) {
  const { scale, lanes, field } = layout;
  const visibleOf = (evs: TimelineEvent[], key: string) =>
    flagshipOnly && !expanded.has(key) ? evs.filter((e) => e.flagship) : evs;
  const extraOf = (evs: TimelineEvent[]) =>
    flagshipOnly ? evs.filter((e) => !e.flagship).length : 0;

  let y = PAD_TOP;
  const laneRows = lanes.map((lane) => {
    const { nodes, fanUp, fanDown } = fanLine(
      visibleOf(lane.events, lane.brand.key),
      scale.xOf,
    );
    const center = y + NODE_R + fanUp;
    y = center + NODE_R + fanDown + LANE_GAP;
    return { lane, center, nodes, extra: extraOf(lane.events) };
  });
  const lanesBottom = y;

  const fieldNodes = fanLine(visibleOf(field, FIELD_KEY), scale.xOf);
  const fieldExtra = extraOf(field);
  const fieldY = lanesBottom + FIELD_GAP + NODE_R + fieldNodes.fanUp;
  const tracksHeight = field.length
    ? fieldY + NODE_R + fieldNodes.fanDown + 12
    : lanesBottom + 12;

  return { laneRows, fieldNodes, fieldExtra, fieldY, tracksHeight };
}

interface BranchTimelineProps {
  events: TimelineEvent[];
  visibleStrands: Set<StrandKey>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  matchedIds: Set<string>;
  filterActive: boolean;
  flagshipOnly: boolean; // §11: collapse each lane to its landmark events
}

// Edge styling by genealogy type — births solid, acquisition/absorption softer
// and dashed (SPEC-branching-org-genealogy §5, open-decision #2).
const EDGE_STYLE: Record<
  EdgeKind,
  { width: number; opacity: number; dash?: string }
> = {
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
  flagshipOnly,
}: BranchTimelineProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  // Per-lane "show everything" overrides while in flagship mode (§11); persist
  // across flagship on/off so a re-enable remembers what the user opened.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggleExpand = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const layout = useMemo(
    () =>
      events.length ? buildBranchLayout(events, PX_PER_YEAR * zoom) : null,
    [events, zoom],
  );

  // Zoom keeps the viewport-centre point fixed: capture the centred content
  // fraction before the scale changes, restore the matching scrollLeft after the
  // new (wider/narrower) track has laid out.
  const scrollRef = useRef<HTMLDivElement>(null);
  const anchorFrac = useRef<number | null>(null);
  const zoomBy = (factor: number) => {
    const el = scrollRef.current;
    if (el && el.scrollWidth > 0) {
      anchorFrac.current =
        (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth;
    }
    setZoom((z) => clamp(z * factor, ZOOM_MIN, ZOOM_MAX));
  };
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && anchorFrac.current !== null) {
      el.scrollLeft = anchorFrac.current * el.scrollWidth - el.clientWidth / 2;
      anchorFrac.current = null;
    }
  }, [zoom]);

  // The lane (org) whose lineage should light up: a hovered lane wins, else the
  // lane that owns the selected event.
  const selectedKey = useMemo(
    () =>
      layout?.lanes.find((l) => l.events.some((e) => e.id === selectedId))
        ?.brand.key ?? null,
    [layout, selectedId],
  );
  const activeKey = hovered ?? selectedKey;

  if (!layout) {
    return (
      <div className="rounded-lg border border-ink bg-panel p-6 text-muted">
        No events to show.
      </div>
    );
  }

  const { scale, lanes, edges, field } = layout;
  const rowOf = new Map(lanes.map((l, i) => [l.brand.key, i]));

  // Variable lane stacking on the current (flagship-filtered) subset: each lane
  // is fanned on what's visible and reserves only the room that needs, so
  // sparse/collapsed lanes stay compact while dense ones expand. Labels sit to
  // the *left* of the head node, so a lane reserves no caption row either.
  const { laneRows, fieldNodes, fieldExtra, fieldY, tracksHeight } =
    layoutGeometry(layout, flagshipOnly, expanded);
  const laneY = (i: number) => laneRows[i].center;

  // A single event disc — strand-ringed logo/glyph; shared by lanes and the field.
  const renderNode = (
    e: TimelineEvent,
    cx: number,
    cy: number,
    laneKey?: string,
  ) => {
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
          left: cx,
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
    <div className="relative">
      {/* Zoom controls (Stage 3) — float over the scroll area, top-right. */}
      <div className="absolute right-3 top-3 z-10 flex overflow-hidden rounded-lg border border-ink bg-panel/95 shadow-sm backdrop-blur">
        <ZoomButton
          label="−"
          title="Zoom out"
          disabled={zoom <= ZOOM_MIN}
          onClick={() => zoomBy(1 / ZOOM_STEP)}
        />
        <button
          type="button"
          onClick={() => setZoom(1)}
          title="Reset zoom"
          className="border-x border-hairline px-2 py-1 font-mono text-[10px] tabular-nums text-secondary hover:bg-wash"
        >
          {Math.round(zoom * 100)}%
        </button>
        <ZoomButton
          label="+"
          title="Zoom in"
          disabled={zoom >= ZOOM_MAX}
          onClick={() => zoomBy(ZOOM_STEP)}
        />
      </div>

      <div
        ref={scrollRef}
        className="overflow-auto rounded-lg border border-ink bg-panel"
        style={{ maxHeight: STAGE_MAX_H }}
      >
        <div
          className="relative"
          style={{ width: scale.trackWidth, height: tracksHeight }}
        >
          {/* Faint per-year vertical gridlines tie dates across all lanes together. */}
          {scale.ticks.map((t, i) => (
            <div
              key={`grid-${t.label}-${i}`}
              className="absolute top-0 w-px bg-hairline"
              style={{ left: t.x, height: tracksHeight }}
            />
          ))}

          {/* Genealogy edges — drawn behind the lanes/nodes (SPEC §2). */}
          <svg
            className="pointer-events-none absolute left-0 top-0"
            width={scale.trackWidth}
            height={tracksHeight}
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
              const inLineage =
                e.fromKey === activeKey || e.toKey === activeKey;
              const opacity = activeKey
                ? inLineage
                  ? s.opacity
                  : EDGE_MUTED
                : EDGE_DIM;
              return (
                <g key={`edge-${i}`} opacity={opacity}>
                  <path
                    d={edgePath(e.x, y1, y2)}
                    strokeWidth={s.width}
                    strokeDasharray={s.dash}
                  />
                  <circle
                    cx={e.x}
                    cy={y1}
                    r={2.5}
                    fill="var(--color-ink)"
                    stroke="none"
                  />
                </g>
              );
            })}
          </svg>

          {/* Org lanes */}
          {laneRows.map(({ lane, center: y, nodes, extra }) => {
            const width = Math.max(LANE_MIN_W, lane.endX - lane.startX);
            const open = expanded.has(lane.brand.key);
            return (
              <div key={lane.brand.key}>
                {/* lane line */}
                <div
                  className="absolute rounded-full bg-edge"
                  style={{ left: lane.startX, top: y - 1.5, width, height: 3 }}
                />
                {/* org label — to the left of the head node, on the lane line, so
                    the lane needs no extra vertical room for a caption. In
                    flagship mode it doubles as the expand/collapse control. */}
                <LaneLabel
                  text={lane.brand.label}
                  extra={extra}
                  open={open}
                  right={scale.trackWidth - (lane.startX - NODE_R - 4)}
                  top={y}
                  onToggle={() => toggleExpand(lane.brand.key)}
                />
                {/* events — the first one is the clickable lane head; fanned in y
                    where dates cluster so discs don't overlap. */}
                {nodes.map((n) =>
                  renderNode(n.e, n.x, y + n.yOffset, lane.brand.key),
                )}
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
              <button
                type="button"
                disabled={fieldExtra === 0}
                onClick={() => toggleExpand(FIELD_KEY)}
                className="absolute z-[2] font-label text-[11px] font-semibold uppercase tracking-[0.1em] text-muted enabled:hover:text-ink disabled:cursor-default"
                style={{
                  left: 8,
                  top: fieldY - NODE_R - fieldNodes.fanUp - 18,
                }}
              >
                The field · papers, policy &amp; tooling
                {fieldExtra > 0 && (
                  <span className="ml-1.5 text-eyebrow">
                    {expanded.has(FIELD_KEY) ? "− less" : `+${fieldExtra}`}
                  </span>
                )}
              </button>
              {fieldNodes.nodes.map((n) =>
                renderNode(n.e, n.x, fieldY + n.yOffset),
              )}
            </>
          )}
        </div>

        {/* Year axis — sticky to the bottom of the stage so the date ruler stays
            visible no matter how tall the lane stack gets (it still pans
            horizontally with the track). */}
        <div
          className="sticky bottom-0 z-[3] border-t border-hairline bg-panel/95 backdrop-blur"
          style={{ width: scale.trackWidth, height: AXIS_H }}
        >
          {scale.ticks.map((t, i) => (
            <div
              key={`axis-${t.label}-${i}`}
              className="absolute -translate-x-1/2 text-center"
              style={{ left: t.x, top: 6 }}
            >
              <div className="mx-auto h-2 w-px bg-edge" />
              <div className="mt-1 font-mono text-[10px] text-muted">
                {t.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Lane caption, left of the head node. Plain text unless the lane has events
// hidden by the flagship filter, in which case it becomes the expand/collapse
// control with a "+N" / "− less" badge (§11).
function LaneLabel({
  text,
  extra,
  open,
  right,
  top,
  onToggle,
}: {
  text: string;
  extra: number;
  open: boolean;
  right: number;
  top: number;
  onToggle: () => void;
}) {
  const base =
    "absolute z-[2] -translate-y-1/2 whitespace-nowrap pr-2 text-right font-label text-[11px] font-semibold uppercase tracking-[0.1em] text-secondary";
  if (extra === 0) {
    return (
      <div className={base} style={{ right, top }}>
        {text}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`${base} hover:text-ink`}
      style={{ right, top }}
    >
      {text}
      <span className="ml-1.5 text-eyebrow">
        {open ? "− less" : `+${extra}`}
      </span>
    </button>
  );
}

function ZoomButton({
  label,
  title,
  disabled,
  onClick,
}: {
  label: string;
  title: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="px-2.5 py-1 font-mono text-sm leading-none text-secondary hover:bg-wash disabled:cursor-not-allowed disabled:opacity-30"
    >
      {label}
    </button>
  );
}
