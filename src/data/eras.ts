// Rough eras of AI history (PRD §7 "zoom to era"). Boundaries are ISO dates;
// `start` is inclusive, `end` is exclusive. null = open-ended.
export interface Era {
  key: string;
  label: string;
  start: string | null;
  end: string | null;
}

export const ERAS: Era[] = [
  { key: "pre-dl", label: "Pre-deep-learning", start: null, end: "2012-01-01" },
  { key: "dl", label: "Deep learning", start: "2012-01-01", end: "2017-06-01" },
  { key: "llm", label: "Large language models", start: "2017-06-01", end: "2022-11-30" },
  { key: "post", label: "Post-ChatGPT", start: "2022-11-30", end: null },
];

export function eraOf(date: string): Era {
  return (
    ERAS.find(
      (e) => (e.start === null || date >= e.start) && (e.end === null || date < e.end),
    ) ?? ERAS[ERAS.length - 1]
  );
}
