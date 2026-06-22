import {
  siAnthropic,
  siGoogle,
  siDeepmind,
  siMeta,
  siNvidia,
  siHuggingface,
  siMistralai,
  siDeepseek,
  siQwen,
  siBaidu,
  siLangchain,
} from "simple-icons";
import type { SimpleIcon } from "simple-icons";

/**
 * Brand registry — resolves an event's `actors` to a recognisable mark so the
 * node shows *who*, not just an abstract dot (SPEC-iconography-overview §3).
 *
 * Marks come from `simple-icons` where available. Some important brands (OpenAI,
 * Microsoft, …) were removed from simple-icons at the trademark holders' request;
 * those carry an inline, self-hosted monochrome `mark` (path + viewBox) instead,
 * rendered identically (tinted via currentColor) so there's no broken-image risk.
 * A brand with neither falls back to the strand glyph. Logos are used editorially,
 * for identification only — see the disclosure in the app footer.
 *
 * Genealogy fields (founded / parents / …) drive the org-genealogy branch view
 * (SPEC-branching-org-genealogy §4). All optional and curate-once. Stage 1
 * populates `founded` only; the edge-driving fields (parents/relation/becomes/
 * dissolved) land in Stage 2 alongside the bézier edges.
 */
export interface BrandMark {
  viewBox: string; // the mark's own coordinate space, e.g. "0 0 16 16"
  path: string; // a single monochrome path, tinted at render time
}

export interface Brand {
  key: string; // stable id, e.g. "openai"
  label: string; // canonical display name
  aliases: string[]; // actor strings (case-insensitive) that resolve to this brand
  icon?: SimpleIcon; // simple-icons mark (tree-shaken via static named import)
  mark?: BrandMark; // inline self-hosted mark, for brands not in simple-icons

  // --- genealogy (SPEC-branching-org-genealogy §4); all optional, curate-once ---
  founded?: string; // ISO; lane start (source of truth, not events)
  colour?: string; // lane colour in branch view
  parents?: string[]; // brand keys this spun out of / merged from        (Stage 2)
  relation?: "spinout" | "merge" | "acquisition"; // edge style to parent  (Stage 2)
  becomes?: { into: string; date: string }; // merge/absorb target + when  (Stage 2)
  dissolved?: string; // ISO; lane end if not via `becomes`                (Stage 2)
  laneOrderHint?: number; // optional manual nudge for vertical ordering
}

// OpenAI "Blossom" logomark — Bootstrap Icons rendition (MIT). Used editorially.
const OPENAI_MARK: BrandMark = {
  viewBox: "0 0 16 16",
  path: "M14.949 6.547a3.94 3.94 0 0 0-.348-3.273 4.11 4.11 0 0 0-4.4-1.934A4.1 4.1 0 0 0 8.423.2 4.15 4.15 0 0 0 6.305.086a4.1 4.1 0 0 0-1.891.948 4.04 4.04 0 0 0-1.158 1.753 4.1 4.1 0 0 0-1.563.679A4 4 0 0 0 .554 4.72a3.99 3.99 0 0 0 .502 4.731 3.94 3.94 0 0 0 .346 3.274 4.11 4.11 0 0 0 4.402 1.933c.382.425.852.764 1.377.995.526.231 1.095.35 1.67.346 1.78.002 3.358-1.132 3.901-2.804a4.1 4.1 0 0 0 1.563-.68 4 4 0 0 0 1.14-1.253 3.99 3.99 0 0 0-.506-4.716m-6.097 8.406a3.05 3.05 0 0 1-1.945-.694l.096-.054 3.23-1.838a.53.53 0 0 0 .265-.455v-4.49l1.366.778q.02.011.025.035v3.722c-.003 1.653-1.361 2.992-3.037 2.996m-6.53-2.75a2.95 2.95 0 0 1-.36-2.01l.095.057L5.29 12.09a.53.53 0 0 0 .527 0l3.949-2.246v1.555a.05.05 0 0 1-.022.041L6.473 13.3c-1.454.826-3.311.335-4.15-1.098m-.85-6.94A3.02 3.02 0 0 1 3.07 3.949v3.785a.51.51 0 0 0 .262.451l3.93 2.237-1.366.779a.05.05 0 0 1-.048 0L2.585 9.342a2.98 2.98 0 0 1-1.113-4.094zm11.216 2.571L8.747 5.576l1.362-.776a.05.05 0 0 1 .048 0l3.265 1.86a3 3 0 0 1 1.173 1.207 2.96 2.96 0 0 1-.27 3.2 3.05 3.05 0 0 1-1.36.997V8.279a.52.52 0 0 0-.276-.445m1.36-2.015-.097-.057-3.226-1.855a.53.53 0 0 0-.53 0L6.249 6.153V4.598a.04.04 0 0 1 .019-.04L9.533 2.7a3.07 3.07 0 0 1 3.257.139c.474.325.843.778 1.066 1.303.223.526.289 1.103.191 1.664zM5.503 8.575 4.139 7.8a.05.05 0 0 1-.026-.037V4.049c0-.57.166-1.127.476-1.607s.752-.864 1.275-1.105a3.08 3.08 0 0 1 3.234.41l-.096.054-3.23 1.838a.53.53 0 0 0-.265.455zm.742-1.577 1.758-1 1.762 1v2l-1.755 1-1.762-1z",
};

