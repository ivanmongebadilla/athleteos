"use client";
import { useId, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, Dumbbell, Flame, Layers3, Plus, Trash2, Wind, X, Zap } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import type { Exercise } from "./types";
import { formats, kinds, type SessionInput, type SectionInput } from "./validation";
import { saveSession } from "./actions";
import { Field, MutationForm, NumberField, useTrainingMessages } from "./ui";
import { editorMessages } from "./editor-messages";
import { ExercisePicker } from "./exercise-picker";
import { exerciseLabel } from "./exercise-labels";

type Movement = SectionInput["exercises"][number];
type PlannedSet = Movement["sets"][number];
type Block = SectionInput & { editorKey: string };
const quickBlocks = ["warmup", "strength", "conditioning", "accessories"] as const;
const blockIcons = { warmup: Flame, strength: Dumbbell, conditioning: Zap, accessories: Layers3, weightlifting: Dumbbell, gymnastics: Layers3, cooldown: Wind };
const blockAccents = { warmup: "#c07a2e", strength: "#4f6fa0", conditioning: "#8aa838", accessories: "#8f6bb3", weightlifting: "#4f6fa0", gymnastics: "#3f8f7d", cooldown: "#6b7682" };
const blockTints = { warmup: "rgba(192,122,46,.16)", strength: "rgba(79,111,160,.16)", conditioning: "rgba(138,168,56,.16)", accessories: "rgba(143,107,179,.16)", weightlifting: "rgba(79,111,160,.16)", gymnastics: "rgba(63,143,125,.16)", cooldown: "rgba(107,118,130,.16)" };

