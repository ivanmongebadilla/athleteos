import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./server";
import { getSupabaseEnv } from "@/lib/env";

export async function getSignedInAthlete() {
  if (!getSupabaseEnv()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    return error ? null : data.user;
  } catch { return null; }
}

export async function requireAthlete() {
  if (!getSupabaseEnv()) redirect("/setup");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, user: data.user };
}
