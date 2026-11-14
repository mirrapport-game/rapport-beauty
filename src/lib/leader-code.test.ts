import { describe, it, expect } from "vitest";
import { normalizeLeaderCode } from "./leader-code.functions";

describe("leader access code", () => {
  it("matches the code regardless of case and spaces", () => {
    expect(normalizeLeaderCode(" раппорт2027 раппортbeauty ")).toBe(normalizeLeaderCode("Раппорт2027РаппортBeauty"));
  });
  it("does not match a different code", () => {
    expect(normalizeLeaderCode("Раппорт2026РаппортBeauty")).not.toBe(normalizeLeaderCode("Раппорт2027РаппортBeauty"));
  });
});
