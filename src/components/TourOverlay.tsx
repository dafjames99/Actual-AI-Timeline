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
      className="fixed inset-x-0 top-2 z-30 mx-auto w-[calc(100%-1rem)] max-w-md rounded-xl bg-slate-900 p-3 text-white shadow-xl sm:top-4"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
    >
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>
          Guided tour · {index + 1} / {total}
        </span>
        <button type="button" onClick={onExit} className="hover:text-white" aria-label="Exit tour">
          Exit ✕
        </button>
      </div>
      <p className="mt-1 text-sm font-semibold">{event.title}</p>
      {note && <p className="mt-0.5 text-xs text-slate-300">{note}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={index === 0}
          className="flex-1 rounded-lg border border-slate-600 px-3 py-1.5 text-sm disabled:opacity-40"
        >
          ← Prev
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-900"
        >
          {last ? "Finish" : "Next →"}
        </button>
      </div>
    </motion.div>
  );
}
