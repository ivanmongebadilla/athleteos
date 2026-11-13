import type { ProfileInput, SessionInput, LogInput } from "./validation";
export type Exercise = { id: string; name: string; name_es?: string | null; aliases?: string[]; athlete_id?: string | null; source?: string | null; equipment?: string | null; body_part?: string | null; discipline: string; archived: boolean };
export type RecordRow = { id: string; exercise_id: string; recorded_on: string; load: number; unit: "lb" | "kg"; repetitions: number; notes: string | null };
export type SessionSummary = { id: string; title: string; scheduled_on: string; status: string; has_results: boolean; intensity: string; duration_minutes: number | null; notes: string | null; updated_at: string; training_weeks: { training_programs: { status: string } } };
export type StoredSection = SessionInput["sections"][number] & { id: string };
export type StoredSession = Omit<SessionInput, "sections"> & { id: string; sections: StoredSection[]; completed: boolean; cancelled: boolean };
export type StoredResult = Omit<LogInput["results"][number], "sets"> & { id: string; completed_at: string; format: string | null; score_details: { intervals?: boolean[]; did_not_finish?: boolean }; sets: LogInput["results"][number]["sets"] };
export type AthleteProfile = ProfileInput & { onboarding_completed_at: string | null };
