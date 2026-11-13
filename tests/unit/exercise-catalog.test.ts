import { describe, it, expect } from "vitest";
import catalog from "../../data/exercises/catalog.json";
import { exerciseLabel, matchesExercise } from "../../src/modules/training/exercise-labels";
describe("shared exercise catalog", () => {
  it("retains all source identities and bilingual text without media", () => {
    expect(catalog).toHaveLength(1379);
    expect(new Set(catalog.map(row=>row.id)).size).toBe(catalog.length);
    expect(catalog.filter(row=>row.source==="exercises-dataset")).toHaveLength(1324);
    for(const row of catalog) { expect(row.name_es.trim()).not.toBe(""); expect(row.instructions.en.trim()).not.toBe(""); expect(row.instructions.es.trim()).not.toBe(""); expect(row).not.toHaveProperty("gif_url"); }
  });
  it("finds accented Spanish names, English names and common abbreviations", () => {
    const row={...catalog.find(row=>row.name==="Clean and Jerk")!,archived:false};
    expect(matchesExercise(row,"dos tiempos")).toBe(true); expect(matchesExercise(row,"C&J")).toBe(true); expect(matchesExercise(row,"envion")).toBe(true);
    expect(exerciseLabel(row,"es")).toBe("Dos tiempos"); expect(exerciseLabel(row,"en")).toBe("Clean and Jerk");
    expect(catalog.filter(item=>matchesExercise({...item,archived:false},"C&J"))).toHaveLength(1);
  });
  it("keeps the source bar muscle-up distinct from the added ring variant", () => {
    const bar=catalog.find(row=>row.name.toLowerCase()==="kipping muscle up")!;
    const ring=catalog.find(row=>row.source_id==="kipping-ring-muscle-up")!;
    expect(bar.name_es).toContain("barra"); expect(bar.instructions.en).toContain("pull-up bar");
    expect(ring.name_es).toContain("anillas"); expect(ring.equipment).toBe("rings"); expect(ring.id).not.toBe(bar.id);
  });
});
