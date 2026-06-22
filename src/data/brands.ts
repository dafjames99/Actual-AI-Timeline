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
 * those carry an optional self-hosted `asset` instead and fall back to the strand
 * glyph until an asset is supplied. Logos are used editorially, for
 * identification only — see the disclosure in the app footer.
 *
 * NOTE: the genealogy fields the branch view needs (founded / parents / …) are
 * deliberately NOT here yet; they're added when SPEC-branching-org-genealogy
 * implementation starts.
 */
export interface Brand {
  key: string; // stable id, e.g. "openai"
  label: string; // canonical display name
  aliases: string[]; // actor strings (case-insensitive) that resolve to this brand
  icon?: SimpleIcon; // simple-icons mark (tree-shaken via static named import)
  asset?: string; // self-hosted SVG url, for marks not in simple-icons
}

export const BRANDS: Brand[] = [
  // Removed from simple-icons (trademark requests) — glyph fallback until an
  // official mark is dropped into `asset`.
  { key: "openai", label: "OpenAI", aliases: ["openai"] },
  { key: "microsoft", label: "Microsoft", aliases: ["microsoft"] },

  { key: "anthropic", label: "Anthropic", aliases: ["anthropic"], icon: siAnthropic },
  {
    key: "google",
    label: "Google",
    aliases: ["google", "google brain", "google research", "google deepmind"],
    icon: siGoogle,
  },
  { key: "deepmind", label: "DeepMind", aliases: ["deepmind"], icon: siDeepmind },
  {
    key: "meta",
    label: "Meta",
    aliases: ["meta", "meta ai", "fair", "facebook ai research"],
    icon: siMeta,
  },
  { key: "nvidia", label: "NVIDIA", aliases: ["nvidia"], icon: siNvidia },
  {
    key: "huggingface",
    label: "Hugging Face",
    aliases: ["hugging face", "huggingface"],
    icon: siHuggingface,
  },
  { key: "mistral", label: "Mistral AI", aliases: ["mistral", "mistral ai"], icon: siMistralai },
  { key: "deepseek", label: "DeepSeek", aliases: ["deepseek"], icon: siDeepseek },
  { key: "qwen", label: "Qwen", aliases: ["qwen", "alibaba", "alibaba cloud"], icon: siQwen },
  { key: "baidu", label: "Baidu", aliases: ["baidu", "ernie"], icon: siBaidu },
  { key: "langchain", label: "LangChain", aliases: ["langchain"], icon: siLangchain },
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

/** A brand only renders a mark if it actually has one (icon or self-hosted asset). */
export function brandHasMark(b: Brand): boolean {
  return Boolean(b.icon || b.asset);
}
