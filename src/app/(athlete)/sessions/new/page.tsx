import { SessionEditor } from "@/modules/training/session-editor";
import { getLibrary, getTrainingHome } from "@/modules/training/data";
import { dateSchema } from "@/modules/training/validation";
import { localDate } from "@/modules/training/calendar";
export default async function NewSession({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const [{ profile }, { exercises }, params] = await Promise.all([getTrainingHome(), getLibrary(), searchParams]);
  const date = dateSchema.safeParse(params.date);
  return <SessionEditor exercises={exercises} unit={profile.preferred_units} initial={{ id: null, expected_updated_at: null, title: "", scheduled_on: date.success ? date.data : localDate(profile.timezone), status: "scheduled", intensity: "moderate", duration_minutes: profile.available_minutes, notes: "", published: false, sections: [] }} />;
}
