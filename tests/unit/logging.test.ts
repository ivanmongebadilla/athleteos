import { describe, expect, it } from "vitest";
import { formatClock, parseClock, scoreDetailsSchema, sectionLogSchema } from "@/modules/training/logging";
describe("section scoring", () => {
  it("parses and formats elapsed minutes without treating them as clock times", () => { expect(parseClock("08:42")).toBe(522); expect(parseClock("72:03")).toBe(4323); expect(formatClock(4323)).toBe("72:03"); expect(parseClock("")).toBe(null); expect(parseClock("8:70")).toBeNaN(); expect(parseClock("1.5")).toBeNaN(); });
  it("validates structured interval results and rejects hidden arbitrary payloads", () => { expect(scoreDetailsSchema.safeParse({ intervals: [true, false, true] }).success).toBe(true); expect(scoreDetailsSchema.safeParse({ intervals: ["yes"] }).success).toBe(false); expect(scoreDetailsSchema.safeParse({ arbitrary: "data" }).success).toBe(false); });
  it("requires an actual result while accepting explicitly recorded zero rounds or DNF", () => {
    const value = { session_id: "00000000-0000-4000-8000-000000000031", expected_updated_at: "2026-11-12T10:00:00Z", expected_result_id: null, result: { section_id: "10000000-0000-4000-8000-000000000031", completion_seconds: null, rounds: null, repetitions: null, scaled: false, session_rpe: null, notes: "", sets: [], score_details: {} } };
    expect(sectionLogSchema.safeParse(value).success).toBe(false);
    expect(sectionLogSchema.safeParse({ ...value, result: { ...value.result, rounds: 0 } }).success).toBe(true);
    expect(sectionLogSchema.safeParse({ ...value, result: { ...value.result, score_details: { did_not_finish: true } } }).success).toBe(true);
  });
});
