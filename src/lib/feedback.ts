export const CRITERIA = [
  ["empathy", "Эмпатия"],
  ["listening", "Слушание"],
  ["argumentation", "Аргументация"],
  ["stress", "Стрессоустойчивость"],
  ["teamwork", "Командность"],
  ["upselling", "Допродажи"],
] as const;
export type CriterionKey = (typeof CRITERIA)[number][0];
export type Scores = Partial<Record<CriterionKey, number>>;

/** Average every criterion over a list of score objects (ignores missing values). */
export function avgScores(list: Scores[]): Scores {
  const out: Scores = {};
  for (const [k] of CRITERIA) {
    const v = list.map((s) => s[k]).filter((x): x is number => typeof x === "number");
    if (v.length) out[k] = Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100;
  }
  return out;
}

export function mean(v: (number | null | undefined)[]): number | null {
  const n = v.filter((x): x is number => typeof x === "number");
  return n.length ? Math.round((n.reduce((a, b) => a + b, 0) / n.length) * 100) / 100 : null;
}

/** Longest run of consecutive calendar days among the given dates. */
export function longestStreak(dates: string[]): number {
  const days = [...new Set(dates.map((d) => new Date(d).toISOString().slice(0, 10)))].sort();
  let best = 0, run = 0, prev = 0;
  for (const d of days) {
    const t = Date.parse(d) / 86400000;
    run = t - prev === 1 ? run + 1 : 1;
    prev = t;
    best = Math.max(best, run);
  }
  return best;
}

export const radarData = (s: Scores) => CRITERIA.map(([k, l]) => ({ criterion: l, value: s[k] ?? 0 }));
