// Shared geometry for the single-line "scrubber" timeline. Events all sit on
// one horizontal track; the stage shows a fixed centre playhead while the track
// translates under it. A jog/ruler dial at the bottom scrubs the same offset.

export const PX_PER_YEAR = 140; // horizontal scale in date mode (roomy for thumb scrubbing)
export const EVEN_SPACING = 84; // px between events in equal-spacing mode
export const TRACK_PAD = 80; // px of track before the first / after the last event

export const DOT_R = 7; // event node radius
export const DOT_R_ACTIVE = 9; // radius of the event nearest the centre
export const ICON_NODE_R = 16; // radius of the active node's icon disc (~32px)
export const ICON_GLYPH = 17; // px size of the brand mark / glyph inside that disc
export const DOT_MIN_GAP = 26; // closer than this in x → fan events off the line
export const FAN_STEP = 18; // vertical offset per fan level

// Branch (lineage) view: same-lane nodes closer than BRANCH_MIN_GAP in x fan
// vertically off the lane line, BRANCH_FAN_STEP px per level. Wider gap / taller
// step than the flat view because the discs are the larger icon size (NODE_R).
// BRANCH_FAN_MAX caps the fan depth so a very dense cluster (or a zoomed-out
// overview, where everything bunches up) can't blow the lane height open —
// past the cap, discs just overlap rather than stacking ever taller.
export const BRANCH_MIN_GAP = 30;
export const BRANCH_FAN_STEP = 22;
export const BRANCH_FAN_MAX = 3;

/** Fan level for the k-th member of a dense cluster: 0, +1, -1, +2, -2, … */
export function fanLevel(k: number): number {
  if (k === 0) return 0;
  return k % 2 === 1 ? Math.ceil(k / 2) : -k / 2;
}

/** Like {@link fanLevel} but saturating at ±max so dense runs stop growing. */
export function fanLevelCapped(k: number, max: number): number {
  const lvl = fanLevel(k);
  return Math.sign(lvl) * Math.min(Math.abs(lvl), max);
}
export const POPUP_THRESHOLD = 56; // px from centre within which a title pops up

export const LINE_WEIGHT = 4; // thickness of the era-coloured baseline

export const ERA_LABEL_H = 18; // px height of one row in the top-left era-label wheel

// Vertical layout of the stage (px). The line sits at LINE_Y from the top of
// the track area; dots fan above/below it; the dial occupies the bottom.
export const STAGE_MIN_HEIGHT = 360;
export const DIAL_HEIGHT = 76;
export const STAGE_HEIGHT = "70vh";

export const ACTIVE_Y_OFFSET = 10;
