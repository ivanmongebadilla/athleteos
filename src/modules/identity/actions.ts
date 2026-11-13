"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/env";
import { credentialsSchema, loginSchema } from "./validation";
import type { AuthMessageKey } from "@/lib/i18n/messages";

export type AuthState = { error?: AuthMessageKey; message?: AuthMessageKey };
export async function authenticate(_previous: AuthState, form: FormData): Promise<AuthState> {
  if (!getSupabaseEnv()) return { error: "notConfigured" };
  const signup = form.get("intent") === "signup";
  const result = (signup ? credentialsSchema : loginSchema).safeParse({ email: form.get("email"), password: form.get("password") });
  if (!result.success) return { error: signup ? "invalidSignup" : "invalidLogin" };
  const supabase = await createClient();
  try {
    if (signup) {
      const { data, error } = await supabase.auth.signUp(result.data);
      if (error) return { error: "signupFailed" };
      if (!data.session) return { message: "checkEmail" };
    } else {
      const { error } = await supabase.auth.signInWithPassword(result.data);
      if (error) return { error: "loginFailed" };
    }
  } catch { return { error: "unavailable" }; }
  redirect("/today");
}
export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) redirect("/profile?error=signout");
  redirect("/login");
}
