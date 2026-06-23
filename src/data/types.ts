// The 7 strands an event can belong to (PRD §4). Each event belongs to exactly one.
export type StrandKey =
  | "research"
  | "labs"
  | "products"
  | "oss"
  | "governance"
  | "corporate"
  | "infrastructure";

// The canonical event shape the rest of the app consumes (PRD §5).
export interface TimelineEvent {
  id: string; // slug, e.g. "attention-is-all-you-need"
  title: string; // short display label, e.g. "Transformer paper"
  date: string; // ISO 8601, e.g. "2017-06-12"
  strand: StrandKey; // one of the 7 strands
  summary: string; // 1–3 sentence plain-English explanation
  significance: string; // why it mattered — 1–3 sentences
  actors: string[]; // orgs/people
  tags: string[]; // freeform
  source_url: string; // canonical source (mandatory)
  image_url?: string; // optional thumbnail
  related_ids?: string[]; // optional cross-links to other events
  body?: string; // rendered HTML from the Markdown body, if present
  flagship?: boolean; // landmark event — shown when the lineage view is in "flagship only" mode
}
