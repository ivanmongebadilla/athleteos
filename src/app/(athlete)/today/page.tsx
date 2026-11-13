import { getSchedule, getTrainingHome } from "@/modules/training/data";
import { localDate } from "@/modules/training/calendar";
import { TodayView } from "@/modules/training/today-view";
import { UndoSessionDelete } from "@/modules/training/session-delete";
import { z } from "zod";
export default async function Today({searchParams}:{searchParams:Promise<{deleted?:string}>}) { const { profile } = await getTrainingHome(); const today = localDate(profile.timezone); const sessions = await getSchedule(today, today); const deleted=z.uuid().safeParse((await searchParams).deleted); return <>{deleted.success&&<UndoSessionDelete id={deleted.data}/>}<TodayView sessions={sessions} today={today} onboarding={!!profile.onboarding_completed_at} /></>; }
