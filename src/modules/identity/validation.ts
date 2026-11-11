import { z } from "zod";
export const credentialsSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(12, "Use at least 12 characters.").max(128),
});
export const loginSchema = credentialsSchema.extend({ password: z.string().min(1).max(128) });
