# Supabase setup (5 minutes)

1. Create a free project at https://supabase.com → **New project**.
2. **SQL Editor** → paste all of `supabase/schema.sql` → **Run**.
3. **Authentication → Providers → Anonymous Sign-Ins → enable.**
   (Every visitor silently gets a private account — no login wall, real row-level security.)
4. **Project Settings → API** → copy into `.env.local` (and your host's env vars):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...      # server only — powers the public RSVP page
   ```
5. Restart `npm run dev`. The Guests & RSVP tab and cloud sync are now live.

Without these keys the app still works in local-only mode (plans in the browser; no guest RSVPs).
