import { useCallback, useEffect, useState } from "react";

const PARAM = "event";

function readParam(): string | null {
  return new URLSearchParams(window.location.search).get(PARAM);
}

/**
 * Source of truth for which event is open, synced to the `?event=<id>` query
 * param so deep-links work (PRD §10). Reading on mount opens a shared link;
 * selecting updates the URL without a navigation/reload.
 */
export function useSelectedEvent() {
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : readParam(),
  );

  // Keep state in sync with back/forward navigation.
  useEffect(() => {
    const onPop = () => setSelectedId(readParam());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set(PARAM, id);
    else url.searchParams.delete(PARAM);
    window.history.replaceState({}, "", url);
  }, []);

  return { selectedId, select };
}