// Microsoft — the four-square mark, rendered monochrome to match the palette.
const MICROSOFT_MARK: BrandMark = {
  viewBox: "0 0 21 21",
  path: "M0 0h10v10H0z M11 0h10v10H11z M0 11h10v10H0z M11 11h10v10H11z",
};

// Founding dates are sourced lane-start anchors; an org whose founding predates
// the event window (e.g. NVIDIA 1993, Google 1998) is left without `founded` so
// its lane simply starts at its first event (handled in BranchTimeline). Splitting
// `google` into Brain / DeepMind / Google-DeepMind lanes is deferred to Stage 2.
export const BRANDS: Brand[] = [
  // Removed from simple-icons (trademark requests) — inline self-hosted marks.
  { key: "openai", label: "OpenAI", aliases: ["openai"], mark: OPENAI_MARK, founded: "2015-12-11" },
  { key: "microsoft", label: "Microsoft", aliases: ["microsoft"], mark: MICROSOFT_MARK },

  {
    key: "anthropic",
    label: "Anthropic",
    aliases: ["anthropic"],
    icon: siAnthropic,
    founded: "2021-01-01",
  },
  {
    key: "google",
    label: "Google",
    aliases: ["google", "google brain", "google research", "google deepmind"],
    icon: siGoogle,
  },
  {
    key: "deepmind",
    label: "DeepMind",
    aliases: ["deepmind"],
    icon: siDeepmind,
    founded: "2010-09-23",
  },
  {
    key: "meta",
    label: "Meta",
    aliases: ["meta", "meta ai", "fair", "facebook ai research"],
    icon: siMeta,
    founded: "2013-12-09", // FAIR founded Dec 2013
  },
  { key: "nvidia", label: "NVIDIA", aliases: ["nvidia"], icon: siNvidia },
  {
    key: "huggingface",
    label: "Hugging Face",
    aliases: ["hugging face", "huggingface"],
    icon: siHuggingface,
    founded: "2016-01-01",
  },
  {
    key: "mistral",
    label: "Mistral AI",
    aliases: ["mistral", "mistral ai"],
    icon: siMistralai,
    founded: "2023-04-28",
  },
  {
    key: "deepseek",
    label: "DeepSeek",
    aliases: ["deepseek"],
    icon: siDeepseek,
    founded: "2023-07-17",
  },
  { key: "qwen", label: "Qwen", aliases: ["qwen", "alibaba", "alibaba cloud"], icon: siQwen },
  { key: "baidu", label: "Baidu", aliases: ["baidu", "ernie"], icon: siBaidu },
  {
    key: "langchain",
    label: "LangChain",
    aliases: ["langchain"],
    icon: siLangchain,
    founded: "2022-10-17",
  },
];

// Lowercase alias → brand, built once at module load.
const BY_ALIAS = new Map<string, Brand>();
for (const b of BRANDS) for (const a of b.aliases) BY_ALIAS.set(a.toLowerCase(), b);

/** The first actor that resolves to a known brand, or null. */
export function brandForActors(actors: string[]): Brand | null {
  for (const a of actors) {
    const b = BY_ALIAS.get(a.trim().toLowerCase());
    if (b) return b;
  }
  return null;
}
