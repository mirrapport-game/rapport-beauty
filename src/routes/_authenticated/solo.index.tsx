import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GAME_TITLE } from "@/lib/game";
import { startSolo } from "@/lib/solo.functions";
import { PROF_ROLES, ROLE_CATEGORIES, allowedCategories } from "@/lib/prof-roles";
import { useRoles } from "@/hooks/use-roles";
import { LADDER } from "@/lib/assessment";
import { CareerLadder, useLadder } from "@/components/CareerLadder";

export const Route = createFileRoute("/_authenticated/solo/")({
  head: () => ({
    meta: [
      { title: `Тренировка с ИИ — ${GAME_TITLE}` },
      { name: "description", content: "Отработайте сложный диалог с ИИ-клиентом и получите оценку по 6 критериям." },
      { property: "og:title", content: `Тренировка с ИИ — ${GAME_TITLE}` },
      { property: "og:description", content: "Диалог с ИИ-собеседником, авто-оценка и эталонное решение." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SoloPick,
});

type Sc = { id: string; title: string | null; category_id: string | null; level: number | null };
const field = "rounded-md border border-input bg-background px-3 py-2";

function SoloPick() {
  const navigate = useNavigate();
  const start = useServerFn(startSolo);
  const [cats, setCats] = useState<{ id: string; title: string }[]>([]);
  const [list, setList] = useState<Sc[]>([]);
  const [cat, setCat] = useState("");
  const [level, setLevel] = useState(0);
  const [busy, setBusy] = useState(false);
  const { roles } = useRoles();
  const [uid, setUid] = useState<string | null>(null);
  const [ownRole, setOwnRole] = useState<string | null>(null);
  const [extra, setExtra] = useState<string[]>([]);
  const [isManager, setIsManager] = useState(false);
  const [past, setPast] = useState<{ id: string; status: string; started_at: string; scenario_id: string | null }[]>([]);

  useEffect(() => {
    supabase.from("categories").select("id, title").then(({ data }) => setCats(data ?? []));
    supabase.from("scenarios").select("id, title, category_id, level").eq("is_active", true).then(({ data }) => setList(data ?? []));
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUid(user.id);
      const { data: pr } = await supabase.from("profiles").select("prof_role, play_roles").eq("id", user.id).maybeSingle();
      setOwnRole(pr?.prof_role ?? null);
      setExtra(pr?.play_roles ?? []);
      const { data: cm } = await supabase.from("clinic_members").select("role").eq("user_id", user.id).maybeSingle();
      setIsManager(cm?.role === "manager");
    });
    supabase.from("solo_sessions").select("id, status, started_at, scenario_id").order("started_at", { ascending: false }).limit(10).then(({ data }) => setPast(data ?? []));
  }, []);

  const staff = roles.includes("leader") || roles.includes("admin");
  const seesAll = isManager || roles.includes("leader") || roles.includes("admin");
  const allowed = seesAll ? null : allowedCategories(ownRole, extra);
  const toggleRole = async (r: string) => {
    const next = extra.includes(r) ? extra.filter((x) => x !== r) : [...extra, r];
    setExtra(next);
    if (uid) {
      const { error } = await supabase.from("profiles").update({ play_roles: next }).eq("id", uid);
      if (error) toast.error("Не удалось сохранить выбор ролей");
    }
  };
  const visibleCats = cats.filter((c) => !allowed || allowed.has(c.id));

  const ladder = useLadder();
  const go = async (scenarioId?: string, forceCat?: string) => {
    setBusy(true);
    try {
      const r = await start({ data: { scenarioId, categoryId: forceCat || cat || (allowed ? shown[Math.floor(Math.random() * shown.length)]?.category_id ?? undefined : undefined), level: level || undefined } });
      navigate({ to: "/solo/$id", params: { id: r.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
      setBusy(false);
    }
  };

  const shown = list.filter((s) => (!allowed || (s.category_id && allowed.has(s.category_id))) && (!cat || s.category_id === cat) && (!level || s.level === level));
  const title = (id: string | null) => list.find((s) => s.id === id)?.title ?? "Ситуация";

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">🤖 Тренировка с ИИ</h1>
        <p className="text-muted-foreground">ИИ сыграет клиента или коллегу. После диалога — оценка по 6 критериям и эталонное решение.</p>
      </div>
      <section className="rounded-xl border border-border bg-card p-3">
        <h2 className="mb-2 font-semibold">Выбор роли</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {([["random", "🎲 Рандомная роль", "Случайная ситуация из всех ролей салона"], ["my_role", "👤 Моя роль", "Карточки вашей должности"], ["career_ladder", "🪜 Карьерная лестница", "Все роли по очереди: от мастера до владельца"]] as const).map(([m, l, d]) => (
            <button key={m} type="button" onClick={() => ladder.save({ role_mode: m })}
              className={`rounded-lg border p-2 text-left text-sm ${ladder.row?.role_mode === m ? "border-primary bg-accent" : "border-border"}`}>
              <b>{l}</b><span className="block text-xs text-muted-foreground">{d}</span>
            </button>
          ))}
        </div>
        {ladder.row?.role_mode === "random" && (
          <button disabled={busy || !cats.length} onClick={() => go(undefined, cats[Math.floor(Math.random() * cats.length)]?.id)} className="mt-3 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50">Начать со случайной ролью</button>
        )}
        {ladder.row?.role_mode === "career_ladder" && (() => {
          const step = LADDER.find((s) => s.step === ladder.row!.current_step);
          return (
            <div className="mt-3 space-y-2">
              {step ? (
                <button disabled={busy} onClick={() => go(undefined, step.category_id)} className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50">▶️ Шаг {step.step}: {step.title}</button>
              ) : <p className="font-semibold">🏆 Челлендж пройден! Вы прошли путь до владельца салона.</p>}
              <CareerLadder row={ladder.row} onStartStep={(cat) => go(undefined, cat)} />
            </div>
          );
        })()}
      </section>
      {ladder.row?.role_mode !== "random" && ladder.row?.role_mode !== "career_ladder" && <>
      <section className="rounded-xl border border-border bg-card p-3 text-sm">
        {seesAll ? (
          <p>👑 Вы руководитель или ведущий — вам доступны карточки всех ролей салона.</p>
        ) : (
          <>
            <p className="mb-2">
              Моя роль: <b>{ownRole ?? "не выбрана"}</b>
              {!ownRole && <> — <Link to="/profile" className="text-primary underline">выбрать в профиле</Link></>}
              . Отметьте, какие роли коллег вы тоже хотите проигрывать:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PROF_ROLES.filter((r) => ROLE_CATEGORIES[r] && r !== ownRole).map((r) => (
                <button key={r} type="button" onClick={() => toggleRole(r)}
                  className={`rounded-full border px-3 py-1 text-xs ${extra.includes(r) ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                  {extra.includes(r) ? "✓ " : ""}{r}
                </button>
              ))}
            </div>
            {!allowed && <p className="mt-2 text-xs text-muted-foreground">Роль не выбрана — пока показаны все карточки.</p>}
          </>
        )}
      </section>
      <div className="flex flex-wrap gap-2">
        {staff && <select className={field} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Все рубрики</option>
          {visibleCats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>}
        <select className={field} value={level} onChange={(e) => setLevel(Number(e.target.value))}>
          <option value={0}>Любой уровень</option>
          {[1, 2, 3].map((l) => <option key={l} value={l}>Уровень {l}</option>)}
        </select>
        <button disabled={busy || !shown.length} onClick={() => go()} className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50">
          🎲 Случайная ситуация
        </button>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {shown.map((s) => (
          <li key={s.id}>
            <button disabled={busy} onClick={() => go(s.id)} className="w-full rounded-xl border border-border bg-card p-3 text-left shadow-sm hover:border-primary disabled:opacity-50">
              <div className="font-semibold">{s.title}</div>
              <div className="text-xs text-muted-foreground">{cats.find((c) => c.id === s.category_id)?.title} · ур. {s.level ?? 1}</div>
            </button>
          </li>
        ))}
      </ul>
      </>}
      {past.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Мои тренировки</h2>
          <ul className="space-y-1 text-sm">
            {past.map((p) => (
              <li key={p.id}>
                <Link to="/solo/$id" params={{ id: p.id }} className="hover:text-primary">
                  {new Date(p.started_at).toLocaleDateString("ru")} — {title(p.scenario_id)} {p.status === "finished" ? "✅" : "⏳"}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
