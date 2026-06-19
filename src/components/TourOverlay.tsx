import { motion } from "framer-motion";
import type { TimelineEvent } from "../data/types";

interface TourOverlayProps {
  event: TimelineEvent; // current step's event
  note?: string;
  index: number; // 0-based
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
}

/**
 * Guided-tour control bar (PRD §7). Floats at the top so it stays clear of the
 * bottom-sheet detail panel. Stepping pans/zooms the timeline to each event and
 * opens its panel (wired in App).
 */
export default function TourOverlay({
  event,
  note,
  index,
  total,
  onPrev,
  onNext,
  onExit,
}: TourOverlayProps) {
  const last = index === total - 1;
  return (
    <motion.div
      className="fixed inset-x-0 top-2 z-30 mx-auto w-[calc(100%-1rem)] max-w-md rounded-xl bg-ink p-3 text-paper shadow-xl sm:top-4"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
    >
      <div className="flex items-center justify-between text-xs text-tour-muted">
        <span className="font-mono tracking-[0.1em]">
          Guided tour · {index + 1} / {total}
        </span>
        <button
          type="button"
          onClick={onExit}
          className="font-label text-[10px] font-semibold uppercase tracking-[0.14em] hover:text-paper"
          aria-label="Exit tour"
        >
          Exit ✕
        </button>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold leading-[1.1] text-panel">
        {event.title}
      </p>
      {note && <p className="mt-1 font-body text-base italic leading-snug text-tour-note">{note}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={index === 0}
          className="flex-1 rounded-lg border border-secondary px-3 py-1.5 font-label text-[10px] font-semibold uppercase tracking-[0.14em] disabled:opacity-40"
        >
          ← Prev
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 rounded-lg bg-paper px-3 py-1.5 font-label text-[10px] font-semibold uppercase tracking-[0.14em] text-ink"
        >
          {last ? "Finish" : "Next →"}
        </button>
      </div>
    </motion.div>
  );
}
