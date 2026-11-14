import { describe, expect, it } from "vitest";
import { LADDER, QUESTIONS, levelOf, scoreAnswers } from "@/lib/assessment";

describe("assessment", () => {
  it("has 12 questions", () => expect(QUESTIONS).toHaveLength(12));
  it("levels follow thresholds", () => {
    expect(levelOf(2.4)).toBe("beginner");
    expect(levelOf(2.5)).toBe("intermediate");
    expect(levelOf(3.5)).toBe("advanced");
    expect(levelOf(4.6)).toBe("expert");
  });
  it("averages each scale over answers", () => {
    const sc = scoreAnswers({ aq_01: "b", aq_02: "a" }); // empathy 5 and 0
    expect(sc.empathy).toBe(2.5);
  });
  it("ladder goes from sanitary staff to owner", () => {
    expect(LADDER[0].title).toBe("Мастер с клиентом");
    expect(LADDER[LADDER.length - 1]?.title).toBe("Владелец салона");
  });
});
