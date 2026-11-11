import { requireAthlete } from "@/lib/supabase/session";
import { signOut } from "@/modules/identity/actions";
export default async function Profile({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user, supabase } = await requireAthlete();
  const { data: profile, error } = await supabase.from("profiles").select("name, preferred_units").eq("id", user.id).single();
  const params = await searchParams;
  return <><div className="page-heading"><div><div className="eyebrow">YOUR ATHLETE WORKSPACE</div><h1>Your account<span className="accent">.</span></h1><p>The start of a more personal training experience.</p></div></div><section className="panel profile-panel"><h2>{profile?.name || "Athlete"}</h2><dl><dt>Email</dt><dd>{user.email}</dd><dt>Preferred units</dt><dd>{profile?.preferred_units ?? "Not available"}</dd><dt>Profile setup</dt><dd>Full athlete onboarding arrives in Phase 2.</dd></dl>{error && <p role="alert" className="form-error">Your profile could not be loaded. Check that the database migration has been applied.</p>}{params.error && <p role="alert" className="form-error">Sign-out failed. Please try again.</p>}<form action={signOut}><button className="button secondary" type="submit">Sign out</button></form></section></>;
}
