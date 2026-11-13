"use client";
import { useActionState, useState } from "react";
import { authenticate } from "@/modules/identity/actions";
import { ArrowRight } from "lucide-react";
import { useLocale } from "./locale-provider";
export function AuthForm({ configured, initialSignup = false }: { configured: boolean; initialSignup?: boolean }) {
  const { t } = useLocale();
  const [signup, setSignup] = useState(initialSignup);
  const [state, action, pending] = useActionState(authenticate, {});
  return <><div className="auth-tabs"><button type="button" aria-pressed={!signup} onClick={() => setSignup(false)}>{t.common.signIn}</button><button type="button" aria-pressed={signup} onClick={() => setSignup(true)}>{t.common.createAccount}</button></div><form action={action} className="auth-form"><input type="hidden" name="intent" value={signup ? "signup" : "login"}/><label htmlFor="email">{t.auth.email}</label><input id="email" name="email" type="email" placeholder={t.auth.emailPlaceholder} autoComplete="email" required maxLength={254} disabled={!configured}/><label htmlFor="password">{t.auth.password}</label><input id="password" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 12 : 1} maxLength={128} disabled={!configured}/>{signup && <small>{t.auth.passwordHint}</small>}<div aria-live="polite">{state.error && <p className="form-error">{t.auth.feedback[state.error]}</p>}{state.message && <p className="form-message">{t.auth.feedback[state.message]}</p>}</div><button className="button lime" type="submit" disabled={pending || !configured}>{pending ? t.common.loading : signup ? t.common.createAccount : t.common.signIn}<ArrowRight size={18}/></button></form></>;
}
