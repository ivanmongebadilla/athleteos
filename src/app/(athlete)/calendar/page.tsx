import { getSchedule, getTrainingHome } from "@/modules/training/data";
import { calendarDays, localDate } from "@/modules/training/calendar";
import { dateSchema } from "@/modules/training/validation";
import { CalendarView } from "@/modules/training/calendar-view";
export default async function Calendar({ searchParams }: { searchParams: Promise<{ date?: string; view?: string }> }) {
  const [{ profile }, params] = await Promise.all([getTrainingHome(), searchParams]); const today = localDate(profile.timezone); const parsed = dateSchema.safeParse(params.date); const anchor = parsed.success ? parsed.data : today; const view = params.view === "week" ? "week" : "month"; const days = calendarDays(anchor, view); const sessions = await getSchedule(days[0], days[days.length - 1]);
  return <CalendarView sessions={sessions} days={days} anchor={anchor} today={today} view={view} />;
}
