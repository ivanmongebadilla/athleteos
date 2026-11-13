import { getTrainingHome } from "@/modules/training/data";
import { getCoachPreferences } from "@/modules/coach/data";
import { CoachHome } from "@/modules/coach/coach-home";
export default async function Coach() {
  const [{ profile }, preferences] = await Promise.all([getTrainingHome(), getCoachPreferences()]);
  return <CoachHome profile={profile} preferences={preferences}/>;
}
