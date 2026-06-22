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

  if (resolved.kind === "mark") {
    return (
      <svg
        viewBox={resolved.viewBox}
        width={size}
        height={size}
        role="img"
        aria-label={resolved.label}
        fill={color}
        className={className}
        style={style}
      >
        <title>{resolved.label}</title>
        <path d={resolved.path} />
      </svg>
    );
  }

  const Glyph = STRAND_GLYPH[event.strand];
  return <Glyph size={size} color={color} className={className} style={style} aria-hidden />;
}
