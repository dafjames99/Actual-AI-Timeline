import type { TimelineEvent } from "../data/types";
import { brandForActors } from "../data/brands";

/**
 * Pure resolver (no React) for what a node's disc should show: a brand mark when
 * we can resolve and render one, otherwise the strand's event-type glyph. A
 * "mark" is normalised to a tintable path + its own viewBox, whether it comes
 * from simple-icons (24×24) or an inline self-hosted brand. `label` is the human
 * name (the brand, or the first actor) — used for the title card and a11y. Kept
 * separate from the `NodeIcon` component so it stays unit-testable and doesn't
 * break fast-refresh.
 */
export type ResolvedIcon =
  | { kind: "mark"; viewBox: string; path: string; label: string }
  | { kind: "glyph"; label: string };

export function resolveNodeIcon(event: TimelineEvent): ResolvedIcon {
  const brand = brandForActors(event.actors);
  if (brand?.icon) {
    return { kind: "mark", viewBox: "0 0 24 24", path: brand.icon.path, label: brand.label };
  }
  if (brand?.mark) {
    return { kind: "mark", viewBox: brand.mark.viewBox, path: brand.mark.path, label: brand.label };
  }
  return { kind: "glyph", label: event.actors[0] ?? "" };
}
