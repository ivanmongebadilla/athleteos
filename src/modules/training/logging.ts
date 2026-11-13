import { z } from "zod";
import { logSchema } from "./validation";

export const scoreDetailsSchema = z.object({
  intervals: z.array(z.boolean()).max(1440).optional(),
  interval_scores: z.array(z.number().int().min(0).max(100000)).min(1).max(1440).optional(),
  did_not_finish: z.boolean().optional(),
}).strict();

// Format/plan-dependent rules are also enforced under the session lock in SQL.
export function roundScore(format: string | null, scores: number[]) {
  return format === "tabata" ? Math.min(...scores) : scores.reduce((sum, score) => sum + score, 0);
}
export const sectionLogSchema = z.object({
  session_id: z.uuid(), expected_updated_at: z.string(), expected_result_id: z.uuid().nullable(),
  result: logSchema.shape.results.element.extend({ score_details: scoreDetailsSchema, repetitions: z.number().int().min(0).max(144000000).nullable() }),
}).refine(({ result }) => result.sets.length > 0 || result.completion_seconds !== null || result.rounds !== null || result.repetitions !== null || result.session_rpe !== null || result.notes.trim().length > 0 || result.score_details.did_not_finish === true, { message: "Enter an actual result" });

export function parseClock(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d{1,4}:[0-5]\d$/.test(value.trim())) return Number.NaN;
  const [minutes, seconds] = value.trim().split(":").map(Number);
  return minutes * 60 + seconds;
}
export function formatClock(seconds: number | null) { return seconds === null ? "" : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
