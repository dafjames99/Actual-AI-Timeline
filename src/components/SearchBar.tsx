interface SearchBarProps {
  query: string;
  onQuery: (q: string) => void;
  activeTags: string[];
  onToggleTag: (tag: string) => void;
  matchCount: number;
  totalCount: number;
  active: boolean; // any search/tag filter currently applied
  onClear: () => void;
}

/**
 * Keyword search + active tag filter (PRD §7). Searches title/tags/actors;
 * non-matching events dim in the timeline rather than disappearing. Mobile-first:
 * full-width input, with active tag chips wrapping beneath.
 */
export default function SearchBar({
  query,
  onQuery,
  activeTags,
  onToggleTag,
  matchCount,
  totalCount,
  active,
  onClear,
}: SearchBarProps) {
  return (
    <div className="border-b border-hairline px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="search"
            inputMode="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search title, tags, actors…"
            aria-label="Search events"
            className="w-full rounded-lg border border-edge bg-transparent px-3 py-2 font-mono text-sm text-ink outline-none placeholder:text-label focus:border-ink"
          />
        </div>
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-lg border border-edge px-3 py-2 font-label text-[10px] font-semibold uppercase tracking-[0.12em] text-secondary hover:bg-wash"
          >
            Clear
          </button>
        )}
      </div>

      {activeTags.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {activeTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              className="flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 font-mono text-xs text-paper"
            >
              #{tag} <span aria-hidden>✕</span>
            </button>
          ))}
        </div>
      )}

      {active && (
        <p className="mt-2 font-mono text-xs text-muted">
          {matchCount} of {totalCount} events match
        </p>
      )}
    </div>
  );
}
