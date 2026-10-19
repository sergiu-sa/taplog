import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The magic link verifies at Supabase, which redirects here with ?code=. Exchanging it
// needs the PKCE verifier cookie that sendLink set, so it only works in that browser.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect("/");
    console.error("exchangeCodeForSession:", error.message);
  }
  redirect("/login?error=1");
}
