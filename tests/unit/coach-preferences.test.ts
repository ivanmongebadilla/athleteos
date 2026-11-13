import { describe, expect, it } from "vitest";
import { coachPreferencesSchema } from "@/modules/coach/preferences";
describe("coach preferences", () => {
  const input={focus:"weightlifting",goal:"Improve snatch",coaching_style:"detailed",expected_updated_at:null};
  it("accepts initial and edited preferences and trims the goal",()=>{
    expect(coachPreferencesSchema.parse({...input,goal:"  My goal  "}).goal).toBe("My goal");
    expect(coachPreferencesSchema.safeParse({...input,expected_updated_at:"2026-11-14T00:00:00Z"}).success).toBe(true);
  });
  it("rejects unsupported preferences, oversized text and supplied ownership",()=>{
    for(const patch of [{focus:"unknown"},{coaching_style:"unknown"},{goal:"x".repeat(1001)},{athlete_id:"other"}]) expect(coachPreferencesSchema.safeParse({...input,...patch}).success).toBe(false);
  });
});
