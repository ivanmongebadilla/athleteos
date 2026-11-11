import { z } from "zod";

const schema = z.object({
  url: z.url().refine((value) => /^https?:\/\//.test(value)),
  key: z.string().min(20).refine((key) => !key.includes("replace-with")),
});

export function parseSupabaseEnv(url?: string, key?: string) {
  const result = schema.safeParse({ url, key });
  return result.success ? result.data : null;
}

export function getSupabaseEnv() {
  return parseSupabaseEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
