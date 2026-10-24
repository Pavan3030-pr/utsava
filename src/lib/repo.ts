import { CLOUD_ENABLED, ensureUser, sb } from "./supabase/client";
import { EMPTY_LEDGER, type Intake, type Ledger, type StoredPlan } from "./schemas";

export interface EventRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  intake: Intake;
  plan: StoredPlan | null;
  ledger: Ledger;
}

export interface Repo {
  mode: "cloud" | "local";
  list(): Promise<EventRecord[]>;
  get(id: string): Promise<EventRecord | null>;
  create(intake: Intake): Promise<EventRecord>;
  save(rec: EventRecord): Promise<void>;
  remove(id: string): Promise<void>;
}

/* ------------------------------ local (browser) ------------------------------ */
const KEY = "utsava:v2:events";

function readLocal(): EventRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.map((e) => ({ ...e, ledger: e.ledger ?? EMPTY_LEDGER })) : [];
  } catch {
    return [];
  }
}
function writeLocal(events: EventRecord[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(events.slice(-30)));
  } catch { /* storage full/disabled */ }
}
const localId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));

const local: Repo = {
  mode: "local",
  async list() { return readLocal().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); },
  async get(id) { return readLocal().find((e) => e.id === id) ?? null; },
  async create(intake) {
    const now = new Date().toISOString();
    const rec: EventRecord = { id: localId(), createdAt: now, updatedAt: now, intake, plan: null, ledger: EMPTY_LEDGER };
    writeLocal([...readLocal(), rec]);
    return rec;
  },
  async save(rec) {
    writeLocal([...readLocal().filter((e) => e.id !== rec.id), { ...rec, updatedAt: new Date().toISOString() }]);
  },
  async remove(id) { writeLocal(readLocal().filter((e) => e.id !== id)); },
};

/* ------------------------------ cloud (Supabase) ------------------------------ */
interface Row { id: string; created_at: string; updated_at: string; intake: Intake; plan: StoredPlan | null; ledger: Ledger | null }
const fromRow = (r: Row): EventRecord => ({
  id: r.id, createdAt: r.created_at, updatedAt: r.updated_at, intake: r.intake, plan: r.plan, ledger: r.ledger ?? EMPTY_LEDGER,
});

const cloud: Repo = {
  mode: "cloud",
  async list() {
    await ensureUser();
    const { data, error } = await sb().from("events").select("*").order("updated_at", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return (data as Row[]).map(fromRow);
  },
  async get(id) {
    await ensureUser();
    const { data, error } = await sb().from("events").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? fromRow(data as Row) : null;
  },
  async create(intake) {
    await ensureUser();
    const { data, error } = await sb().from("events").insert({ intake, plan: null, ledger: EMPTY_LEDGER }).select("*").single();
    if (error) throw new Error(error.message);
    return fromRow(data as Row);
  },
  async save(rec) {
    await ensureUser();
    const { error } = await sb().from("events").update({ intake: rec.intake, plan: rec.plan, ledger: rec.ledger }).eq("id", rec.id);
    if (error) throw new Error(error.message);
  },
  async remove(id) {
    await ensureUser();
    const { error } = await sb().from("events").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};

export const repo: Repo = CLOUD_ENABLED ? cloud : local;
