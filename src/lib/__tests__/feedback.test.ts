import { describe, it, expect } from "vitest";
import { avgScores, longestStreak, mean } from "../feedback";

describe("feedback math", () => {
  it("averages each criterion separately", () => {
    expect(avgScores([{ empathy: 4, listening: 5 }, { empathy: 5 }])).toEqual({ empathy: 4.5, listening: 5 });
  });
  it("mean ignores empty values", () => {
    expect(mean([4, null, 5])).toBe(4.5);
    expect(mean([])).toBeNull();
  });
  it("counts consecutive days for streak", () => {
    expect(longestStreak(["2026-01-01T10:00Z", "2026-01-02T10:00Z", "2026-01-03T09:00Z", "2026-01-05T09:00Z"])).toBe(3);
  });
});
