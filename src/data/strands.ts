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
  research: { key: "research", label: "Research / Academic", short: "Research", colour: "#4f6a91", order: 0 },
  labs: { key: "labs", label: "Labs & Model Releases", short: "Labs", colour: "#715f8c", order: 1 },
  products: { key: "products", label: "Products & Deployment", short: "Products", colour: "#b07f3c", order: 2 },
  oss: { key: "oss", label: "Open Source & Tooling", short: "OSS", colour: "#5b7a4f", order: 3 },
  governance: { key: "governance", label: "Governance & Policy", short: "Policy", colour: "#6c6b6f", order: 4 },
  corporate: { key: "corporate", label: "Corporate & Industry", short: "Corporate", colour: "#9c534a", order: 5 },
  infrastructure: { key: "infrastructure", label: "AI-adjacent Infrastructure", short: "Infra", colour: "#4c8079", order: 6 },
};

// Ordered list, handy for rendering lanes / legend in a stable sequence.
export const STRAND_LIST: StrandConfig[] = Object.values(STRANDS).sort(
  (a, b) => a.order - b.order,
);

export const STRAND_KEYS = STRAND_LIST.map((s) => s.key);

export function isStrandKey(value: unknown): value is StrandKey {
  return typeof value === "string" && value in STRANDS;
}
