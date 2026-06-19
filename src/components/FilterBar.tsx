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
    <div className="flex items-center gap-2 overflow-x-auto border-b border-hairline px-4 py-3 sm:flex-wrap sm:px-6">
      {STRAND_LIST.map((strand) => {
        const on = visible.has(strand.key);
        return (
          <button
            key={strand.key}
            type="button"
            onClick={() => onToggle(strand.key)}
            aria-pressed={on}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-label text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors ${
              on
                ? "border-edge text-ink-soft"
                : "border-edge-soft text-faint line-through"
            }`}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: on ? strand.colour : "var(--color-dot-off)" }}
            />
            {strand.label}
          </button>
        );
      })}
    </div>
  );
}
