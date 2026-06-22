import { scaleTime } from "d3-scale";
import { timeYear } from "d3-time";
import { timeFormat } from "d3-time-format";
import type { TimelineEvent } from "../data/types";
import { PX_PER_YEAR, TRACK_PAD } from "./layout";

// The proportional (date-accurate) time → x mapping. Extracted from Timeline's
// "date" mode so the flat scrubber and the org-genealogy branch view share one
// history axis (SPEC-branching-org-genealogy §5). The "even" spacing mode is a
// flat-only concept and stays in Timeline.tsx.

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const formatYear = timeFormat("%Y");

export interface Tick {
  x: number;
  label: string;
}

export interface TimeScale {
  d0: Date; // padded domain start
  d1: Date; // padded domain end
  trackWidth: number; // px width of the full track at PX_PER_YEAR
  xOf: (e: TimelineEvent) => number;
  xOfDate: (d: Date) => number;
  dateAtX: (x: number) => Date;
  ticks: Tick[]; // one per year
}

/**
 * Build the shared proportional time scale from the event set. Domain is the
 * event date range padded by a third of a year on each side, matching the flat
 * timeline's original behaviour exactly.
 */
export function buildTimeScale(events: TimelineEvent[]): TimeScale {
  const times = events.map((e) => new Date(e.date).getTime());
  const pad = YEAR_MS / 3;
  const d0 = new Date(Math.min(...times) - pad);
  const d1 = new Date(Math.max(...times) + pad);

  const years = (d1.getTime() - d0.getTime()) / YEAR_MS;
  const trackWidth = Math.round(years * PX_PER_YEAR) + TRACK_PAD * 2;
  const scale = scaleTime().domain([d0, d1]).range([TRACK_PAD, trackWidth - TRACK_PAD]);

  return {
    d0,
    d1,
    trackWidth,
    xOf: (e) => scale(new Date(e.date)),
    xOfDate: (d) => scale(d),
    dateAtX: (x) => scale.invert(x),
    ticks: scale.ticks(timeYear).map((t) => ({ x: scale(t), label: formatYear(t) })),
  };
}
