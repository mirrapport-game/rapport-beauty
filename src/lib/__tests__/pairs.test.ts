import { describe, expect, it } from "vitest";
import { allRoles, partnerAt, roleAt, sideOf, splitPair } from "@/lib/pairs";

describe("role pairs", () => {
  it("splits a rubric title into two roles", () => {
    expect(splitPair("Мастер → Клиент")).toEqual(["Мастер", "Клиент"]);
  });
  it("both sides are selectable roles", () => {
    expect(roleAt("Мастер → Клиент", "left")).toBe("Мастер");
    expect(roleAt("Мастер → Клиент", "right")).toBe("Клиент");
  });
  it("the partner is the opposite side", () => {
    expect(partnerAt("Косметолог → Клиент", "left")).toBe("Клиент");
    expect(partnerAt("Косметолог → Клиент", "right")).toBe("Косметолог");
  });
  it("a missing side falls back to left", () => {
    expect(sideOf(null)).toBe("left");
    expect(sideOf("right")).toBe("right");
  });
  it("lists every role across several rubrics without repeats", () => {
    expect(allRoles(["Мастер → Клиент", "Косметолог → Клиент"])).toEqual(["Мастер", "Клиент", "Косметолог"]);
  });
});