export function SessionEditor({ initial, exercises, unit }: { initial: SessionInput; exercises: Exercise[]; unit: "lb" | "kg" }) {
  const t = useTrainingMessages();
  const { locale } = useLocale();
  const e = editorMessages(locale);
  const router = useRouter();
  const prefix = useId();
  const sequence = useRef(initial.sections.length);
  const preview = useRef<HTMLDialogElement>(null);
  const [session, setSession] = useState(initial);
  const [blocks, setBlocks] = useState<Block[]>(initial.sections.map((row, index) => ({ ...row, editorKey: `${prefix}-${index}` })));
  const [restBlocks, setRestBlocks] = useState<Block[]>([]);
  const [blockError, setBlockError] = useState(false);
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(() => new Set());
  function setBlockCollapsed(key: string, collapsed: boolean) {
    setCollapsedBlocks(current => { const next = new Set(current); if (collapsed) next.add(key); else next.delete(key); return next; });
  }
  const active = exercises.filter(exercise => !exercise.archived);
  const blockName = (kind: SectionInput["kind"]) => kind === "conditioning" ? e.wod : t[kind];
  const movementName = (id: string) => { const exercise = exercises.find(exercise => exercise.id === id); return exercise ? exerciseLabel(exercise, locale) : e.selectExercise; };
  function update(patch: Partial<SessionInput>) { setSession(current => ({ ...current, ...patch })); }
  function changeBlock(index: number, patch: Partial<Block>) { setBlocks(current => current.map((row, at) => at === index ? { ...row, ...patch } : row)); }
  function addBlock(kind: SectionInput["kind"]) {
    const editorKey = `${prefix}-${sequence.current++}`;
    setBlocks(current => [...current, { editorKey, kind, format: kind === "conditioning" ? "for_time" : null, time_cap_seconds: null, instructions: "", exercises: [] }]);
    setBlockError(false);
  }
  function move(index: number, direction: number) {
    setBlocks(current => { const rows = [...current]; [rows[index], rows[index + direction]] = [rows[index + direction], rows[index]]; return rows; });
  }
  function toggleRest(checked: boolean) {
    if (checked) { setRestBlocks(blocks); setBlocks([]); } else setBlocks(restBlocks);
    update({ status: checked ? "rest" : "scheduled" }); setBlockError(false);
  }
  const newSet = (): PlannedSet => ({ repetitions: 5, load: null, unit, percentage: null, target_rpe: null, rest_seconds: null });
  const emptyBlocked = session.status !== "rest" && !blocks.length;

  return <div className="session-builder">
    <div className="builder-heading"><Link href="/calendar" className="builder-back"><ArrowLeft size={16} />{t.back}</Link><h1>{initial.id ? t.edit : t.newSession}<span className="accent">.</span></h1></div>
    <MutationForm className="builder-form" label={session.published ? e.savePublish : e.saveDraft} disabled={emptyBlocked} hideActions={emptyBlocked} extraActions={pending => <><div className="builder-publication"><label className="training-check"><input type="checkbox" checked={session.published} disabled={pending || emptyBlocked} aria-describedby={`${prefix}-publication-hint`} onChange={event => update({ published: event.target.checked })} /><strong>{e.publishSession}</strong></label><p id={`${prefix}-publication-hint`}>{session.published ? session.status === "rest" ? e.publishRestHint : e.publishHint : e.draftHint}</p></div><button type="button" className="button secondary" disabled={pending} onClick={() => preview.current?.showModal()}>{e.preview}</button></>} onSave={async () => {
      if (session.status !== "rest" && !blocks.length) { setBlockError(true); return { ok: false, code: "invalid" }; }
      const result = await saveSession({ ...session, sections: blocks });
      if (result.ok && result.id) router.push("/today");
      return result;
    }}>
      <div className="builder-layout">
        <aside className="builder-sidebar" aria-label={e.details}>
          <section className="builder-card builder-settings"><div className="builder-kicker">{e.details}</div>
            <Field label={t.date}><input type="date" value={session.scheduled_on} onChange={event => update({ scheduled_on: event.target.value })} required /></Field>
            <Field label={t.title}><input value={session.title} onChange={event => update({ title: event.target.value })} placeholder={locale === "es" ? "Ej. CrossFit 6:00 AM" : "e.g. CrossFit 6:00 AM"} required maxLength={160} /></Field>
            <div className="duration-presets" role="group" aria-label={t.duration}>{[45, 60, 90].map(minutes => <button key={minutes} type="button" aria-pressed={session.duration_minutes === minutes} onClick={() => update({ duration_minutes: minutes })}>{minutes} <small>min</small></button>)}</div>
            <details className="builder-options"><summary>{e.more}</summary><NumberField label={t.duration} value={session.duration_minutes} onChange={value => update({ duration_minutes: value })} min={1} max={600} /><Field label={t.intensity}><select value={session.intensity} onChange={event => update({ intensity: event.target.value as SessionInput["intensity"] })}>{(["low", "moderate", "high"] as const).map(key => <option key={key} value={key}>{t[key]}</option>)}</select></Field><Field label={t.notes}><textarea value={session.notes} onChange={event => update({ notes: event.target.value })} maxLength={2000} /></Field><label className="training-check"><input type="checkbox" checked={session.status === "rest"} onChange={event => toggleRest(event.target.checked)} />{t.rest}</label></details>
          </section>
          <nav className="builder-card block-overview" aria-label={e.blocks}><div className="builder-kicker">{e.blocks}</div>{blocks.map((block, index) => <a href={`#${block.editorKey}`} key={block.editorKey}><span className="block-dot" />{blockName(block.kind)}<span>{index + 1}</span></a>)}{!blocks.length && <p>{session.status === "rest" ? e.restHint : e.noBlocks}</p>}</nav>
        </aside>

        <div className="builder-workspace">
          {session.status !== "rest" ? <><section className="builder-card block-picker"><div className="builder-kicker">{e.addBlock}</div><div className="block-picker-actions">{quickBlocks.map(kind => { const Icon = blockIcons[kind]; return <button type="button" key={kind} disabled={blocks.length >= 12} onClick={() => addBlock(kind)}><Icon size={16} style={{ color: blockAccents[kind] }} />{blockName(kind)}<Plus size={13} /></button>; })}<label className="other-block"><span className="sr-only">{e.extraBlock}</span><select aria-label={e.extraBlock} value="" disabled={blocks.length >= 12} onChange={event => { if (event.target.value) addBlock(event.target.value as SectionInput["kind"]); }}><option value="">{e.extraBlock} +</option>{kinds.filter(kind => !quickBlocks.some(quick => quick === kind)).map(kind => <option key={kind} value={kind}>{t[kind]}</option>)}</select></label></div><p>{e.blockHint}</p></section>
            {!blocks.length && <section className="builder-empty"><Layers3 size={28} /><h2>{e.emptyTitle}</h2><p>{e.emptyBody}</p></section>}
            {blockError && <p role="alert" className="form-error">{e.requiredBlock}</p>}
            {blocks.map((block, index) => {
              const Icon = blockIcons[block.kind];
              const isWod = block.kind === "conditioning";
              const showInstructions = isWod || block.kind === "warmup" || block.kind === "cooldown";
              const isCollapsed = collapsedBlocks.has(block.editorKey);
              function changeMovement(at: number, patch: Partial<Movement>) { changeBlock(index, { exercises: block.exercises.map((row, rowIndex) => rowIndex === at ? { ...row, ...patch } : row) }); }
              return <section className="builder-card builder-block" id={block.editorKey} key={block.editorKey} aria-label={`${index + 1}. ${blockName(block.kind)}`} style={{ "--block-tint": blockTints[block.kind] } as CSSProperties} onInvalidCapture={() => { if (isCollapsed) flushSync(() => setBlockCollapsed(block.editorKey, false)); }}>
                <header className="builder-block-header"><Icon size={18} style={{ color: blockAccents[block.kind] }} /><h2><button type="button" className="block-collapse-toggle" aria-expanded={!isCollapsed} aria-controls={`${block.editorKey}-body`} title={isCollapsed ? e.expand : e.collapse} onClick={() => setBlockCollapsed(block.editorKey, !isCollapsed)}>{blockName(block.kind)}<ChevronDown size={16} /></button></h2><span className="block-number">{String(index + 1).padStart(2, "0")}</span>{isWod && <div className="block-cap" hidden={isCollapsed}><NumberField label={e.capMinutes} value={block.time_cap_seconds === null ? null : block.time_cap_seconds / 60} min={1 / 60} max={1440} step={1 / 60} onChange={value => changeBlock(index, { time_cap_seconds: value === null ? null : Math.round(value * 60) })} /></div>}<div className="block-tools"><button type="button" aria-label={`${t.moveUp}: ${blockName(block.kind)} ${index + 1}`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></button><button type="button" aria-label={`${t.moveDown}: ${blockName(block.kind)} ${index + 1}`} disabled={index === blocks.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></button><button type="button" aria-label={`${e.removeBlock}: ${blockName(block.kind)} ${index + 1}`} onClick={() => setBlocks(current => current.filter(row => row.editorKey !== block.editorKey))}><Trash2 size={15} /></button></div></header>
                <div id={`${block.editorKey}-body`} hidden={isCollapsed}>
                {isWod && <div className="block-formats" role="group" aria-label={t.format}>{formats.map(format => <button key={format} type="button" aria-pressed={block.format === format} onClick={() => changeBlock(index, { format })}>{format === "custom" ? t.customFormat : t[format]}</button>)}</div>}
                {showInstructions && <div className="block-instructions"><Field label={isWod ? e.scheme : t.instructions}><textarea value={block.instructions} placeholder={isWod ? e.schemePlaceholder : `${t.instructions} · ${e.optional}`} onChange={event => changeBlock(index, { instructions: event.target.value })} rows={1} maxLength={2000} /></Field></div>}
                {block.exercises.length > 0 && <div className={`movement-table-heading ${isWod ? "wod" : ""}`} aria-hidden="true"><span>{e.movement}</span><span>{isWod ? e.detail : e.prescription}</span>{!isWod && <span>{t.load}</span>}</div>}
                {block.exercises.map((movement, at) => {
                  const first = movement.sets[0];
                  const method = first?.percentage != null ? "percent" : first?.load != null ? "weight" : "none";
                  const uniform = movement.sets.every(set => set.repetitions === first?.repetitions && set.load === first?.load && set.percentage === first?.percentage && set.unit === first?.unit);
                  const patchSets = (patch: Partial<PlannedSet>) => changeMovement(at, { sets: (movement.sets.length ? movement.sets : [newSet()]).map(set => ({ ...set, ...patch })) });
                  return <div className="builder-movement" key={at}>
                    <div className={`movement-main ${isWod ? "wod" : ""}`}><ExercisePicker label={e.movement} hideLabel value={movement.exercise_id} onChange={value => changeMovement(at, { exercise_id: value })} exercises={exercises.filter(exercise => !exercise.archived || exercise.id === movement.exercise_id)} />
                      {isWod ? <Field label={e.detail}><input value={movement.notes} onChange={event => changeMovement(at, { notes: event.target.value })} placeholder={e.notesPlaceholder} maxLength={2000} /></Field> : <><div className="reps-sets"><NumberField label={t.sets} value={movement.sets.length} min={0} max={50} required onChange={value => { if (value !== null) changeMovement(at, { sets: Array.from({ length: Math.max(0, Math.min(50, value)) }, (_, setIndex) => movement.sets[setIndex] ?? { ...(first ?? newSet()) }) }); }} /><span>×</span><NumberField label={t.reps} value={first?.repetitions ?? 5} required min={1} max={1000} onChange={value => { if (value !== null) patchSets({ repetitions: value }); }} /></div><div className="load-control"><Field label={e.loading}><select value={method} onChange={event => patchSets(event.target.value === "percent" ? { percentage: first?.percentage ?? 80, load: null } : event.target.value === "weight" ? { percentage: null, load: first?.load ?? 0 } : { percentage: null, load: null })}><option value="none">{e.bodyweight}</option><option value="weight">{e.weight}</option><option value="percent">{e.percent}</option></select></Field>{method !== "none" && <NumberField label={method === "percent" ? t.percentage : t.load} value={method === "percent" ? first?.percentage ?? null : first?.load ?? null} min={method === "percent" ? 0.01 : 0} max={method === "percent" ? 110 : 999999.99} step={0.01} onChange={value => { if (value !== null) patchSets(method === "percent" ? { percentage: value } : { load: value }); }} />}{method === "weight" && <Field label={t.unit}><select value={first?.unit ?? unit} onChange={event => patchSets({ unit: event.target.value as "lb" | "kg" })}><option>lb</option><option>kg</option></select></Field>}</div></>}
                      <button type="button" className="movement-remove" aria-label={`${t.remove}: ${movementName(movement.exercise_id)} ${at + 1}`} onClick={() => changeBlock(index, { exercises: block.exercises.filter((_, rowIndex) => rowIndex !== at) })}><Trash2 size={15} /></button></div>
                    {!uniform && <p className="individual-hint">{e.configured}</p>}
                    <details className="movement-advanced"><summary>{e.advanced}{movement.sets.length ? ` · ${movement.sets.length}` : ""}</summary>{!isWod && <Field label={t.notes}><input value={movement.notes} onChange={event => changeMovement(at, { notes: event.target.value })} maxLength={2000} /></Field>}{movement.sets.map((set, setIndex) => {
                      function changeSet(patch: Partial<PlannedSet>) { changeMovement(at, { sets: movement.sets.map((row, rowIndex) => rowIndex === setIndex ? { ...row, ...patch } : row) }); }
                      return <div className="set-editor" key={setIndex}><strong>{t.sets} {setIndex + 1}</strong><NumberField label={t.reps} value={set.repetitions} required min={1} max={1000} onChange={value => { if (value !== null) changeSet({ repetitions: value }); }} /><NumberField label={t.load} value={set.load} max={999999.99} step={0.01} onChange={value => changeSet({ load: value })} /><Field label={t.unit}><select value={set.unit} onChange={event => changeSet({ unit: event.target.value as "lb" | "kg" })}><option>lb</option><option>kg</option></select></Field><NumberField label={t.percentage} value={set.percentage} min={0.01} max={110} step={0.01} onChange={value => changeSet({ percentage: value })} /><NumberField label={t.rpe} value={set.target_rpe} min={1} max={10} step={0.1} onChange={value => changeSet({ target_rpe: value })} /><NumberField label={t.restSeconds} value={set.rest_seconds} max={86400} onChange={value => changeSet({ rest_seconds: value })} /><button type="button" className="text-button" onClick={() => changeMovement(at, { sets: movement.sets.filter((_, rowIndex) => rowIndex !== setIndex) })}>{t.remove}</button></div>;
                    })}<button type="button" className="text-button" disabled={movement.sets.length >= 50} onClick={() => changeMovement(at, { sets: [...movement.sets, newSet()] })}><Plus size={14} />{t.addSet}</button></details>
                  </div>;
                })}
                <footer className="block-footer"><button type="button" disabled={!active.length || block.exercises.length >= 30} onClick={() => changeBlock(index, { exercises: [...block.exercises, { exercise_id: "", notes: "", sets: isWod ? [] : [newSet(), newSet(), newSet()] }] })}><Plus size={16} />{e.addMovement}</button>{!active.length && <Link href="/progress">{t.noExercises}</Link>}{!isWod && <details className="builder-options"><summary>{e.blockOptions}</summary><div className="training-grid">{!showInstructions && <Field label={t.instructions}><textarea value={block.instructions} onChange={event => changeBlock(index, { instructions: event.target.value })} rows={2} maxLength={2000} /></Field>}<Field label={t.format}><select value={block.format ?? ""} onChange={event => changeBlock(index, { format: event.target.value ? event.target.value as SectionInput["format"] : null })}><option value="">{t.none}</option>{formats.map(format => <option key={format} value={format}>{format === "custom" ? t.customFormat : t[format]}</option>)}</select></Field><NumberField label={e.capMinutes} value={block.time_cap_seconds === null ? null : block.time_cap_seconds / 60} min={1 / 60} max={1440} step={1 / 60} onChange={value => changeBlock(index, { time_cap_seconds: value === null ? null : Math.round(value * 60) })} /></div></details>}</footer></div>
              </section>;
            })}</> : <section className="builder-empty"><Wind size={30} /><h2>{t.restDay}</h2><p>{e.restHint}</p></section>}
        </div>
      </div>
    </MutationForm>
    <dialog ref={preview} className="session-preview" aria-labelledby={`${prefix}-preview-title`}><header><div><div className="builder-kicker">{e.unsaved}</div><h2 id={`${prefix}-preview-title`}>{session.title || t.newSession}</h2></div><button type="button" className="text-button" aria-label={e.close} onClick={() => preview.current?.close()}><X size={18} /></button></header><p>{session.scheduled_on} · {session.duration_minutes ?? "—"} min · {t[session.intensity]}</p>{session.notes && <p className="preserve-lines">{session.notes}</p>}{session.status === "rest" ? <h3>{t.restDay}</h3> : !blocks.length ? <p>{e.noBlocks}</p> : blocks.map((block, index) => <section key={block.editorKey}><h3>{index + 1}. {blockName(block.kind)}{block.format ? ` · ${block.format === "custom" ? t.customFormat : t[block.format]}` : ""}</h3>{block.time_cap_seconds !== null && <p>{e.capMinutes}: {block.time_cap_seconds / 60}</p>}<p className="preserve-lines">{block.instructions}</p>{block.exercises.map((movement, at) => <div key={at}><strong>{movementName(movement.exercise_id)}</strong><p>{movement.notes}</p>{movement.sets.map((set, setIndex) => <p key={setIndex}>{setIndex + 1}. {set.repetitions} {t.reps} · {set.load !== null ? `${set.load} ${set.unit}` : set.percentage !== null ? `${set.percentage}%` : e.noLoad}{set.target_rpe !== null ? ` · RPE ${set.target_rpe}` : ""}{set.rest_seconds !== null ? ` · ${t.restSeconds}: ${set.rest_seconds}` : ""}</p>)}</div>)}</section>)}</dialog>
  </div>;
}


