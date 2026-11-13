import "server-only";
import { requireAthlete } from "@/lib/supabase/session";
import type { AthleteProfile, Exercise, SessionSummary, StoredSession, StoredResult, RecordRow } from "./types";
const sessionSelect = "id,title,scheduled_on,status,intensity,duration_minutes,notes,updated_at,training_weeks!inner(training_programs!inner(status))";
export async function getTrainingHome() {
  const { supabase, user } = await requireAthlete();
  const [profile, settings] = await Promise.all([
    supabase.from("profiles").select("name,preferred_units,experience,primary_goals,secondary_goals,limitations").eq("id", user.id).single(),
    supabase.from("athlete_settings").select("training_days_per_week,available_minutes,timezone,equipment,disciplines,onboarding_completed_at").eq("athlete_id", user.id).single(),
  ]);
  if (profile.error || settings.error) throw new Error("Athlete settings unavailable");
  return { profile: { ...profile.data, ...settings.data } as AthleteProfile, email: user.email };
}
export async function getLibrary() {
  const { supabase, user } = await requireAthlete();
  // PostgREST caps each response at 1,000 rows. Fetch every visible catalog/private
  // exercise in stable pages; RLS, rather than a private-only filter, scopes reads.
  async function readExercises() {
    const rows: Exercise[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from("exercises").select("id,name,name_es,aliases,athlete_id,source,equipment,body_part,discipline,archived").order("id").range(offset, offset + 499);
      if (error) throw new Error("Exercise library unavailable");
      rows.push(...data as Exercise[]);
      if (data.length < 500) return rows.sort((a, b) => a.name.localeCompare(b.name));
    }
  }
  const [exercises, records] = await Promise.all([
    readExercises(),
    supabase.from("personal_records").select("id,exercise_id,recorded_on,load,unit,repetitions,notes").eq("athlete_id", user.id).order("recorded_on", { ascending: false }).limit(1000),
  ]);
  if (records.error) throw new Error("Exercise library unavailable");
  return { exercises, records: records.data as RecordRow[] };
}
export async function getSchedule(start: string, end: string) {
  const { supabase, user } = await requireAthlete();
  const { data, error } = await supabase.from("training_sessions").select(`${sessionSelect},workout_results(id)`).eq("athlete_id", user.id).gte("scheduled_on", start).lte("scheduled_on", end).order("scheduled_on").order("created_at");
  if (error) throw new Error("Schedule unavailable");
  return data.map(row => ({ ...row, has_results: row.workout_results.length > 0 })) as unknown as SessionSummary[];
}
export async function getSession(id: string) {
  const { supabase, user } = await requireAthlete();
  const { data, error } = await supabase.from("training_sessions").select(`${sessionSelect},workout_sections(id,position,kind,format,time_cap_seconds,instructions,prescribed_exercises(position,exercise_id,notes,prescribed_sets(set_number,repetitions,load,unit,percentage,target_rpe,rest_seconds))),workout_results(id,section_id,completed_at,format,score_details,completion_seconds,rounds,repetitions,scaled,session_rpe,notes,completed_sets(exercise_id,set_number,repetitions,load,unit,rpe,successful,rest_seconds,notes))`).eq("athlete_id", user.id).eq("id", id).maybeSingle();
  if (error) throw new Error("Session unavailable");
  if (!data) return null;
  const summary = data as unknown as SessionSummary;
  const session: StoredSession = {
    id: data.id, expected_updated_at: data.updated_at, title: data.title, scheduled_on: data.scheduled_on,
    status: data.status === "rest" ? "rest" : "scheduled", intensity: data.intensity, duration_minutes: data.duration_minutes, notes: data.notes ?? "",
    published: summary.training_weeks.training_programs.status === "published", completed: data.status === "completed", cancelled: data.status === "cancelled",
    sections: data.workout_sections.sort((a, b) => a.position - b.position).map(section => ({ ...section, instructions: section.instructions ?? "", exercises: section.prescribed_exercises.sort((a, b) => a.position - b.position).map(exercise => ({ exercise_id: exercise.exercise_id, notes: exercise.notes ?? "", sets: exercise.prescribed_sets.sort((a, b) => a.set_number - b.set_number).map(set => ({ ...set, unit: set.unit ?? "lb" })) })) })),
  };
  const results = data.workout_results.map(result => ({ ...result, notes: result.notes ?? "", sets: result.completed_sets.map(set => ({ ...set, notes: set.notes ?? "" })) })) as StoredResult[];
  return { session, results };
}

