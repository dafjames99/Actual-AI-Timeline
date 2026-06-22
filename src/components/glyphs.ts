import {
  FileText,
  Sparkles,
  AppWindow,
  GitBranch,
  Scale,
  Building2,
  Cpu,
  type LucideIcon,
} from "lucide-react";
import type { StrandKey } from "../data/types";

/**
 * Event-type glyph per strand (SPEC-iconography-overview §4). This is the
 * fallback identity when an event has no recognisable brand — academic papers,
 * policy, one-off actors. The strand already implies a "kind of thing", so the
 * glyph is derived from it rather than from a new data field.
 */
export const STRAND_GLYPH: Record<StrandKey, LucideIcon> = {
  research: FileText, // a paper
  labs: Sparkles, // a model release
  products: AppWindow, // a shipped product
  oss: GitBranch, // open source / tooling
  governance: Scale, // policy / law
  corporate: Building2, // company / deal
  infrastructure: Cpu, // hardware / infra
};
