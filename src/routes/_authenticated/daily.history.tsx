import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GAME_TITLE } from "@/lib/game";
import { EMPTY } from "@/lib/copy";

export const Route = createFileRoute("/_authenticated/daily/history")({
  head: () => ({
    meta: [
      { title: `История ролей дня — ${GAME_TITLE}` },
      { name: "description", content: "Календарь выполненных ролей дня, серия и средние оценки." },
      { property: "og:title", content: `История ролей дня — ${GAME_TITLE}` },
      { property: "og:description", content: "Календарь, серия дней и оценки." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: History,
});

type Row = { id: string; issued_date: string; status: string; streak_day: number; role_id: string | null; feedback_json: any };

const avg = (r: Row) => {
  const c = r.feedback_json?.checks as { score: number }[] | undefined;
  return c?.length ? c.reduce((a, b) => a + b.score, 0) / c.length : null;
};

function History() {
  const [rows, setRows] = useState<Row[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from("daily_cards").select("id, issued_date, status, streak_day, role_id, feedback_json").order("issued_date", { ascending: false }).then(({ data }) => setRows((data ?? []) as Row[]));
    supabase.from("daily_roles").select("id, title").then(({ data }) => setRoles(Object.fromEntries((data ?? []).map((r) => [r.id, r.title]))));
  }, []);

  const today = new Date();
  const days = Array.from({ length: 35 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - (34 - i)); return d.toLocaleDateString("sv"); });
  const byDate = Object.fromEntries(rows.map((r) => [r.issued_date, r]));
  const todayStr = today.toLocaleDateString("sv");
  const scored = rows.map(avg).filter((x): x is number => x !== null);
  const streak = rows[0]?.status === "answered" ? rows[0].streak_day : 0;

  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 py-6 pb-24">
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary">← Кабинет</Link>
      <h1 className="text-2xl font-bold">📅 Роли дня</h1>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl border border-border bg-card p-3"><div className="text-2xl font-bold text-primary">🔥 {streak}</div><div className="text-xs text-muted-foreground">дней подряд</div></div>
        <div className="rounded-2xl border border-border bg-card p-3"><div className="text-2xl font-bold text-primary">{rows.filter((r) => r.status === "answered").length}</div><div className="text-xs text-muted-foreground">выполнено</div></div>
        <div className="rounded-2xl border border-border bg-card p-3"><div className="text-2xl font-bold text-primary">{scored.length ? (scored.reduce((a, b) => a + b, 0) / scored.length).toFixed(1) : "—"}</div><div className="text-xs text-muted-foreground">средняя оценка</div></div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const r = byDate[d];
          const cls = r?.status === "answered" ? "bg-primary text-primary-foreground" : r ? "bg-destructive/30" : "bg-muted";
          return <div key={d} title={d} className={`flex aspect-square items-center justify-center rounded-md text-xs ${cls} ${d === todayStr ? "ring-2 ring-ring" : ""}`}>{Number(d.slice(8))}</div>;
        })}
      </div>
      <p className="text-xs text-muted-foreground">Цвет: выполнено · пропущено · рамка — сегодня</p>
      <ul className="space-y-2">
        {rows.length === 0 && <li className="text-sm text-muted-foreground">{EMPTY.dailyHistory}</li>}
        {rows.map((r) => (
          <li key={r.id}>
            <Link to="/daily/$cardId" params={{ cardId: r.id }} className="flex justify-between rounded-xl border border-border bg-card p-3 text-sm hover:border-primary">
              <span>{new Date(r.issued_date).toLocaleDateString("ru")} — {roles[r.role_id ?? ""] ?? "Роль"}</span>
              <span>{r.status === "answered" ? `✅ ${avg(r)?.toFixed(1) ?? ""}` : "⏳"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
