import "server-only";
import { requireAthlete } from "@/lib/supabase/session";
import type { RecordRow } from "./types";
import type { ProgressResult, ProgressSession } from "./progress";

// Stable pagination avoids silently truncating longer training histories at
// PostgREST's per-response limit. Each result has at most 200 completed sets.
async function pages<T>(query: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await query(from, from + 499);
    if (error || !data) throw new Error("Progress history unavailable");
    rows.push(...data as T[]);
    if (data.length < 500) return rows;
  }
}
export async function getProgressHistory() {
  const { supabase, user } = await requireAthlete();
  const [sessions, results, records] = await Promise.all([
    pages<ProgressSession>((from, to) => supabase.from("training_sessions").select("id,title,scheduled_on,status").eq("athlete_id", user.id).order("id").range(from, to)),
    pages<ProgressResult>((from, to) => supabase.from("workout_results").select("id,section_id,completed_at,format,completion_seconds,scaled,score_details,training_sessions!inner(id,title,scheduled_on,status),workout_sections!inner(kind,instructions,prescribed_exercises(position,exercise_id,prescribed_sets(set_number,repetitions,load,unit,percentage))),completed_sets(exercise_id,repetitions,load,unit,successful)").eq("athlete_id", user.id).order("id").range(from, to)),
    pages<RecordRow>((from, to) => supabase.from("personal_records").select("id,exercise_id,recorded_on,load,unit,repetitions,notes").eq("athlete_id", user.id).order("id").range(from, to)),
  ]);
  return { sessions, results, records };
}
