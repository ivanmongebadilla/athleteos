import { z } from "zod";
export const coachFocuses = ["balanced", "weightlifting", "strength", "conditioning", "gymnastics"] as const;
export const coachStyles = ["concise", "detailed", "balanced"] as const;
export const coachPreferencesSchema = z.object({
  focus: z.enum(coachFocuses), goal: z.string().trim().max(1000), coaching_style: z.enum(coachStyles),
  expected_updated_at: z.string().min(1).nullable(),
}).strict();
export type CoachPreferencesInput = z.infer<typeof coachPreferencesSchema>;
export type CoachPreferences = Omit<CoachPreferencesInput, "expected_updated_at"> & { updated_at: string; setup_completed_at: string };
