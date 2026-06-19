import { useEffect, useMemo, useState } from "react";
import { getAllEvents } from "./data/getAllEvents";
import { STRAND_KEYS } from "./data/strands";
import type { StrandKey, TimelineEvent } from "./data/types";
import Timeline from "./components/Timeline";
import FilterBar from "./components/FilterBar";
import SearchBar from "./components/SearchBar";
import EventPanel from "./components/EventPanel";
import { useSelectedEvent } from "./hooks/useSelectedEvent";

export default function App() {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [visible, setVisible] = useState<Set<StrandKey>>(() => new Set(STRAND_KEYS));
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const { selectedId, select } = useSelectedEvent();

  useEffect(() => {
    getAllEvents().then(setEvents);
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, TimelineEvent>();
    events?.forEach((e) => m.set(e.id, e));
    return m;
  }, [events]);

  const filterActive = query.trim().length > 0 || activeTags.length > 0;

  // Match on title/tags/actors (PRD §7); every whitespace token must appear, and
  // every active tag must be present. Non-matches are dimmed, not removed.
  const matchedIds = useMemo(() => {
    const ids = new Set<string>();
    if (!events) return ids;
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    for (const e of events) {
      const haystack = [e.title, ...e.tags, ...e.actors].join(" ").toLowerCase();
      const textOk = tokens.every((t) => haystack.includes(t));
      const tagsOk = activeTags.every((t) => e.tags.includes(t));
      if (textOk && tagsOk) ids.add(e.id);
    }
    return ids;
  }, [events, query, activeTags]);

  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;
  const related = useMemo(
    () => (selected?.related_ids ?? []).map((id) => byId.get(id)).filter((e): e is TimelineEvent => !!e),
    [selected, byId],
  );

  const toggleStrand = (key: StrandKey) =>
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleTag = (tag: string) =>
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const clearFilters = () => {
    setQuery("");
    setActiveTags([]);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
        <h1 className="text-lg font-bold sm:text-xl">AI Progress Timeline</h1>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
          A multi-strand view of how the field has unfolded.
        </p>
      </header>

      <FilterBar visible={visible} onToggle={toggleStrand} />
      <SearchBar
        query={query}
        onQuery={setQuery}
        activeTags={activeTags}
        onToggleTag={toggleTag}
        matchCount={matchedIds.size}
        totalCount={events?.length ?? 0}
        active={filterActive}
        onClear={clearFilters}
      />

      <main className="p-3 sm:p-6">
        {!events ? (
          <p className="text-slate-500">Loading events…</p>
        ) : (
          <Timeline
            events={events}
            visibleStrands={visible}
            selectedId={selectedId}
            onSelect={select}
            matchedIds={matchedIds}
            filterActive={filterActive}
          />
        )}
      </main>

      <EventPanel
        event={selected}
        related={related}
        activeTags={activeTags}
        onToggleTag={toggleTag}
        onClose={() => select(null)}
        onSelect={select}
      />
    </div>
  );
}
