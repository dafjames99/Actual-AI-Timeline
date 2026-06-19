import type { TimelineEvent } from "./types";
import { getAllEvents } from "./getAllEvents";

// Sibling of getAllEvents — same loader boundary. Used by deep-linking (Stage 2).
export async function getEventById(id: string): Promise<TimelineEvent | undefined> {
  const events = await getAllEvents();
  return events.find((e) => e.id === id);
}
