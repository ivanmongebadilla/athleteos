import type { Exercise } from "./types";
export function exerciseLabel(exercise: Exercise, locale: string) { return locale === "es" && exercise.name_es ? exercise.name_es : exercise.name; }
export function normalizeExerciseSearch(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim(); }
export function matchesExercise(exercise: Exercise, query: string) {
  const haystack = normalizeExerciseSearch([exercise.name, exercise.name_es, ...(exercise.aliases ?? []), exercise.equipment, exercise.body_part].filter(Boolean).join(" "));
  const tokens = haystack.split(" ");
  return normalizeExerciseSearch(query).split(" ").every(word => word.length <= 2 && word.length > 0 ? tokens.includes(word) : haystack.includes(word));
}
