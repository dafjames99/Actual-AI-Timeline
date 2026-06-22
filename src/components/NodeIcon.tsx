import type { CSSProperties } from "react";
import type { TimelineEvent } from "../data/types";
import { STRAND_GLYPH } from "./glyphs";
import { resolveNodeIcon } from "./nodeIconResolver";

interface NodeIconProps {
  event: TimelineEvent;
  size: number; // px of the mark/glyph itself
  color?: string; // monochrome tint (defaults to inherited ink via currentColor)
  className?: string;
  style?: CSSProperties;
}

/** Renders the resolved brand mark or strand glyph, tinted monochrome. */
export function NodeIcon({ event, size, color = "currentColor", className, style }: NodeIconProps) {
  const resolved = resolveNodeIcon(event);

  if (resolved.kind === "brand" && resolved.brand.icon) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        role="img"
        aria-label={resolved.label}
        fill={color}
        className={className}
        style={style}
      >
        <title>{resolved.label}</title>
        <path d={resolved.brand.icon.path} />
      </svg>
    );
  }

  if (resolved.kind === "brand" && resolved.brand.asset) {
    return (
      <img
        src={resolved.brand.asset}
        width={size}
        height={size}
        alt={resolved.label}
        className={className}
        style={style}
      />
    );
  }

  const Glyph = STRAND_GLYPH[event.strand];
  return <Glyph size={size} color={color} className={className} style={style} aria-hidden />;
}
