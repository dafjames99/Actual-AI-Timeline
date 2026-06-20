// Shared geometry for the single-line "scrubber" timeline. Events all sit on
// one horizontal track; the stage shows a fixed centre playhead while the track
// translates under it. A jog/ruler dial at the bottom scrubs the same offset.

export const PX_PER_YEAR = 130; // horizontal scale in date mode (roomy for thumb scrubbing)
export const EVEN_SPACING = 84; // px between events in equal-spacing mode
export const TRACK_PAD = 80; // px of track before the first / after the last event

export const DOT_R = 7; // event node radius
export const DOT_R_ACTIVE = 9; // radius of the event nearest the centre
export const DOT_MIN_GAP = 26; // closer than this in x → fan events off the line
export const FAN_STEP = 18; // vertical offset per fan level
export const POPUP_THRESHOLD = 56; // px from centre within which a title pops up

export const LINE_WEIGHT = 4; // thickness of the era-coloured baseline

// Vertical layout of the stage (px). The line sits at LINE_Y from the top of
// the track area; dots fan above/below it; the dial occupies the bottom.
export const STAGE_MIN_HEIGHT = 360;
export const DIAL_HEIGHT = 76;
