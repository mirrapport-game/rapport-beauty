import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GAME_TITLE } from "@/lib/game";
import { DAILY_SCREEN } from "@/lib/copy";
import { getDailyModel, submitDaily, getDailyPractice, scoreDailyPractice, SLOT_TYPE, type DailyFeedback, type PracticeCard, type Slot } from "@/lib/daily.functions";

const LEVEL_NAME: Record<number, string> = { 1: "вопрос", 2: "просьба", 3: "требование" };

/** After the reference answer: retry on a harder card from the same series (max 2) or study the linked skill. */
const avg = (f: DailyFeedback) => f.checks.length ? f.checks.reduce((a, c) => a + c.score, 0) / f.checks.length : 0;

function Practice({ cardId, slot, first }: { cardId: string; slot: Slot; first: DailyFeedback }) {
  const load = useServerFn(getDailyPractice);
  const score = useServerFn(scoreDailyPractice);
  const [attempt, setAttempt] = useState(0);
  const [card, setCard] = useState<PracticeCard | null>(null);
  const [showSkill, setShowSkill] = useState(false);
  const [text, setText] = useState("");
  const [fb, setFb] = useState<DailyFeedback | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchCard = async (a: number) => {
    setBusy(true);
    try {
      const c = await load({ data: { id: cardId, slot, attempt: a } });
      if (!c) toast.error("Для вашей роли пока нет похожей ситуации");
      else { setCard(c); setAttempt(a); setText(""); setFb(null); }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка"); }
    setBusy(false);
  };
  const send = async () => {
    if (!card) return;
    setBusy(true);
    try {
      const r = await score({ data: { id: cardId, slot, situationId: card.situation.id, answer: text } });
      if (r.error) toast.error(r.error); else setFb(r.feedback);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка"); }
    setBusy(false);
  };
  const openSkill = async () => { if (!card) await fetchCard(1); setShowSkill(true); };

  return (
    <div className="space-y-3 pt-2">
      {!card && (
        <div className="grid gap-2 sm:grid-cols-2">
          <button disabled={busy} onClick={() => fetchCard(1)} className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">🔁 Попробовать ещё раз</button>
          <button disabled={busy} onClick={openSkill} className="rounded-md border border-border px-4 py-2.5 text-sm disabled:opacity-50">🎓 Изучить навык</button>
        </div>
      )}
      {card && showSkill && card.skill && (
        <div className="space-y-2 rounded-xl border border-primary/30 bg-accent/40 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Карточка навыка</p>
          <p className="text-lg font-bold">{card.skill.title}</p>
          {card.skill.formula && <p className="font-semibold text-primary">{card.skill.formula}</p>}
          {card.skill.description && <p className="text-sm">{card.skill.description}</p>}
          {card.skill.how_to_apply.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm">{card.skill.how_to_apply.map((h) => <li key={h}>{h}</li>)}</ul>}
          {card.skill.why_learn && <p className="text-sm text-muted-foreground">{card.skill.why_learn}</p>}
          <p className="text-sm italic">О чём подумать: где в вашей сегодняшней ситуации этот приём помог бы — и что бы вы сказали иначе?</p>
        </div>
      )}
      {card && showSkill && !card.skill && <p className="text-sm text-muted-foreground">Для этой ситуации карточки навыка пока нет.</p>}
      {card && (
        <div className="space-y-2 rounded-xl border border-border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Повтор · сложнее: {LEVEL_NAME[card.situation.level ?? 2]}</p>
          <p className="font-semibold">{card.situation.title}</p>
          {card.situation.description && <p className="text-sm">{card.situation.description}</p>}
          {card.situation.opening_line && <p className="text-lg font-semibold leading-snug">«{card.situation.opening_line}»</p>}
          <textarea rows={3} value={text} disabled={!!fb} onChange={(e) => setText(e.target.value)} placeholder="Ваш ответ…"
            className="w-full rounded-md border border-input bg-background px-3 py-2" />
          {!fb && <button disabled={busy || !text.trim()} onClick={send} className="w-full rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Оцениваем…" : "Ответить"}</button>}
          {fb && (
            <div className="space-y-2">
              {fb.checks.map((c) => (
                <div key={c.criterion} className="flex justify-between text-sm"><span>{c.criterion}</span><span className="font-semibold">{c.score}/5</span></div>
              ))}
              <p className="text-sm">{fb.comment}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {!showSkill && <button onClick={() => setShowSkill(true)} className="rounded-md border border-border px-3 py-2 text-sm">🎓 Изучить навык</button>}
          </div>
          {fb && (() => {
            const a = avg(first), b = avg(fb), d = b - a;
            return (
              <div className="space-y-2 rounded-xl bg-muted p-3">
                <p className="text-sm font-semibold">Ваш прогресс</p>
                {([["Первая ситуация", a], ["Повтор (сложнее)", b]] as const).map(([l, v]) => (
                  <div key={l}>
                    <div className="flex justify-between text-sm"><span>{l}</span><span className="font-semibold">{v.toFixed(1)}/5</span></div>
                    <div className="h-2 rounded-full bg-background"><div className="h-2 rounded-full bg-primary" style={{ width: `${(v / 5) * 100}%` }} /></div>
                  </div>
                ))}
                <p className="text-sm">{d >= 0.25 ? `📈 +${d.toFixed(1)} — вы стали увереннее, и это на более сложной карточке!` : d > -0.25 ? "➡️ Тот же уровень, но на более сложной карточке — это уже рост." : `📉 ${d.toFixed(1)} — сложная карточка далась труднее. Загляните в навык и попробуйте завтра.`}</p>
                <p className="text-xs text-muted-foreground">Повтор на сегодня использован — завтра новая роль.</p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/daily/$cardId")({
  head: () => ({
    meta: [
      { title: `Роль дня — ${GAME_TITLE}` },
      { name: "description", content: "Ежедневная тренировка: погружение в роль, задание и обратная связь." },
      { property: "og:title", content: `Роль дня — ${GAME_TITLE}` },
      { property: "og:description", content: "Ежедневная тренировка коммуникации в салоне." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Daily,
});

const SLOTS: { slot: Slot; label: string; from: number }[] = [
  { slot: "morning", label: "🌅 Утро", from: 0 },
  { slot: "day", label: "☀️ День", from: 12 },
  { slot: "evening", label: "🌙 Вечер", from: 17 },
];

function Daily() {
  const { cardId } = Route.useParams();
  const [card, setCard] = useState<any>(null);
  const [role, setRole] = useState<any>(null);
  const [ctx, setCtx] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [step, setStep] = useState<"immerse" | "task">("immerse");

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("daily_cards").select("*").eq("id", cardId).maybeSingle();
      if (!c) return;
      setCard(c);
      const [r, x, t, a] = await Promise.all([
        supabase.from("daily_roles").select("title, description").eq("id", c.role_id!).maybeSingle(),
        supabase.from("daily_role_context").select("*").eq("role_id", c.role_id!).maybeSingle(),
        supabase.from("daily_tasks").select("id, type, question, criteria, level").eq("role_id", c.role_id!),
        supabase.from("daily_answers").select("*").eq("card_id", cardId),
      ]);
      setRole(r.data); setCtx(x.data); setTasks(t.data ?? []); setAnswers(a.data ?? []);
      if ((a.data ?? []).length) setStep("task");
    })();
  }, [cardId]);

  if (!card) return <main className="mx-auto max-w-xl px-4 py-6 text-muted-foreground">Загрузка…</main>;
  const hour = new Date().getHours();

  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 py-6 pb-24">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← На главную</Link>
        <span className="rounded-full bg-accent px-3 py-1 text-sm font-semibold">{DAILY_SCREEN.streak(card.streak_day)}</span>
      </div>
      <h1 className="text-2xl font-bold">🎭 {DAILY_SCREEN.title(role?.title ?? "")}</h1>
      <p className="text-sm text-muted-foreground">{DAILY_SCREEN.subtitle}</p>

      {step === "immerse" && ctx && (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm animate-in fade-in zoom-in-95">
          {DAILY_SCREEN.ctx.filter(([k]) => k !== "key_phrase").map(([k, l]) => (
            <div key={k}>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{l}</div>
              <p className="text-base font-medium leading-relaxed">{ctx[k]}</p>
            </div>
          ))}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {DAILY_SCREEN.ctx.find(([k]) => k === "key_phrase")?.[1]}
            </div>
            <blockquote className="rounded-xl bg-primary p-4 text-xl font-semibold leading-snug text-primary-foreground">«{ctx.key_phrase}»</blockquote>
          </div>
          <button onClick={() => setStep("task")} className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground">Я в роли → к вопросам дня</button>
        </section>
      )}

      {step === "task" && (
        <>
          <button onClick={() => setStep("immerse")} className="text-sm text-primary">↺ Перечитать погружение</button>
          {SLOTS.map((s) => {
            const task = tasks.find((t) => t.type === SLOT_TYPE[s.slot]);
            const ans = answers.find((a) => a.slot === s.slot);
            if (!task) return null;
            return (
              <SlotTask key={s.slot} cardId={cardId} slot={s.slot} label={s.label} task={task} answer={ans}
                locked={!ans && hour < s.from} from={s.from}
                onDone={(a) => setAnswers((x) => [...x, a])} />
            );
          })}
          <Link to="/daily/history" className="block text-center text-sm text-primary">Моя история ролей дня →</Link>
        </>
      )}
    </main>
  );
}

function SlotTask({ cardId, slot, label, task, answer, locked, from, onDone }: {
  cardId: string; slot: Slot; label: string; task: any; answer: any; locked: boolean; from: number; onDone: (a: any) => void;
}) {
  const submit = useServerFn(submitDaily);
  const getModel = useServerFn(getDailyModel);
  const [text, setText] = useState(answer?.answer_text ?? "");
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<string | null>(null);
  const fb = answer?.feedback_json as DailyFeedback | undefined;

  const send = async () => {
    setBusy(true);
    try {
      const r = await submit({ data: { id: cardId, slot, answer: text } });
      if (r.error) toast.error(r.error);
      else onDone({ slot, answer_text: text, feedback_json: r.feedback });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка"); }
    setBusy(false);
  };

  return (
    <section className={`space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm ${locked ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{label}</h2>
        {answer && <span className="text-sm">✅ готово</span>}
      </div>
      {locked ? (
        <p className="text-sm text-muted-foreground">🔒 Откроется после {from}:00</p>
      ) : (
        <>
          <p className="text-xl font-semibold leading-snug">{task.question}</p>
          {task.type === "mini_case" && Array.isArray(task.criteria) && (
            <p className="text-sm text-muted-foreground">Подсказка — учтите: {(task.criteria as string[]).join(", ")}.</p>
          )}
          <textarea rows={4} value={text} disabled={!!answer} onChange={(e) => setText(e.target.value)}
            placeholder={task.type === "roleplay" ? "Ваша реплика собеседнику…" : "Ваш ответ…"}
            className="w-full rounded-md border border-input bg-background px-3 py-2" />
          {!answer && (
            <button disabled={busy || !text.trim()} onClick={send} className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">
              {busy ? "Оцениваем…" : DAILY_SCREEN.answer}
            </button>
          )}
          {fb && (
            <div className="space-y-2 border-t border-border pt-3">
              {fb.checks.map((c) => (
                <div key={c.criterion}>
                  <div className="flex justify-between text-sm"><span>{c.criterion}</span><span className="font-semibold">{c.score}/5</span></div>
                  <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(c.score / 5) * 100}%` }} /></div>
                </div>
              ))}
              <p className="text-sm">{DAILY_SCREEN.saved(fb.comment)}</p>
              {model ? <div className="rounded-xl bg-muted p-3 text-sm"><b>Эталон:</b> {model}</div> : (
                <button onClick={async () => setModel((await getModel({ data: { id: cardId, slot } })).model)} className="rounded-md border border-border px-4 py-2 text-sm">📘 {DAILY_SCREEN.model}</button>
              )}
              {model && <Practice cardId={cardId} slot={slot} first={fb} />}
            </div>
          )}
        </>
      )}
    </section>
  );
}
