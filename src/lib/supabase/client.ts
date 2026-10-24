import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const CLOUD_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

let client: SupabaseClient | null = null;

export function sb(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}

/** Frictionless real auth: every visitor silently gets a private, RLS-protected account. */
export async function ensureUser(): Promise<string> {
  const c = sb();
  const { data } = await c.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: anon, error } = await c.auth.signInAnonymously();
  if (error || !anon.user) {
    throw new Error("Couldn’t start a secure session. In Supabase enable Authentication → Anonymous sign-ins.");
  }
  return anon.user.id;
}
