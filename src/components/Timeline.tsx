import { useEffect, useMemo, useRef, useState } from "react";
import { scaleTime } from "d3-scale";
import { timeYear } from "d3-time";
import { timeFormat } from "d3-time-format";
import type { StrandKey, TimelineEvent } from "../data/types";
import { STRANDS, STRAND_LIST } from "../data/strands";
import { ERAS, eraOf } from "../data/eras";
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

export type TimelineMode = "date" | "even";

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const EVEN_SPACING = 64; // px between events in equal-spacing mode
const TOUCH_R = 18; // invisible hit-area radius for comfortable touch targets
const formatYear = timeFormat("%Y");
const formatNodeDate = timeFormat("%b %Y");

interface Tick {
  x: number;
  label: string;
}
interface Band {
  key: string;
  label: string;
  left: number;
  right: number;
}

interface TimelineProps {
  events: TimelineEvent[];
  visibleStrands: Set<StrandKey>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  matchedIds: Set<string>;
  filterActive: boolean;
  mode: TimelineMode;
  centerId: string | null; // event/era target to scroll into view
  centerKey: number; // bump to re-trigger scroll even for the same id
}

interface HoverState {
  event: TimelineEvent;
  x: number;
  y: number;
}

export default function Timeline({
  events,
  visibleStrands,
  selectedId,
  onSelect,
  matchedIds,
  filterActive,
  mode,
  centerId,
  centerKey,
}: TimelineProps) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lanes = STRAND_LIST.filter((s) => visibleStrands.has(s.key));
  const laneIndex = useMemo(() => {
    const m = new Map<StrandKey, number>();
    lanes.forEach((s, i) => m.set(s.key, i));
    return m;
  }, [lanes]);

  const shownEvents = events.filter((e) => visibleStrands.has(e.strand));

  const { innerWidth, xOf, ticks, bands } = useMemo(() => {
    const dates = events.map((e) => new Date(e.date).getTime());
    const pad = YEAR_MS / 3;
    const d0 = new Date(Math.min(...dates) - pad);
    const d1 = new Date(Math.max(...dates) + pad);

    let innerWidth: number;
    let xOf: (e: TimelineEvent) => number;
    let ticks: Tick[];

    if (mode === "date") {
      const years = (d1.getTime() - d0.getTime()) / YEAR_MS;
      innerWidth = Math.max(
        MIN_INNER_WIDTH,
        Math.round(years * PX_PER_YEAR) + PADDING_LEFT + PADDING_RIGHT,
      );
      const x = scaleTime().domain([d0, d1]).range([PADDING_LEFT, innerWidth - PADDING_RIGHT]);
      xOf = (e) => x(new Date(e.date));
      ticks = x.ticks(timeYear).map((t) => ({ x: x(t), label: formatYear(t) }));
    } else {
      const n = events.length;
      innerWidth = Math.max(MIN_INNER_WIDTH, (n - 1) * EVEN_SPACING + PADDING_LEFT + PADDING_RIGHT);
      const step = n > 1 ? (innerWidth - PADDING_LEFT - PADDING_RIGHT) / (n - 1) : 0;
      const idx = new Map(events.map((e, i) => [e.id, i]));
      xOf = (e) => PADDING_LEFT + (idx.get(e.id) ?? 0) * step;
      // Year label at the first event of each year.
      ticks = [];
      let lastYear = "";
      for (const e of events) {
        const y = e.date.slice(0, 4);
        if (y !== lastYear) {
          ticks.push({ x: xOf(e), label: y });
          lastYear = y;
        }
      }
    }

    // Era bands: extent of each era's events, tiled at midpoint boundaries.
    const present = ERAS.map((era) => {
      const evs = events.filter((e) => eraOf(e.date).key === era.key);
      if (evs.length === 0) return null;
      const xs = evs.map(xOf);
      return { era, min: Math.min(...xs), max: Math.max(...xs) };
    }).filter((p): p is { era: (typeof ERAS)[number]; min: number; max: number } => p !== null);

    const bands: Band[] = present.map((p, i) => ({
      key: p.era.key,
      label: p.era.label,
      left: i === 0 ? 0 : (present[i - 1].max + p.min) / 2,
      right: i === present.length - 1 ? innerWidth : (p.max + present[i + 1].min) / 2,
    }));

    return { innerWidth, xOf, ticks, bands };
  }, [events, mode]);

  const height = AXIS_HEIGHT + Math.max(1, lanes.length) * LANE_HEIGHT;

  // Scroll a target event/era into the centre when requested (tour, era jump,
  // deep-link). centerKey forces re-runs even when centerId is unchanged.
  useEffect(() => {
    if (!centerId) return;
    const e = events.find((x) => x.id === centerId);
    const el = scrollRef.current;
    if (!e || !el) return;
    el.scrollTo({ left: xOf(e) - el.clientWidth / 2, behavior: "smooth" });
  }, [centerId, centerKey, xOf, events]);

  return (
    <div className="flex border border-ink bg-panel">
      {/* Fixed strand-label gutter — narrow + short labels on phones. */}
      <div className="w-24 shrink-0 border-r border-ink sm:w-44">
        <div style={{ height: AXIS_HEIGHT }} />
        {lanes.map((strand) => (
          <div
            key={strand.key}
            className="flex items-center gap-1.5 px-2 font-label text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-ink-soft sm:gap-2 sm:px-3 sm:text-[10.5px]"
            style={{ height: LANE_HEIGHT }}
          >
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: strand.colour }}
            />
            <span className="sm:hidden">{strand.short}</span>
            <span className="hidden sm:inline">{strand.label}</span>
          </div>
        ))}
      </div>

      {/* Scrollable, date-accurate chart. */}
      <div ref={scrollRef} className="relative overflow-x-auto">
        <svg width={innerWidth} height={height} role="img" aria-label="AI progress timeline">
          {/* Era bands (background) + labels */}
          {bands.map((b, i) => (
            <g key={b.key}>
              <rect
                x={b.left}
                y={AXIS_HEIGHT}
                width={Math.max(0, b.right - b.left)}
                height={height - AXIS_HEIGHT}
                className={i % 2 === 0 ? "fill-wash" : "fill-wash-alt"}
              />
              <text
                x={(b.left + b.right) / 2}
                y={14}
                textAnchor="middle"
                className="fill-caption font-label text-[10px] font-semibold uppercase tracking-[0.18em]"
              >
                {b.label}
              </text>
            </g>
          ))}

          {/* Year gridlines + labels */}
          {ticks.map((t, i) => (
            <g key={`${t.label}-${i}`}>
              <line
                x1={t.x}
                x2={t.x}
                y1={AXIS_HEIGHT}
                y2={height}
                className="stroke-line"
                strokeWidth={1}
              />
              <text
                x={t.x}
                y={AXIS_HEIGHT - 8}
                textAnchor="middle"
                className="fill-muted font-mono text-xs"
              >
                {t.label}
              </text>
            </g>
          ))}

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
                className="stroke-line"
                strokeWidth={2}
              />
            );
          })}

          {/* Event nodes */}
          {shownEvents.map((e) => {
            const strand = STRANDS[e.strand];
            const cx = xOf(e);
            const cy = laneCenterY(laneIndex.get(e.strand)!);
            const selected = e.id === selectedId;
            const dimmed = filterActive && !matchedIds.has(e.id);
            return (
              <g
                key={e.id}
                className="cursor-pointer transition-opacity"
                opacity={dimmed ? 0.15 : 1}
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
              >
                <circle cx={cx} cy={cy} r={TOUCH_R} fill="transparent" />
                <circle
                  cx={cx}
                  cy={cy}
                  r={selected ? NODE_R + 3 : NODE_R}
                  fill={strand.colour}
                  style={{ stroke: selected ? strand.colour : "var(--color-panel)" }}
                  strokeWidth={selected ? 3 : 1.5}
                  strokeOpacity={selected ? 0.4 : 1}
                />
              </g>
            );
          })}

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
      <rect x={left} y={top} width={width} height={22} rx={4} className="fill-ink" />
      <text
        x={hover.x}
        y={top + 15}
        textAnchor="middle"
        className="fill-paper font-mono text-[11.5px]"
      >
        {label}
      </text>
    </g>
  );
}
