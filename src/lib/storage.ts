import type { Intake, StoredPlan } from "./schemas";

export interface StoredEvent {
  id: string;
  createdAt: string;
  updatedAt: string;
  intake: Intake;
  plan: StoredPlan | null;
}

const KEY = "utsava:v1:events";

function read(): StoredEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(events: StoredEvent[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(events));
  } catch {
    /* storage full or disabled — the app still works for this session */
  }
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}

export const listEvents = (): StoredEvent[] =>
  read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const getEvent = (id: string): StoredEvent | null => read().find((e) => e.id === id) ?? null;

export function saveEvent(event: StoredEvent): void {
  const all = read().filter((e) => e.id !== event.id);
  all.push({ ...event, updatedAt: new Date().toISOString() });
  write(all.slice(-30));
}

export function createEvent(intake: Intake): StoredEvent {
  const now = new Date().toISOString();
  const event: StoredEvent = { id: newId(), createdAt: now, updatedAt: now, intake, plan: null };
  saveEvent(event);
  return event;
}

export function deleteEvent(id: string): void {
  write(read().filter((e) => e.id !== id));
}
