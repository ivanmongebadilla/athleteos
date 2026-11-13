"use client";
import { Children, cloneElement, isValidElement, useEffect, useId, useRef, useState, useTransition, type ReactNode, type FormEvent } from "react";
import { useLocale } from "@/components/locale-provider";
import { trainingMessages } from "./messages";
import type { SaveState } from "./actions";
export function useTrainingMessages() { const { locale } = useLocale(); return trainingMessages(locale); }
export function Field({ label, children }: { label: string; children: ReactNode }) { const id = useId(); return <div className="training-field"><label htmlFor={id}>{label}</label>{Children.map(children, child => isValidElement<{ id?: string }>(child) && ["input", "select", "textarea"].includes(String(child.type)) ? cloneElement(child, { id }) : child)}</div>; }
export function Heading({ title, children }: { title: string; children?: ReactNode }) { const t = useTrainingMessages(); return <div className="page-heading"><div><div className="eyebrow">{t.core}</div><h1>{title}<span className="accent">.</span></h1></div>{children}</div>; }
export function MutationForm({ onSave, label, children, extraActions, className = "", disabled = false, hideActions = false }: { onSave: (data: FormData) => Promise<SaveState>; label?: string; children: ReactNode; extraActions?: ReactNode | ((pending: boolean) => ReactNode); className?: string; disabled?: boolean; hideActions?: boolean }) {
  const t = useTrainingMessages(); const [state, setState] = useState<SaveState>(); const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); setState(undefined); startTransition(async () => { try { setState(await onSave(data)); } catch { setState({ ok: false, code: "saveError" }); } }); }
  return <form onSubmit={submit} className={`training-form ${className}`}><fieldset disabled={pending}>{children}</fieldset>{!hideActions && <div className="training-actions">{typeof extraActions === "function" ? extraActions(pending) : extraActions}<button type="submit" className="button lime" disabled={pending || disabled}>{pending ? t.saving : label ?? t.save}</button><span role={state?.ok === false ? "alert" : "status"}>{state?.code ? t[state.code] : ""}</span></div>}</form>;
}
export function numberValue(data: FormData, name: string) { const raw = data.get(name); return raw === "" || raw === null ? null : Number(raw); }
export function NumberField({ label, value, onChange, min = 0, max = 999999, step = 1, required = false }: { label: string; value: number | null; onChange: (value: number | null) => void; min?: number; max?: number; step?: number; required?: boolean }) {
  const [text, setText] = useState(() => value === null ? "" : String(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setText(value === null ? "" : String(value)); }, [value]);
  return <Field label={label}><input type="number" value={text} min={min} max={max} step={step} required={required}
    onFocus={() => { focused.current = true; }}
    onBlur={() => { focused.current = false; setText(value === null ? "" : String(value)); }}
    onChange={event => { setText(event.target.value); onChange(event.target.value === "" ? null : Number(event.target.value)); }} /></Field>;
}
