import { getLibrary, getTrainingHome } from "@/modules/training/data";
import { localDate } from "@/modules/training/calendar";
import { ProgressView } from "@/modules/training/progress-view";
import { getProgressHistory } from "@/modules/training/progress-data";
import { buildProgress } from "@/modules/training/progress";
export default async function Progress({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = (await searchParams).tab === "library" ? "library" : "overview";
  const [library, { profile }, history] = await Promise.all([getLibrary(), getTrainingHome(), tab === "overview" ? getProgressHistory() : Promise.resolve({ sessions: [], results: [], records: [] })]);
  const today = localDate(profile.timezone);
  return <ProgressView {...library} today={today} unit={profile.preferred_units} tab={tab} summary={buildProgress(history.sessions, history.results, history.records, today)}/>;
}
