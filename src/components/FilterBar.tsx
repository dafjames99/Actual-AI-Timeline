import type { StrandKey } from "../data/types";
import { STRAND_LIST } from "../data/strands";

interface FilterBarProps {
  visible: Set<StrandKey>;
  onToggle: (key: StrandKey) => void;
}

/**
 * Strand toggles (PRD §7). Clicking a chip shows/hides that strand's lane; the
 * Timeline reclaims the vertical space of any hidden lane.
 */
export default function FilterBar({ visible, onToggle }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-6 py-3">
      {STRAND_LIST.map((strand) => {
        const on = visible.has(strand.key);
        return (
          <button
            key={strand.key}
            type="button"
            onClick={() => onToggle(strand.key)}
            aria-pressed={on}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
              on
                ? "border-slate-300 text-slate-700"
                : "border-slate-200 text-slate-300 line-through"
            }`}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: on ? strand.colour : "#cbd5e1" }}
            />
            {strand.label}
          </button>
        );
      })}
    </div>
  );
}
