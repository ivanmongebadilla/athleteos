import { redirect } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { AuthForm } from "@/components/auth-form";
import { getSupabaseEnv } from "@/lib/env";
import { getMessages } from "@/lib/i18n/server";
import { getSignedInAthlete } from "@/lib/supabase/session";
import Link from "next/link";
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; mode?: string }> }) {
  if (await getSignedInAthlete()) redirect("/today");
  const configured = !!getSupabaseEnv();
  const params = await searchParams;
  const t = await getMessages();
  return <PublicShell><div className="auth-container"><div className="eyebrow">{t.auth.eyebrow}</div><h1>{t.auth.title}<br/>{t.auth.titleEnd}</h1><p>{t.auth.intro}</p><section className="panel auth-panel">{!configured && <p className="notice">{t.auth.unconfigured} <Link href="/setup">{t.auth.setupLink}</Link>.</p>}{params.error && <p role="alert" className="form-error">{t.auth.confirmation}</p>}<AuthForm key={params.mode} configured={configured} initialSignup={params.mode === "signup"}/></section></div></PublicShell>;
}
