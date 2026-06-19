import { AnimatePresence, motion } from "framer-motion";
import type { TimelineEvent } from "../data/types";
import { STRANDS } from "../data/strands";

interface EventPanelProps {
  event: TimelineEvent | null;
  related: TimelineEvent[]; // resolved related events (existing ids only)
  activeTags: string[]; // tags currently used as filters
  onToggleTag: (tag: string) => void;
  onClose: () => void;
  onSelect: (id: string) => void;
}

/**
 * Detail panel (PRD §7) — slides up from the bottom as a sheet, which works well
 * on both phone and desktop. Shows the full event record plus clickable related
 * events.
 */
export default function EventPanel({
  event,
  related,
  activeTags,
  onToggleTag,
  onClose,
  onSelect,
}: EventPanelProps) {
  return (
    <AnimatePresence>
      {event && (
        <>
          <motion.div
            className="fixed inset-0 z-10 bg-slate-900/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            key={event.id}
            className="fixed inset-x-0 bottom-0 z-20 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[28rem] sm:max-h-none sm:rounded-none sm:rounded-l-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            role="dialog"
            aria-label={event.title}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className="inline-block rounded px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: STRANDS[event.strand].colour }}
                >
                  {STRANDS[event.strand].label}
                </span>
                <h2 className="mt-2 text-xl font-bold text-slate-900">{event.title}</h2>
                <time className="font-mono text-sm text-slate-400">{event.date}</time>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <Section title="Summary">{event.summary}</Section>
            <Section title="Why it mattered">{event.significance}</Section>

            {event.actors.length > 0 && (
              <Section title="Actors">
                <div className="flex flex-wrap gap-1.5">
                  {event.actors.map((a) => (
                    <span key={a} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {a}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {event.tags.length > 0 && (
              <Section title="Tags">
                <div className="flex flex-wrap gap-1.5">
                  {event.tags.map((t) => {
                    const on = activeTags.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onToggleTag(t)}
                        aria-pressed={on}
                        className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                          on
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 text-slate-500 hover:border-slate-400"
                        }`}
                      >
                        #{t}
                      </button>
                    );
                  })}
                </div>
              </Section>
            )}

            {related.length > 0 && (
              <Section title="Related">
                <ul className="space-y-1">
                  {related.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(r.id)}
                        className="text-left text-sm text-blue-600 hover:underline"
                      >
                        {r.title} <span className="text-slate-400">· {r.date}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {event.body && (
              <Section title="Notes">
                <div
                  className="prose prose-sm max-w-none text-slate-600"
                  dangerouslySetInnerHTML={{ __html: event.body }}
                />
              </Section>
            )}

            <div className="mt-6">
              <a
                href={event.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                View source ↗
              </a>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <div className="mt-1 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}
