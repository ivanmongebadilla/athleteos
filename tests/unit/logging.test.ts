import { describe, expect, it } from "vitest";
import { formatClock, parseClock, scoreDetailsSchema, sectionLogSchema } from "@/modules/training/logging";
import { roundScore } from "@/modules/training/logging";
import { sectionSchema } from "@/modules/training/validation";
describe("section scoring", () => {
  it("requires EMOM interval and rounds and caps total duration", () => {
    const section = { kind: "conditioning", format: "emom", time_cap_seconds: 1080, emom_interval_seconds: 180, interval_rounds: 6, instructions: "", exercises: [] };
    expect(sectionSchema.safeParse(section).success).toBe(true);
    for (const patch of [{ emom_interval_seconds: null }, { interval_rounds: null }, { interval_rounds: 0 }, { interval_rounds: 6.5 }, { emom_interval_seconds: 0 }, { emom_interval_seconds: 1.5 }, { emom_interval_seconds: 86400 }]) expect(sectionSchema.safeParse({ ...section, ...patch }).success).toBe(false);
  });
  it("validates numeric rounds separately from boolean EMOM flags",()=>{
    expect(scoreDetailsSchema.safeParse({interval_scores:[0,12,8]}).success).toBe(true);
    for(const value of [[true,1],[-1],[1.5],[null],[100001],[]])expect(scoreDetailsSchema.safeParse({interval_scores:value}).success).toBe(false);
    expect(roundScore("tabata",[12,11,10,9,8,7,6,0])).toBe(0);expect(roundScore("intervals",[10,0,12])).toBe(22);
  });
  it("requires prescribed interval rounds while keeping other plan formats compatible",()=>{
    const section={kind:"conditioning",format:"intervals",time_cap_seconds:null,instructions:"",exercises:[]};
    expect(sectionSchema.safeParse(section).success).toBe(false);expect(sectionSchema.safeParse({...section,interval_rounds:5}).success).toBe(true);
    expect(sectionSchema.safeParse({...section,interval_rounds:0}).success).toBe(false);expect(sectionSchema.safeParse({...section,format:"tabata",interval_rounds:7}).success).toBe(false);
    expect(sectionSchema.safeParse({...section,format:"for_time"}).success).toBe(true);
  });
  it("parses and formats elapsed minutes without treating them as clock times", () => { expect(parseClock("08:42")).toBe(522); expect(parseClock("72:03")).toBe(4323); expect(formatClock(4323)).toBe("72:03"); expect(parseClock("")).toBe(null); expect(parseClock("8:70")).toBeNaN(); expect(parseClock("1.5")).toBeNaN(); });
  it("validates structured interval results and rejects hidden arbitrary payloads", () => { expect(scoreDetailsSchema.safeParse({ intervals: [true, false, true] }).success).toBe(true); expect(scoreDetailsSchema.safeParse({ intervals: ["yes"] }).success).toBe(false); expect(scoreDetailsSchema.safeParse({ arbitrary: "data" }).success).toBe(false); });
  it("requires an actual result while accepting explicitly recorded zero rounds or DNF", () => {
    const value = { session_id: "00000000-0000-4000-8000-000000000031", expected_updated_at: "2026-11-12T10:00:00Z", expected_result_id: null, result: { section_id: "10000000-0000-4000-8000-000000000031", completion_seconds: null, rounds: null, repetitions: null, scaled: false, session_rpe: null, notes: "", sets: [], score_details: {} } };
    expect(sectionLogSchema.safeParse(value).success).toBe(false);
    expect(sectionLogSchema.safeParse({ ...value, result: { ...value.result, rounds: 0 } }).success).toBe(true);
    expect(sectionLogSchema.safeParse({ ...value, result: { ...value.result, score_details: { did_not_finish: true } } }).success).toBe(true);
  });
});
