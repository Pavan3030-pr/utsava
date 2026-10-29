import { z } from "zod";

export const EVENT_TYPES = ["wedding", "engagement", "birthday", "baby", "community", "other"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_META: Record<EventType, { label: string; emoji: string; hint: string }> = {
  wedding: { label: "Wedding", emoji: "💍", hint: "Multi-day rituals & receptions" },
  engagement: { label: "Engagement", emoji: "✨", hint: "Roka, sagai, ring ceremony" },
  birthday: { label: "Birthday", emoji: "🎂", hint: "Kids, milestones, surprises" },
  baby: { label: "Baby ceremony", emoji: "🍼", hint: "Baby shower, naming, annaprashan" },
  community: { label: "Community event", emoji: "🪔", hint: "Festivals, pujas, society meets" },
  other: { label: "Something else", emoji: "🎉", hint: "Anniversary, farewell, reunion" },
};

export const LANGUAGES = {
  en: "English",
  hi: "Hindi (हिन्दी)",
  te: "Telugu (తెలుగు)",
  ta: "Tamil (தமிழ்)",
  kn: "Kannada (ಕನ್ನಡ)",
  ml: "Malayalam (മലയാളം)",
  mr: "Marathi (मराठी)",
  bn: "Bengali (বাংলা)",
  gu: "Gujarati (ગુજરાતી)",
} as const;
export type LanguageCode = keyof typeof LANGUAGES;
const languageCodes = Object.keys(LANGUAGES) as [LanguageCode, ...LanguageCode[]];

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), "Not a real date");

/** What the user tells us. Validated on the client AND the server. */
export const IntakeSchema = z.object({
  type: z.enum(EVENT_TYPES),
  title: z.string().trim().min(2, "Give your event a name").max(120),
  date: isoDate.optional(),
  guests: z.number().int().min(1).max(10000).optional(),
  budget: z.number().min(10000, "Budget should be at least ₹10,000").max(1_000_000_000).optional(),
  location: z.string().trim().max(80).optional(),
  style: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
  language: z.enum(languageCodes).default("en"),
});
export type Intake = z.infer<typeof IntakeSchema>;

/** Natural-language → structured intake (everything optional). */
export const ParsedIntakeSchema = z.object({
  type: z.enum(EVENT_TYPES).optional(),
  title: z.string().optional(),
  date: z.string().optional().describe("YYYY-MM-DD, resolved relative to today"),
  guests: z.number().optional(),
  budget: z.number().optional().describe("Total budget in INR as a plain number"),
  location: z.string().optional(),
  style: z.string().optional(),
  notes: z.string().optional(),
  language: z.enum(languageCodes).optional(),
});
export type ParsedIntake = z.infer<typeof ParsedIntakeSchema>;

const Priority = z.enum(["high", "medium", "low"]);

/** The plan Gemini generates. Plain JSON-schema-friendly types only. */
export const PlanSchema = z.object({
  title: z.string(),
  tagline: z.string().describe("Warm one-line tagline, max 12 words"),
  summary: z.string().describe("2-3 sentence overview that states key assumptions"),
  themes: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      palette: z.array(z.string()).describe("3-5 hex colours such as #F59E0B"),
      decor: z.array(z.string()).describe("3-4 concrete décor or experience ideas"),
    }),
  ),
  budget: z.object({
    total: z.number().describe("Total in INR"),
    breakdown: z.array(
      z.object({
        category: z.string(),
        amount: z.number().describe("INR"),
        percentage: z.number(),
        notes: z.string(),
        savingTip: z.string(),
      }),
    ),
  }),
  schedule: z.array(
    z.object({
      day: z.string().describe("e.g. 'Day 1 · Haldi' or 'Party day'"),
      name: z.string(),
      vibe: z.string(),
      items: z.array(z.object({ time: z.string(), activity: z.string() })),
    }),
  ),
  timeline: z.array(
    z.object({
      daysBefore: z.number().describe("Days before the event; 0 = event day"),
      title: z.string(),
      description: z.string(),
    }),
  ),
  checklist: z.array(
    z.object({
      category: z.string(),
      items: z.array(z.object({ task: z.string(), priority: Priority, completed: z.boolean() })),
    }),
  ),
  vendors: z.array(
    z.object({
      category: z.string(),
      whatToLookFor: z.string(),
      questionsToAsk: z.array(z.string()),
      estimatedRange: z.string(),
      bookBy: z.string(),
    }),
  ),
  culturalNotes: z.array(z.string()),
  risks: z.array(z.object({ risk: z.string(), mitigation: z.string() })),
  invitation: z.object({
    language: z.string(),
    message: z.string().describe("Warm WhatsApp-ready invitation using [Guest name] placeholder"),
  }),
});
export type EventPlan = z.infer<typeof PlanSchema>;

