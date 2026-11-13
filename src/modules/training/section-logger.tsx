"use client";
import { useId, useRef, useState, type CSSProperties } from "react";
import { Check, ChevronDown, Dumbbell, Flame, Layers3, Plus, Trash2, Wind, Zap } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { saveSectionLog } from "./actions";
import type { Exercise, StoredResult, StoredSection, StoredSession } from "./types";
import { Field, MutationForm, NumberField, numberValue, useTrainingMessages } from "./ui";
import { formatClock, parseClock, roundScore } from "./logging";
import { logMessages } from "./log-messages";
import { exerciseLabel } from "./exercise-labels";

const icons = { warmup: Flame, strength: Dumbbell, conditioning: Zap, accessories: Layers3, weightlifting: Dumbbell, gymnastics: Layers3, cooldown: Wind };
const blockAccents = { warmup: "#c07a2e", strength: "#4f6fa0", conditioning: "#8aa838", accessories: "#8f6bb3", weightlifting: "#4f6fa0", gymnastics: "#3f8f7d", cooldown: "#6b7682" };
const blockTints = { warmup: "rgba(192,122,46,.16)", strength: "rgba(79,111,160,.16)", conditioning: "rgba(138,168,56,.16)", accessories: "rgba(143,107,179,.16)", weightlifting: "rgba(79,111,160,.16)", gymnastics: "rgba(63,143,125,.16)", cooldown: "rgba(107,118,130,.16)" };
const doneNoteEn = logMessages("en").completedNote;
const doneNoteEs = logMessages("es").completedNote;

function ClockInput({ name, label, required, defaultSeconds }: { name: string; label: string; required?: boolean; defaultSeconds: number | null }) {
  const l = logMessages(useLocale().locale);
  const [minutes, setMinutes] = useState(() => defaultSeconds === null ? "" : String(Math.floor(defaultSeconds / 60)));
  const [seconds, setSeconds] = useState(() => defaultSeconds === null ? "" : String(defaultSeconds % 60).padStart(2, "0"));
  const combined = minutes === "" && seconds === "" ? "" : `${minutes || "0"}:${(seconds || "0").padStart(2, "0")}`;
  const minId = useId(); const secId = useId();
  return <div className="training-field clock-field">
    <span>{label}</span>
    <div className="clock-field-inputs">
      <label htmlFor={minId} className="sr-only">{`${label} (${l.minutes})`}</label>
      <input id={minId} className="clock-input" type="number" inputMode="numeric" min={0} max={999} required={required} placeholder="MM" value={minutes} onChange={event => setMinutes(event.target.value.replace(/\D/g, "").slice(0, 3))} />
      <span className="clock-field-sep" aria-hidden="true">:</span>
      <label htmlFor={secId} className="sr-only">{`${label} (${l.seconds})`}</label>
      <input id={secId} className="clock-input" type="number" inputMode="numeric" min={0} max={59} placeholder="SS" value={seconds} onChange={event => { const raw = event.target.value.replace(/\D/g, "").slice(0, 2); const next = raw === "" ? "" : String(Math.min(59, Number(raw))); setSeconds(next); if (next !== "" && minutes === "") setMinutes("0"); }} />
    </div>
    <input type="hidden" name={name} value={combined} />
  </div>;
}

