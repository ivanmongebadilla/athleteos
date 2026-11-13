"use server";
import { revalidatePath } from "next/cache";
import { requireAthlete } from "@/lib/supabase/session";
import { coachPreferencesSchema, type CoachPreferences } from "./preferences";
export async function saveCoachPreferences(input: unknown): Promise<{ ok: true; preferences: CoachPreferences } | { ok: false }> {
  const { supabase } = await requireAthlete();
  const parsed = coachPreferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { data, error } = await supabase.rpc("save_coach_preferences", { payload: parsed.data });
  if (error || !data) return { ok: false };
  revalidatePath("/coach");
  return { ok: true, preferences: data as CoachPreferences };
}
