"use client";
import { useId, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import type { Exercise } from "./types";
import { exerciseLabel, matchesExercise } from "./exercise-labels";
export function ExercisePicker({ exercises, label, value, onChange, name, required = true, hideLabel = false }: { exercises: Exercise[]; label: string; value?: string; onChange?: (value: string) => void; name?: string; required?: boolean; hideLabel?: boolean }) {
  const { locale } = useLocale(); const [query, setQuery] = useState(""); const [selected, setSelected] = useState(""); const [focused, setFocused] = useState(false);
  const selectId = useId(); const listId = useId();
  const current = value ?? selected;
  const filtered = exercises.filter(exercise => matchesExercise(exercise, query)).sort((a,b) => exerciseLabel(a,locale).localeCompare(exerciseLabel(b,locale),locale));
  const options = filtered.slice(0,100);
  const chosen = exercises.find(exercise => exercise.id === current);
  if (chosen && !options.some(exercise => exercise.id === chosen.id)) options.unshift(chosen);
  const suggestions = query.trim() ? filtered.slice(0, 8) : [];
  function pick(id: string) { setSelected(id); onChange?.(id); setQuery(""); }
  return <div className="exercise-picker">
    <input type="search" aria-label={locale === "es" ? "Buscar movimientos" : "Search movements"} placeholder={locale === "es" ? "Buscar en español o inglés…" : "Search in English or Spanish…"} value={query}
      aria-controls={listId} aria-autocomplete="list"
      onChange={event => setQuery(event.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setTimeout(() => setFocused(false), 120)}
      onKeyDown={event => { if (event.key === "Enter" && suggestions.length) { event.preventDefault(); pick(suggestions[0].id); } }} />
    {focused && suggestions.length > 0 && <ul className="exercise-picker-suggestions" role="listbox" id={listId}>{suggestions.map(exercise => <li key={exercise.id}><button type="button" role="option" aria-selected={exercise.id === current} onMouseDown={event => event.preventDefault()} onClick={() => pick(exercise.id)}>{exerciseLabel(exercise,locale)}</button></li>)}</ul>}
    <div className="training-field"><label htmlFor={selectId} className={hideLabel ? "sr-only" : undefined}>{label}</label><select id={selectId} name={name} value={current} required={required} onChange={event => { setSelected(event.target.value); onChange?.(event.target.value); }}><option value="">{locale === "es" ? "Elige un movimiento" : "Choose a movement"}</option>{options.map(exercise => <option key={exercise.id} value={exercise.id}>{exerciseLabel(exercise,locale)}{exercise.archived ? locale === "es" ? " (Archivado)" : " (Archived)" : ""}</option>)}</select></div>
    {filtered.length > 100 && <small>{locale === "es" ? "Mostrando 100. Busca para encontrar cualquier movimiento." : "Showing 100. Search to find any movement."}</small>}{!filtered.length && <small>{locale === "es" ? "No hay coincidencias." : "No matches."}</small>}
  </div>;
}
