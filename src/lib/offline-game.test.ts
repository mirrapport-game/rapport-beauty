import { describe, it, expect } from "vitest";
import { dealPool, type ODeck, type OSession } from "./offline-game";
const c = (id: string, scenario_id: string, cat = "a") => ({ id, type: "situation", category_id: cat, title: id, description: null, opening_line: null, level: 1, scenario_id, card_no: null, linked_skill_id: null, formula: null, how_to_apply: null, why_learn: null, task: null, example_dialogue: null });
const deck: ODeck = { savedAt: "", cats: [], scenarios: [], cards: [c("1.1", "s1_1"), c("1.2", "s1_2"), c("2.1", "s2_1"), c("3.1", "s3_1", "b")] };
const s: OSession = { id: "x", title: "", createdAt: "", players: ["A"], catIds: ["a"], turns: [], finished: false };
describe("offline dealPool", () => {
  it("only deals from chosen rubrics", () => expect(dealPool(deck, s).map((x) => x.id)).toEqual(["1.1", "1.2", "2.1"]));
  it("excludes the whole series once one card was dealt", () =>
    expect(dealPool(deck, { ...s, turns: [{ player: "A", cardId: "1.1", score: 4 }] }).map((x) => x.id)).toEqual(["2.1"]));
});
