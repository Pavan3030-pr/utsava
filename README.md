# Utsava (उत्सव) — AI Celebration & Event Planner

**GenAI-powered planning assistant for weddings, birthdays and community events.**  
Built for PromptWars Virtual – Challenge: Celebration & Event Planner.

> Sanskrit for *festival / celebration*. Designed with deep respect for Indian culture, rituals and multi-day events.

---

## Features

- **Premium light theme** – Clean Google / Microsoft Fluent inspired UI (soft whites, subtle elevation, blue accent `#1a73e8`)
- **Multi-page navigation** – Landing → Auth → Create Event → Interactive Dashboard
- **AI Plan Generation** – Budgets (INR), timelines, vendor checklists, themes & cultural notes
- **Interactive Dashboard** – Overview · Budget · Timeline · Checklist · Ideas · Chat
- **Indian cultural awareness** – Rituals, regional styles, realistic vendor ranges
- **Supabase ready** – Auth + Postgres + RLS schema included
- **OpenAI ready** – Structured output via Vercel AI SDK + Zod
- **Demo mode** – Works without keys; switches to real AI/Auth when keys are present

---

## Tech Stack

| Layer        | Tech                                      |
|--------------|-------------------------------------------|
| Framework    | Next.js 15 (App Router) + TypeScript      |
| Styling      | Tailwind CSS v4                           |
| AI           | Vercel AI SDK + OpenAI + Zod              |
| Auth & DB    | Supabase (Auth + Postgres + RLS)          |
| Deploy       | Vercel                                    |

---

## Getting Started

### 1. Install

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` → `.env.local` (or add them directly in Vercel):

```
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> Without keys the app runs in **demo mode** (still fully navigable).

### 3. Supabase Setup

See **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** for the exact steps and SQL.

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000

---

## Status

| Feature                        | Status      |
|--------------------------------|-------------|
| Landing + multi-page nav       | ✅ Complete |
| Premium light theme            | ✅ Complete |
| Create event wizard            | ✅ Complete |
| Dashboard (all tabs)           | ✅ Complete |
| OpenAI generate endpoint       | ✅ Complete |
| Zod + cultural system prompt   | ✅ Complete |
| Supabase schema + RLS          | ✅ Ready    |
| Supabase client helpers        | ✅ Ready    |
| Demo mode fallback             | ✅ Working  |
| Full Auth form → Supabase      | ⏳ Pending  |
| Persist plans to DB            | ⏳ Pending  |
| Streaming chat refinement      | ⏳ Pending  |
| PDF export                     | ⏳ Pending  |
| Mood-board images (DALL·E)     | ⏳ Pending  |

---

## Deploy on Vercel

1. Import this repo in Vercel
2. Add the 4 environment variables
3. Deploy

After creating your Supabase project and running `schema.sql`, the app will use real Auth + real AI automatically.

---

## Name Meaning

**Utsava (उत्सव)** — Festival, celebration, joyous occasion.  
Chosen so every Indian user immediately feels at home.

---

Built with care for the PromptWars leaderboard.
