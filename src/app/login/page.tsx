import Link from "next/link";
import { Shell } from "@/components/shell";
import { AuthForm } from "@/components/auth-form";
import { getSupabaseEnv } from "@/lib/env";
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const configured = !!getSupabaseEnv();
  const params = await searchParams;
  return <Shell setup><div className="auth-container"><div className="eyebrow">YOUR TRAINING STARTS WITH YOU</div><h1>Welcome to<br/>your workspace<span className="accent">.</span></h1><p>Show up. Put in the work. Build something stronger.</p><section className="panel auth-panel">{!configured && <p className="notice">Connect Supabase to enable authentication. <Link href="/setup">View setup instructions</Link>.</p>}{params.error && <p role="alert" className="form-error">This confirmation link could not be verified. Try signing in or request a new confirmation from your Supabase account flow.</p>}<AuthForm configured={configured}/></section></div></Shell>;
}
