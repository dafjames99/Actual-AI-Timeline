import type { TimelineMode } from "./Timeline";
import { ERAS } from "../data/eras";

// The view axis (SPEC-branching-org-genealogy §6). "branch-lineage" is reserved
// for the deferred idea-genealogy mode (§11) and not yet wired.
export type TimelineView = "flat" | "branch-org" | "branch-lineage";

interface ControlsProps {
  view: TimelineView;
  onView: (v: TimelineView) => void;
  mode: TimelineMode;
  onMode: (m: TimelineMode) => void;
  flagshipOnly: boolean;
  onFlagshipOnly: (v: boolean) => void;
  onJumpEra: (eraKey: string) => void;
  onStartTour: () => void;
  tourAvailable: boolean;
}

/**
 * Timeline controls: the view toggle (flat scrubber ↔ org-genealogy branch view),
 * plus flat-only controls — spacing mode (Date = proportional, Even =
 * equal-per-event, PRD §7), era jumps, and the guided-tour launcher. Mobile-first:
 * a single horizontally-scrollable row.
 */
export default function Controls({
  view,
  onView,
  mode,
  onMode,
  flagshipOnly,
  onFlagshipOnly,
  onJumpEra,
  onStartTour,
  tourAvailable,
}: ControlsProps) {
  const flat = view === "flat";
  return (
    <div className="flex items-center gap-3 overflow-x-auto border-b border-hairline px-4 py-2 text-xs sm:px-6">
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-label text-[10px] font-semibold uppercase tracking-[0.12em] text-label">
          View
        </span>
        <div className="flex overflow-hidden rounded-lg border border-ink">
          <ModeButton
            on={flat}
            onClick={() => onView("flat")}
            label="Timeline"
          />
          <ModeButton
            on={view === "branch-org"}
            onClick={() => onView("branch-org")}
            label="Lineage"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="font-label text-[10px] font-semibold uppercase tracking-[0.12em] text-label">
          Show
        </span>
        <div className="flex overflow-hidden rounded-lg border border-ink">
          <ModeButton
            on={flagshipOnly}
            onClick={() => onFlagshipOnly(true)}
            label="Flagship"
          />
          <ModeButton
            on={!flagshipOnly}
            onClick={() => onFlagshipOnly(false)}
            label="All events"
          />
        </div>
      </div>

      {flat && (
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-label text-[10px] font-semibold uppercase tracking-[0.12em] text-label">
            Spacing
          </span>
          <div className="flex overflow-hidden rounded-lg border border-ink">
            <ModeButton
              on={mode === "date"}
              onClick={() => onMode("date")}
              label="Date"
            />
            <ModeButton
              on={mode === "even"}
              onClick={() => onMode("even")}
              label="Even"
            />
          </div>
        </div>
      )}

      {flat && (
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-label text-[10px] font-semibold uppercase tracking-[0.12em] text-label">
            Jump
          </span>
          {ERAS.map((era) => (
            <button
              key={era.key}
              type="button"
              onClick={() => onJumpEra(era.key)}
              className="shrink-0 border-b border-edge px-0.5 pb-0.5 font-body text-sm text-secondary hover:border-ink"
            >
              {era.label}
            </button>
          ))}
        </div>
      )}

      {flat && tourAvailable && (
        <button
          type="button"
          onClick={onStartTour}
          className="ml-auto shrink-0 rounded-lg bg-ink px-3 py-1.5 font-label text-[10px] font-semibold uppercase tracking-[0.14em] text-paper hover:bg-ink-soft"
        >
          ▶ Guided tour
        </button>
      )}
    </div>
  );
}

function ModeButton({
  on,
  onClick,
  label,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`px-2.5 py-1 font-label text-[10px] font-semibold uppercase tracking-[0.12em] ${on ? "bg-ink text-paper" : "bg-panel text-secondary"}`}
    >
      {label}
    </button>
  );
}
