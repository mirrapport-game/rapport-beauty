import hall from "@/data/assessments/hall_v1.json";
import emin from "@/data/assessments/emin_v1.json";
import goleman from "@/data/assessments/goleman_v1.json";
import { CRITERIA, type CriterionKey, type Scores } from "@/lib/feedback";

export type TestScale = { id: string; title: string };
export type TestOption = { id: string; text: string; scores: Record<string, number> };
export type TestQuestion = { id: string; scenario: string; question: string; options: TestOption[] };
export type EiTest = {
  id: string; title: string; description: string; author_concept: string; estimated_minutes: number;
  scales: TestScale[]; questions: TestQuestion[];
};
/** Common scale → list of test scales averaged into it. */
export type CommonMapping = Record<CriterionKey, string[]>;

/** Default mapping of EI test scales onto the 6 app-wide scales (also stored in assessment_tests.scale_mapping). */
export const DEFAULT_MAPPING: CommonMapping = {
  empathy: ["empathy"],
  listening: ["empathy", "self_awareness"],
  argumentation: ["social_skills", "self_motivation"],
  stress: ["stress", "emotion_management"],
  teamwork: ["social_skills"],
  upselling: ["self_motivation", "social_skills"],
};

const build = (d: { meta: { scales: TestScale[]; estimated_minutes: number }; assessment_test: { id: string; title: string; description: string; author_concept: string }; questions: TestQuestion[] }): EiTest => ({
  ...d.assessment_test, estimated_minutes: d.meta.estimated_minutes, scales: d.meta.scales, questions: d.questions,
});

export const EI_TESTS: EiTest[] = [build(hall as never), build(emin as never), build(goleman as never)];
export const getTest = (id: string) => EI_TESTS.find((t) => t.id === id);

const r2 = (n: number) => Math.round(n * 100) / 100;
const avg = (v: number[]) => (v.length ? r2(v.reduce((a, b) => a + b, 0) / v.length) : 0);

/** Average each test scale over answered questions. */
export function scoreTest(test: EiTest, answers: Record<string, string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of test.scales) {
    out[s.id] = avg(test.questions.map((q) => q.options.find((o) => o.id === answers[q.id])?.scores[s.id]).filter((x): x is number => typeof x === "number"));
  }
  return out;
}

/** Project test-scale scores onto the 6 common scales. */
export function toCommon(testScores: Record<string, number>, mapping: CommonMapping = DEFAULT_MAPPING): Scores {
  const out: Scores = {};
  for (const [k] of CRITERIA) out[k] = avg((mapping[k] ?? []).map((s) => testScores[s]).filter((x): x is number => typeof x === "number"));
  return out;
}
