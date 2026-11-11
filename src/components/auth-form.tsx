"use client";
import { useActionState, useState } from "react";
import { authenticate } from "@/modules/identity/actions";
import { ArrowRight } from "lucide-react";
export function AuthForm({ configured }: { configured: boolean }) {
  const [signup, setSignup] = useState(false);
  const [state, action, pending] = useActionState(authenticate, {});
  return <><div className="auth-tabs"><button type="button" aria-pressed={!signup} onClick={() => setSignup(false)}>Sign in</button><button type="button" aria-pressed={signup} onClick={() => setSignup(true)}>Create account</button></div><form action={action} className="auth-form"><input type="hidden" name="intent" value={signup ? "signup" : "login"}/><label htmlFor="email">Email address</label><input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required maxLength={254} disabled={!configured}/><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 12 : 1} maxLength={128} disabled={!configured}/>{signup && <small>At least 12 characters. Confirm your email to activate your account.</small>}<div aria-live="polite">{state.error && <p className="form-error">{state.error}</p>}{state.message && <p className="form-message">{state.message}</p>}</div><button className="button lime" type="submit" disabled={pending || !configured}>{pending ? "Please wait…" : signup ? "Create account" : "Sign in"}<ArrowRight size={18}/></button></form></>;
}
