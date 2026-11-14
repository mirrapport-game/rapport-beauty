import { describe, expect, it } from "vitest";
import { EI_TESTS, getTest, scoreTest, toCommon } from "@/lib/ei-tests";

describe("EI tests", () => {
  it("has the three tests with 15 questions each", () => {
    expect(EI_TESTS.map((t) => t.id)).toEqual(["hall_v1", "emin_v1", "goleman_v1"]);
    for (const t of EI_TESTS) expect(t.questions.length).toBe(15);
  });
  it("maps test scales onto common scales by averaging", () => {
    const c = toCommon({ empathy: 4, self_awareness: 2, stress: 5, emotion_management: 3, social_skills: 4, self_motivation: 2 });
    expect(c.empathy).toBe(4);
    expect(c.listening).toBe(3);
    expect(c.stress).toBe(4);
    expect(c.teamwork).toBe(4);
  });
  it("scores answers per test scale", () => {
    const t = getTest("hall_v1")!;
    const q = t.questions[0]!;
    const s = scoreTest(t, { [q.id]: "b" });
    expect(s["empathy"]).toBe(q.options.find((o) => o.id === "b")!.scores["empathy"]);
  });
});
