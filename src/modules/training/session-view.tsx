"use client";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowLeft, CheckCircle2, Dumbbell, Flame, Layers3, Wind, Zap } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import type { Exercise, StoredResult, StoredSession } from "./types";
import { useTrainingMessages } from "./ui";
import { logMessages } from "./log-messages";
import { SectionLogger } from "./section-logger";
import { formatClock } from "./logging";
import { exerciseLabel } from "./exercise-labels";
import { DeleteSession } from "./session-delete";

const icons = { warmup: Flame, strength: Dumbbell, conditioning: Zap, accessories: Layers3, weightlifting: Dumbbell, gymnastics: Layers3, cooldown: Wind };
const blockAccents = { warmup: "#c07a2e", strength: "#4f6fa0", conditioning: "#8aa838", accessories: "#8f6bb3", weightlifting: "#4f6fa0", gymnastics: "#3f8f7d", cooldown: "#6b7682" };
const blockTints = { warmup: "rgba(192,122,46,.16)", strength: "rgba(79,111,160,.16)", conditioning: "rgba(138,168,56,.16)", accessories: "rgba(143,107,179,.16)", weightlifting: "rgba(79,111,160,.16)", gymnastics: "rgba(63,143,125,.16)", cooldown: "rgba(107,118,130,.16)" };
export function SessionView({ session, exercises, results, unit, timezone }: { session: StoredSession; exercises: Exercise[]; results: StoredResult[]; unit: "lb" | "kg"; timezone: string }) {
  const t = useTrainingMessages(); const { locale } = useLocale(); const l = logMessages(locale);
  const name = (id: string) => { const exercise = exercises.find(exercise => exercise.id === id); return exercise ? exerciseLabel(exercise, locale) : t.exercise; };
  const canLog = session.published && session.status !== "rest" && !session.cancelled;
  const savedSectionIds = new Set(results.map(result => result.section_id));
  return <div className="session-log"><div className="log-page-heading"><Link href="/calendar" className="builder-back"><ArrowLeft size={15} />{t.back}</Link><div><h1>{session.title}<span className="accent">.</span></h1><div className="session-page-actions">{!session.completed && !session.cancelled && results.length === 0 && <Link className="button secondary" href={`/sessions/${session.id}/edit`}>{t.edit}</Link>}{!session.completed && results.length === 0 && <DeleteSession id={session.id} title={session.title} version={session.expected_updated_at}/>}</div></div></div>
    <div className="log-layout"><aside className="log-sidebar"><section className="builder-card log-session-info"><h2>{session.title}</h2><time dateTime={session.scheduled_on}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${session.scheduled_on}T12:00:00Z`))}</time><div className="outline-tag">{session.scheduled_on} · {session.completed ? t.completed : session.status === "rest" ? t.restDay : session.published ? t.published : t.draft}</div>{session.duration_minutes && <small>{session.duration_minutes} min · {t[session.intensity]}</small>}{session.notes && <p className="preserve-lines">{session.notes}</p>}</section>
      <section className="builder-card log-plan"><div className="builder-kicker">{l.plan}</div><h2 className="sr-only">{t.planned}</h2>{session.sections.map((section, index) => { const Icon = icons[section.kind]; return <a href={`#log-${section.id}`} key={section.id}><Icon size={15} style={{ color: blockAccents[section.kind] }} /><div><strong>{section.kind === "conditioning" ? "WOD" : t[section.kind]}</strong>{section.exercises.map((exercise, at) => <span key={at}>{name(exercise.exercise_id)}{exercise.sets.length ? ` · ${exercise.sets.length} × ${exercise.sets[0].repetitions}` : ""}</span>)}{!section.exercises.length && <span>{section.instructions || l.instructionsOnly}</span>}{section.format && <small>{section.format === "custom" ? t.customFormat : t[section.format]}</small>}</div><small>{index + 1}</small></a>; })}{session.status === "rest" && <p>{t.restDay}</p>}</section>
      {canLog && <p className="log-completion-hint">{l.completionHint}</p>}
    </aside><div className="log-workspace"><div className="log-workspace-heading"><span className="builder-kicker">{canLog ? l.independent : t.planned}</span>{session.sections.length > 0 && <span className="log-progress"><CheckCircle2 size={13} /><span className="log-progress-count">{savedSectionIds.size} / {session.sections.length}</span><span className="log-progress-dots" aria-hidden="true">{session.sections.map(section => <span key={section.id} className={`log-progress-dot ${savedSectionIds.has(section.id) ? "is-done" : ""}`} />)}</span></span>}</div>
      {results.length > 0 && <h2 className="sr-only">{t.results}</h2>}
      {session.sections.map(section => {
        const entries = results.filter(result => result.section_id === section.id).sort((a, b) => b.completed_at.localeCompare(a.completed_at) || b.id.localeCompare(a.id));
        return <div id={`log-${section.id}`} key={section.id} className="log-block-anchor">{canLog ? <SectionLogger session={session} section={section} latest={entries[0]} history={entries.slice(1)} exercises={exercises} unit={unit} timezone={timezone} /> : <article className="log-card workout-section" style={{ "--block-tint": blockTints[section.kind] } as CSSProperties}><header className="log-card-header"><div>{(() => { const Icon = icons[section.kind]; return <Icon size={16} style={{ color: blockAccents[section.kind] }} />; })()}<h2>{section.kind === "conditioning" ? "WOD" : t[section.kind]}</h2>{section.format && <span className="log-format">{section.format === "custom" ? t.customFormat : t[section.format]}</span>}</div></header><div className="log-prescription"><p className="preserve-lines">{section.instructions}</p>{section.format === "emom" ? <p>{l.emomSummary(section.emom_interval_seconds ?? 60, section.interval_rounds ?? Math.ceil((section.time_cap_seconds ?? 0) / 60))}</p> : section.format === "tabata" ? <p>{l.tabataSummary(section.interval_rounds ?? 8, section.tabata_work_seconds ?? 20, section.tabata_rest_seconds ?? 10)}</p> : <>{section.format === "intervals" && section.interval_rounds != null && <p>{l.roundCount}: {section.interval_rounds}</p>}{section.time_cap_seconds !== null && <p>{["amrap","emom","intervals"].includes(section.format ?? "") ? l.duration : l.cap}: {formatClock(section.time_cap_seconds)}</p>}</>}{section.exercises.map((exercise, index) => <div key={index}><strong>{name(exercise.exercise_id)}</strong><p>{exercise.notes}</p>{exercise.sets.map((set, at) => <p key={at}>{at + 1}. {set.repetitions} {t.reps} · {set.load !== null ? `${set.load} ${set.unit}` : set.percentage !== null ? `${set.percentage}% PR` : l.noLoad}</p>)}</div>)}</div></article>}</div>;
      })}
      {!session.published && <p className="log-help">{t.draftHint}</p>}{session.status === "rest" && <section className="builder-empty"><Wind size={28} /><h2>{t.restDay}</h2></section>}
    </div></div>
  </div>;
}

