import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./server";
import { getSupabaseEnv } from "@/lib/env";

export async function requireAthlete() {
  if (!getSupabaseEnv()) redirect("/setup");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, user: data.user };
}
