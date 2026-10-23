# Supabase Setup Guide for Utsava

You will create the project and add the keys in **Vercel**.

## 1. Create Supabase Project

1. Go to https://supabase.com → New Project
2. Choose organization, name it `utsava`, set a strong DB password
3. Region: choose closest to your users (or Mumbai / Singapore for India)
4. Wait ~2 minutes for the project to be ready

## 2. Run the Schema

1. In the Supabase dashboard go to **SQL Editor**
2. Paste the entire contents of `supabase/schema.sql`
3. Click **Run**
4. Confirm tables `profiles` and `events` appear under Table Editor

## 3. Enable Email Auth

- Authentication → Providers → Email → ensure “Enable Email provider” is on
- Optional: disable “Confirm email” for faster testing during the challenge

## 4. Get the Keys

In **Project Settings → API**:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## 5. Add to Vercel

In your Vercel project → Settings → Environment Variables add the four keys, then redeploy.

That’s it. The app will automatically use real Auth + real AI once the keys are present.
