import { createClient } from "@supabase/supabase-js";

// Server-only client with the secret key. It bypasses RLS, so use it only for
// writes no user is allowed to make (the daily news headline and its captions).
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is not set.");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: { persistSession: false },
  });
}