/** Plan as persisted in the browser (adds verification metadata). */
export type StoredPlan = EventPlan & {
  meta?: { budgetAdjusted: boolean; generatedAt: string; duplicatesRemoved?: number };
};

export const ParseRequestSchema = z.object({ text: z.string().trim().min(5).max(800) });
export const RefineRequestSchema = z.object({
  intake: IntakeSchema,
  plan: PlanSchema,
  instruction: z.string().trim().min(3).max(500),
  /** 0 = primary model; 1–2 = silent retries on the fallback chain */
  attempt: z.number().int().min(0).max(2).default(0),
  /** last few turns so "a bit cheaper than that" makes sense */
  history: z.array(z.object({ instruction: z.string().max(300), reply: z.string().max(400) })).max(3).default([]),
});

/** Recursively-optional version used while a plan is still streaming in. */
export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;
export type PartialPlan = DeepPartial<StoredPlan>;

/* ---------- Parallel generation: 3 independent slices of the plan ---------- */
export const PlanCoreSchema = PlanSchema.pick({ title: true, tagline: true, summary: true, budget: true });
export const PlanScheduleSchema = PlanSchema.pick({ schedule: true, timeline: true });
export const PlanOpsSchema = PlanSchema.pick({ checklist: true, vendors: true });
export const PlanIdeasSchema = PlanSchema.pick({ themes: true, culturalNotes: true, risks: true, invitation: true });

export const PLAN_PARTS = ["core", "schedule", "ops", "ideas"] as const;
export type PlanPart = (typeof PLAN_PARTS)[number];
export const PART_SCHEMAS = {
  core: PlanCoreSchema, schedule: PlanScheduleSchema, ops: PlanOpsSchema, ideas: PlanIdeasSchema,
} as const;
export const PART_LABELS: Record<PlanPart, string> = {
  core: "Budget & summary", schedule: "Schedule & timeline", ops: "Checklist & vendors", ideas: "Themes & invitation",
};

export const PartQuerySchema = z.enum(PLAN_PARTS);

/** Slice request = the intake plus which retry attempt this is (0 = first try → primary model). */
export const StreamRequestSchema = IntakeSchema.extend({ attempt: z.number().int().min(0).max(2).default(0) });

/* ---------- Guests & RSVPs ---------- */
export type RsvpStatus = "yes" | "no" | "maybe";
export interface Rsvp { event: string; status: RsvpStatus; partySize: number; note?: string }
export interface Guest {
  id: string;
  eventId: string;
  name: string;
  phone?: string;
  group?: string;
  diet?: string;
  /** names of the sub-events (mehendi, sangeet…) this guest is invited to */
  invited: string[];
  token: string;
  rsvps: Rsvp[];
}

export const RsvpSubmitSchema = z.object({
  responses: z
    .array(
      z.object({
        event: z.string().trim().min(1).max(120),
        status: z.enum(["yes", "no", "maybe"]),
        partySize: z.number().int().min(1).max(20),
        note: z.string().trim().max(300).optional(),
      }),
    )
    .min(1)
    .max(12),
});

/* ---------- Spend tracker & vendor pipeline (stored with the event) ---------- */
export interface Expense {
  id: string;
  category: string;
  vendor: string;
  note?: string;
  amount: number;
  paid: number;
  dueDate?: string;
}
export type ShortlistStatus = "shortlisted" | "quoted" | "booked" | "rejected";
export interface ShortlistItem {
  id: string;
  category: string;
  name: string;
  phone?: string;
  quote?: number;
  status: ShortlistStatus;
  notes?: string;
}
export interface Ledger { expenses: Expense[]; shortlist: ShortlistItem[]; /** YYYY-MM-DD — guests are asked to reply by this date */ rsvpBy?: string }
export const EMPTY_LEDGER: Ledger = { expenses: [], shortlist: [] };

export const RefineResultSchema = z.object({
  reply: z.string().describe("Friendly 1-2 sentence answer to the user"),
  changes: z.array(z.string()).describe("Short bullet list of what changed"),
  updates: z
    .object({
      core: PlanCoreSchema.optional(),
      schedule: PlanScheduleSchema.optional(),
      ops: PlanOpsSchema.optional(),
      ideas: PlanIdeasSchema.optional(),
    })
    .describe("Include a slice ONLY if it must change; each included slice must be complete"),
});
export type RefineResult = z.infer<typeof RefineResultSchema>;
