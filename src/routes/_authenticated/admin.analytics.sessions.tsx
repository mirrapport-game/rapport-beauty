import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { mean } from "@/lib/feedback";
import { useAnalyticsData } from "@/lib/use-analytics";

export const Route = createFileRoute("/_authenticated/admin/analytics/sessions")({
  head: () => ({ meta: [{ title: "Все сессии — админка" }] }),
  component: Sessions,
});

const ST: Record<string, string> = { active: "идёт", finished: "завершена", paused: "пауза", draft: "черновик" };

function Sessions() {
  const d = useAnalyticsData();
  const [f, setF] = useState({ from: "", to: "", leader: "", status: "", cat: "" });
  if (!d.loaded) return <p>Загрузка…</p>;
  const rows = d.sessions.filter((s) =>
    (!f.from || s.created_at >= f.from) && (!f.to || s.created_at.slice(0, 10) <= f.to) && (!f.leader || s.leader_id === f.leader)
    && (!f.status || s.status === f.status) && (!f.cat || (s.category_ids ?? []).includes(f.cat)));
  const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Все сессии ({rows.length})</h1>
      <div className="flex flex-wrap gap-2">
        <input type="date" className={sel} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
        <input type="date" className={sel} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
        <select className={sel} value={f.leader} onChange={(e) => setF({ ...f, leader: e.target.value })}><option value="">Все ведущие</option>{[...new Set(d.sessions.map((s) => s.leader_id))].map((l) => <option key={l} value={l}>{d.people.get(l) ?? l.slice(0, 8)}</option>)}</select>
        <select className={sel} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Любой статус</option>{Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className={sel} value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}><option value="">Все рубрики</option>{d.cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
      </div>
      {rows.length === 0 ? <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Сессий не найдено.</p> : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card text-sm">
          {rows.map((s) => {
            const fb = d.feedback.filter((x) => x.session_id === s.id);
            return (
              <Link key={s.id} to="/leader/$id/export" params={{ id: s.id }} className="grid gap-1 px-3 py-2.5 hover:bg-muted md:grid-cols-[minmax(0,1fr)_110px_160px_90px_120px] md:gap-3">
                <span className="font-medium">{s.title} <span className="font-mono text-xs text-muted-foreground">{s.code}</span></span>
                <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("ru-RU")}</span>
                <span className="truncate text-xs">{d.people.get(s.leader_id) ?? "—"}</span>
                <span className="text-xs">{ST[s.status] ?? s.status}</span>
                <span className="text-xs text-muted-foreground">{d.participants.filter((p) => p.session_id === s.id).length} игр. · ★ {mean(fb.map((x) => x.overall_rating)) ?? "—"}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
