import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { scaleTime } from "d3-scale";
import { timeYear } from "d3-time";
import { timeFormat } from "d3-time-format";
import type { StrandKey, TimelineEvent } from "../data/types";
import { STRANDS } from "../data/strands";
import { ERAS, eraOf } from "../data/eras";
import {
  DIAL_HEIGHT,
  ERA_LABEL_H,
  DOT_MIN_GAP,
  DOT_R,
  DOT_R_ACTIVE,
  EVEN_SPACING,
  FAN_STEP,
  LINE_WEIGHT,
  POPUP_THRESHOLD,
  PX_PER_YEAR,
  STAGE_MIN_HEIGHT,
  TRACK_PAD,
  STAGE_HEIGHT
} from "./layout";

export type TimelineMode = "date" | "even";

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const formatYear = timeFormat("%Y");
const formatCentre = timeFormat("%b %Y");

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

interface TimelineProps {
  events: TimelineEvent[];
  visibleStrands: Set<StrandKey>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  matchedIds: Set<string>;
  filterActive: boolean;
  mode: TimelineMode;
  centerId: string | null; // event/era target to scrub to centre
  centerKey: number; // bump to re-trigger the scrub even for the same id
}

interface Placed {
  e: TimelineEvent;
  x: number; // position along the track (px)
  yOffset: number; // fan offset off the baseline for near-collisions
}
interface Tick {
  x: number;
  label: string;
}
interface Band {
  key: string;
  colour: string;
  left: number;
  right: number;
}

