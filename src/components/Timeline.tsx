import { useMemo, useState } from "react";
import { scaleTime } from "d3-scale";
import { timeYear } from "d3-time";
import { timeFormat } from "d3-time-format";
import type { StrandKey, TimelineEvent } from "../data/types";
import { STRANDS, STRAND_LIST } from "../data/strands";
import {
  AXIS_HEIGHT,
  LANE_HEIGHT,
  MIN_INNER_WIDTH,
  NODE_R,
  PADDING_LEFT,
  PADDING_RIGHT,
  PX_PER_YEAR,
  laneCenterY,
} from "./layout";

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const formatYear = timeFormat("%Y");
const formatNodeDate = timeFormat("%b %Y");

interface TimelineProps {
  events: TimelineEvent[];
  visibleStrands: Set<StrandKey>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface HoverState {
  event: TimelineEvent;
  x: number;
  y: number;
}

/**
 * Stage 2: the interactive timeline. Lanes are assigned by visible-strand order
 * so toggling a strand off collapses its lane and reclaims the space. Nodes are
 * clickable (open detail panel) and hoverable (lightweight tooltip).
 */
export default function Timeline({ events, visibleStrands, selectedId, onSelect }: TimelineProps) {
  const [hover, setHover] = useState<HoverState | null>(null);

  const lanes = STRAND_LIST.filter((s) => visibleStrands.has(s.key));
  const laneIndex = useMemo(() => {
    const m = new Map<StrandKey, number>();
    lanes.forEach((s, i) => m.set(s.key, i));
    return m;
  }, [lanes]);

  const shownEvents = events.filter((e) => visibleStrands.has(e.strand));

  const { innerWidth, x, ticks } = useMemo(() => {
    // Domain is fixed to the full dataset so the x-axis doesn't jump when lanes
    // toggle — only the visible nodes change.
    const dates = events.map((e) => new Date(e.date).getTime());
    const pad = YEAR_MS / 3;
    const d0 = new Date(Math.min(...dates) - pad);
    const d1 = new Date(Math.max(...dates) + pad);

    const years = (d1.getTime() - d0.getTime()) / YEAR_MS;
    const innerWidth = Math.max(
      MIN_INNER_WIDTH,
      Math.round(years * PX_PER_YEAR) + PADDING_LEFT + PADDING_RIGHT,
    );
    const x = scaleTime().domain([d0, d1]).range([PADDING_LEFT, innerWidth - PADDING_RIGHT]);
    return { innerWidth, x, ticks: x.ticks(timeYear) };
  }, [events]);

  const height = AXIS_HEIGHT + Math.max(1, lanes.length) * LANE_HEIGHT;

  return (
    <div className="flex border border-slate-200">
      {/* Fixed strand-label gutter — only visible strands, aligned to lanes. */}
      <div className="shrink-0 border-r border-slate-200 bg-slate-50" style={{ width: 184 }}>
        <div style={{ height: AXIS_HEIGHT }} />
        {lanes.map((strand) => (
          <div
            key={strand.key}
            className="flex items-center gap-2 px-3 text-sm text-slate-700"
            style={{ height: LANE_HEIGHT }}
          >
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: strand.colour }}
            />
            <span className="leading-tight">{strand.label}</span>
          </div>
        ))}
      </div>

      {/* Scrollable, date-accurate chart. */}
      <div className="relative overflow-x-auto">
        <svg width={innerWidth} height={height} role="img" aria-label="AI progress timeline">
          {/* Year gridlines + labels */}
          {ticks.map((t) => {
            const tx = x(t);
            return (
              <g key={+t}>
                <line x1={tx} x2={tx} y1={AXIS_HEIGHT} y2={height} stroke="#e2e8f0" strokeWidth={1} />
                <text
                  x={tx}
                  y={AXIS_HEIGHT - 16}
                  textAnchor="middle"
                  className="fill-slate-400 font-mono text-xs"
                >
                  {formatYear(t)}
                </text>
              </g>
            );
          })}

          {/* Lane baselines */}
          {lanes.map((strand) => {
            const ly = laneCenterY(laneIndex.get(strand.key)!);
            return (
              <line
                key={strand.key}
                x1={PADDING_LEFT}
                x2={innerWidth - PADDING_RIGHT}
                y1={ly}
                y2={ly}
                stroke="#f1f5f9"
                strokeWidth={2}
              />
            );
          })}

          {/* Event nodes */}
          {shownEvents.map((e) => {
            const strand = STRANDS[e.strand];
            const cx = x(new Date(e.date));
            const cy = laneCenterY(laneIndex.get(e.strand)!);
            const selected = e.id === selectedId;
            return (
              <circle
                key={e.id}
                cx={cx}
                cy={cy}
                r={selected ? NODE_R + 3 : NODE_R}
                fill={strand.colour}
                stroke={selected ? strand.colour : "white"}
                strokeWidth={selected ? 3 : 1.5}
                strokeOpacity={selected ? 0.4 : 1}
                className="cursor-pointer"
                onClick={() => onSelect(e.id)}
                onMouseEnter={() => setHover({ event: e, x: cx, y: cy })}
                onMouseLeave={() => setHover((h) => (h?.event.id === e.id ? null : h))}
                tabIndex={0}
                role="button"
                aria-label={`${e.title}, ${e.date}`}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    onSelect(e.id);
                  }
                }}
              />
            );
          })}

          {/* Hover tooltip (title + date only) — rendered in SVG to track scroll. */}
          {hover && <NodeTooltip hover={hover} />}
        </svg>
      </div>
    </div>
  );
}

function NodeTooltip({ hover }: { hover: HoverState }) {
  const label = `${hover.event.title} · ${formatNodeDate(new Date(hover.event.date))}`;
  const width = label.length * 6.7 + 16;
  const left = hover.x - width / 2;
  const top = hover.y - NODE_R - 30;
  return (
    <g pointerEvents="none">
      <rect x={left} y={top} width={width} height={22} rx={4} fill="#0f172a" />
      <text x={hover.x} y={top + 15} textAnchor="middle" className="fill-white text-xs">
        {label}
      </text>
    </g>
  );
}
