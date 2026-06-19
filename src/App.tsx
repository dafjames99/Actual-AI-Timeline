import { useEffect, useState } from "react";
import { getAllEvents } from "./data/getAllEvents";
import { STRAND_LIST } from "./data/strands";
import type { TimelineEvent } from "./data/types";
import Timeline from "./components/Timeline";

export default function App() {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);

  useEffect(() => {
    getAllEvents().then(setEvents);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-bold">AI Progress Timeline</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          A multi-strand view of how the field has unfolded.
        </p>
      </header>

      {/* Filter-bar / legend shell — inert in Stage 1; toggles wire up in Stage 2. */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-6 py-3">
        {STRAND_LIST.map((strand) => (
          <span
            key={strand.key}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: strand.colour }}
            />
            {strand.label}
          </span>
        ))}
      </div>

      <main className="p-6">
        {!events ? (
          <p className="text-slate-500">Loading events…</p>
        ) : (
          <Timeline events={events} />
        )}
      </main>
    </div>
  );
}
