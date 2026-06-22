import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { getAllEvents } from "./data/getAllEvents";
import { STRAND_KEYS } from "./data/strands";
import { ERAS } from "./data/eras";
import { TOUR } from "./data/tour";
import type { StrandKey, TimelineEvent } from "./data/types";
import Timeline from "./components/Timeline";
import type { TimelineMode } from "./components/Timeline";
import BranchTimeline from "./components/BranchTimeline";
import FilterBar from "./components/FilterBar";
import SearchBar from "./components/SearchBar";
import Controls from "./components/Controls";
import type { TimelineView } from "./components/Controls";
import EventPanel from "./components/EventPanel";
import TourOverlay from "./components/TourOverlay";
import { useSelectedEvent } from "./hooks/useSelectedEvent";

export default function App() {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [visible, setVisible] = useState<Set<StrandKey>>(() => new Set(STRAND_KEYS));
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [mode, setMode] = useState<TimelineMode>("date");
  const [view, setView] = useState<TimelineView>("flat");
  const [center, setCenter] = useState<{ id: string | null; key: number }>({ id: null, key: 0 });
  const [tourIndex, setTourIndex] = useState<number | null>(null);
  const { selectedId, select } = useSelectedEvent();

  useEffect(() => {
    getAllEvents().then(setEvents);
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, TimelineEvent>();
    events?.forEach((e) => m.set(e.id, e));
    return m;
  }, [events]);

  const focus = useCallback((id: string) => setCenter((c) => ({ id, key: c.key + 1 })), []);

  const filterActive = query.trim().length > 0 || activeTags.length > 0;

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
    () =>
      (selected?.related_ids ?? [])
        .map((id) => byId.get(id))
        .filter((e): e is TimelineEvent => !!e),
    [selected, byId],
  );

  // Guided tour: only steps whose events exist in the dataset.
  const tourSteps = useMemo(() => TOUR.filter((s) => byId.has(s.id)), [byId]);
  const tourStep = tourIndex !== null ? tourSteps[tourIndex] : null;
  const tourEvent = tourStep ? byId.get(tourStep.id)! : null;

  // Go to a tour step (or exit if out of range): select + scroll to its event.
  const goStep = useCallback(
    (i: number) => {
      if (i < 0) return;
      if (i >= tourSteps.length) {
        setTourIndex(null);
        return;
      }
      setTourIndex(i);
      select(tourSteps[i].id);
      focus(tourSteps[i].id);
    },
    [tourSteps, select, focus],
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

  const jumpEra = (eraKey: string) => {
    if (!events) return;
    const era = ERAS.find((e) => e.key === eraKey);
    const first = era
      ? events.find((e) => (era.start === null || e.date >= era.start) && (era.end === null || e.date < era.end))
      : undefined;
    if (first) focus(first.id);
  };

  const exitTour = useCallback(() => setTourIndex(null), []);
  const nextStep = useCallback(() => {
    if (tourIndex !== null) goStep(tourIndex + 1);
  }, [tourIndex, goStep]);
  const prevStep = useCallback(() => {
    if (tourIndex !== null) goStep(tourIndex - 1);
  }, [tourIndex, goStep]);

  // Global keyboard shortcuts: Esc closes panel / exits tour; arrows step the tour.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        select(null);
        exitTour();
      } else if (tourIndex !== null) {
        if (e.key === "ArrowRight") nextStep();
        else if (e.key === "ArrowLeft") prevStep();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tourIndex, select, exitTour, nextStep, prevStep]);

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b-2 border-ink px-4 py-6 sm:px-6 sm:py-8">
        <p className="font-label text-[11px] font-semibold uppercase tracking-[0.16em] text-eyebrow">
          A Field Guide
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.1] tracking-[-0.022em] text-ink sm:text-6xl">
          AI Progress Timeline
        </h1>
        <p className="mt-3 max-w-xl font-body text-lg italic leading-snug text-secondary sm:text-xl">
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
      <Controls
        view={view}
        onView={setView}
        mode={mode}
        onMode={setMode}
        onJumpEra={jumpEra}
        onStartTour={() => goStep(0)}
        tourAvailable={tourSteps.length > 0}
      />

      <main className="p-3 sm:p-6">
        {!events ? (
          <p className="text-muted">Loading events…</p>
        ) : view === "branch-org" ? (
          <BranchTimeline
            events={events}
            visibleStrands={visible}
            selectedId={selectedId}
            onSelect={select}
            matchedIds={matchedIds}
            filterActive={filterActive}
          />
        ) : (
          <Timeline
            events={events}
            visibleStrands={visible}
            selectedId={selectedId}
            onSelect={select}
            matchedIds={matchedIds}
            filterActive={filterActive}
            mode={mode}
            centerId={center.id}
            centerKey={center.key}
          />
        )}
      </main>

      <footer className="border-t border-hairline px-4 py-6 sm:px-6">
        <p className="max-w-2xl font-body text-xs leading-relaxed text-muted">
          All product names, logos, and brands are property of their respective owners.
          Logos are used here for identification and editorial purposes only; this site is
          not affiliated with, endorsed by, or sponsored by any of them.
        </p>
      </footer>

      <EventPanel
        event={selected}
        related={related}
        activeTags={activeTags}
        onToggleTag={toggleTag}
        onClose={() => {
          select(null);
          exitTour();
        }}
        onSelect={select}
      />

      <AnimatePresence>
        {tourEvent && tourIndex !== null && (
          <TourOverlay
            event={tourEvent}
            note={tourStep?.note}
            index={tourIndex}
            total={tourSteps.length}
            onPrev={prevStep}
            onNext={nextStep}
            onExit={exitTour}
          />
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}
