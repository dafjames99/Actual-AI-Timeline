import { useEffect, useMemo, useState } from "react";
import { getAllEvents } from "./data/getAllEvents";
import { STRAND_KEYS } from "./data/strands";
import type { StrandKey, TimelineEvent } from "./data/types";
import Timeline from "./components/Timeline";
import FilterBar from "./components/FilterBar";
import EventPanel from "./components/EventPanel";
import { useSelectedEvent } from "./hooks/useSelectedEvent";

export default function App() {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [visible, setVisible] = useState<Set<StrandKey>>(() => new Set(STRAND_KEYS));
  const { selectedId, select } = useSelectedEvent();

  useEffect(() => {
    getAllEvents().then(setEvents);
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, TimelineEvent>();
    events?.forEach((e) => m.set(e.id, e));
    return m;
  }, [events]);

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

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
        <h1 className="text-lg font-bold sm:text-xl">AI Progress Timeline</h1>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
          A multi-strand view of how the field has unfolded.
        </p>
      </header>

      <FilterBar visible={visible} onToggle={toggleStrand} />

      <main className="p-3 sm:p-6">
        {!events ? (
          <p className="text-slate-500">Loading events…</p>
        ) : (
          <Timeline
            events={events}
            visibleStrands={visible}
            selectedId={selectedId}
            onSelect={select}
          />
        )}
      </main>

      <EventPanel
        event={selected}
        related={related}
        onClose={() => select(null)}
        onSelect={select}
      />
    </div>
  );
}
