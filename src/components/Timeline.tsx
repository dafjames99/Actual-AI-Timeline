import { useMemo } from "react";
import { scaleTime } from "d3-scale";
import { timeYear } from "d3-time";
import { timeFormat } from "d3-time-format";
import type { TimelineEvent } from "../data/types";
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

interface TimelineProps {
  events: TimelineEvent[];
}

/**
 * Stage 1: a static, date-accurate, horizontal multi-strand timeline ("The Log",
 * PRD §7). One swim lane per strand; node x-position encodes date precisely.
 * No interaction yet — that arrives in Stage 2.
 */
export default function Timeline({ events }: TimelineProps) {
  const { innerWidth, height, x, ticks } = useMemo(() => {
    const dates = events.map((e) => new Date(e.date).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Pad the domain by ~4 months each side so end nodes aren't flush to the edge.
    const pad = YEAR_MS / 3;
    const d0 = new Date(minDate.getTime() - pad);
    const d1 = new Date(maxDate.getTime() + pad);

    const years = (d1.getTime() - d0.getTime()) / YEAR_MS;
    const innerWidth = Math.max(
      MIN_INNER_WIDTH,
      Math.round(years * PX_PER_YEAR) + PADDING_LEFT + PADDING_RIGHT,
    );

    const x = scaleTime()
      .domain([d0, d1])
      .range([PADDING_LEFT, innerWidth - PADDING_RIGHT]);

    const height = AXIS_HEIGHT + STRAND_LIST.length * LANE_HEIGHT;
    const ticks = x.ticks(timeYear);

    return { innerWidth, height, x, ticks };
  }, [events]);

  return (
    <div className="flex border border-slate-200">
      {/* Fixed strand-label gutter — aligned to lanes via shared layout constants. */}
      <div className="shrink-0 border-r border-slate-200 bg-slate-50" style={{ width: 184 }}>
        <div style={{ height: AXIS_HEIGHT }} />
        {STRAND_LIST.map((strand) => (
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
      <div className="overflow-x-auto">
        <svg width={innerWidth} height={height} role="img" aria-label="AI progress timeline">
          {/* Year gridlines + labels */}
          {ticks.map((t) => {
            const tx = x(t);
            return (
              <g key={+t}>
                <line
                  x1={tx}
                  x2={tx}
                  y1={AXIS_HEIGHT}
                  y2={height}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
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
          {STRAND_LIST.map((strand) => {
            const ly = laneCenterY(strand.order);
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
          {events.map((e) => {
            const strand = STRANDS[e.strand];
            return (
              <circle
                key={e.id}
                cx={x(new Date(e.date))}
                cy={laneCenterY(strand.order)}
                r={NODE_R}
                fill={strand.colour}
                stroke="white"
                strokeWidth={1.5}
              >
                <title>
                  {e.title} — {e.date}
                </title>
              </circle>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
