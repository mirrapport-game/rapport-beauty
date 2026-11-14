import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mean } from "@/lib/feedback";
import { useAnalyticsData } from "@/lib/use-analytics";

export const Route = createFileRoute("/_authenticated/admin/analytics/users")({
  head: () => ({ meta: [{ title: "Итоги пользователей — админка" }] }),
  component: Users,
});

function Users() {
  const d = useAnalyticsData();
  const [ach, setAch] = useState<{ user_id: string; achievement_id: string }[]>([]);
  const [icons, setIcons] = useState<Map<string, string>>(new Map());
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    supabase.from("user_achievements").select("user_id,achievement_id").then(({ data }) => setAch(data ?? []));
    supabase.from("achievements").select("id,icon,title").then(({ data }) => setIcons(new Map((data ?? []).map((a) => [a.id, `${a.icon} ${a.title}`]))));
  }, []);
  if (!d.loaded) return <p>Загрузка…</p>;
  const users = [...d.people.entries()].map(([id, name]) => {
    const parts = d.participants.filter((p) => p.user_id === id);
    const pids = new Set(parts.map((p) => p.id));
    const fb = d.feedback.filter((f) => pids.has(f.to_participant));
    return { id, name, sessions: new Set(parts.map((p) => p.session_id)).size, avg: mean(fb.map((f) => f.overall_rating)), fb: fb.length, ach: ach.filter((a) => a.user_id === id).map((a) => a.achievement_id), parts };
  }).filter((u) => u.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.sessions - a.sessions);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Пользователи: итоги</h1>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по имени" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" />
      <div className="divide-y divide-border rounded-xl border border-border bg-card text-sm">
        {users.map((u) => (
          <div key={u.id}>
            <button onClick={() => setOpen(open === u.id ? null : u.id)} className="grid w-full gap-1 px-3 py-2.5 text-left hover:bg-muted md:grid-cols-[minmax(0,1fr)_90px_90px_minmax(0,1fr)] md:gap-3">
              <span className="font-medium">{u.name}</span>
              <span className="text-xs">{u.sessions} сес.</span>
              <span className="text-xs">★ {u.avg ?? "—"} ({u.fb})</span>
              <span className="truncate text-xs">{u.ach.map((a) => icons.get(a)?.split(" ")[0]).join(" ") || "—"}</span>
            </button>
            {open === u.id && (
              <div className="space-y-1 bg-muted/40 px-3 py-2 text-xs">
                {u.ach.length > 0 && <div>Достижения: {u.ach.map((a) => icons.get(a) ?? a).join(", ")}</div>}
                {u.parts.length === 0 ? <div className="text-muted-foreground">Ещё не играл.</div> : u.parts.map((p) => {
                  const s = d.sessions.find((x) => x.id === p.session_id);
                  const fb = d.feedback.filter((f) => f.to_participant === p.id);
                  return <div key={p.id}>{s?.title ?? "Сессия"} · {new Date(p.joined_at).toLocaleDateString("ru-RU")} · ★ {mean(fb.map((f) => f.overall_rating)) ?? "—"}</div>;
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
