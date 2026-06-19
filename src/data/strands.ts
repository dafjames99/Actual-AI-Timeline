import type { StrandKey } from "./types";

export interface StrandConfig {
  key: StrandKey;
  label: string; // full display name for the swim lane / legend
  short: string; // abbreviated label for the narrow mobile gutter
  colour: string; // hex; mirrored into CSS custom properties in index.css
  order: number; // top-to-bottom lane order
}

// Colour intents follow PRD §4. `order` controls the vertical lane stacking.
export const STRANDS: Record<StrandKey, StrandConfig> = {
  research: { key: "research", label: "Research / Academic", short: "Research", colour: "#3b82f6", order: 0 },
  labs: { key: "labs", label: "Labs & Model Releases", short: "Labs", colour: "#8b5cf6", order: 1 },
  products: { key: "products", label: "Products & Deployment", short: "Products", colour: "#f59e0b", order: 2 },
  oss: { key: "oss", label: "Open Source & Tooling", short: "OSS", colour: "#16a34a", order: 3 },
  governance: { key: "governance", label: "Governance & Policy", short: "Policy", colour: "#64748b", order: 4 },
  corporate: { key: "corporate", label: "Corporate & Industry", short: "Corporate", colour: "#b91c1c", order: 5 },
  infrastructure: { key: "infrastructure", label: "AI-adjacent Infrastructure", short: "Infra", colour: "#14b8a6", order: 6 },
};

// Ordered list, handy for rendering lanes / legend in a stable sequence.
export const STRAND_LIST: StrandConfig[] = Object.values(STRANDS).sort(
  (a, b) => a.order - b.order,
);

export const STRAND_KEYS = STRAND_LIST.map((s) => s.key);

export function isStrandKey(value: unknown): value is StrandKey {
  return typeof value === "string" && value in STRANDS;
}
