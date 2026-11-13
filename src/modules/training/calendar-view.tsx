"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import type { SessionSummary } from "./types";
import { shiftPeriod } from "./calendar";
import { Heading, useTrainingMessages } from "./ui";
import { DeleteSession } from "./session-delete";
export function SessionCard({ session }: { session: SessionSummary }) {
  const t = useTrainingMessages(); const { locale } = useLocale(); const es = locale === "es";
  const state = session.status === "completed" ? "completed" : session.has_results ? "in-progress" : session.status;
  const status = state === "completed" ? t.completed : state === "in-progress" ? (es ? "En progreso" : "In progress") : state === "rest" ? t.restDay : state === "cancelled" ? t.cancelled : (es ? "Pendiente" : "Pending");
  return <article className={`session-card ${state}`} aria-label={session.title}>
    <Link className="session-card-link" href={`/sessions/${session.id}`}><strong>{session.title}</strong><div className="session-card-badges"><span className={`session-status ${state}`}>{status}</span><span className="session-publication">{session.training_weeks.training_programs.status === "draft" ? t.draft : t.published}</span></div>{session.duration_minutes && <small>{session.duration_minutes} min · {t[session.intensity as "low" | "moderate" | "high"]}</small>}</Link>
    {session.status !== "completed" && !session.has_results && <DeleteSession compact id={session.id} title={session.title} version={session.updated_at}/>}
  </article>;
}
export function CalendarView({ sessions, days, anchor, today, view }: { sessions: SessionSummary[]; days: string[]; anchor: string; today: string; view: "month" | "week" }) {
  const t = useTrainingMessages(); const { locale } = useLocale();
  const router = useRouter();
  const todayCell = useRef<HTMLElement>(null);
  const [todayRequest, setTodayRequest] = useState(0);
  useEffect(() => {
    if (!todayRequest || anchor !== today) return;
    todayCell.current?.focus({ preventScroll: true });
    todayCell.current?.scrollIntoView({ block: "center", behavior: "instant" });
  }, [anchor, today, todayRequest, view]);
  function goToToday() {
    setTodayRequest(request => request + 1);
    if (anchor !== today) router.push(`/calendar?date=${today}&view=${view}`, { scroll: false });
  }
  const url = (date: string, mode = view) => `/calendar?date=${date}&view=${mode}`;
  const label = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${anchor}T12:00:00Z`));
  return <><Heading title={t.calendar}><Link className="button lime" href={`/sessions/new?date=${anchor}`}>{t.newSession} +</Link></Heading><section className="panel training-panel"><div className="calendar-toolbar"><div className="training-actions"><Link className="button secondary" aria-label={t.previous} href={url(shiftPeriod(anchor, view, -1))}>←</Link><h2>{label}</h2><Link className="button secondary" aria-label={t.next} href={url(shiftPeriod(anchor, view, 1))}>→</Link></div><div className="training-actions"><button type="button" className="button secondary" onClick={goToToday}>{t.current}</button><Link className={`button ${view === "month" ? "lime" : "secondary"}`} href={url(anchor, "month")}>{t.month}</Link><Link className={`button ${view === "week" ? "lime" : "secondary"}`} href={url(anchor, "week")}>{t.week}</Link></div></div><div className={`calendar-grid ${view}`}>{days.map(day => <article key={day} ref={day === today ? todayCell : undefined} tabIndex={-1} aria-current={day === today ? "date" : undefined} aria-label={day === today ? `${t.current}: ${day}` : undefined} className={`calendar-day ${day === today ? "is-today" : ""} ${view === "month" && day.slice(0, 7) !== anchor.slice(0, 7) ? "outside-month" : ""}`}><Link className="calendar-date" href={`/sessions/new?date=${day}`} aria-label={`${t.newSession}: ${day}`}><time dateTime={day}>{new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: view === "week" ? "short" : undefined, timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))}</time><span>+</span></Link>{sessions.filter(session => session.scheduled_on === day).map(session => <SessionCard key={session.id} session={session} />)}</article>)}</div><p>{t.draftHint}</p></section></>;
}