// Fan level for the k-th member of a dense cluster: 0, +1, -1, +2, -2, …
function fanLevel(k: number): number {
  if (k === 0) return 0;
  return k % 2 === 1 ? Math.ceil(k / 2) : -k / 2;
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
  // --- Track geometry (positions are stable regardless of strand filtering) ---
  const layout = useMemo(() => {
    if (events.length === 0) return null;
    const times = events.map((e) => new Date(e.date).getTime());
    const pad = YEAR_MS / 3;
    const d0 = new Date(Math.min(...times) - pad);
    const d1 = new Date(Math.max(...times) + pad);

    let trackWidth: number;
    let xOf: (e: TimelineEvent) => number;
    let dateAtX: ((x: number) => Date) | null;
    let xOfDate: ((d: Date) => number) | null;
    let ticks: Tick[];

    if (mode === "date") {
      const years = (d1.getTime() - d0.getTime()) / YEAR_MS;
      trackWidth = Math.round(years * PX_PER_YEAR) + TRACK_PAD * 2;
      const scale = scaleTime().domain([d0, d1]).range([TRACK_PAD, trackWidth - TRACK_PAD]);
      xOf = (e) => scale(new Date(e.date));
      dateAtX = (x) => scale.invert(x);
      xOfDate = (d) => scale(d);
      ticks = scale.ticks(timeYear).map((t) => ({ x: scale(t), label: formatYear(t) }));
    } else {
      const n = events.length;
      trackWidth = (n - 1) * EVEN_SPACING + TRACK_PAD * 2;
      const idx = new Map(events.map((e, i) => [e.id, i]));
      xOf = (e) => TRACK_PAD + (idx.get(e.id) ?? 0) * EVEN_SPACING;
      dateAtX = null;
      xOfDate = null;
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

    // Place events left→right, fanning consecutive near-collisions off the line.
    const ordered = [...events].sort((a, b) => xOf(a) - xOf(b));
    const placed: Placed[] = [];
    let prevX = -Infinity;
    let k = 0;
    for (const e of ordered) {
      const x = xOf(e);
      k = x - prevX < DOT_MIN_GAP ? k + 1 : 0;
      placed.push({ e, x, yOffset: fanLevel(k) * FAN_STEP });
      prevX = x;
    }
    const posById = new Map(placed.map((p) => [p.e.id, p]));

    // Era line segments: span each present era's events, tiled at midpoints.
    const present = ERAS.map((era) => {
      const xs = events.filter((e) => eraOf(e.date).key === era.key).map(xOf);
      return xs.length ? { era, min: Math.min(...xs), max: Math.max(...xs) } : null;
    }).filter((p): p is { era: (typeof ERAS)[number]; min: number; max: number } => p !== null);

    const bands: Band[] = present.map((p, i) => {
      if (xOfDate) {
        const left = i === 0 ? 0 : xOfDate(new Date(p.era.start!));
        const right = i === present.length - 1 ? trackWidth : xOfDate(new Date(present[i + 1].era.start!));
        return {
          key: p.era.key, colour: p.era.colour, left: clamp(left, 0, trackWidth), right: clamp(right, 0, trackWidth)
        }
      }
      return {
        key: p.era.key,
        colour: p.era.colour,
        left: i === 0 ? 0 : (present[i - 1].max + p.min) / 2,
        right: i === present.length - 1 ? trackWidth : (p.max + present[i + 1].min) / 2,
      }
    });

    const firstX = placed[0].x;
    const lastX = placed[placed.length - 1].x;
    return { trackWidth, dateAtX, ticks, placed, posById, bands, firstX, lastX };
  }, [events, mode]);

  // --- Stage measurement ---
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: STAGE_MIN_HEIGHT });
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStage({ w: width, h: height });
    });
    ro.observe(el);
    setStage({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // --- Scrub position (the track coordinate currently under the centre) ---
  const [centerX, setCenterX] = useState(0);
  const centerXRef = useRef(0);
  const bounds = useRef({ min: 0, max: 0 });
  const raf = useRef<number | null>(null);

  const cancelAnim = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);

  const commit = useCallback((x: number) => {
    const c = clamp(x, bounds.current.min, bounds.current.max);
    centerXRef.current = c;
    setCenterX(c);
  }, []);

  const animateTo = useCallback(
    (target: number) => {
      cancelAnim();
      const from = centerXRef.current;
      const to = clamp(target, bounds.current.min, bounds.current.max);
      if (Math.abs(to - from) < 0.5) return commit(to);
      const start = performance.now();
      const dur = 420;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        commit(from + (to - from) * eased);
        if (t < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    },
    [cancelAnim, commit],
  );

  const fling = useCallback(
    (v0: number) => {
      // v0 is centre-velocity in px/ms; decay until it (or the bounds) stop it.
      let v = v0;
      let last = performance.now();
      const tick = (now: number) => {
        const dt = Math.min(40, now - last);
        last = now;
        v *= Math.pow(0.9, dt / 16);
        const next = clamp(centerXRef.current + v * dt, bounds.current.min, bounds.current.max);
        commit(next);
        const atEdge = next <= bounds.current.min || next >= bounds.current.max;
        if (Math.abs(v) > 0.015 && !atEdge) raf.current = requestAnimationFrame(tick);
      };
      if (Math.abs(v0) > 0.015) raf.current = requestAnimationFrame(tick);
    },
    [commit],
  );

  // Keep bounds in sync with layout; re-clamp the current position into range.
  useEffect(() => {
    if (!layout) return;
    bounds.current = { min: layout.firstX, max: layout.lastX };
    commit(centerXRef.current);
  }, [layout, commit]);

  // Initial centre: a deep-linked event if present, else the earliest event.
  const inited = useRef(false);
  useEffect(() => {
    if (inited.current || !layout || stage.w === 0) return;
    inited.current = true;
    const target = (selectedId && layout.posById.get(selectedId)?.x) || layout.firstX;
    commit(target);
  }, [layout, stage.w, selectedId, commit]);

  // External scrub requests (tour, era jump, deep-link). centerKey forces reruns.
  useEffect(() => {
    if (!centerId || !layout) return;
    const p = layout.posById.get(centerId);
    if (p) animateTo(p.x);
  }, [centerId, centerKey, layout, animateTo]);

  useEffect(() => cancelAnim, [cancelAnim]);

  // Events on visible strands (positions are stable; filtering only hides dots).
  const shown = useMemo(
    () => (layout ? layout.placed.filter((p) => visibleStrands.has(p.e.strand)) : []),
    [layout, visibleStrands],
  );
  const shownRef = useRef(shown);
  useEffect(() => {
    shownRef.current = shown;
  }, [shown]);

  // --- Drag / scrub gesture (shared by the whole stage, incl. the dial) ---
  const drag = useRef<{ id: number; lastX: number; samples: { x: number; t: number }[] } | null>(
    null,
  );
  const wasDrag = useRef(false);

  // Which event dot (if any) sits under a pointer — used for reliable tap-select,
  // since capturing the pointer on the stage can swallow a child button's click.
  const hitTest = useCallback((e: React.PointerEvent): Placed | null => {
    const el = stageRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const tx = e.clientX - rect.left - (rect.width / 2 - centerXRef.current);
    const ty = e.clientY - rect.top;
    const lineY = Math.max(80, (rect.height - DIAL_HEIGHT) / 2);
    let best: Placed | null = null;
    let bd = Infinity;
    for (const p of shownRef.current) {
      const dx = p.x - tx;
      const dy = lineY + p.yOffset - ty;
      const d2 = dx * dx + dy * dy;
      if (d2 < bd) {
        bd = d2;
        best = p;
      }
    }
    return best && bd <= 22 * 22 ? best : null;
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    cancelAnim();
    wasDrag.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { id: e.pointerId, lastX: e.clientX, samples: [{ x: e.clientX, t: e.timeStamp }] };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.lastX;
    d.lastX = e.clientX;
    if (Math.abs(dx) > 0) {
      if (!wasDrag.current && Math.abs(dx) > 2) wasDrag.current = true;
      commit(centerXRef.current - dx);
    }
    d.samples.push({ x: e.clientX, t: e.timeStamp });
    if (d.samples.length > 5) d.samples.shift();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (!wasDrag.current) {
      const hit = hitTest(e); // a tap: select + snap the dot to centre
      if (hit) {
        onSelect(hit.e.id);
        animateTo(hit.x);
      }
      return;
    }
    const s = d.samples;
    if (s.length >= 2) {
      const a = s[0];
      const b = s[s.length - 1];
      const dt = b.t - a.t;
      if (dt > 0) fling(-(b.x - a.x) / dt); // centre moves opposite the finger
    }
  };

  // Event nearest the centre (drives the title pop-up and keyboard stepping).
  const nearest = useMemo(() => {
    let best: Placed | null = null;
    let bd = Infinity;
    for (const p of shown) {
      const d = Math.abs(p.x - centerX);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best ? { p: best, dist: bd } : null;
  }, [shown, centerX]);

  const stepBy = useCallback(
    (dir: 1 | -1) => {
      if (!nearest) return;
      const i = shown.indexOf(nearest.p);
      const next = shown[clamp(i + dir, 0, shown.length - 1)];
      if (next) animateTo(next.x);
    },
    [nearest, shown, animateTo],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (nearest && e.key === "Enter" && nearest.dist < 2) {
      onSelect(nearest.p.e.id);
    }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      e.stopPropagation(); // don't also drive the guided-tour global handler
      stepBy(e.key === "ArrowRight" ? 1 : -1);
    }
  };

  // 
  useEffect(() => {
    if (!selectedId && stageRef.current) {
      stageRef.current.focus();
    }
  }, [selectedId]);

  const selectAt = (p: Placed) => {
    onSelect(p.e.id);
    animateTo(p.x); // tapping a node snaps it to centre
  };

  if (!layout) {
    return (
      <div className="border border-ink bg-panel p-6 text-muted" style={{ minHeight: STAGE_MIN_HEIGHT }}>
        No events to show.
      </div>
    );
  }

  const lineArea = stage.h - DIAL_HEIGHT;
  const lineY = Math.max(80, lineArea / 2);
  const translateX = stage.w / 2 - centerX;

  const centreDate =
    mode === "date" && layout.dateAtX
      ? layout.dateAtX(centerX)
      : nearest
        ? new Date(nearest.p.e.date)
        : null;
  const centreEraColour = centreDate ? eraOf(centreDate.toISOString().slice(0, 10)).colour : "#94897a";
  const activeEraIndex = centreDate
    ? ERAS.findIndex((e) => e.key === eraOf(centreDate.toISOString().slice(0, 10)).key)
    : 0;
  const popup = nearest && nearest.dist <= POPUP_THRESHOLD ? nearest.p : null;

  return (
    <div className="overflow-hidden rounded-lg border border-ink bg-panel">
      <div
        ref={stageRef}
        className="relative touch-none select-none overflow-hidden outline-none"
        style={{ height: STAGE_HEIGHT, minHeight: STAGE_MIN_HEIGHT }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="group"
        aria-label="AI progress timeline — drag to scrub through time"
      >
        {/* Era label — a vertical wheel. All eras are rendered, stacked at the
            same origin; the active one sits in a one-row window while the rest
            are translated off-screen. Crossing a boundary rolls the wheel, and
            jumping several eras at once flicks through the ones in between. */}
        <div
          className="pointer-events-none absolute z-20 overflow-hidden"
          style={{ left: "2%", top: 12, height: ERA_LABEL_H, width: 220 }}
        >
          {ERAS.map((era, i) => (
            <div
              key={era.key}
              className="absolute left-0 top-0 whitespace-nowrap font-label text-[13px] font-light uppercase tracking-[0.14em] font-stretch-expanded transition-transform duration-500 ease-out"
              style={{
                height: ERA_LABEL_H,
                lineHeight: `${ERA_LABEL_H}px`,
                transform: `translateY(${(i - activeEraIndex) * ERA_LABEL_H}px)`,
                color: centreEraColour,
              }}
            >
              {era.label}
            </div>
          ))}
        </div>

        {/* Moving track: era line + event dots + the centred title card. */}
        <div
          className="absolute left-0 top-0 h-full will-change-transform"
          style={{ width: layout.trackWidth, transform: `translateX(${translateX}px)` }}
        >
          {/* Era-coloured baseline segments */}
          {layout.bands.map((b) => (
            <div
              key={b.key}
              className="absolute rounded-full"
              style={{
                left: b.left,
                width: Math.max(0, b.right - b.left),
                top: lineY - LINE_WEIGHT / 2,
                height: LINE_WEIGHT,
                backgroundColor: b.colour,
              }}
            />
          ))}

          {/* Event dots (fanned stems for near-collisions) */}
          {shown.map((p) => {
            const strand = STRANDS[p.e.strand];
            const active = popup?.e.id === p.e.id;
            const selected = p.e.id === selectedId;
            const dimmed = filterActive && !matchedIds.has(p.e.id);
            const r = active ? DOT_R_ACTIVE : DOT_R;
            const dotY = lineY + p.yOffset;
            return (
              <div key={p.e.id}>
                {p.yOffset !== 0 && (
                  <div
                    className="absolute"
                    style={{
                      left: p.x - 0.5,
                      top: Math.min(lineY, dotY),
                      width: 1,
                      height: Math.abs(p.yOffset),
                      backgroundColor: strand.colour,
                      opacity: dimmed ? 0.15 : 0.45,
                    }}
                  />
                )}
                <button
                  type="button"
                  aria-label={`${p.e.title}, ${p.e.date}`}
                  onClick={() => {
                    if (wasDrag.current) return; // ignore the click that ends a drag
                    selectAt(p);
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full transition-[width,height] duration-150"
                  style={{
                    left: p.x,
                    top: dotY,
                    width: r * 2,
                    height: r * 2,
                    backgroundColor: strand.colour,
                    opacity: dimmed ? 0.15 : 1,
                    boxShadow: selected
                      ? `0 0 0 3px var(--color-panel), 0 0 0 5px ${strand.colour}`
                      : "0 0 0 1.5px var(--color-panel)",
                  }}
                />
              </div>
            );
          })}

          {/* Title card for the event nearest the centre */}
          {popup && (
            <div
              key={popup.e.id}
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full"
              style={{ left: popup.x, top: lineY + Math.min(0, popup.yOffset) - DOT_R_ACTIVE - 10 }}
            >
              <div className="animate-[pop_180ms_ease-out] whitespace-nowrap rounded-lg border border-ink bg-ink px-3 py-1.5 text-center shadow-lg">
                <div className="font-display text-sm font-semibold leading-tight text-paper">
                  {popup.e.title}
                </div>
                <div className="font-mono text-[10px] text-tour-muted">
                  {formatCentre(new Date(popup.e.date))}
                </div>
              </div>
              <div
                className="mx-auto h-2 w-2 -translate-y-1 rotate-45 border-b border-r border-ink bg-ink"
                style={{ marginTop: -1 }}
              />
            </div>
          )}
        </div>

        {/* Fixed centre playhead + live date readout */}
        <div
          className="pointer-events-none absolute top-0 z-0 -translate-x-1/2"
          style={{ left: "50%", height: lineArea }}
        >
          <div className="mx-auto h-full w-px" style={{ backgroundColor: centreEraColour, opacity: 0.5 }} />
        </div>
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2"
          style={{ left: "50%", top: 12 }}
        >
          <div
            className="rounded-full border bg-panel px-3 py-1 font-mono text-xs shadow-sm"
            style={{ borderColor: centreEraColour, color: "var(--color-ink)" }}
          >
            {centreDate ? formatCentre(centreDate) : "—"}
          </div>
        </div>

        {/* Bottom jog/ruler dial — drag anywhere to scrub */}
        <div
          className="absolute inset-x-0 bottom-0 overflow-hidden border-t border-hairline bg-wash-alt"
          style={{ height: DIAL_HEIGHT }}
        >
          <div
            className="absolute left-0 top-0 h-full will-change-transform"
            style={{ width: layout.trackWidth, transform: `translateX(${translateX}px)` }}
          >
            {layout.ticks.map((t, i) => (
              <div key={`${t.label}-${i}`} className="absolute top-0 -translate-x-1/2" style={{ left: t.x }}>
                <div className="mx-auto h-3 w-px bg-edge" />
                <div className="mt-1 font-mono text-[10px] text-muted">{t.label}</div>
              </div>
            ))}
          </div>
          {/* Fixed dial centre marker */}
          <div className="pointer-events-none absolute bottom-0 top-0 left-1/2 -translate-x-1/2">
            <div className="mx-auto h-0 w-0 border-x-4 border-t-[6px] border-x-transparent border-t-ink" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center font-label text-[9px] font-semibold uppercase tracking-[0.14em] text-label">
            drag to scrub
          </div>
        </div>
      </div>
    </div>
  );
}
