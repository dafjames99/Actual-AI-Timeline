import type { TimelineEvent } from "../data/types";
import { brandForActors, brandHasMark, type Brand } from "../data/brands";

/**
 * Pure resolver (no React) for what a node's disc should show: a brand mark when
 * we can resolve and render one, otherwise the strand's event-type glyph.
 * `label` is the human name for the mark (the brand, or the first actor) — used
 * for the title card and accessibility. Kept separate from the `NodeIcon`
 * component so it stays unit-testable and doesn't break fast-refresh.
 */
export type ResolvedIcon =
  | { kind: "brand"; brand: Brand; label: string }
  | { kind: "glyph"; label: string };

export function resolveNodeIcon(event: TimelineEvent): ResolvedIcon {
  const brand = brandForActors(event.actors);
  if (brand && brandHasMark(brand)) return { kind: "brand", brand, label: brand.label };
  return { kind: "glyph", label: event.actors[0] ?? "" };
}
