import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GAME_TITLE } from "@/lib/game";
import { DEFAULT_MAPPING, getTest, scoreTest, toCommon } from "@/lib/ei-tests";
import { levelOf, overall } from "@/lib/assessment";

export const Route = createFileRoute("/_authenticated/assessment/$testId/run")({
  head: () => ({
    meta: [
      { title: `Прохождение теста — ${GAME_TITLE}` },
      { name: "description", content: "Ответьте на ситуации из салона и получите профиль по шкалам." },
      { property: "og:title", content: `Прохождение теста — ${GAME_TITLE}` },
      { property: "og:description", content: "Тест эмоционального интеллекта для сотрудников салона." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Run,
});

function Run() {
  const { testId } = Route.useParams();
  const test = getTest(testId);
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  if (!test) return <main className="p-6">Тест не найден. <Link to="/assessment" className="text-primary underline">К выбору тестов</Link></main>;
  const q = test.questions[i]!;
  const n = test.questions.length;

  const finish = async () => {
    setBusy(true);
    const testScores = scoreTest(test, answers);
    const scores = toCommon(testScores);
    const { error } = await supabase.from("assessment_results").insert({
      test_id: test.id, answers, scores, test_scores: testScores, scale_mapping: DEFAULT_MAPPING, level: levelOf(overall(scores)),
    });
    setBusy(false);
    if (error) { toast.error("Не удалось сохранить результат"); return; }
    void nav({ to: "/assessment/result/$testId", params: { testId: test.id } });
  };

  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <div className="text-sm font-semibold">{test.title}</div>
      <div className="text-sm text-muted-foreground">Вопрос {i + 1} из {n}</div>
      <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${((i + 1) / n) * 100}%` }} /></div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Ситуация</p>
        <p className="font-medium">{q.scenario}</p>
        <p className="mt-3 font-semibold">{q.question}</p>
      </div>
      <div className="space-y-2">
        {q.options.map((o) => (
          <label key={o.id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${answers[q.id] === o.id ? "border-primary bg-accent" : "border-border bg-card"}`}>
            <input type="radio" name={q.id} checked={answers[q.id] === o.id} onChange={() => setAnswers({ ...answers, [q.id]: o.id })} />
            <span>{o.text}</span>
          </label>
        ))}
      </div>
      <div className="flex justify-between">
        {i ? <button onClick={() => setI(i - 1)} className="rounded-md border border-border px-4 py-2">Назад</button>
          : <Link to="/assessment" className="rounded-md border border-border px-4 py-2">К тестам</Link>}
        {i < n - 1 ? (
          <button disabled={!answers[q.id]} onClick={() => setI(i + 1)} className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50">Далее</button>
        ) : (
          <button disabled={!answers[q.id] || busy} onClick={finish} className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50">Завершить</button>
        )}
      </div>
    </main>
  );
}
