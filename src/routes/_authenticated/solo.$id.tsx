import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GAME_TITLE } from "@/lib/game";
import { CRITERIA } from "@/lib/feedback";
import { LADDER, LADDER_PASS, overall } from "@/lib/assessment";
import { AFTER_RESULT } from "@/lib/copy";
import { useSkillHistory } from "@/lib/use-skill-history";
import { DynamicsBlock } from "@/components/SkillDynamics";
import { soloFinish, soloSend, startSolo, SOLO_MAX_USER_MESSAGES, type SoloResult } from "@/lib/solo.functions";

export const Route = createFileRoute("/_authenticated/solo/$id")({
  head: () => ({
    meta: [
      { title: `Диалог с ИИ — ${GAME_TITLE}` },
      { name: "description", content: "Тренировочный диалог с ИИ-собеседником." },
      { property: "og:title", content: `Диалог с ИИ — ${GAME_TITLE}` },
      { property: "og:description", content: "Тренировочный диалог с ИИ-собеседником." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SoloChat,
});

type Msg = { sender: string; content: string };

function SoloChat() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const send = useServerFn(soloSend);
  const finish = useServerFn(soloFinish);
  const start = useServerFn(startSolo);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [sit, setSit] = useState<{ title: string; description: string | null; task: string | null } | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [status, setStatus] = useState("active");
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [result, setResult] = useState<SoloResult | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const points = useSkillHistory(uid, result);
  useEffect(() => {
    if (!result || !scenarioId) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUid(user.id);
      const [{ data: lp }, { data: sc }] = await Promise.all([
        supabase.from("career_ladder_progress").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("scenarios").select("category_id").eq("id", scenarioId).maybeSingle(),
      ]);
      const step = LADDER.find((x) => x.step === lp?.current_step);
      if (!lp || lp.role_mode !== "career_ladder" || !step || sc?.category_id !== step.category_id) return;
      const avg = overall(result.scores);
      const done = (lp.completed_steps as number[]) ?? [];
      const byStep = { ...((lp.scores_by_step as Record<string, number>) ?? {}), [step.step]: avg };
      if (avg >= LADDER_PASS) {
        await supabase.from("career_ladder_progress").update({ current_step: step.step + 1, completed_steps: [...new Set([...done, step.step])], scores_by_step: byStep, updated_at: new Date().toISOString() }).eq("user_id", user.id);
        toast.success(`🪜 Шаг «${step.title}» пройден!`);
      } else {
        await supabase.from("career_ladder_progress").update({ scores_by_step: byStep }).eq("user_id", user.id);
        toast(`🪜 Для шага «${step.title}» нужно от ${LADDER_PASS} баллов — попробуйте ещё раз`);
      }
    })();
  }, [result, scenarioId]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setResult(null);
    (async () => {
      const { data: s } = await supabase.from("solo_sessions").select("status, situation_id, scenario_id").eq("id", id).maybeSingle();
      if (!s) return;
      setStatus(s.status);
      setScenarioId(s.scenario_id);
      const { data: c } = await supabase.from("cards").select("title, description, task").eq("id", s.situation_id!).maybeSingle();
      setSit(c);
      const { data: m } = await supabase.from("solo_messages").select("sender, content").eq("solo_session_id", id).order("created_at");
      setMsgs(m ?? []);
      if (s.status === "finished") {
        const r = await finish({ data: { id } });
        if (!r.error) setResult(r);
      }
    })();
  }, [id, finish]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing, result]);

  const userCount = msgs.filter((m) => m.sender === "user").length;

  const doFinish = async () => {
    setFinishing(true);
    const r = await finish({ data: { id } }).catch((e) => ({ error: String(e) }) as any);
    setFinishing(false);
    if (r.error) { toast.error(r.error); return; }
    setStatus("finished");
    setResult(r);
  };

  const submit = async () => {
    const t = text.trim();
    if (!t || typing) return;
    setText("");
    setMsgs((m) => [...m, { sender: "user", content: t }]);
    setTyping(true);
    try {
      const r = await send({ data: { id, text: t } });
      if (r.error) toast.error(r.error);
      if (r.reply) setMsgs((m) => [...m, { sender: "bot", content: r.reply! }]);
      if (r.limit) {
        toast.info("Лимит сообщений — подводим итоги");
        await doFinish();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    }
    setTyping(false);
    inputRef.current?.focus();
  };

  const again = async (sameScenario: boolean) => {
    if (!sameScenario) return navigate({ to: "/solo" });
    const r = await start({ data: { scenarioId: scenarioId ?? undefined } });
    navigate({ to: "/solo/$id", params: { id: r.id } });
  };

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4">
      <Link to="/solo" className="text-sm text-muted-foreground hover:text-primary">← Все ситуации</Link>
      {sit && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h1 className="text-lg font-bold">{sit.title}</h1>
          <p className="mt-1 text-sm">{sit.description}</p>
          {sit.task && <p className="mt-2 text-sm font-medium text-primary">Ваша задача: {sit.task}</p>}
        </section>
      )}

      <section className="space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 animate-in fade-in slide-in-from-bottom-1 ${m.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
              {m.sender === "bot" && <div className="mb-0.5 text-xs font-semibold text-muted-foreground">🧑‍⚕️ Собеседник</div>}
              {m.content}
            </div>
          </div>
        ))}
        {typing && <div className="w-fit rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground animate-pulse">Собеседник печатает…</div>}
        <div ref={endRef} />
      </section>

      {status === "active" && (
        <div className="sticky bottom-16 space-y-2 rounded-2xl border border-border bg-background p-2 shadow-lg md:bottom-2">
          <textarea
            ref={inputRef}
            autoFocus
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="Ваш ответ…"
            className="w-full resize-none rounded-md bg-background px-3 py-2 outline-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{userCount}/{SOLO_MAX_USER_MESSAGES}</span>
            <div className="flex gap-2">
              <button onClick={doFinish} disabled={finishing || typing || userCount === 0} className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50">
                {finishing ? "Оцениваем…" : "Завершить диалог"}
              </button>
              <button onClick={submit} disabled={typing || !text.trim()} className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}

      {status === "finished" && !result && <p className="text-muted-foreground animate-pulse">Готовим обратную связь…</p>}
      {result && (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
          <h2 className="text-lg font-bold">Обратная связь</h2>
          <div className="space-y-2">
            {CRITERIA.map(([k, l]) => (
              <div key={k}>
                <div className="flex justify-between text-sm"><span>{l}</span><span className="font-semibold">{result.scores[k] ?? "—"}/5</span></div>
                <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary transition-all duration-700" style={{ width: `${((result.scores[k] ?? 0) / 5) * 100}%` }} /></div>
              </div>
            ))}
          </div>
          <div><h3 className="font-semibold">✅ Что получилось</h3><p className="whitespace-pre-wrap text-sm">{result.what_worked}</p></div>
          <div><h3 className="font-semibold">🎯 Что улучшить</h3><p className="whitespace-pre-wrap text-sm">{result.what_to_improve}</p></div>
          {result.solution && (
            <div className="rounded-xl bg-muted p-3">
              <h3 className="font-semibold">📘 Эталонное решение: {result.solution.title}</h3>
              <p className="whitespace-pre-wrap text-sm">{result.solution.description}</p>
              {Array.isArray(result.solution.steps) && (
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{result.solution.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
              )}
            </div>
          )}
          <DynamicsBlock points={points} sourceId={id} />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => again(true)} className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">🔁 {AFTER_RESULT.again}</button>
            <button onClick={() => again(false)} className="rounded-md border border-border px-4 py-2">{AFTER_RESULT.other}</button>
          </div>
        </section>
      )}
    </main>
  );
}
