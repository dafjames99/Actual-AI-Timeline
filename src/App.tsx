import { useEffect, useState } from "react";
import { getAllEvents } from "./data/getAllEvents";
import { STRANDS } from "./data/strands";
import type { TimelineEvent } from "./data/types";

/**
 * Stage 0 smoke test: prove the data pipeline end-to-end by listing every event
 * getAllEvents() returns, grouped/sorted by date with its strand badge. The real
 * SVG swim-lane visualisation lands in Stage 1.
 */
export default function App() {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);

  useEffect(() => {
    getAllEvents().then(setEvents);
  }, []);

  if (!events) return <main className="p-8 text-slate-500">Loading events…</main>;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold text-slate-900">AI Progress Timeline</h1>
      <p className="mt-1 text-sm text-slate-500">
        Stage 0 — data layer smoke test · {events.length} events loaded
      </p>

      <ul className="mt-6 space-y-3">
        {events.map((e) => {
          const strand = STRANDS[e.strand];
          return (
            <li key={e.id} className="flex items-baseline gap-3 border-b border-slate-100 pb-3">
              <time className="w-24 shrink-0 font-mono text-xs text-slate-400">{e.date}</time>
              <span
                className="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: strand.colour }}
              >
                {strand.label}
              </span>
              <div>
                <a
                  href={e.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-slate-900 hover:underline"
                >
                  {e.title}
                </a>
                <p className="text-sm text-slate-600">{e.summary}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
