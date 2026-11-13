import "server-only";
import { requireAthlete } from "@/lib/supabase/session";
import type { CoachPreferences } from "./preferences";
export async function getCoachPreferences() {
  const { supabase, user } = await requireAthlete();
  const { data, error } = await supabase.from("coach_preferences").select("focus,goal,coaching_style,updated_at,setup_completed_at").eq("athlete_id", user.id).maybeSingle();
  if (error) throw new Error("Coach preferences unavailable");
  return data as CoachPreferences | null;
}
