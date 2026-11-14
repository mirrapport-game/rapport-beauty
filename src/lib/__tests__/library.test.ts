import { describe, it, expect } from "vitest";
import { planImport, csvToImport, parseCsv } from "../library";

describe("planImport", () => {
  it("skips ids that already exist instead of overwriting", () => {
    const p = planImport({ skills: [{ id: "s1", title: "A", formula: "f" }] }, "b", new Set(["s1"]), new Set());
    expect(p.cards).toHaveLength(0);
    expect(p.skipped[0]!.id).toBe("s1");
  });
  it("flags duplicate ids in the file", () => {
    const p = planImport({ skills: [{ id: "s1", title: "A", formula: "f" }, { id: "s1", title: "B", formula: "f" }] }, "b", new Set(), new Set());
    expect(p.errors[0]!.reason).toContain("повторяется");
  });
  it("flags broken references", () => {
    const p = planImport({ scenarios: [{ id: "scn1", situation_id: "missing" }] }, "b", new Set(), new Set());
    expect(p.scenarios).toHaveLength(0);
    expect(p.errors[0]!.id).toBe("scn1");
  });
  it("flags missing required fields", () => {
    const p = planImport({ situations: [{ id: "x", title: "T" }] }, "b", new Set(), new Set());
    expect(p.errors[0]!.reason).toContain("description");
  });
  it("rejects level outside 1-3", () => {
    const p = planImport({ roles: [{ id: "r", title: "T", level: 4 }] }, "b", new Set(), new Set());
    expect(p.errors).toHaveLength(1);
  });
});
it("splits CSV array cells by ;", () => {
  const f = csvToImport(parseCsv('id,type,title,formula,tags\ns1,skill,A,f,"a; b"\n'));
  expect(f.skills![0]!["tags"]).toEqual(["a", "b"]);
});
