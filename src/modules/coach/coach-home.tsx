"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CheckCheck, ChevronRight, Dumbbell, History, MessageCircle, ShieldCheck, Sparkles, Target } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import type { AthleteProfile } from "@/modules/training/types";
import { coachMessages } from "./messages";
import { coachFocuses, coachStyles, type CoachPreferences } from "./preferences";
import { saveCoachPreferences } from "./actions";

export function CoachHome({ profile, preferences }: { profile: AthleteProfile; preferences: CoachPreferences | null }) {
  const { locale } = useLocale(); const t = coachMessages(locale);
  const [saved, setSaved] = useState(preferences);
  const [step, setStep] = useState(preferences ? 4 : 0);
  const [focus, setFocus] = useState(preferences?.focus ?? "balanced");
  const [goal, setGoal] = useState(preferences?.goal ?? "");
  const [style, setStyle] = useState(preferences?.coaching_style ?? "balanced");
  const [error, setError] = useState(false); const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [step]);
  function edit() { setFocus(saved?.focus ?? "balanced"); setGoal(saved?.goal ?? ""); setStyle(saved?.coaching_style ?? "balanced"); setError(false); setStep(saved ? 5 : 1); }
  function submit() {
    setError(false);
    startTransition(async () => {
      try {
        const result = await saveCoachPreferences({ focus, goal, coaching_style: style, expected_updated_at: saved?.updated_at ?? null });
        if (!result.ok) { setError(true); return; }
        setSaved(result.preferences); setStep(4);
      } catch { setError(true); }
    });
  }
  const profileItems = [
    [t.experience, t[profile.experience]],
    [t.schedule, `${profile.training_days_per_week} ${t.days} · ${profile.available_minutes} ${t.minutes}`],
    [t.equipment, profile.equipment.join(" · ") || t.empty],
    [t.limitations, profile.limitations.join(" · ") || t.empty],
    [t.goals, [...profile.primary_goals, ...profile.secondary_goals].join(" · ") || t.empty],
  ];
  function profileSection() {
    return <><dl className="coach-profile-grid">{profileItems.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{!profile.onboarding_completed_at && <p className="coach-note">{t.profileMissing}</p>}<Link className="coach-inline-link" href="/profile">{t.editProfile}<ChevronRight size={16}/></Link></>;
  }
  function focusSection() {
    return <><fieldset className="coach-choice-group"><legend className="sr-only">{t.focus}</legend><div className="coach-focus-grid">{coachFocuses.map(value=><label className="coach-choice" key={value}><input type="radio" name="focus" value={value} checked={focus===value} onChange={()=>setFocus(value)}/><span><strong>{t.focuses[value]}</strong><small>{t.focusDescriptions[value]}</small></span><span className="coach-radio-mark" aria-hidden="true">{focus===value && <Check size={13}/>}</span></label>)}</div></fieldset><label className="coach-goal"><span>{t.goal}<small>{t.optional}</small></span><textarea rows={3} maxLength={1000} placeholder={t.goalPlaceholder} value={goal} onChange={event=>setGoal(event.target.value)}/><small>{goal.length} / 1000</small></label></>;
  }
  function styleSection() {
    return <><fieldset className="coach-choice-group"><legend className="sr-only">{t.style}</legend>{coachStyles.map(value=><label className="coach-choice" key={value}><input type="radio" name="coaching_style" value={value} checked={style===value} onChange={()=>setStyle(value)}/><span><strong>{t.styles[value]}</strong><small>{t.styleDescriptions[value]}</small></span><span className="coach-radio-mark" aria-hidden="true">{style===value && <Check size={13}/>}</span></label>)}</fieldset><p className="coach-note">{t.noPrompt}</p></>;
  }
  return <div className="coach-page">
    <div className="coach-eyebrow"><Sparkles size={14} />{t.label}</div>
    {step === 0 && <section className="coach-welcome">
      <div className="coach-welcome-copy"><h1 ref={heading} tabIndex={-1}>{t.title}</h1><p className="coach-intro">{t.intro}</p>
        <button className="button lime" onClick={edit}>{t.setup}<ArrowRight size={17}/></button><small>{t.time}</small>
        <ul className="coach-trust"><li><Dumbbell size={15}/>{t.profileTag}</li><li><History size={15}/>{t.historyTag}</li><li><ShieldCheck size={15}/>{t.privateTag}</li></ul>
      </div>
      <div className="coach-vision"><div className="coach-orbit" aria-hidden="true"><span className="coach-orbit-ring"/><span className="coach-orbit-icon"><Sparkles size={37}/></span><span className="coach-orbit-dot"/></div><h2>{t.cardTitle}</h2><p>{t.cardBody}</p><ul>{t.features.map(feature=><li key={feature}><Check size={16}/>{feature}</li>)}</ul></div>
    </section>}
    {step > 0 && step < 4 && <section className="coach-setup" aria-label={t.setup}>
      <div className="coach-steps" aria-label={`${t.step} ${step} ${t.of} 3`}>{t.steps.map((label,index)=><div key={label} aria-current={step===index+1 ? "step" : undefined} className={step>index+1 ? "complete" : ""}><span>{step>index+1 ? <Check size={14}/> : index+1}</span><b>{label}</b></div>)}</div>
      <form onSubmit={event=>{event.preventDefault();if(step<3)setStep(step+1);else submit();}}>
        <fieldset disabled={pending}>
          <header className="coach-step-heading"><small>{t.step} {step} {t.of} 3</small><h1 ref={heading} tabIndex={-1}>{step===1?t.profileTitle:step===2?t.focusTitle:t.styleTitle}</h1><p>{step===1?t.profileBody:step===2?t.focusBody:t.styleBody}</p></header>
          {step===1 && profileSection()}
          {step===2 && focusSection()}
          {step===3 && styleSection()}
        </fieldset>
        {error && <p role="alert" className="coach-error">{t.error}</p>}
        <div className="coach-form-actions"><button type="button" className="coach-text-button" disabled={pending} onClick={()=>step>1?setStep(step-1):setStep(saved?4:0)}><ArrowLeft size={16}/>{step===1?t.cancel:t.back}</button><button className="button lime" disabled={pending}>{pending?t.saving:step===3?t.finish:t.next}{!pending && <ArrowRight size={16}/>}</button></div>
      </form>
    </section>}
    {step===5 && saved && <section className="coach-setup coach-edit-all" aria-label={t.edit}>
      <form onSubmit={event=>{event.preventDefault();submit();}}>
        <fieldset disabled={pending}>
          <header className="coach-step-heading"><h1 ref={heading} tabIndex={-1}>{t.edit}</h1><p>{t.editBody}</p></header>
          <div className="coach-edit-section"><h2>{t.steps[0]}</h2>{profileSection()}</div>
          <div className="coach-edit-section"><h2>{t.steps[1]}</h2>{focusSection()}</div>
          <div className="coach-edit-section"><h2>{t.steps[2]}</h2>{styleSection()}</div>
        </fieldset>
        {error && <p role="alert" className="coach-error">{t.error}</p>}
        <div className="coach-form-actions"><button type="button" className="coach-text-button" disabled={pending} onClick={()=>setStep(4)}><ArrowLeft size={16}/>{t.cancel}</button><button className="button lime" disabled={pending}>{pending?t.saving:t.finish}{!pending && <ArrowRight size={16}/>}</button></div>
      </form>
    </section>}
    {step===4 && saved && <><header className="coach-ready-heading"><span className="coach-saved"><CheckCheck size={15}/>{t.readyLabel}</span><h1 ref={heading} tabIndex={-1}>{t.readyTitle}</h1><p>{t.readyBody}</p></header><div className="coach-ready-layout"><section className="coach-next"><span className="coach-next-icon"><MessageCircle size={25}/></span><div className="coach-eyebrow">{t.nextLabel}</div><h2>{t.nextTitle}</h2><p>{t.nextBody}</p><ul className="coach-starters" aria-label={t.starterLabel}>{t.starters.map(text=><li key={text}><MessageCircle size={15}/>{text}</li>)}</ul><Link className="button secondary" href="/today">{t.today}<ArrowRight size={16}/></Link></section><aside className="coach-preferences"><div className="coach-eyebrow"><Target size={14}/>{t.readyLabel}</div><dl><dt>{t.focus}</dt><dd>{t.focuses[saved.focus]}</dd><dt>{t.style}</dt><dd>{t.styles[saved.coaching_style]}</dd>{saved.goal && <><dt>{t.goal}</dt><dd className="coach-user-goal">{saved.goal}</dd></>}</dl><button className="coach-inline-link" onClick={edit}>{t.edit}<ChevronRight size={16}/></button><Link className="coach-inline-link" href="/calendar">{t.calendar}<ChevronRight size={16}/></Link></aside></div></>}
  </div>;
}
