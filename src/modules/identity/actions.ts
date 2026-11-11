"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/env";
import { credentialsSchema, loginSchema } from "./validation";

export type AuthState = { error?: string; message?: string };
export async function authenticate(_previous: AuthState, form: FormData): Promise<AuthState> {
  if (!getSupabaseEnv()) return { error: "Connect Supabase before signing in." };
  const signup = form.get("intent") === "signup";
  const result = (signup ? credentialsSchema : loginSchema).safeParse({ email: form.get("email"), password: form.get("password") });
  if (!result.success) return { error: signup ? "Enter a valid email and a password of 12–128 characters." : "Enter a valid email and password." };
  const supabase = await createClient();
  try {
    if (signup) {
      const { data, error } = await supabase.auth.signUp(result.data);
      if (error) return { error: "Unable to create an account. Try again later or sign in." };
      if (!data.session) return { message: "Check your email to confirm your account, then sign in." };
    } else {
      const { error } = await supabase.auth.signInWithPassword(result.data);
      if (error) return { error: "Unable to sign in. Check your credentials and email confirmation." };
    }
  } catch { return { error: "Authentication is temporarily unavailable. Please try again." }; }
  redirect("/today");
}
export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) redirect("/profile?error=signout");
  redirect("/login");
}
