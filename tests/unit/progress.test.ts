import { describe, expect, it } from "vitest";
import { buildProgress, type ProgressResult, type ProgressSession } from "@/modules/training/progress";
const session = (id: string, date = "2026-11-13", status = "completed"): ProgressSession => ({ id, title: "Training", scheduled_on: date, status });
const result = (s: ProgressSession, id = "a", load = 100, overrides: Partial<ProgressResult> = {}): ProgressResult => ({ id, section_id: `${s.id}-section`, completed_at: "2026-11-13T12:00:00Z", format: "for_time", completion_seconds: 400, scaled: false, score_details: {}, training_sessions:s, workout_sections:{kind:"conditioning",instructions:"21-15-9 thrusters + pull-ups"},completed_sets:[{exercise_id:"squat",repetitions:1,load,unit:"kg",successful:true}],...overrides });
describe("progress from actual training",()=>{
  it("deduplicates revised sections and sessions and excludes deleted/future training",()=>{
    const s=session("a"),future=session("future","2026-11-14"),deleted=session("deleted");
    const data=buildProgress([s,future],[result(s),result(s,"b",90,{completed_at:"2026-11-13T13:00:00Z"}),result(s,"c",80,{section_id:"another"}),result(deleted),result(future)],[],"2026-11-13");
    expect(data.monthSessions).toBe(1);expect(data.days.at(-1)?.count).toBe(1);expect(data.points).toHaveLength(1);expect(data.points[0].kg).toBe(90);expect(data.monthPrs).toBe(1);
  });
  it("counts a streak ending yesterday, breaks after a gap and includes partial logging",()=>{
    const a=session("a","2026-11-11"),b=session("b","2026-11-12","scheduled");
    expect(buildProgress([a,b],[result(a),result(b)],[],"2026-11-13").streak).toBe(2);
    expect(buildProgress([a,b],[result(a),result(b)],[],"2026-11-14").streak).toBe(0);
    expect(buildProgress([a,b],[result(a),result(b)],[],"2026-11-13").monthSessions).toBe(1);
  });
  it("normalizes units, separates rep records, and ignores failed and bodyweight sets",()=>{
    const a=session("a","2026-11-12"),b=session("b");const second=result(b,"b",220.462262,{completed_sets:[{exercise_id:"squat",repetitions:1,load:220.462262,unit:"lb",successful:true},{exercise_id:"squat",repetitions:3,load:80,unit:"kg",successful:true},{exercise_id:"snatch",repetitions:1,load:999,unit:"kg",successful:false},{exercise_id:"pullup",repetitions:10,load:0,unit:"kg",successful:true}]});
    const data=buildProgress([a,b],[result(a),second],[],"2026-11-13");expect(data.points).toHaveLength(3);expect(data.prs).toHaveLength(2);expect(data.prs.find(p=>p.reps===1)?.date).toBe("2026-11-12");
  });
  it("deduplicates historical and logged PRs while comparing against earlier months",()=>{
    const s=session("a");const data=buildProgress([s],[result(s)], [{id:"p1",exercise_id:"squat",recorded_on:"2026-10-10",load:90,unit:"kg",repetitions:1,notes:null},{id:"p2",exercise_id:"squat",recorded_on:"2026-11-13",load:100,unit:"kg",repetitions:1,notes:null}],"2026-11-13");expect(data.monthPrs).toBe(1);expect(data.points).toHaveLength(2);
  });
  it("groups named benchmarks by prescription and scaling, excluding DNF and non-time formats",()=>{
    const sessions=["a","b","c","d","e","f"].map(id=>({...session(id),title:"Fran"}));
    const data=buildProgress(sessions,[result(sessions[0]),result(sessions[1],"b",100,{scaled:true}),result(sessions[2],"c",100,{workout_sections:{kind:"conditioning",instructions:"Different load"}}),result(sessions[3],"d",100,{score_details:{did_not_finish:true}}),result(sessions[4],"e",100,{format:"amrap"}),result({...sessions[5],title:"CrossFit"},"f")],[],"2026-11-13");expect(data.benchmarks).toHaveLength(3);expect(data.benchmarks.every(row=>row.points.length===1)).toBe(true);
  });
  it("returns a complete empty state with exactly 56 date cells",()=>{const data=buildProgress([],[],[],"2026-11-13");expect(data.days).toHaveLength(56);expect(data.streak).toBe(0);expect(data.monthSessions).toBe(0);expect(data.monthPrs).toBe(0);expect(data.benchmarks).toEqual([]);});
  it("includes genuine benchmark bests in recent PRs and monthly totals",()=>{
    const a={...session("a","2026-11-11"),title:"Fran"},b={...session("b","2026-11-12"),title:"Fran"},c={...session("c"),title:"Fran"};
    const data=buildProgress([a,b,c],[result(a,"a",0,{completion_seconds:420,completed_sets:[]}),result(b,"b",0,{completion_seconds:402,completed_sets:[]}),result(c,"c",0,{completion_seconds:430,completed_sets:[]})],[],"2026-11-13");
    expect(data.benchmarkPrs.map(row=>row.seconds)).toEqual([420,402]);expect(data.monthPrs).toBe(2);
  });
});
