"use client";
import Link from "next/link";
import type { SessionSummary } from "./types";
import { SessionCard } from "./calendar-view";
import { Heading, useTrainingMessages } from "./ui";
export function TodayView({ sessions, today, onboarding }: { sessions: SessionSummary[]; today: string; onboarding: boolean }) {
  const t = useTrainingMessages(); return <><Heading title={t.today}><Link href={`/sessions/new?date=${today}`} className="button lime">{t.newSession} +</Link></Heading>{!onboarding && <section className="panel training-panel onboarding-panel"><h2>{t.onboarding}</h2><p>{t.onboardingText}</p><Link className="button lime" href="/profile">{t.editProfile} →</Link></section>}<section className="panel training-panel"><div className="eyebrow">{today}</div><h2>{t.scheduled}</h2>{sessions.length ? <div className="today-sessions">{sessions.map(session => <SessionCard key={session.id} session={session} />)}</div> : <p>{t.noSessions}</p>}<Link className="button secondary" href="/calendar">{t.calendar} →</Link></section></>;
}
