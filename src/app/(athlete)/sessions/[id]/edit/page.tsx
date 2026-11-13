import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getLibrary, getSession, getTrainingHome } from "@/modules/training/data";
import { SessionEditor } from "@/modules/training/session-editor";
export default async function EditSession({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!z.uuid().safeParse(id).success) notFound();
  const [data, { exercises }, { profile }] = await Promise.all([getSession(id), getLibrary(), getTrainingHome()]);
  if (!data) notFound(); if (data.session.completed || data.session.cancelled || data.results.length > 0) redirect(`/sessions/${id}`);
  return <SessionEditor initial={data.session} exercises={exercises} unit={profile.preferred_units} />;
}

