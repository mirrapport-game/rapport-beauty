import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-roles";
import { DURATION_STAGES, MODES, MODE_HINTS, useCategories } from "@/lib/game-cards";

export const Route = createFileRoute("/_authenticated/leader/")({
  head: () => ({ meta: [{ title: "Кабинет ведущего — Раппорт" }] }),
  component: LeaderHome,
});

type Row = { id: string; code: string; title: string; created_at: string; status: string };

const DECKS: [string, string][] = [["salon", "Салон красоты"], ["cosmetology", "Студия косметологии"], ["team", "Командная работа"]];

function LeaderHome() {
  const navigate = useNavigate();
  const { is, loaded } = useRoles();
  const cats = useCategories().filter((c) => c.is_active);
  const [list, setList] = useState<Row[]>([]);
  const [title, setTitle] = useState("Тренинг");
  const [sel, setSel] = useState<string[]>([]);
  const [mode, setMode] = useState("classic");
  const [max, setMax] = useState(20);
  const [dur, setDur] = useState<Record<string, number>>({ assign_cards: 1, first_play: 3, feedback: 2, second_play: 3 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) =>
      supabase.from("game_sessions").select("id,code,title,created_at,status").eq("leader_id", data.user!.id)
        .order("created_at", { ascending: false }).then(({ data }) => setList(data ?? [])),
    );
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.rpc("create_game_session", { _title: title, _rubric: null as unknown as number });
    if (error || !data) { setBusy(false); toast.error("Не удалось создать сессию"); return; }
    const stage_durations = Object.fromEntries(Object.entries(dur).map(([k, m]) => [k, Math.round(m * 60)]));
    await supabase.from("game_sessions").update({
      category_ids: sel, mode, max_participants: max, stage_durations,
      timer_duration: stage_durations["first_play"] ?? 180, timer_remaining: stage_durations["first_play"] ?? 180,
    }).eq("id", data);
    navigate({ to: "/leader/$id", params: { id: data } });
  };

  if (loaded && !is("leader") && !is("admin"))
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <p className="text-center text-muted-foreground">Раздел ведущего. Попросите администратора выдать вам роль «Ведущий».</p>
      </main>
    );

  const active = list.filter((s) => s.status !== "finished");
  const done = list.filter((s) => s.status === "finished");
  const inp = "rounded-md border border-input bg-background px-3 py-2";
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
      <h1 className="text-2xl font-bold">Кабинет ведущего</h1>
      <Link to="/leader/onboarding" className="mt-2 inline-block rounded-md border border-border px-4 py-2 text-sm">📣 Как презентовать игру команде</Link>
      <form onSubmit={create} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Новая сессия</h2>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название сессии" className={`${inp} w-full`} />
        <div>
          <div className="mb-1.5 text-sm font-medium">Рубрики {sel.length === 0 && <span className="font-normal text-muted-foreground">(не выбрано — все)</span>}</div>
          {DECKS.map(([dk, dl]) => {
            const dc = cats.filter((c) => (c.deck ?? "salon") === dk);
            const allOn = dc.length > 0 && dc.every((c) => sel.includes(c.id));
            return (
              <div key={dk} className="mb-2 rounded-xl border border-border p-3">
                <button type="button" disabled={dc.length === 0}
                  onClick={() => setSel(allOn ? sel.filter((x) => !dc.some((c) => c.id === x)) : [...new Set([...sel, ...dc.map((c) => c.id)])])}
                  className={`mb-2 rounded-full px-3 py-1 text-sm font-medium ${allOn ? "bg-primary text-primary-foreground" : "border border-input"} disabled:opacity-50`}>
                  {allOn ? "✔ " : ""}Набор «{dl}»
                </button>
                {dc.length === 0 ? <p className="text-xs text-muted-foreground">Карточек в этом наборе пока нет</p> : (
                  <div className="flex flex-wrap gap-1.5">
                    {dc.map((c) => (
                      <button type="button" key={c.id} onClick={() => setSel(sel.includes(c.id) ? sel.filter((x) => x !== c.id) : [...sel, c.id])}
                        className={`rounded-full px-2.5 py-1 text-xs ${sel.includes(c.id) ? "bg-primary text-primary-foreground" : "border border-input"}`}>{c.rubric_no}. {c.title}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm"><span className="font-medium">Режим</span>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className={`${inp} w-full`}>
              {Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <span className="block text-xs text-muted-foreground">{MODE_HINTS[mode]}</span>
          </label>
          <label className="space-y-1 text-sm"><span className="font-medium">Максимум участников</span>
            <input type="number" min={1} max={20} value={max} onChange={(e) => setMax(Math.min(20, Math.max(1, Number(e.target.value))))} className={`${inp} w-full`} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DURATION_STAGES.map(([k, l]) => (
            <label key={k} className="space-y-1 text-sm"><span className="font-medium">{l}, мин</span>
              <input type="number" min={0.5} max={30} step={0.5} value={dur[k]} onChange={(e) => setDur({ ...dur, [k]: Number(e.target.value) })} className={`${inp} w-full`} />
            </label>
          ))}
        </div>
        <button disabled={busy} className="rounded-md bg-primary px-5 py-2 font-medium text-primary-foreground disabled:opacity-50">Создать сессию</button>
      </form>
      {[["Активные сессии", active], ["Завершённые", done]].map(([h, rows]) => (
        <section key={h as string}>
          <h2 className="mt-8 font-semibold">{h as string}</h2>
          <div className="mt-3 space-y-2">
            {(rows as Row[]).length === 0 && <p className="text-sm text-muted-foreground">Пока нет.</p>}
            {(rows as Row[]).map((s) => (
              <Link key={s.id} to="/leader/$id" params={{ id: s.id }} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:shadow">
                <span className="font-medium">{s.title}</span>
                <span className="font-mono text-primary">{s.code}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
