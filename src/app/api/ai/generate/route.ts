import { NextRequest, NextResponse } from "next/server";
import { generateEventPlan } from "@/lib/ai/generate";

export const maxDuration = 60; // allow longer for AI

export async function POST(req: NextRequest) {
  try {
    // Guard: no key → return helpful demo response
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "OPENAI_API_KEY not configured",
          demo: true,
          message:
            "Add OPENAI_API_KEY in Vercel Environment Variables to enable real AI generation.",
        },
        { status: 503 }
      );
    }

    const body = await req.json();

    const plan = await generateEventPlan({
      type: body.type || "wedding",
      title: body.title || "Untitled Celebration",
      date: body.date,
      guests: body.guests,
      budget: body.budget,
      location: body.location,
      style: body.style,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    console.error("AI generate error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to generate plan",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
