import { Shell } from "@/components/shell";
import { requireAthlete } from "@/lib/supabase/session";
import { getMessages } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";
export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const { user, supabase } = await requireAthlete();
  const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();
  const t = await getMessages();
  const name = profile?.name?.trim() || (typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.trim()
    ? user.user_metadata.full_name.trim().slice(0, 120) : user.email?.split("@")[0] || t.common.athlete);
  return <Shell athlete={{ name, initials: name.charAt(0).toUpperCase() }}>{children}</Shell>;
}
