"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAthlete } from "@/lib/supabase/session";
import { exerciseSchema, recordSchema, profileSchema, sessionSchema, logSchema } from "./validation";
import { sectionLogSchema } from "./logging";
export type SaveState = { ok: boolean; code?: "invalid" | "saveError" | "saved"; id?: string };
export async function deleteSession(input: unknown): Promise<SaveState> {
  const { supabase } = await requireAthlete();
  const parsed=z.object({id:z.uuid(),expected_updated_at:z.string().min(1)}).safeParse(input);
  if(!parsed.success) return {ok:false,code:"invalid"};
  const {data,error}=await supabase.rpc("delete_training_session",{payload:parsed.data});
  if(error || !z.uuid().safeParse(data).success) return {ok:false,code:"saveError"};
  refresh(); return {ok:true,id:data};
}
export async function restoreSession(id: string): Promise<SaveState> {
  const { supabase } = await requireAthlete();
  if(!z.uuid().safeParse(id).success) return {ok:false,code:"invalid"};
  const {data,error}=await supabase.rpc("restore_training_session",{session_id:id});
  if(error || !z.uuid().safeParse(data).success) return {ok:false,code:"saveError"};
  refresh(); return {ok:true,id:data};
}
export async function readExerciseInstructions(id: string): Promise<{ en?: string; es?: string } | null> {
  const { supabase } = await requireAthlete();
  if (!z.uuid().safeParse(id).success) return null;
  const { data, error } = await supabase.from("exercises").select("instructions").eq("id", id).maybeSingle();
  if (error || !data) return null;
  const parsed = z.object({ en: z.string().optional(), es: z.string().optional() }).safeParse(data.instructions);
  return parsed.success ? parsed.data : null;
}
export async function saveSectionLog(input: unknown): Promise<SaveState & { completed_at?: string }> {
  const { supabase } = await requireAthlete();
  const parsed = sectionLogSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { data, error } = await supabase.rpc("save_workout_section", { payload: parsed.data });
  if (error) return { ok: false, code: "saveError" };
  const saved = z.object({ id: z.uuid(), completed_at: z.string() }).safeParse(data);
  if (!saved.success) return { ok: false, code: "saveError" };
  refresh(); return { ok: true, code: "saved", ...saved.data };
}
function refresh() { ["/today", "/calendar", "/progress", "/profile"].forEach(path => revalidatePath(path)); revalidatePath("/sessions", "layout"); }
export async function saveProfile(input: unknown): Promise<SaveState> {
  const { supabase } = await requireAthlete();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { error } = await supabase.rpc("save_athlete_profile", { payload: parsed.data });
  if (error) return { ok: false, code: "saveError" };
  revalidatePath("/", "layout"); return { ok: true, code: "saved" };
}
export async function saveExercise(input: unknown): Promise<SaveState> {
  const { supabase, user } = await requireAthlete();
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { error } = await supabase.from("exercises").insert({ ...parsed.data, athlete_id: user.id });
  if (error) return { ok: false, code: "saveError" };
  refresh(); return { ok: true, code: "saved" };
}
export async function setExerciseArchived(input: unknown): Promise<SaveState> {
  const { supabase, user } = await requireAthlete();
  const parsed = z.object({ id: z.uuid(), archived: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { data, error } = await supabase.from("exercises").update({ archived: parsed.data.archived }).eq("id", parsed.data.id).eq("athlete_id", user.id).select("id").single();
  if (error || !data) return { ok: false, code: "saveError" };
  refresh(); return { ok: true, code: "saved" };
}
export async function saveRecord(input: unknown): Promise<SaveState> {
  const { supabase, user } = await requireAthlete();
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { error } = await supabase.from("personal_records").insert({ ...parsed.data, athlete_id: user.id });
  if (error) return { ok: false, code: "saveError" };
  refresh(); return { ok: true, code: "saved" };
}
export async function saveSession(input: unknown): Promise<SaveState> {
  const { supabase } = await requireAthlete();
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { data, error } = await supabase.rpc("save_training_session", { payload: parsed.data });
  if (error) return { ok: false, code: "saveError" };
  refresh(); return { ok: true, code: "saved", id: data as string };
}
export async function saveLog(input: unknown): Promise<SaveState> {
  const { supabase } = await requireAthlete();
  const parsed = logSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { error } = await supabase.rpc("complete_training_session", { payload: parsed.data });
  if (error) return { ok: false, code: "saveError" };
  refresh(); return { ok: true, code: "saved" };
}