type Actual = StoredResult["sets"][number];
type Row = { key: string; exerciseId: string; planned?: StoredSection["exercises"][number]["sets"][number]; actual?: Actual };
export function SectionLogger({ session, section, latest, history, exercises, unit, timezone }: { session: StoredSession; section: StoredSection; latest?: StoredResult; history: StoredResult[]; exercises: Exercise[]; unit: "lb" | "kg"; timezone: string }) {
  const t = useTrainingMessages(); const { locale } = useLocale(); const l = logMessages(locale);
  const label = section.kind === "conditioning" ? "WOD" : t[section.kind];
  const Icon = icons[section.kind];
  const [savedId, setSavedId] = useState<string | null>(latest?.id ?? null);
  const [savedAt, setSavedAt] = useState(latest?.completed_at);
  const [dirty, setDirty] = useState(false);
  const [scaled, setScaled] = useState(latest?.scaled ?? false);
  const [dnf, setDnf] = useState(latest?.score_details?.did_not_finish ?? false);
  const [done, setDone] = useState(() => !!latest?.notes && (latest.notes === doneNoteEn || latest.notes === doneNoteEs));
  const doneRef = useRef<HTMLInputElement>(null);
  const intervalsFormat = section.format === "emom";
  const numericRounds = section.format === "intervals" || section.format === "tabata";
  const roundCount = section.interval_rounds ?? 0;
  const [scores, setScores] = useState<(number|null)[]>(() => Array.from({length:roundCount},(_,index)=>latest?.score_details?.interval_scores?.[index] ?? null));
  const enteredScores = scores.filter((score): score is number => score !== null);
  const liveScore = enteredScores.length ? roundScore(section.format, enteredScores) : null;
  const [intervals, setIntervals] = useState<boolean[]>(section.format === "emom" ? Array.from({ length: section.interval_rounds ?? Math.ceil((section.time_cap_seconds ?? 0) / (section.emom_interval_seconds ?? 60)) }, (_, index) => latest?.score_details?.intervals?.[index] ?? false) : []);
  const prescribed = section.exercises.flatMap(movement => movement.sets.map(set => ({ exerciseId: movement.exercise_id, planned: set })));
  const sequence = useRef(0);
  const [rows, setRows] = useState<Row[]>(() => latest ? latest.sets.map((actual, index) => ({ key: `saved-${index}`, exerciseId: actual.exercise_id, actual, planned: prescribed[index]?.exerciseId === actual.exercise_id ? prescribed[index].planned : undefined })) : prescribed.map((row, index) => ({ ...row, key: `planned-${index}` })));
  const name = (id: string) => { const exercise = exercises.find(exercise => exercise.id === id); return exercise ? exerciseLabel(exercise, locale) : t.exercise; };
  function addRow(exerciseId: string) { setRows(current => [...current, { key: `extra-${sequence.current++}`, exerciseId }]); setDirty(true); }
  const numeric = (data: FormData, key: string) => numberValue(data, `${section.id}-${key}`);
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value));
  const isWod = section.kind === "conditioning";
  const hasScore = isWod || section.format !== null;
  const complete = Boolean(savedId) && !dirty;
  const [collapsed, setCollapsed] = useState(false);
  const bodyId = useId();
  return <article className={`log-card workout-section ${complete ? "is-complete" : ""}`} aria-label={label} style={{ "--block-tint": blockTints[section.kind] } as CSSProperties}>
    <header className="log-card-header"><div><Icon size={16} style={{ color: blockAccents[section.kind] }} /><h2><button type="button" className="block-collapse-toggle" aria-expanded={!collapsed} aria-controls={bodyId} title={collapsed ? l.expand : l.collapse} onClick={() => setCollapsed(current => !current)}>{label}<ChevronDown size={16} /></button></h2>{section.format && <span className="log-format">{section.format === "custom" ? t.customFormat : t[section.format]}</span>}</div><span className={`log-save-state ${savedId && !dirty ? "is-saved" : ""}`} role="status">{savedId && !dirty && <Check size={13} />}{dirty ? l.changes : savedId ? t.completed : l.unsaved}</span></header>
    <div id={bodyId} hidden={collapsed}>
    {(section.instructions || section.time_cap_seconds !== null) && <div className="log-prescription"><p className="preserve-lines">{section.instructions}</p>{section.format === "emom" && <span>{l.emomSummary(section.emom_interval_seconds ?? 60, section.interval_rounds ?? Math.ceil((section.time_cap_seconds ?? 0) / 60))}</span>}{section.format !== "tabata" && section.format !== "emom" && section.time_cap_seconds !== null && <span>{section.format === "amrap" || section.format === "intervals" ? l.duration : l.cap}: {formatClock(section.time_cap_seconds)}</span>}</div>}
    <div onChangeCapture={() => setDirty(true)}>
      <MutationForm className="section-log-form" label={`${savedId ? l.update : l.save} ${label}`} disabled={numericRounds && (!roundCount || scores.some(score=>score===null))} onSave={async data => {
        const clock = parseClock(String(data.get(`${section.id}-time`) ?? ""));
        const enteredNotes = String(data.get(`${section.id}-notes`) ?? "");
        const markedDone = data.get(`${section.id}-done`) === "1";
        const result = await saveSectionLog({ session_id: session.id, expected_updated_at: session.expected_updated_at, expected_result_id: savedId, result: {
          section_id: section.id, completion_seconds: clock, rounds: numericRounds ? roundCount : intervalsFormat && intervals.length ? intervals.filter(Boolean).length : numeric(data, "rounds"), repetitions: numericRounds ? liveScore : numeric(data, "reps"), scaled, session_rpe: numeric(data, "rpe"),
          notes: enteredNotes.trim() ? enteredNotes : markedDone ? l.completedNote : "",
          score_details: { ...(numericRounds ? { interval_scores: scores } : {}), ...(intervalsFormat && intervals.length ? { intervals } : {}), ...(dnf ? { did_not_finish: true } : {}) },
          sets: rows.map((row, index) => ({ exercise_id: row.exerciseId, set_number: index + 1, repetitions: numberValue(data, `${row.key}-reps`), load: numberValue(data, `${row.key}-load`), unit: data.get(`${row.key}-unit`), rpe: numberValue(data, `${row.key}-rpe`), rest_seconds: numberValue(data, `${row.key}-rest`), successful: !data.has(`${row.key}-failed`), notes: String(data.get(`${row.key}-notes`) ?? "") })),
        } });
        if (result.ok && result.id) { setSavedId(result.id); setSavedAt(result.completed_at); setDirty(false); setDone(markedDone); }
        return result;
      }}>
        {rows.length > 0 && <div className="actual-table"><div className="actual-table-heading"><span>{l.set}</span><span>{l.planned}</span><span>{l.actual}</span></div>{rows.map((row, index) => <div className="actual-row actual-set" key={row.key}>
          <div className="actual-row-label"><strong>{name(row.exerciseId)}</strong><small>{l.set} {index + 1}</small></div>
          <div className="planned-set">{row.planned ? <><strong>{row.planned.repetitions} {t.reps}</strong><span>{row.planned.load !== null ? `${row.planned.load} ${row.planned.unit}` : row.planned.percentage !== null ? `${row.planned.percentage}% PR` : l.noLoad}</span></> : <span>—</span>}</div>
          <div className="actual-entry"><Field label={t.reps}><input name={`${row.key}-reps`} type="number" min={0} max={1000} required placeholder={row.planned ? String(row.planned.repetitions) : "—"} defaultValue={row.actual?.repetitions} /></Field><Field label={t.load}><input name={`${row.key}-load`} type="number" min={0} max={999999.99} step={0.01} required placeholder="—" defaultValue={row.actual?.load} /></Field><Field label={t.unit}><select name={`${row.key}-unit`} defaultValue={row.actual?.unit ?? (row.planned?.load !== null && row.planned?.load !== undefined ? row.planned.unit : unit)}><option>lb</option><option>kg</option></select></Field><button type="button" className="movement-remove" aria-label={`${l.remove} ${index + 1}`} onClick={() => { setRows(current => current.filter(item => item.key !== row.key)); setDirty(true); }}><Trash2 size={14} /></button></div>
          <details className="actual-row-options"><summary>{l.setOptions}</summary><div className="training-grid"><Field label={t.rpe}><input type="number" name={`${row.key}-rpe`} min={1} max={10} step={0.1} defaultValue={row.actual?.rpe ?? ""} /></Field><Field label={t.restSeconds}><input type="number" name={`${row.key}-rest`} min={0} max={86400} defaultValue={row.actual?.rest_seconds ?? ""} /></Field><Field label={t.notes}><input name={`${row.key}-notes`} maxLength={2000} defaultValue={row.actual?.notes ?? ""} /></Field></div><label className="training-check"><input name={`${row.key}-failed`} type="checkbox" defaultChecked={row.actual ? !row.actual.successful : false} />{l.failed}</label></details>
        </div>)}</div>}
        {!isWod && !rows.length && section.exercises.length > 0 && <p className="log-help">{l.noSets}</p>}
        {section.exercises.length > 0 && <div className="log-add-sets">{[...new Set(section.exercises.map(exercise => exercise.exercise_id))].map(id => <button key={id} type="button" className="text-button" disabled={rows.length >= 200} onClick={() => addRow(id)}><Plus size={13} /><span>{l.addSet}</span><span className="log-add-set-exercise">{name(id)}</span></button>)}</div>}
        {numericRounds && <div className="numeric-rounds">
          {section.format === "tabata" && <p className="tabata-prescription">{l.tabataSummary(roundCount, section.tabata_work_seconds ?? 20, section.tabata_rest_seconds ?? 10)}</p>}
          {latest?.score_details?.intervals && <p className="log-help">{l.legacyScore}</p>}
          {!roundCount ? <p role="alert">{l.missingRounds}</p> : <><p>{section.format === "tabata" ? l.tabataHint : l.roundScoreHint}</p><div className="round-score-grid">{scores.map((score,index)=><NumberField key={index} label={`${l.round} ${index+1}`} value={score} min={0} max={100000} required onChange={value=>{setScores(current=>current.map((row,at)=>at===index?value:row));setDirty(true);}}/>)}</div><output className="round-score-summary" aria-live="polite">{section.format === "tabata" ? l.tabataScore : l.totalScore}: <strong>{liveScore ?? "—"}</strong>{section.format === "tabata" && ` ${t.reps.toLowerCase()} (${l.lowest})`}<small>{enteredScores.length} / {roundCount}</small></output></>}
        </div>}
        {hasScore && <div className="wod-score"><div className="wod-score-fields">
          {(section.format === "for_time" || section.format === "custom" || !section.format) && <ClockInput name={`${section.id}-time`} label={l.time} required={section.format === "for_time" && !dnf} defaultSeconds={latest?.completion_seconds ?? null} />}
          {section.format === "amrap" && <><Field label={l.completeRounds}><input type="number" name={`${section.id}-rounds`} min={0} max={100000} required defaultValue={latest?.rounds ?? ""} /></Field><Field label={l.extraReps}><input type="number" name={`${section.id}-reps`} min={0} max={100000} defaultValue={latest?.repetitions ?? ""} /></Field></>}

          <div className="score-category" role="group" aria-label={l.category}><button type="button" aria-pressed={!scaled} onClick={() => { setScaled(false); setDirty(true); }}>{l.rx}</button><button type="button" aria-pressed={scaled} onClick={() => { setScaled(true); setDirty(true); }}>{l.scaled}</button></div><Field label={t.notes}><input name={`${section.id}-notes`} defaultValue={latest?.notes ?? ""} maxLength={2000} /></Field>
        </div>{intervalsFormat && intervals.length > 0 && <><p className="log-help">{l.intervalHint}</p><div className="interval-checklist">{intervals.map((checked, index) => <label key={index}><input type="checkbox" checked={checked} onChange={event => { setIntervals(current => current.map((value, at) => at === index ? event.target.checked : value)); setDirty(true); }} /><span>{l.round} {index + 1}</span></label>)}</div></>}{section.format === "for_time" && <label className="training-check"><input type="checkbox" checked={dnf} onChange={event => { setDnf(event.target.checked); setDirty(true); }} />{l.dnf}</label>}</div>}
        {section.exercises.map((exercise, index) => exercise.notes && <p className="log-movement-note" key={index}><strong>{name(exercise.exercise_id)}</strong> · {exercise.notes}</p>)}

        <input ref={doneRef} type="hidden" name={`${section.id}-done`} defaultValue={done ? "1" : ""} />
        {!isWod && rows.length === 0 && (savedId && done && !dirty
          ? <div className="log-mark-done log-mark-done-complete"><Check size={14} />{t.completed}<button type="button" className="text-button" onClick={() => { setDone(false); if (doneRef.current) doneRef.current.value = ""; setDirty(true); }}>{l.editCompletion}</button></div>
          : <button type="submit" className="button lime log-mark-done-button" onClick={() => { if (doneRef.current) doneRef.current.value = "1"; setDone(true); }}>{l.markDone}</button>)}
        <details className="log-extra"><summary>{l.options}</summary><div className="training-grid">{!hasScore && <Field label={t.notes}><textarea rows={1} name={`${section.id}-notes`} defaultValue={latest?.notes ?? ""} maxLength={2000} /></Field>}<Field label={t.rpe}><input type="number" name={`${section.id}-rpe`} min={1} max={10} step={0.1} defaultValue={latest?.session_rpe ?? ""} /></Field>{section.format !== "amrap" && !numericRounds && <><Field label={l.completeRounds}><input type="number" name={`${section.id}-rounds`} min={0} max={100000} defaultValue={latest?.rounds ?? ""} disabled={intervalsFormat && intervals.length > 0} /></Field><Field label={l.extraReps}><input type="number" name={`${section.id}-reps`} min={0} max={100000} defaultValue={latest?.repetitions ?? ""} /></Field></>}{!numericRounds && section.format !== "for_time" && section.format !== "custom" && section.format !== null && <ClockInput name={`${section.id}-time`} label={l.time} defaultSeconds={latest?.completion_seconds ?? null} />}</div></details>
      </MutationForm>
    </div>
    {savedAt && <div className="log-saved-footer"><Check size={12} /><time dateTime={savedAt}>{l.savedAt} · {date(savedAt)}</time><span>{l.revisionHint}</span></div>}
    {history.length > 0 && <details className="log-history"><summary>{l.history} ({history.length})</summary>{history.map(result => <div key={result.id}><time>{date(result.completed_at)}</time><p>{result.completion_seconds !== null ? `${formatClock(result.completion_seconds)} · ` : ""}{result.rounds !== null ? `${result.rounds} ${t.rounds} · ` : ""}{result.repetitions !== null ? result.format === "intervals" ? `${l.totalScore}: ${result.repetitions}` : `${result.repetitions} ${t.reps}` : ""}</p>{result.sets.map((set, at) => <p key={at}>{name(set.exercise_id)} · {set.repetitions} {t.reps} · {set.load} {set.unit}</p>)}<p>{result.notes}</p>{result.score_details?.interval_scores && <p>{l.roundScores}: {result.score_details.interval_scores.join(" · ")}</p>}{result.score_details?.intervals && section.format !== "emom" && <p>{l.legacyFlags}: {result.score_details.intervals.map(value=>value?"✓":"—").join(" · ")}</p>}</div>)}</details>}
    </div>
  </article>;
}
