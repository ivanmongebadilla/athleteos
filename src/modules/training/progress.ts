import { addDays } from "./calendar";
import type { RecordRow } from "./types";

export type ProgressSession = { id: string; title: string; scheduled_on: string; status: string };
export type ProgressResult = {
  id: string; section_id: string; completed_at: string; format: string | null;
  completion_seconds: number | null; scaled: boolean;
  score_details: { did_not_finish?: boolean } | null;
  training_sessions: ProgressSession;
  workout_sections: { kind: string; instructions: string | null; prescribed_exercises?: { position: number; exercise_id: string; prescribed_sets: { set_number: number; repetitions: number; load: number | null; unit: string | null; percentage: number | null }[] }[] };
  completed_sets: { exercise_id: string; repetitions: number; load: number; unit: "kg" | "lb"; successful: boolean }[];
};
export type LiftPoint = { exerciseId: string; date: string; kg: number; reps: number };
export type Benchmark = { name: string; scaled: boolean; prescription: string; points: { date: string; completedAt: string; seconds: number; sessionId: string }[] };
export const loadInUnit = (kg: number, unit: "lb" | "kg") => unit === "kg" ? kg : kg / 0.45359237;
const kilograms = (load: number, unit: "lb" | "kg") => unit === "kg" ? load : load * 0.45359237;

// Revisions are corrections, not additional training or additional PR attempts.
export function latestResults(results: ProgressResult[]) {
  const latest = new Map<string, ProgressResult>();
  for (const row of results) {
    const previous = latest.get(row.section_id);
    if (!previous || row.completed_at > previous.completed_at || (row.completed_at === previous.completed_at && row.id > previous.id)) latest.set(row.section_id, row);
  }
  return [...latest.values()];
}

export function buildProgress(sessions: ProgressSession[], results: ProgressResult[], records: RecordRow[], today: string) {
  const active = new Set(sessions.map(session => session.id));
  const latest = latestResults(results.filter(row => active.has(row.training_sessions.id) && row.training_sessions.scheduled_on <= today));
  const trainedDates = new Set(latest.map(row => row.training_sessions.scheduled_on));
  let streak = 0;
  let cursor = trainedDates.has(today) ? today : addDays(today, -1);
  while (trainedDates.has(cursor)) { streak++; cursor = addDays(cursor, -1); }
  const days = Array.from({ length: 56 }, (_, index) => {
    const date = addDays(today, index - 55);
    return { date, count: new Set(latest.filter(row => row.training_sessions.scheduled_on === date).map(row => row.training_sessions.id)).size };
  });
  const lifts: LiftPoint[] = records.filter(row => row.recorded_on <= today).map(row => ({ exerciseId: row.exercise_id, date: row.recorded_on, kg: kilograms(row.load, row.unit), reps: row.repetitions }));
  for (const row of latest) for (const set of row.completed_sets) {
    if (set.successful && set.load > 0 && set.repetitions > 0) lifts.push({ exerciseId: set.exercise_id, date: row.training_sessions.scheduled_on, kg: kilograms(set.load, set.unit), reps: set.repetitions });
  }
  const daily = new Map<string, LiftPoint>();
  for (const row of lifts) {
    const key = `${row.exerciseId}:${row.reps}:${row.date}`;
    if (row.kg > (daily.get(key)?.kg ?? -1)) daily.set(key, row);
  }
  const points = [...daily.values()].sort((a, b) => a.date.localeCompare(b.date) || a.exerciseId.localeCompare(b.exerciseId) || a.reps - b.reps);
  const bests = new Map<string, number>();
  const prs: LiftPoint[] = [];
  for (const row of points) {
    const key = `${row.exerciseId}:${row.reps}`;
    // Avoid conversion rounding turning equal kg/lb loads into a false PR.
    if (row.kg > (bests.get(key) ?? -1) + 0.0001) { prs.push(row); bests.set(key, row.kg); }
  }
  const benchmarkGroups = new Map<string, Benchmark>();
  for (const row of latest) {
    if (row.workout_sections.kind !== "conditioning" || row.format !== "for_time" || row.completion_seconds === null || row.score_details?.did_not_finish) continue;
    const instructions = row.workout_sections.instructions?.trim() ?? "";
    const title = row.training_sessions.title.trim();
    // Only explicitly named benchmarks qualify. Preserve prescription and RX/
    // scaled as separate groups so unlike workouts never share a trend line.
    const match = /^(fran|grace|helen|isabel|diane|elizabeth|annie|karen|jackie|nancy|amanda|murph)(?=$|\s|[:—–-])/i.exec(title)
      ?? /^(fran|grace|helen|isabel|diane|elizabeth|annie|karen|jackie|nancy|amanda|murph)(?=$|\s|[:—–-])/i.exec(instructions);
    if (!match) continue;
    const name = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
    const prescription = instructions.replace(/\s+/g, " ");
    const namedTitle = new RegExp(`^${name}(?=$|\\s|[:—–-])`, "i").test(title) ? title.toLowerCase() : "";
    const structuredPrescription = [...(row.workout_sections.prescribed_exercises ?? [])].sort((a,b)=>a.position-b.position).map(movement=>({ exercise:movement.exercise_id, sets:[...movement.prescribed_sets].sort((a,b)=>a.set_number-b.set_number).map(set=>[set.repetitions,set.load,set.unit,set.percentage]) }));
    const key = `${name}:${row.scaled}:${namedTitle}:${prescription.toLowerCase()}:${JSON.stringify(structuredPrescription)}`;
    const group = benchmarkGroups.get(key) ?? { name, scaled: row.scaled, prescription, points: [] };
    group.points.push({ date: row.training_sessions.scheduled_on, completedAt: row.completed_at, seconds: row.completion_seconds, sessionId: row.training_sessions.id });
    benchmarkGroups.set(key, group);
  }
  const benchmarks = [...benchmarkGroups.values()].map(row => ({ ...row, points: row.points.sort((a, b) => a.date.localeCompare(b.date) || a.completedAt.localeCompare(b.completedAt) || a.sessionId.localeCompare(b.sessionId)) })).sort((a, b) => b.points.at(-1)!.date.localeCompare(a.points.at(-1)!.date));
  const benchmarkPrs = benchmarks.flatMap(row => {
    let best = Infinity;
    return row.points.flatMap(point => {
      if (point.seconds >= best) return [];
      best = point.seconds;
      return [{ name: row.name, scaled: row.scaled, ...point }];
    });
  });
  return {
    streak, days, trained: days.filter(day => day.count > 0).length,
    monthSessions: sessions.filter(row => row.status === "completed" && row.scheduled_on <= today && row.scheduled_on.slice(0, 7) === today.slice(0, 7)).length,
    monthPrs: [...prs, ...benchmarkPrs].filter(row => row.date.slice(0, 7) === today.slice(0, 7)).length,
    points, prs: prs.sort((a, b) => b.date.localeCompare(a.date)), benchmarks, benchmarkPrs,
  };
}
