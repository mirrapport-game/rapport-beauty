import { describe, expect, it } from "vitest";
import { dayIndex, quickQuestionsFor, ROLE_QUICK_CATEGORIES, roleForToday, weakest } from "@/lib/daily-path";

const roles = ["dr_admin", "dr_sanitary", "dr_owner", "dr_therapist"];

describe("roleForToday", () => {
  it("my role mode returns the chosen role", () => {
    expect(roleForToday("my_role", { myRole: "dr_admin", roles })).toBe("dr_admin");
  });
  it("my role mode without a chosen role returns null", () => {
    expect(roleForToday("my_role", { roles })).toBeNull();
  });
  it("career starts with the sanitary role and ends with owner", () => {
    expect(roleForToday("career", { careerStep: 1, roles })).toBe("dr_sanitary");
    expect(roleForToday("career", { careerStep: 10, roles })).toBe("dr_owner");
  });
  it("random mode picks from the role list", () => {
    expect(roleForToday("random", { roles, rnd: 0.6 })).toBe("dr_owner");
  });
});

describe("weakest", () => {
  it("returns the lowest scale", () => {
    expect(weakest({ empathy: 4, listening: 2, argumentation: 3 })).toBe("listening");
  });
});

const qs = [
  { id: "q1", category_id: "master_client" },
  { id: "q2", category_id: "admin_client" },
  { id: "q3", category_id: "owner_staff" },
];

describe("quickQuestionsFor", () => {
  it("returns only situations from the player's role rubrics", () => {
    const pool = quickQuestionsFor("dr_junior", qs);
    expect(pool.map((q) => q.id)).toEqual(["q1"]);
  });
  it("owner gets owner/leader situations", () => {
    expect(quickQuestionsFor("dr_owner", qs).map((q) => q.id)).toEqual(["q3"]);
  });
  it("unknown role falls back to the full pool", () => {
    expect(quickQuestionsFor("dr_unknown", qs)).toHaveLength(3);
    expect(quickQuestionsFor(null, qs)).toHaveLength(3);
  });
  it("every daily role has a mapping", () => {
    for (const r of ["dr_sanitary", "dr_junior", "dr_driver", "dr_admin", "dr_lab_nurse", "dr_accountant", "dr_head", "dr_owner", "dr_checkup_doc", "dr_therapist"]) {
      expect(ROLE_QUICK_CATEGORIES[r]?.length).toBeGreaterThan(0);
    }
  });
});

describe("dayIndex", () => {
  it("is stable for the same seed and within range", () => {
    expect(dayIndex("user:2026-11-06", 12)).toBe(dayIndex("user:2026-11-06", 12));
    expect(dayIndex("user:2026-11-06", 12)).toBeLessThan(12);
    expect(dayIndex("user:2026-11-06", 12)).toBeGreaterThanOrEqual(0);
  });
  it("handles empty pool", () => {
    expect(dayIndex("x", 0)).toBe(0);
  });
});
