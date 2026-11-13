import { z } from "zod";

export const units = ["lb", "kg"] as const;
export const disciplines = ["weightlifting", "strength", "gymnastics", "conditioning", "accessory", "custom"] as const;
export const kinds = ["warmup", "weightlifting", "strength", "gymnastics", "conditioning", "accessories", "cooldown"] as const;
export const formats = ["for_time", "amrap", "emom", "intervals", "tabata", "custom"] as const;
export const dateSchema = z.iso.date().refine(value => new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value);
const text = z.string().trim().max(2000);
const optionalNumber = (schema: z.ZodNumber) => z.preprocess(value => value === "" || value === undefined ? null : value, schema.nullable());
const count = z.number().int().min(0).max(100000);
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(120), preferred_units: z.enum(units),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  primary_goals: z.array(text).max(20), secondary_goals: z.array(text).max(20), limitations: z.array(text).max(20),
  training_days_per_week: z.number().int().min(1).max(7), available_minutes: z.number().int().min(10).max(300),
  timezone: z.string().max(100).refine(value => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }),
  equipment: z.array(text).max(40), disciplines: z.array(text).max(20),
});
export const exerciseSchema = z.object({ name: z.string().trim().min(1).max(120), discipline: z.enum(disciplines) });
export const recordSchema = z.object({ exercise_id: z.uuid(), recorded_on: dateSchema, load: z.number().positive().max(999999.99), unit: z.enum(units), repetitions: z.number().int().min(1).max(1000), notes: text });
export const setSchema = z.object({
  repetitions: z.number().int().min(1).max(1000), load: optionalNumber(z.number().min(0).max(999999.99)), unit: z.enum(units),
  percentage: optionalNumber(z.number().positive().max(110)), target_rpe: optionalNumber(z.number().min(1).max(10)), rest_seconds: optionalNumber(z.number().int().min(0).max(86400)),
});
export const sectionSchema = z.object({
  kind: z.enum(kinds), format: z.enum(formats).nullable(), time_cap_seconds: optionalNumber(z.number().int().positive().max(86400)), instructions: text,
  exercises: z.array(z.object({ exercise_id: z.uuid(), notes: text, sets: z.array(setSchema).max(50) })).max(30),
});
export const sessionSchema = z.object({
  id: z.uuid().nullable(), expected_updated_at: z.string().nullable(), title: z.string().trim().min(1).max(160), scheduled_on: dateSchema,
  status: z.enum(["scheduled", "rest"]), intensity: z.enum(["low", "moderate", "high"]), duration_minutes: optionalNumber(z.number().int().min(1).max(600)),
  notes: text, published: z.boolean(), sections: z.array(sectionSchema).max(12),
}).refine(value => value.status === "rest" ? value.sections.length === 0 : value.sections.length > 0, { path: ["sections"], message: "Training needs a section; rest days must have no sections." });
export const logSchema = z.object({
  session_id: z.uuid(), expected_updated_at: z.string(),
  results: z.array(z.object({
    section_id: z.uuid(), completion_seconds: optionalNumber(count), rounds: optionalNumber(count), repetitions: optionalNumber(count),
    scaled: z.boolean(), session_rpe: optionalNumber(z.number().min(1).max(10)), notes: text,
    sets: z.array(z.object({ exercise_id: z.uuid(), set_number: z.number().int().min(1).max(1000), repetitions: z.number().int().min(0).max(1000), load: z.number().min(0).max(999999.99), unit: z.enum(units), rpe: optionalNumber(z.number().min(1).max(10)), successful: z.boolean(), rest_seconds: optionalNumber(z.number().int().min(0).max(86400)), notes: text })).max(200),
  })).min(1).max(12),
}).refine(value => new Set(value.results.map(row => row.section_id)).size === value.results.length, { message: "Duplicate sections" })
  .refine(value => value.results.some(row => row.sets.length || row.completion_seconds !== null || row.rounds !== null || row.repetitions !== null || row.notes.length || row.session_rpe !== null), { message: "Enter an actual result" });
export type SessionInput = z.infer<typeof sessionSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
export type LogInput = z.infer<typeof logSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
