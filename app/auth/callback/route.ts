import { NextResponse } from "next/server";
import { createClient, getUserAndProfile, needsName } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // First-time users (no first/last name yet) go fill in their name.
  const { user, profile } = await getUserAndProfile();
  const next = user && needsName(profile) ? "/onboarding" : "/";

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
