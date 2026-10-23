import { z } from "zod";

export const EventPlanSchema = z.object({
  title: z.string(),
  summary: z.string(),
  themes: z.array(z.string()).min(2).max(5),
  budget: z.object({
    total: z.number(),
    currency: z.literal("INR"),
    breakdown: z.array(
      z.object({
        category: z.string(),
        amount: z.number(),
        percentage: z.number(),
        notes: z.string().optional(),
      })
    ),
  }),
  timeline: z.array(
    z.object({
      phase: z.string(), // e.g. "D-90", "Week -4", "Day 0"
      title: z.string(),
      description: z.string().optional(),
      status: z.enum(["upcoming", "in_progress", "done"]).default("upcoming"),
    })
  ),
  checklist: z.array(
    z.object({
      category: z.string(),
      items: z.array(
        z.object({
          task: z.string(),
          priority: z.enum(["high", "medium", "low"]).default("medium"),
          completed: z.boolean().default(false),
        })
      ),
    })
  ),
  culturalNotes: z.array(z.string()).optional(),
  vendorSuggestions: z
    .array(
      z.object({
        category: z.string(),
        tips: z.string(),
      })
    )
    .optional(),
});

export type EventPlan = z.infer<typeof EventPlanSchema>;
