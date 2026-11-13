import { getTrainingHome } from "@/modules/training/data";
import { ProfileForm } from "@/modules/training/profile-form";
import { signOut } from "@/modules/identity/actions";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { trainingMessages } from "@/modules/training/messages";
export default async function Profile({ searchParams }: { searchParams: Promise<{ error?: string }> }) { const [{ profile, email }, locale, params, common] = await Promise.all([getTrainingHome(), getLocale(), searchParams, getMessages()]); const t = trainingMessages(locale); return <><ProfileForm profile={profile} /><section className="panel training-panel"><p>{email}</p>{params.error && <p role="alert">{common.profile.logoutError}</p>}<form action={signOut}><button className="button secondary">{t.signOut}</button></form></section></>; }
