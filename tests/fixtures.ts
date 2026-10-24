import type { EventPlan, Intake } from "../src/lib/schemas";

export const intake: Intake = {
  type: "wedding", title: "Priya & Rahul", date: "2027-02-14", guests: 200,
  budget: 2_500_000, location: "Hyderabad", language: "en",
};

export const plan: EventPlan = {
  title: "Priya & Rahul", tagline: "Two families, one celebration", summary: "A joyful wedding.",
  themes: [{ name: "Marigold", description: "Warm", palette: ["#F59E0B", "nope", "#B4234E"], decor: ["Garlands"] }],
  budget: {
    total: 2_000_000,
    breakdown: [
      { category: "Venue", amount: 800_000, percentage: 40, notes: "", savingTip: "" },
      { category: "Catering", amount: 700_000, percentage: 35, notes: "", savingTip: "" },
      { category: "Decor", amount: 400_000, percentage: 20, notes: "", savingTip: "" },
      { category: "Contingency", amount: 100_000, percentage: 5, notes: "", savingTip: "" },
    ],
  },
  schedule: [{ day: "Day 1", name: "Wedding", vibe: "Sacred", items: [{ time: "9:00 AM", activity: "Muhurtham" }] }],
  timeline: [
    { daysBefore: 0, title: "Wedding day", description: "Enjoy" },
    { daysBefore: 90, title: "Book venue", description: "Deposit, due" },
    { daysBefore: 30, title: "Send invites", description: "WhatsApp; print" },
  ],
  checklist: [
    { category: "Vendors", items: [
      { task: "Book caterer", priority: "high", completed: true },
      { task: "Book DJ", priority: "low", completed: false },
    ] },
  ],
  vendors: [], culturalNotes: [], risks: [],
  invitation: { language: "English", message: "Join us, [Guest name]" },
};
