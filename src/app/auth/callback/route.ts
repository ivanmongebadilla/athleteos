import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/env";

// The default Supabase email template redirects to Site URL with a PKCE code.
// Destinations are fixed: caller-supplied next/redirect parameters are ignored.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  let authenticated = false;
  if (getSupabaseEnv() && code && code.length <= 4096) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      authenticated = !error;
    } catch {
      // Do not expose codes, tokens, or provider details in the response.
    }
  }
  redirect(authenticated ? "/today" : "/login?error=confirmation");
}
