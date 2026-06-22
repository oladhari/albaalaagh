import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Falls back to anon key client-side so the module doesn't throw when
// SUPABASE_SERVICE_ROLE_KEY is absent (server-only env var).
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey;

// Public client (browser-safe, no auth session)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-only admin client (bypasses RLS — only correct on the server)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Browser auth client (tracks session via cookies)
export function createBrowserSupabase() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
