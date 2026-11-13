import { notFound } from "next/navigation";
import { z } from "zod";
import { getLibrary, getSession, getTrainingHome } from "@/modules/training/data";
import { SessionView } from "@/modules/training/session-view";
export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!z.uuid().safeParse(id).success) notFound();
  const [data, { exercises }, { profile }] = await Promise.all([getSession(id), getLibrary(), getTrainingHome()]);
  if (!data) notFound();
  return <SessionView session={data.session} results={data.results} exercises={exercises} unit={profile.preferred_units} timezone={profile.timezone} />;
}

