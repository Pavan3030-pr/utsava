import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { EventPlanSchema, type EventPlan } from "./schemas";

export interface GenerateInput {
  type: string;
  title: string;
  date?: string;
  guests?: string | number;
  budget?: string | number;
  location?: string;
  style?: string;
  notes?: string;
}

const SYSTEM_PROMPT = `You are Utsava, an expert Indian celebration & event planner AI.
You deeply understand Indian culture: multi-day weddings (mehendi, sangeet, haldi, pheras, reception), regional variations (North/South/East/West), rituals, family dynamics, and realistic INR budgets.

Always:
- Use Indian Rupees (INR) and realistic 2025-2026 price ranges for the given city/region.
- Respect the event type (wedding, birthday, community, engagement).
- Include culturally relevant checklist items and timeline milestones.
- Suggest practical themes that blend tradition and modernity when appropriate.
- Keep language warm, clear and actionable.
- Output only valid structured data matching the schema.`;

export async function generateEventPlan(input: GenerateInput): Promise<EventPlan> {
  const userPrompt = `
Create a complete, realistic event plan for the following:

Event Type: ${input.type}
Title: ${input.title}
Date: ${input.date || "Not specified"}
Guest Count: ${input.guests || "Not specified"}
Budget (INR): ${input.budget || "Flexible / suggest realistic"}
Location / City: ${input.location || "India (general)"}
Style / Preferences: ${input.style || "Balanced traditional + modern"}
Extra Notes: ${input.notes || "None"}

Generate:
1. A polished title and short summary
2. 3-4 theme ideas
3. Detailed budget breakdown in INR with percentages that sum ~100%
4. Timeline with clear phases (D-90, D-60 ... Day 0 or week-based for birthdays)
5. Categorized checklist (Rituals / Vendors / Guest Experience / Logistics etc.)
6. Optional cultural notes and vendor tips relevant to the location and style
`;

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"), // cost-effective & fast; upgrade to gpt-4o if needed
    schema: EventPlanSchema,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.7,
  });

  return object;
}
