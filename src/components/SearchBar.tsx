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
    <div className="border-b border-slate-200 px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="search"
            inputMode="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search title, tags, actors…"
            aria-label="Search events"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
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
              className="flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white"
            >
              #{tag} <span aria-hidden>✕</span>
            </button>
          ))}
        </div>
      )}

      {active && (
        <p className="mt-2 text-xs text-slate-400">
          {matchCount} of {totalCount} events match
        </p>
      )}
    </div>
  );
}
