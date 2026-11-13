// Local HTTP contract fixture for browser tests. Never contacts Supabase.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
const athlete = "00000000-0000-4000-8000-000000000021";
let profile, settings, exercises, records, sessions, failDelete, coachPreferences;
function reset() {
  profile = { id: athlete, name: "", preferred_units: "kg", experience: "beginner", primary_goals: [], secondary_goals: [], limitations: [] };
  settings = { training_days_per_week: 5, available_minutes: 60, timezone: "America/Tijuana", equipment: [], disciplines: [], onboarding_completed_at: null };
  exercises = []; records = []; sessions = []; failDelete=false; coachPreferences=null;
}
reset();
function send(response, data, status = 200) { response.writeHead(status, { "Content-Type": "application/json" }); response.end(JSON.stringify(data)); }
createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:54329");
  const body = []; for await (const chunk of request) body.push(chunk);
  const input = body.length ? JSON.parse(Buffer.concat(body).toString()) : {};
  if (url.pathname === "/health") return send(response, { ok: true });
  if (url.pathname === "/reset") { reset(); return send(response, { ok: true }); }
  if (url.pathname === "/fail-next-delete") {failDelete=true;return send(response,{ok:true});}
  if (url.pathname === "/seed-catalog") { exercises.push(...JSON.parse(readFileSync(new URL("../../data/exercises/catalog.json", import.meta.url),"utf8")).map(row => ({ ...row,athlete_id:null,archived:false }))); return send(response,{ count:exercises.length }); }
  if (url.pathname === "/auth/v1/user") return send(response, { id: athlete, aud: "authenticated", role: "authenticated", email: "fixture@example.test", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" });
  if (!url.pathname.startsWith("/rest/v1/")) return send(response, { error: "Unexpected fixture endpoint" }, 400);
  const table = url.pathname.replace("/rest/v1/", "");
  if (table === "coach_preferences") return send(response,coachPreferences);
  if (table === "rpc/save_coach_preferences") {
    const p=input.payload;
    if((coachPreferences?.updated_at ?? null)!==p.expected_updated_at)return send(response,{message:"Stale preferences"},400);
    coachPreferences={focus:p.focus,goal:p.goal,coaching_style:p.coaching_style,updated_at:new Date().toISOString(),setup_completed_at:coachPreferences?.setup_completed_at ?? new Date().toISOString()};return send(response,coachPreferences);
  }
  if (table === "rpc/save_athlete_profile") { profile = { ...profile, ...input.payload }; settings = { ...settings, ...input.payload, onboarding_completed_at: new Date().toISOString() }; return send(response, null); }
  if (table === "rpc/delete_training_session") {
    if(failDelete){failDelete=false;return send(response,{message:"Fixture failure"},400);}
    const row=sessions.find(session=>session.id===input.payload.id);
    if(!row || row.updated_at!==input.payload.expected_updated_at) return send(response,{message:"Session unavailable or changed"},400);
    if(row.status==="completed" || row.workout_results.length) return send(response,{message:"Completed sessions and sessions with logged results cannot be deleted"},400);
    row.deleted_at=new Date().toISOString();row.updated_at=new Date().toISOString();return send(response,row.id);
  }
  if (table === "rpc/restore_training_session") {
    const row=sessions.find(session=>session.id===input.session_id);
    if(!row) return send(response,{message:"Session unavailable"},400);
    row.deleted_at=null;row.updated_at=new Date().toISOString();return send(response,row.id);
  }
  if (table === "rpc/save_training_session") {
    const data = input.payload; const id = data.id ?? randomUUID();
    if(sessions.some(session=>session.id===id && session.deleted_at)) return send(response,{message:"Deleted session"},400);
    const row = { ...data, id, updated_at: new Date().toISOString(), training_weeks: { training_programs: { status: data.published ? "published" : "draft" } }, workout_results: [], workout_sections: data.sections.map((section, position) => ({ ...section, interval_rounds: section.interval_rounds ?? (section.format === "tabata" ? 8 : section.format === "emom" ? Math.ceil((section.time_cap_seconds ?? 60) / 60) : null), emom_interval_seconds: section.format === "emom" ? section.emom_interval_seconds ?? 60 : null, time_cap_seconds: section.format === "emom" ? (section.interval_rounds ?? Math.ceil((section.time_cap_seconds ?? 60) / 60)) * (section.emom_interval_seconds ?? 60) : section.format === "tabata" ? (section.interval_rounds ?? 8) * ((section.tabata_work_seconds ?? 20) + (section.tabata_rest_seconds ?? 10)) : section.time_cap_seconds, id: randomUUID(), position, prescribed_exercises: section.exercises.map((exercise, index) => ({ ...exercise, position: index, prescribed_sets: exercise.sets.map((set, at) => ({ ...set, set_number: at + 1 })) })) })) };
    sessions = sessions.filter(session => session.id !== id).concat(row); return send(response, id);
  }
  if (table === "rpc/complete_training_session") {
    const row = sessions.find(session => session.id === input.payload.session_id);
    if (!row || row.deleted_at || row.status !== "scheduled") return send(response, { message: "Unavailable" }, 400);
    row.status = "completed";
    row.workout_results = input.payload.results.map(result => ({ ...result, id: randomUUID(), completed_at: new Date().toISOString(), format: row.workout_sections.find(section => section.id === result.section_id).format, completed_sets: result.sets }));
    return send(response, null);
  }
  if (table === "rpc/save_workout_section") {
    const payload = input.payload;
    const row = sessions.find(session => session.id === payload.session_id);
    const section = row?.workout_sections.find(section => section.id === payload.result.section_id);
    if (!row || row.deleted_at || !section || row.training_weeks.training_programs.status !== "published") return send(response, { message: "Unavailable" }, 400);
    const details=payload.result.score_details??{};
    if(details.intervals && section.format==="emom" && (details.intervals.length!==section.interval_rounds || payload.result.rounds!==details.intervals.filter(Boolean).length)) return send(response,{message:"EMOM prescribed round count mismatch"},400);
    if(details.intervals && section.format!=="emom") return send(response,{message:"Completion flags are EMOM-only"},400);
    if(["intervals","tabata"].includes(section.format)) {
      const scores=details.interval_scores;const count=section.interval_rounds;
      if(!Array.isArray(scores)||scores.length!==count||!scores.every(value=>Number.isInteger(value)&&value>=0&&value<=100000)||payload.result.rounds!==count||payload.result.repetitions!==(section.format==="tabata"?Math.min(...scores):scores.reduce((sum,value)=>sum+value,0))) return send(response,{message:"Invalid numeric round scores"},400);
    } else if(details.interval_scores) return send(response,{message:"Numeric scores outside format"},400);
    const previous = row.workout_results.filter(result => result.section_id === section.id).at(-1);
    if ((previous?.id ?? null) !== payload.expected_result_id) return send(response, { message: "Stale revision" }, 400);
    const result = { ...payload.result, id: randomUUID(), completed_at: new Date().toISOString(), format: section.format, completed_sets: payload.result.sets };
    row.workout_results.push(result);
    const completed = row.workout_sections.every(section => row.workout_results.some(result => result.section_id === section.id));
    if (completed) row.status = "completed";
    return send(response, { id: result.id, completed_at: result.completed_at, session_completed: completed });
  }
  if (table === "profiles") return send(response, profile);
  if (table === "athlete_settings") return send(response, settings);
  if (table === "exercises") {
    if (request.method === "POST") { exercises.push({ ...input, id: randomUUID(), archived: false }); return send(response, null, 201); }
    if (request.method === "PATCH") { const row = exercises.find(exercise => `eq.${exercise.id}` === url.searchParams.get("id")); Object.assign(row, input); return send(response, row); }
    if (url.searchParams.has("id")) return send(response,exercises.find(exercise => `eq.${exercise.id}`===url.searchParams.get("id")) ?? null);
    const ordered=[...exercises].sort((a,b)=>a.id.localeCompare(b.id));
    const offset=Number(url.searchParams.get("offset") ?? 0); const limit=Number(url.searchParams.get("limit") ?? ordered.length);
    return send(response, ordered.slice(offset,offset+limit));
  }
  if (table === "personal_records") {
    if (request.method === "POST") { records.unshift({ ...input, id: randomUUID() }); return send(response, null, 201); }
    const rows=url.searchParams.get("order")?.startsWith("id.")?[...records].sort((a,b)=>a.id.localeCompare(b.id)):records;
    const offset=Number(url.searchParams.get("offset")??0);const limit=Number(url.searchParams.get("limit")??rows.length);return send(response,rows.slice(offset,offset+limit));
  }
  if (table === "workout_results") {
    const rows = sessions.filter(session=>!session.deleted_at).flatMap(session=>session.workout_results.map(result=>({ ...result, training_sessions: {id:session.id,title:session.title,scheduled_on:session.scheduled_on,status:session.status},workout_sections:session.workout_sections.find(section=>section.id===result.section_id) })));
    const ordered=rows.sort((a,b)=>a.id.localeCompare(b.id));const offset=Number(url.searchParams.get("offset")??0);const limit=Number(url.searchParams.get("limit")??ordered.length);
    return send(response,ordered.slice(offset,offset+limit));
  }
  if (table === "training_sessions") {
    if (url.searchParams.has("id")) return send(response, sessions.find(session => !session.deleted_at && `eq.${session.id}` === url.searchParams.get("id")) ?? null);
    const range = url.searchParams.getAll("scheduled_on");
    const rows=sessions.filter(session => !session.deleted_at && range.every(filter => filter.startsWith("gte.") ? session.scheduled_on >= filter.slice(4) : session.scheduled_on <= filter.slice(4))).sort((a,b)=>a.id.localeCompare(b.id));
    const offset=Number(url.searchParams.get("offset")??0);const limit=Number(url.searchParams.get("limit")??rows.length);return send(response,rows.slice(offset,offset+limit));
  }
  return send(response, { error: `Unexpected fixture table ${table}` }, 400);
}).listen(54329, "127.0.0.1");
