import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { getSignedInAthlete } from "@/lib/supabase/session";
export default async function Home({ searchParams }: { searchParams: Promise<{ code?: string; error?: string }> }) {
  const params = await searchParams;
  if (typeof params.code === "string" && params.code.length <= 4096) {
    redirect(`/auth/callback?${new URLSearchParams({ code: params.code })}`);
  }
  if (params.error) redirect("/login?error=confirmation");
  const user = await getSignedInAthlete();
  return <LandingPage authenticated={!!user}/>;
}
