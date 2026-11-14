import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CRITERIA, avgScores, mean, type Scores } from "@/lib/feedback";
import { useAnalyticsData } from "@/lib/use-analytics";

export const Route = createFileRoute("/_authenticated/admin/analytics/")({
  head: () => ({ meta: [{ title: "Аналитика — админка" }] }),
  component: Analytics,
});

function Analytics() {
  const d = useAnalyticsData();
  const [days, setDays] = useState(30);
  const [cat, setCat] = useState("");
  const [leader, setLeader] = useState("");

  const v = useMemo(() => {
    const from = Date.now() - days * 86400000;
    const sessions = d.sessions.filter((s) => Date.parse(s.created_at) >= from && (!cat || (s.category_ids ?? []).includes(cat)) && (!leader || s.leader_id === leader));
    const ids = new Set(sessions.map((s) => s.id));
    const fb = d.feedback.filter((f) => ids.has(f.session_id));
    const parts = d.participants.filter((p) => ids.has(p.session_id));
    const byDay = new Map<string, number>();
    for (const s of sessions) { const k = s.created_at.slice(0, 10); byDay.set(k, (byDay.get(k) ?? 0) + 1); }
    const catCount = new Map<string, number>();
    for (const s of sessions) for (const c of s.category_ids ?? []) catCount.set(c, (catCount.get(c) ?? 0) + 1);
    const avg = avgScores(fb.map((f) => f.scores as Scores));
    return {
      sessions, fb, users: new Set(parts.map((p) => p.user_id)).size, overall: mean(fb.map((f) => f.overall_rating)), avg,
      perDay: [...byDay.entries()].sort().map(([day, n]) => ({ day: day.slice(5), n })),
      topCats: [...catCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, n]) => ({ name: d.cats.find((c) => c.id === id)?.title ?? id, n })),
      crit: CRITERIA.map(([k, l]) => ({ name: l, v: avg[k] ?? 0 })),
    };
  }, [d, days, cat, leader]);

  if (!d.loaded) return <p>Загрузка…</p>;
  const leaders = [...new Set(d.sessions.map((s) => s.leader_id))];
  const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";
  const box = "rounded-xl border border-border bg-card p-4";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Аналитика</h1>
      <div className="flex flex-wrap gap-2">
        <select className={sel} value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[7, 30, 90, 365, 3650].map((n) => <option key={n} value={n}>{n === 3650 ? "Всё время" : `${n} дней`}</option>)}
        </select>
        <select className={sel} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Все рубрики</option>{d.cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
        <select className={sel} value={leader} onChange={(e) => setLeader(e.target.value)}><option value="">Все ведущие</option>{leaders.map((l) => <option key={l} value={l}>{d.people.get(l) ?? l.slice(0, 8)}</option>)}</select>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Сессий", v.sessions.length], ["Активных игроков", v.users], ["Отзывов", v.fb.length], ["Средняя оценка", v.overall ?? "—"]].map(([l, n]) => (
          <div key={l as string} className={`${box} text-center`}><div className="text-2xl font-bold text-primary">{n}</div><div className="text-xs text-muted-foreground">{l}</div></div>
        ))}
      </div>
      {v.sessions.length === 0 ? <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">За выбранный период сессий нет.</p> : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className={box}><h2 className="mb-2 text-sm font-semibold">Сессии по дням</h2>
            <div className="h-56"><ResponsiveContainer><LineChart data={v.perDay}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="day" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Line dataKey="n" name="Сессий" stroke="var(--primary)" strokeWidth={2} /></LineChart></ResponsiveContainer></div>
          </div>
          <div className={box}><h2 className="mb-2 text-sm font-semibold">Средние оценки по критериям</h2>
            <div className="h-56"><ResponsiveContainer><BarChart data={v.crit}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" fontSize={10} interval={0} angle={-20} textAnchor="end" height={50} /><YAxis domain={[0, 5]} fontSize={11} /><Tooltip /><Bar dataKey="v" name="Оценка" fill="var(--primary)" radius={4} /></BarChart></ResponsiveContainer></div>
          </div>
          <div className={`${box} md:col-span-2`}><h2 className="mb-2 text-sm font-semibold">Топ рубрик по числу сессий</h2>
            {v.topCats.length === 0 ? <p className="text-sm text-muted-foreground">В сессиях не выбирались отдельные рубрики.</p> :
              <ul className="space-y-1 text-sm">{v.topCats.map((c) => <li key={c.name} className="flex justify-between"><span>{c.name}</span><span className="font-semibold">{c.n}</span></li>)}</ul>}
          </div>
        </div>
      )}
    </div>
  );
}
