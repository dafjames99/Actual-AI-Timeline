import yaml from "js-yaml";
import { marked } from "marked";
import type { TimelineEvent } from "./types";
import { isStrandKey } from "./strands";

/**
 * THE data-loader boundary (PRD §6 "Framework portability").
 *
 * Nothing outside this file (and getEventById.ts) should know HOW events are
 * loaded. This Vite implementation reads the raw Markdown via import.meta.glob;
 * a Next.js port would swap the glob below for fs.readdirSync + gray-matter and
 * change nothing else in the app.
 */

// Eagerly pull every event file in as a raw string at build time.
const rawFiles = import.meta.glob("../../events/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Split a file into its YAML frontmatter block and Markdown body.
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function parseFile(path: string, raw: string): TimelineEvent | null {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    console.warn(`[events] ${path}: no YAML frontmatter found — skipping`);
    return null;
  }

  const [, frontmatter, body] = match;
  let data: Record<string, unknown>;
  try {
    data = (yaml.load(frontmatter) ?? {}) as Record<string, unknown>;
  } catch (err) {
    console.warn(`[events] ${path}: failed to parse frontmatter — skipping`, err);
    return null;
  }

  // Required fields. Anything missing means the event is unusable; warn + skip.
  const required = ["id", "title", "date", "strand", "summary", "significance", "source_url"];
  const missing = required.filter((k) => !data[k]);
  if (missing.length > 0) {
    console.warn(`[events] ${path}: missing required field(s): ${missing.join(", ")} — skipping`);
    return null;
  }

  if (!isStrandKey(data.strand)) {
    console.warn(`[events] ${path}: unknown strand "${String(data.strand)}" — skipping`);
    return null;
  }

  const bodyHtml = body.trim() ? (marked.parse(body.trim(), { async: false }) as string) : undefined;

  return {
    id: String(data.id),
    title: String(data.title),
    date: String(data.date),
    strand: data.strand,
    summary: String(data.summary),
    significance: String(data.significance),
    actors: toStringArray(data.actors),
    tags: toStringArray(data.tags),
    source_url: String(data.source_url),
    image_url: data.image_url ? String(data.image_url) : undefined,
    related_ids: data.related_ids ? toStringArray(data.related_ids) : undefined,
    body: bodyHtml,
  };
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value == null) return [];
  return [String(value)];
}

let cache: TimelineEvent[] | null = null;

export async function getAllEvents(): Promise<TimelineEvent[]> {
  if (cache) return cache;

  const events = Object.entries(rawFiles)
    .map(([path, raw]) => parseFile(path, raw))
    .filter((e): e is TimelineEvent => e !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Guard against duplicate ids, which would break deep-linking / related_ids.
  const seen = new Set<string>();
  for (const e of events) {
    if (seen.has(e.id)) console.warn(`[events] duplicate id "${e.id}" — deep-links may be ambiguous`);
    seen.add(e.id);
  }

  cache = events;
  return events;
}
