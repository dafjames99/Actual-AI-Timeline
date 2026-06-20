// Rough eras of AI history (PRD §7 "zoom to era"). Boundaries are ISO dates;
// `start` is inclusive, `end` is exclusive. null = open-ended.
export interface Era {
  key: string;
  label: string;
  start: string | null;
  end: string | null;
  colour: string; // hex; tints the timeline line for this period
}

// Era colours are muted "earth" tones, deliberately distinct from the saturated
// strand dot colours — the line reads as the *period*, the dots as the *strand*.
export const ERAS: Era[] = [
  { key: "pre-dl", label: "Pre-deep-learning", start: null, end: "2012-01-01", colour: "#9a8f7a" },
  { key: "dl", label: "Deep learning", start: "2012-01-01", end: "2017-06-01", colour: "#7d8b6a" },
  { key: "llm", label: "Large language models", start: "2017-06-01", end: "2022-11-30", colour: "#6f7d99" },
  { key: "post", label: "Post-ChatGPT", start: "2022-11-30", end: null, colour: "#b08a5a" },
];

export function eraOf(date: string): Era {
  return (
    ERAS.find(
      (e) => (e.start === null || date >= e.start) && (e.end === null || date < e.end),
    ) ?? ERAS[ERAS.length - 1]
  );
}
