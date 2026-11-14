import { Link } from "@tanstack/react-router";
import { CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CRITERIA, type Scores } from "@/lib/feedback";
import { deltas, overall } from "@/lib/assessment";
import { AFTER_RESULT, EMPTY, GROWTH_CARD, resultText } from "@/lib/copy";
import type { SkillPoint } from "@/lib/use-skill-history";

const COLORS = ["var(--primary)", "var(--destructive)", "var(--chart-2, #2a9d8f)", "var(--chart-4, #e9c46a)", "var(--chart-5, #f4a261)", "var(--muted-foreground)"] as const;

function CompareRadar({ series, height = 280 }: { series: { name: string; scores: Scores; color: string }[]; height?: number }) {
  const data = CRITERIA.map(([k, l]) => ({ criterion: l, ...Object.fromEntries(series.map((s) => [s.name, s.scores[k] ?? 0])) }));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid className="stroke-border" />
          <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={false} axisLine={false} />
          {series.map((s) => <Radar key={s.name} name={s.name} dataKey={s.name} stroke={s.color} fill={s.color} fillOpacity={0.2} />)}
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DeltaList({ prev, cur }: { prev: Scores; cur: Scores }) {
  return (
    <ul className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
      {deltas(prev, cur).map((d) => (
        <li key={d.key} className="flex justify-between rounded-md bg-muted px-2 py-1">
          <span>{d.label}</span>
          <b className={d.delta > 0 ? "text-primary" : d.delta < 0 ? "text-destructive" : ""}>{d.delta > 0 ? "+" : ""}{d.delta}</b>
        </li>
      ))}
    </ul>
  );
}

/** «Динамика» block shown on a result screen: before/after vs. previous result and the entry test. */
export function DynamicsBlock({ points, sourceId }: { points: SkillPoint[] | null; sourceId: string }) {
  if (!points) return null;
  const idx = points.findIndex((p) => p.sourceId === sourceId && p.source !== "assessment");
  if (idx < 0) return null;
  const cur = points[idx]!;
  const prev = points.slice(0, idx).reverse().find(() => true);
  const test = points.slice(0, idx + 1).filter((p) => p.source === "assessment").pop();
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-lg font-bold">📈 {AFTER_RESULT.title}</h2>
      {!prev ? (
        <p className="text-sm text-muted-foreground">{EMPTY.dynamics} <Link to="/assessment" className="text-primary underline">Пройдите входной тест</Link>, чтобы видеть сравнение.</p>
      ) : (
        <>
          <CompareRadar series={[
            { name: "До", scores: prev.scores, color: COLORS[5] },
            { name: "После", scores: cur.scores, color: COLORS[0] },
            ...(test && test !== prev ? [{ name: "Тест", scores: test.scores, color: COLORS[1] }] : []),
          ]} />
          <DeltaList prev={prev.scores} cur={cur.scores} />
          <div className="space-y-1 rounded-lg bg-muted p-3 text-sm">
            {(["empathy", "argumentation"] as const).map((k) => {
              const b = prev.scores[k];
              const a = cur.scores[k];
              return typeof b === "number" && typeof a === "number" ? <div key={k}>{GROWTH_CARD.line(k, b, a)}</div> : null;
            })}
          </div>
          <p className="text-sm">{resultText(prev.scores, cur.scores)}</p>
          {test && <p className="text-sm text-muted-foreground">По сравнению с тестом: старт {overall(test.scores)} → сейчас {overall(cur.scores)}</p>}
        </>
      )}
    </section>
  );
}

/** Per-scale lines over the last N results. */
function HistoryLines({ points }: { points: SkillPoint[] }) {
  const src = { assessment: "Тест", session: "Игра", solo: "ИИ" };
  const data = points.map((p, i) => ({ name: `${i + 1}. ${src[p.source]}`, ...Object.fromEntries(CRITERIA.map(([k, l]) => [l, p.scores[k] ?? null])) }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} width={24} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {CRITERIA.map(([, l], i) => <Line key={l} dataKey={l} stroke={COLORS[i]} strokeWidth={2} dot={false} connectNulls />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** «Мой профиль коммуникации»: current radar, start→now, history lines. */
export function CommunicationProfile({ points, full = false }: { points: SkillPoint[] | null; full?: boolean }) {
  if (!points) return null;
  const test = points.find((p) => p.source === "assessment");
  if (!points.length)
    return (
      <section className="rounded-2xl border border-primary/40 bg-accent p-5">
        <h2 className="text-lg font-bold">🧭 Мой профиль коммуникации</h2>
        <p className="mt-1 text-sm">Пройдите входной тест, чтобы увидеть свой профиль коммуникации.</p>
        <Link to="/assessment" className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Пройти тест (5 минут)</Link>
      </section>
    );
  const recent = points.slice(-3);
  const current: Scores = Object.fromEntries(CRITERIA.map(([k]) => {
    const v = recent.map((p) => p.scores[k]).filter((x): x is number => typeof x === "number");
    return [k, v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : 0];
  }));
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">🧭 Мой профиль коммуникации</h2>
        {!full && <Link to="/profile/communication" className="text-sm text-primary underline">Подробнее</Link>}
      </div>
      <CompareRadar series={[{ name: "Сейчас", scores: current, color: COLORS[0] }, ...(test ? [{ name: "Старт (тест)", scores: test.scores, color: COLORS[5] }] : [])]} />
      {test ? <p className="text-sm">Старт: <b>{overall(test.scores)}</b> → Сейчас: <b>{overall(current)}</b></p>
        : <p className="text-sm"><Link to="/assessment" className="text-primary underline">Пройдите входной тест</Link>, чтобы видеть сравнение со стартом.</p>}
      {points.length > 1 && <HistoryLines points={points.slice(full ? -30 : -10)} />}
    </section>
  );
}

export { CompareRadar };
