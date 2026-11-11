import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (getSupabaseEnv() && token && type === "email") {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: type as EmailOtpType });
    if (!error) return NextResponse.redirect(new URL("/today", request.url));
  }
  return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
}
