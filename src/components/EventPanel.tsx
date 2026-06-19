import { useEffect, useRef } from "react";
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
  const ref = useRef<HTMLElement>(null);

  // Move focus into the panel when it opens (accessibility).
  useEffect(() => {
    if (event) ref.current?.focus();
  }, [event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Minimal focus trap: keep Tab cycling within the open panel.
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !ref.current) return;
    const items = ref.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <AnimatePresence>
      {event && (
        <>
          <motion.div
            className="fixed inset-0 z-10 bg-ink/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            key={event.id}
            ref={ref}
            tabIndex={-1}
            onKeyDown={trapTab}
            className="fixed inset-x-0 bottom-0 z-20 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-panel p-6 shadow-2xl outline-none sm:inset-y-0 sm:left-auto sm:right-0 sm:w-md sm:max-h-none sm:rounded-none sm:rounded-l-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-label={event.title}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className="inline-block rounded px-2 py-0.5 font-label text-[10px] font-semibold uppercase tracking-[0.14em] text-white"
                  style={{ backgroundColor: STRANDS[event.strand].colour }}
                >
                  {STRANDS[event.strand].label}
                </span>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.022em] text-ink">
                  {event.title}
                </h2>
                <time className="font-mono text-sm text-muted">{event.date}</time>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded p-1 text-muted hover:bg-wash hover:text-ink"
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
                    <span
                      key={a}
                      className="rounded border border-edge px-2 py-0.5 font-mono text-xs text-secondary"
                    >
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
                        className={`rounded-full border px-2 py-0.5 font-mono text-xs transition-colors ${on
                            ? "border-ink bg-ink text-paper"
                            : "border-edge text-secondary hover:border-ink"
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
                        className="text-left font-body text-sm text-ink hover:underline"
                      >
                        {r.title} <span className="font-mono text-muted">· {r.date}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {event.body && (
              <Section title="Notes">
                <div
                  className="prose prose-sm max-w-none font-body text-ink-soft"
                  dangerouslySetInnerHTML={{ __html: event.body }}
                />
              </Section>
            )}

            <div className="mt-6">
              <a
                href={event.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-ink px-3 py-2 font-label text-[10px] font-semibold uppercase tracking-[0.14em] text-paper hover:bg-ink-soft"
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
      <h3 className="font-label text-[10px] font-semibold uppercase tracking-[0.14em] text-label">
        {title}
      </h3>
      <div className="mt-2 font-body text-base leading-[1.5] text-ink-soft">{children}</div>
    </section>
  );
}
