import type { TimelineMode } from "./Timeline";
import { ERAS } from "../data/eras";

interface ControlsProps {
  mode: TimelineMode;
  onMode: (m: TimelineMode) => void;
  onJumpEra: (eraKey: string) => void;
  onStartTour: () => void;
  tourAvailable: boolean;
}

/**
 * Timeline controls: spacing mode (Date = proportional, Even = equal-per-event,
 * PRD §7), era jumps, and the guided-tour launcher. Mobile-first: a single
 * horizontally-scrollable row.
 */
export default function Controls({
  mode,
  onMode,
  onJumpEra,
  onStartTour,
  tourAvailable,
}: ControlsProps) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto border-b border-slate-200 px-4 py-2 text-xs sm:px-6">
      <div className="flex shrink-0 items-center gap-1">
        <span className="text-slate-400">Spacing:</span>
        <div className="flex overflow-hidden rounded-lg border border-slate-300">
          <ModeButton on={mode === "date"} onClick={() => onMode("date")} label="Date" />
          <ModeButton on={mode === "even"} onClick={() => onMode("even")} label="Even" />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span className="text-slate-400">Jump:</span>
        {ERAS.map((era) => (
          <button
            key={era.key}
            type="button"
            onClick={() => onJumpEra(era.key)}
            className="shrink-0 rounded-full border border-slate-200 px-2 py-1 text-slate-600 hover:border-slate-400"
          >
            {era.label}
          </button>
        ))}
      </div>

      {tourAvailable && (
        <button
          type="button"
          onClick={onStartTour}
          className="ml-auto shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700"
        >
          ▶ Guided tour
        </button>
      )}
    </div>
  );
}

function ModeButton({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`px-2.5 py-1 ${on ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}
    >
      {label}
    </button>
  );
}
