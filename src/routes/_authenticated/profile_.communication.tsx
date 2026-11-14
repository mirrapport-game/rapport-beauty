import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { GAME_TITLE } from "@/lib/game";
import { useSkillHistory, type SkillPoint } from "@/lib/use-skill-history";
import { CRITERIA, avgScores } from "@/lib/feedback";
import { getTest } from "@/lib/ei-tests";
import { SkillRadar } from "@/components/SkillRadar";
import { CareerLadder } from "@/components/CareerLadder";

export const Route = createFileRoute("/_authenticated/profile_/communication")({
  head: () => ({
    meta: [
      { title: `Мой профиль коммуникации — ${GAME_TITLE}` },
      { name: "description", content: "Сводный радар по 6 навыкам, фильтр по источнику и динамика по каждой шкале." },
      { property: "og:title", content: `Профиль коммуникации — ${GAME_TITLE}` },
      { property: "og:description", content: "Как меняются ваши навыки общения от теста к игре." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommPage,
});

type Src = "assessment" | "session" | "solo" | "daily";
const SRC: Record<Src, { label: string; color: string }> = {
  assessment: { label: "🧭 Тест", color: "var(--primary)" },
  session: { label: "🎲 Сессия", color: "var(--destructive)" },
  solo: { label: "🤖 Solo", color: "var(--chart-2, #2a9d8f)" },
  daily: { label: "🎭 Роль дня", color: "var(--chart-4, #e9c46a)" },
};

const pointName = (p: SkillPoint) => (p.source === "assessment" ? getTest(p.testId ?? "")?.title ?? "Входной тест" : SRC[p.source].label);

function CommPage() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);
  const points = useSkillHistory(uid);
  const [on, setOn] = useState<Set<Src>>(new Set(["assessment", "session", "solo", "daily"]));
  const shown = useMemo(() => (points ?? []).filter((p) => on.has(p.source)), [points, on]);
  const toggle = (s: Src) => setOn((o) => { const n = new Set(o); n.has(s) ? n.delete(s) : n.add(s); return n; });
  const data = shown.map((p, i) => ({ i: i + 1, date: new Date(p.at).toLocaleDateString("ru"), name: pointName(p), source: p.source, ...p.scores }));

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold">Мой профиль коммуникации</h1>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SRC) as Src[]).map((s) => (
          <button key={s} onClick={() => toggle(s)}
            className={`rounded-full border px-3 py-1 text-sm ${on.has(s) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
            {SRC[s].label}
          </button>
        ))}
      </div>
      {on.has("daily") && <p className="text-xs text-muted-foreground">Роль дня оценивается словами, а не по 6 шкалам, поэтому на графиках её точек нет.</p>}

      {!points ? <p className="text-muted-foreground">Загрузка…</p> : !shown.length ? (
        <section className="rounded-2xl border border-primary/40 bg-accent p-5">
          <p>Пока нет результатов для выбранных источников.</p>
          <Link to="/assessment" className="mt-3 inline-block rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">Пройти тест</Link>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-semibold">Сводный радар</h2>
            <p className="text-xs text-muted-foreground">Среднее по {shown.length} результатам</p>
            <SkillRadar scores={avgScores(shown.map((p) => p.scores))} />
          </section>
          <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
            <h2 className="font-semibold">Динамика по каждому навыку</h2>
            {CRITERIA.map(([k, label]) => (
              <div key={k}>
                <div className="text-sm font-medium">{label}</div>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 6, right: 8, left: -28, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="i" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 5]} ticks={[0, 2.5, 5]} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => [v, label]} labelFormatter={(_, p) => { const d = p?.[0]?.payload; return d ? `${d.name} · ${d.date}` : ""; }} />
                      <Line type="monotone" dataKey={k} stroke="var(--primary)" strokeWidth={2} connectNulls isAnimationActive
                        dot={(props: { cx?: number; cy?: number; payload?: { source: Src }; index?: number }) => (
                          <circle key={props.index} cx={props.cx} cy={props.cy} r={4} fill={SRC[props.payload?.source ?? "solo"].color} stroke="var(--background)" strokeWidth={1} />
                        )} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-3 text-xs">
              {(["assessment", "session", "solo"] as Src[]).map((s) => (
                <span key={s} className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: SRC[s].color }} />{SRC[s].label}</span>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-2 font-semibold">История</h2>
            <ul className="space-y-1 text-sm">
              {[...shown].reverse().map((p) => (
                <li key={p.source + p.sourceId + p.at} className="flex justify-between gap-2">
                  <span>{pointName(p)}</span>
                  <span className="text-muted-foreground">{new Date(p.at).toLocaleDateString("ru")}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      <CareerLadder />
      <Link to="/assessment" className="block rounded-2xl border border-border bg-card p-4 text-center font-semibold">🧭 Тесты коммуникации</Link>
    </main>
  );
}
