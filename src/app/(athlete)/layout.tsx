import { Shell } from "@/components/shell";
import { requireAthlete } from "@/lib/supabase/session";
export const dynamic = "force-dynamic";
export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  await requireAthlete();
  return <Shell>{children}</Shell>;
}
