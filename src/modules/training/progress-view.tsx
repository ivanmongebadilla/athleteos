"use client";
import Link from "next/link";
import { useId, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Dumbbell, Flame, Trophy, Zap } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { Heading } from "./ui";
import { Library } from "./library";
import { exerciseLabel } from "./exercise-labels";
import { formatClock } from "./logging";
import { loadInUnit, type buildProgress } from "./progress";
import { progressMessages } from "./progress-messages";
import type { Exercise, RecordRow } from "./types";

type Summary = ReturnType<typeof buildProgress>;
function coordinates(values: number[], width: number, height: number, padding = 14) {
  const min = Math.min(...values), max = Math.max(...values), range = max - min || Math.max(max * .1, 1);
  return values.map((value, index) => ({ x: values.length === 1 ? width / 2 : padding + index / (values.length - 1) * (width - padding * 2), y: height - padding - (value - min) / range * (height - padding * 2) }));
}
function Sparkline({ values, label }: { values: number[]; label: string }) {
  const points = coordinates(values, 220, 44, 4);
  return <svg className="progress-sparkline" viewBox="0 0 220 44" role="img" aria-label={label}><polyline points={points.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/>{points.length === 1 && <circle cx={points[0].x} cy={points[0].y} r="3" fill="currentColor"/>}</svg>;
}
export function ProgressView({ exercises, records, summary, today, unit, tab }: { exercises: Exercise[]; records: RecordRow[]; summary: Summary; today: string; unit: "lb" | "kg"; tab: "overview" | "library" }) {
  const { locale } = useLocale(); const t = progressMessages(locale); const chartId = useId();
  const movementIds = [...new Set(summary.points.map(point => point.exerciseId))];
  const [selected, setSelected] = useState(movementIds[0] ?? ""); const movementId = movementIds.includes(selected) ? selected : movementIds[0] ?? "";
  const repOptions = [...new Set(summary.points.filter(point => point.exerciseId === movementId).map(point => point.reps))].sort((a,b) => a-b);
  const [chosenReps, setChosenReps] = useState(1); const reps = repOptions.includes(chosenReps) ? chosenReps : repOptions[0] ?? 1;
  const points = summary.points.filter(point => point.exerciseId === movementId && point.reps === reps);
  const latest = points.at(-1); const best = points.reduce<typeof latest>((best, point) => !best || point.kg > best.kg ? point : best, undefined);
  const previousMonth = new Date(`${today.slice(0,7)}-01T12:00:00Z`); previousMonth.setUTCMonth(previousMonth.getUTCMonth()-1);
  const previousPoints = points.filter(point => point.date.slice(0,7) === previousMonth.toISOString().slice(0,7));
  const currentPoints = points.filter(point => point.date.slice(0,7) === today.slice(0,7));
  const delta = currentPoints.length && previousPoints.length ? loadInUnit(Math.max(...currentPoints.map(p=>p.kg)) - Math.max(...previousPoints.map(p=>p.kg)), unit) : null;
  const name = (id: string) => { const exercise = exercises.find(row=>row.id===id); return exercise ? exerciseLabel(exercise,locale) : t.movementLabel; };
  const number = (value: number) => new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(value);
  const date = (value: string) => new Intl.DateTimeFormat(locale,{month:"short",day:"numeric",timeZone:"UTC"}).format(new Date(`${value}T12:00:00Z`));
  const recentPrs = [
    ...summary.prs.map(pr=>({ key:`${pr.exerciseId}-${pr.reps}-${pr.date}`,date:pr.date,name:name(pr.exerciseId),value:`${number(loadInUnit(pr.kg,unit))} ${unit}`,detail:`${pr.reps} ${t.rep}`,href:null as string|null })),
    ...summary.benchmarkPrs.map(pr=>({key:pr.sessionId,date:pr.date,name:pr.name,value:formatClock(pr.seconds),detail:pr.scaled?t.scaled:"RX",href:`/sessions/${pr.sessionId}` as string|null})),
  ].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const chart = coordinates(points.map(point=>loadInUnit(point.kg,unit)),720,220,24);
  const tickIndices = [...new Set(Array.from({length:Math.min(5,points.length)},(_,i)=>Math.round(i*(points.length-1)/Math.max(1,Math.min(5,points.length)-1))))];
  return <div className="progress-page"><Heading title={t.title}/>
    <nav className="progress-tabs" aria-label={t.views}><Link href="/progress" aria-current={tab==="overview"?"page":undefined}>{t.overview}</Link><Link href="/progress?tab=library" aria-current={tab==="library"?"page":undefined}>{t.library}</Link></nav>
    {tab==="library" ? <Library embedded exercises={exercises} records={records} today={today} unit={unit}/> : <>
      <div className="progress-layout"><aside className="progress-sidebar">
        <div className="progress-stats"><article className="progress-panel progress-stat"><Flame size={17}/><strong>{summary.streak}</strong><span>{t.streak}</span></article><article className="progress-panel progress-stat"><CheckCircle2 size={17}/><strong>{summary.monthSessions}</strong><span>{t.sessions}</span></article><article className="progress-panel progress-stat"><Trophy size={17}/><strong>{summary.monthPrs}</strong><span>{t.prs}</span></article></div>
        <section className="progress-panel consistency-card"><h2>{t.consistency}</h2><div className="consistency-grid" aria-label={t.consistency}>{summary.days.map(day=><span key={day.date} className={`consistency-day intensity-${Math.min(day.count,3)}`} role="img" aria-label={`${date(day.date)}: ${day.count} ${t.activity}`} title={`${day.date}: ${day.count} ${t.activity}`}/>)}</div><p>{summary.trained} {t.last56} · {Math.round(summary.trained/56*100)}%</p><div className="consistency-legend"><span className="consistency-day intensity-0"/>{t.rest}<span className="consistency-day intensity-1"/>{locale==="es"?"Entrenado":"Trained"}</div></section>
        <section className="progress-panel recent-prs"><h2>{t.recent}</h2>{recentPrs.length ? <ul>{recentPrs.map(pr=><li key={pr.key}><Trophy size={15}/><div><strong>{pr.href?<Link href={pr.href}>{pr.name}</Link>:pr.name}</strong><span> · {pr.value}</span><small>{pr.detail}</small></div><time dateTime={pr.date}>{date(pr.date)}</time></li>)}</ul> : <p className="progress-empty-copy">{t.emptyPrs}</p>}</section>
      </aside><div className="progress-main">
        <section className="progress-panel movement-card"><header><h2>{t.movement}</h2>{movementIds.length>0 && <div className="movement-pills" role="group" aria-label={t.movementLabel}>{movementIds.slice(0,3).map(id=><button key={id} type="button" aria-pressed={id===movementId} onClick={()=>setSelected(id)}>{name(id)}</button>)}</div>}</header>
          {latest && best ? <><div className="movement-controls">{movementIds.length>3 && <label>{t.movementLabel}<select value={movementId} onChange={event=>setSelected(event.target.value)}>{movementIds.map(id=><option key={id} value={id}>{name(id)}</option>)}</select></label>}<label>{t.reps}<select value={reps} onChange={event=>setChosenReps(Number(event.target.value))}>{repOptions.map(value=><option key={value} value={value}>{value} {t.rep}</option>)}</select></label></div>
            <div className="movement-summary"><div className="movement-latest"><strong>{number(loadInUnit(latest.kg,unit))}<span> {unit}</span></strong>{delta!==null ? <span className={`progress-delta ${delta<0?"is-down":""}`}>{delta>=0?"+":""}{number(delta)} {unit} {t.versus}</span> : <small>{t.noPrevious}</small>}</div><p>{t.best}: {number(loadInUnit(best.kg,unit))} {unit} · <time dateTime={best.date}>{date(best.date)}</time></p></div>
            <figure className="movement-chart"><svg viewBox="0 0 720 220" role="img" aria-labelledby={chartId}><title id={chartId}>{`${name(movementId)} · ${reps} ${t.rep} · ${unit}`}</title>{[40,110,180].map(y=><line key={y} x1="0" x2="720" y1={y} y2={y} className="chart-gridline"/>)}<polyline points={chart.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke="var(--progress-accent)" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/>{chart.map((p,index)=><circle key={points[index].date} cx={p.x} cy={p.y} r={index===chart.length-1?5:3.5} className={index===chart.length-1?"chart-point latest":"chart-point"}><title>{`${date(points[index].date)} · ${number(loadInUnit(points[index].kg,unit))} ${unit}`}</title></circle>)}</svg><div className="chart-labels">{tickIndices.map(index=><span key={index}>{date(points[index].date)}<small>{number(loadInUnit(points[index].kg,unit))} {unit}</small></span>)}</div><figcaption>{points.length===1?t.onePoint:t.chartHint}</figcaption></figure>
            <details className="progress-history"><summary>{t.chartHistory}</summary><div className="training-table-wrap"><table className="training-table"><thead><tr><th>{t.date}</th><th>{t.load}</th><th>{t.reps}</th></tr></thead><tbody>{[...points].reverse().map(point=><tr key={point.date}><td>{date(point.date)}</td><td>{number(loadInUnit(point.kg,unit))} {unit}</td><td>{point.reps}</td></tr>)}</tbody></table></div></details>
          </> : <div className="progress-empty"><span className="progress-empty-icon"><Dumbbell size={27}/></span><h3>{t.emptyMovement}</h3><p>{t.emptyMovementBody}</p><Link href="/progress?tab=library" className="button secondary">{t.manage}<ArrowRight size={15}/></Link></div>}
        </section>
        <section className="progress-panel benchmark-card"><h2>{t.benchmarks}</h2>{summary.benchmarks.length ? <><div className="benchmark-columns"><span>{t.workout}</span><span>{t.trend}</span><span>{t.latest}</span></div><div className="benchmark-list">{summary.benchmarks.map((row,index)=>{const latest=row.points.at(-1)!,previous=row.points.at(-2);const difference=previous?latest.seconds-previous.seconds:null;return <article className="benchmark-row" key={`${row.name}-${index}`}><div className="benchmark-name"><Zap size={19}/><div><Link href={`/sessions/${latest.sessionId}`}>{row.name}</Link><span>{row.scaled?t.scaled:"RX"}</span><small>{row.prescription || (locale==="es"?"Por tiempo":"For Time")}</small></div></div><Sparkline values={row.points.map(p=>p.seconds)} label={`${row.name}: ${row.points.map(p=>`${date(p.date)} ${formatClock(p.seconds)}`).join(", ")}`}/><div className="benchmark-latest"><strong>{formatClock(latest.seconds)}</strong>{difference!==null ? <small className={difference<=0?"improved":""}>{difference<0?<ArrowDownRight size={12}/>:<ArrowUpRight size={12}/>} {formatClock(Math.abs(difference))}</small> : <small>{t.noComparison}</small>}<time dateTime={latest.date}>{date(latest.date)}</time></div></article>;})}</div></> : <div className="benchmark-empty"><Zap size={23}/><h3>{t.emptyBenchmarks}</h3><p>{t.benchmarkHelp}</p></div>}</section>
        <Link className="progress-manage" href="/progress?tab=library">{t.manage}<ArrowRight size={15}/></Link>
      </div></div><p className="progress-method">{t.basis} {t.units}</p>
    </>}
  </div>;
}
