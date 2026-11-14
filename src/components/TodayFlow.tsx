import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CRITERIA, type Scores } from "@/lib/feedback";
import { QUESTIONS, LADDER } from "@/lib/assessment";
import { CAREER_ROLES, dayIndex, MODE_INFO, quickQuestionsFor, roleForToday, weakest, type DailyMode } from "@/lib/daily-path";
import { DAILY_CARD, GROWTH_CARD, streakText } from "@/lib/copy";
import { useSkillHistory } from "@/lib/use-skill-history";

type Role = { id: string; title: string; description: string | null };
type Card = { id: string; role_id: string | null; status: string; streak_day: number };

/** Step-by-step home for a signed-in player: test → mode → today's task → quick situation → results. */
export function TodayFlow({ userId }: { userId: string }) {
  const [hasTest, setHasTest] = useState<boolean | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [mode, setMode] = useState<DailyMode | null | undefined>(undefined);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [card, setCard] = useState<Card | null | undefined>(undefined);
  const [step, setStep] = useState(1);
  const [changing, setChanging] = useState(false);
  const points = useSkillHistory(userId);

  useEffect(() => {
    supabase.from("assessment_results").select("id", { count: "exact", head: true }).eq("user_id", userId).then(({ count }) => setHasTest((count ?? 0) > 0));
    supabase.from("daily_roles").select("id, title, description").eq("is_active", true).order("title").then(({ data }) => setRoles(data ?? []));
    supabase.from("user_daily_preferences").select("mode, my_role_id").eq("user_id", userId).maybeSingle().then(({ data }) => {
      setMode((data?.mode as DailyMode) ?? null);
      setMyRole(data?.my_role_id ?? null);
    });
    supabase.from("career_ladder_progress").select("current_step").eq("user_id", userId).maybeSingle().then(({ data }) => setStep(data?.current_step ?? 1));
  }, [userId]);

  // Issue today's card according to the mode (once per day).
  useEffect(() => {
    if (!hasTest || !mode || !roles.length) return;
    (async () => {
      const d = new Date().toLocaleDateString("sv-SE");
      const { data: today } = await supabase.from("daily_cards").select("id, role_id, status, streak_day").eq("user_id", userId).eq("issued_date", d).maybeSingle();
      if (today) return setCard(today as Card);
      const role = roleForToday(mode, { myRole, careerStep: step, roles: roles.map((r) => r.id) });
      if (!role) return setCard(null);
      const { data: id, error } = await supabase.rpc("choose_daily_role", { _role: role });
      if (error || !id) return setCard(null);
      const { data: c } = await supabase.from("daily_cards").select("id, role_id, status, streak_day").eq("id", id as string).maybeSingle();
      setCard((c as Card) ?? null);
    })();
  }, [hasTest, mode, myRole, roles, step, userId]);

  // Career: finished today's step role → next step from tomorrow.
  useEffect(() => {
    if (mode !== "career" || !card || card.status !== "answered" || card.role_id !== CAREER_ROLES[step - 1]) return;
    (async () => {
      const { data } = await supabase.from("career_ladder_progress").select("completed_steps").eq("user_id", userId).maybeSingle();
      const done = (data?.completed_steps as number[] | undefined) ?? [];
      if (done.includes(step)) return;
      const next = Math.min(step + 1, LADDER.length);
      await supabase.from("career_ladder_progress").upsert({ user_id: userId, completed_steps: [...done, step], current_step: next, updated_at: new Date().toISOString() });
    })();
  }, [mode, card, step, userId]);

  const saveMode = async (m: DailyMode, role?: string) => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Moscow";
    const { error } = await supabase.from("user_daily_preferences").upsert({ user_id: userId, enabled: true, mode: m, my_role_id: role ?? myRole, timezone: tz });
    if (error) { toast.error("Не удалось сохранить"); return; }
    setMyRole(role ?? myRole);
    setMode(m);
    setChanging(false);
  };

  if (hasTest === null || mode === undefined) return <p className="text-center text-muted-foreground">Загрузка…</p>;

  const stepNo = !hasTest ? 1 : !mode || changing ? 2 : 3;
  return (
    <div className="space-y-4">
      <Stepper current={stepNo} />

      {!hasTest && (
        <Box title="Шаг 1. Входной тест" accent>
          <p className="text-sm">Выберите один из трёх тестов (15 ситуаций из салона). Покажем ваш стартовый профиль: эмпатия, слушание, аргументация и другие навыки.</p>
          <Link to="/assessment" className="mt-3 inline-block rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground">Выбрать тест</Link>
        </Box>
      )}

      {hasTest && (!mode || changing) && (
        <ModePicker roles={roles} initialRole={myRole} onSave={saveMode} />
      )}

      {hasTest && mode && !changing && (
        <>
          <TodayTask card={card} roles={roles} mode={mode} step={step} onChange={() => setChanging(true)} />
          <StreakCard streak={card?.streak_day ?? 0} />
          <QuickSituation userId={userId} roleId={card?.role_id ?? myRole} />
          <SkillBars points={points} />
        </>
      )}
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  const items = ["Тест", "Режим", "Задание дня"];
  return (
    <ol className="flex gap-2 text-xs">
      {items.map((t, i) => (
        <li key={t} className={`flex-1 rounded-full px-3 py-1.5 text-center font-medium ${i + 1 < current ? "bg-accent" : i + 1 === current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          {i + 1 < current ? "✓" : i + 1}. {t}
        </li>
      ))}
    </ol>
  );
}

function Box({ title, children, accent }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${accent ? "border-primary/40 bg-accent" : "border-border bg-card"}`}>
      <h2 className="mb-2 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function ModePicker({ roles, initialRole, onSave }: { roles: Role[]; initialRole: string | null; onSave: (m: DailyMode, role?: string) => void }) {
  const [m, setM] = useState<DailyMode | null>(null);
  const [role, setRole] = useState<string | null>(initialRole);
  return (
    <Box title="Шаг 2. Как вы хотите играть?" accent>
      <p className="mb-3 text-sm text-muted-foreground">Каждый день вы получаете одну карточку с ситуацией из салона и отвечаете на неё в диалоге. ИИ оценивает ответ и подсказывает, что улучшить. Выберите, как будут выдаваться роли:</p>
      <div className="grid gap-2">
        {(Object.keys(MODE_INFO) as DailyMode[]).map((k) => (
          <button key={k} type="button" title={MODE_INFO[k].text} onClick={() => setM(k)}
            className={`rounded-xl border p-3 text-left ${m === k ? "border-primary bg-background ring-2 ring-primary" : "border-border bg-background"}`}>
            <div className="font-semibold">{MODE_INFO[k].icon} {MODE_INFO[k].title}</div>
            <div className="text-sm text-muted-foreground">{MODE_INFO[k].text}</div>
          </button>
        ))}
      </div>
      {m === "my_role" && (
        <div className="mt-3">
          <div className="mb-1 text-sm font-medium">Выберите свою роль:</div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {roles.map((r) => (
              <button key={r.id} onClick={() => setRole(r.id)}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${role === r.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
                <div className="font-medium">{r.title}</div>
                {r.description && <div className={`text-xs ${role === r.id ? "opacity-90" : "text-muted-foreground"}`}>{r.description}</div>}
              </button>
            ))}
          </div>
        </div>
      )}
      <button disabled={!m || (m === "my_role" && !role)} onClick={() => m && onSave(m, role ?? undefined)}
        className="mt-4 w-full rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">
        Начать
      </button>
    </Box>
  );
}

function TodayTask({ card, roles, mode, step, onChange }: { card: Card | null | undefined; roles: Role[]; mode: DailyMode; step: number; onChange: () => void }) {
  const role = roles.find((r) => r.id === card?.role_id);
  return (
    <section className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-md animate-in fade-in zoom-in-95">
      <div className="flex items-center justify-between text-xs uppercase opacity-85">
        <span>{MODE_INFO[mode].icon} Задание дня · {MODE_INFO[mode].title}{mode === "career" ? ` · ступень ${step}/${LADDER.length}` : ""}</span>
        {card && <span>🔥 {card.streak_day}</span>}
      </div>
      {card === undefined ? <p className="mt-2">Готовим задание…</p> : !card ? (
        <p className="mt-2">Не удалось выдать задание. <button onClick={onChange} className="underline">Выбрать режим заново</button></p>
      ) : (
        <>
          {card.status === "answered" ? (
            <>
              <div className="mt-1 text-2xl font-bold">{DAILY_CARD.doneTitle}</div>
              <p className="mt-1 text-sm opacity-90">{DAILY_CARD.doneText(card.streak_day)}</p>
              <Link to="/daily/history" className="mt-4 inline-block rounded-md bg-background px-5 py-2.5 font-bold text-foreground">
                {DAILY_CARD.history}
              </Link>
            </>
          ) : (
            <>
              <div className="mt-1 text-2xl font-bold">{DAILY_CARD.todoTitle}</div>
              <p className="mt-1 text-sm opacity-90">{DAILY_CARD.todoText}</p>
              <div className="mt-2 text-lg font-semibold">Сегодня вы — {role?.title ?? "…"}</div>
              {role?.description && <p className="mt-1 text-sm opacity-90">{role.description}</p>}
              <p className="mt-2 text-sm opacity-90">🌅 Утро · ☀️ День · 🌙 Вечер — три ситуации за день.</p>
              <Link to="/daily/$cardId" params={{ cardId: card.id }} className="mt-4 block rounded-md bg-background px-5 py-3 text-center text-lg font-bold text-foreground">
                {DAILY_CARD.open} →
              </Link>
            </>
          )}
        </>
      )}
      <button onClick={onChange} className="mt-3 text-xs underline opacity-80">Сменить режим</button>
    </section>
  );
}

/** Streak card: words change as the series grows. */
function StreakCard({ streak }: { streak: number }) {
  const text = streakText(streak);
  if (!text) return null;
  return <p className="rounded-2xl border border-border bg-card p-3 text-center text-sm font-medium shadow-sm">{text}</p>;
}

/** One quick situation per day, taken from the rubrics of the player's chosen role. */
function QuickSituation({ userId, roleId }: { userId: string; roleId: string | null }) {
  const pool = useMemo(() => quickQuestionsFor(roleId, QUESTIONS), [roleId]);
  const today = new Date().toLocaleDateString("sv-SE");
  const storeKey = `quick:${userId}:${today}`;
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => setPicked(localStorage.getItem(storeKey)), [storeKey]);
  const q = pool[dayIndex(`${userId}:${today}`, pool.length)] ?? pool[0]!;
  const total = (s: Scores) => CRITERIA.reduce((a, [k]) => a + (s[k] ?? 0), 0);
  const best = useMemo(() => [...q.options].sort((a, b) => total(b.scores) - total(a.scores))[0]?.id, [q]);
  const pick = (id: string) => {
    setPicked(id);
    localStorage.setItem(storeKey, id);
  };
  return (
    <Box title="⚡ Быстрая ситуация">
      <p className="text-sm text-muted-foreground">{q.scenario}</p>
      <p className="mt-2 text-lg font-bold leading-snug">{q.question}</p>
      <div className="mt-3 grid gap-2">
        {q.options.map((o) => {
          const state = !picked ? "" : o.id === best ? "border-primary bg-accent" : o.id === picked ? "border-destructive bg-destructive/10" : "opacity-60";
          return (
            <button key={o.id} disabled={!!picked} onClick={() => pick(o.id)} className={`rounded-lg border border-border p-3 text-left text-sm ${state}`}>
              {picked && o.id === best ? "✅ " : picked === o.id ? "✖️ " : ""}{o.text}
            </button>
          );
        })}
      </div>
      {picked && (
        <p className="mt-3 text-sm">
          {picked === best ? "Отлично! Это лучший вариант." : "Лучший вариант отмечен ✅"} Следующая ситуация откроется завтра.
        </p>
      )}
    </Box>
  );
}

function SkillBars({ points }: { points: ReturnType<typeof useSkillHistory> }) {
  if (!points?.length) return null;
  const recent = points.slice(-3);
  const start = points.find((p) => p.source === "assessment")?.scores ?? {};
  const cur: Scores = Object.fromEntries(CRITERIA.map(([k]) => {
    const v = recent.map((p) => p.scores[k]).filter((x): x is number => typeof x === "number");
    return [k, v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : 0];
  }));
  const weak = weakest(cur);
  return (
    <Box title={`📊 ${GROWTH_CARD.title}`}>
      <div className="space-y-2.5">
        {CRITERIA.map(([k, label]) => {
          const v = cur[k] ?? 0;
          const s = start[k];
          const d = typeof s === "number" ? Math.round((v - s) * 10) / 10 : 0;
          return (
            <div key={k}>
              <div className="flex justify-between text-sm">
                <span className={k === weak ? "font-semibold text-destructive" : ""}>{label}</span>
                <span><b>{v}</b>/5 {d !== 0 && <span className={d > 0 ? "text-primary" : "text-destructive"}>{d > 0 ? "▲" : "▼"}{Math.abs(d)}</span>}</span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${(v / 5) * 100}%` }} />
                {typeof s === "number" && <div className="absolute top-0 h-full w-0.5 bg-foreground/50" style={{ left: `${(s / 5) * 100}%` }} title="Старт" />}
              </div>
            </div>
          );
        })}
      </div>
      {weak && <p className="mt-3 rounded-lg bg-muted p-3 text-sm">🎯 Над чем работать: <b>{CRITERIA.find(([k]) => k === weak)?.[1]}</b></p>}
      <div className="mt-3 space-y-1 rounded-lg bg-muted p-3 text-sm">
        {(["empathy", "stress"] as const).map((k) => {
          const s = start[k];
          return typeof s === "number" ? <div key={k}>{GROWTH_CARD.line(k, s, cur[k] ?? 0)}</div> : null;
        })}
      </div>
      <Link to="/profile/communication" className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        {GROWTH_CARD.more}
      </Link>
    </Box>
  );
}
