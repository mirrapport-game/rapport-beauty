import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GAME_TITLE } from "@/lib/game";
import { DEFAULT_MAPPING, getTest, type CommonMapping } from "@/lib/ei-tests";
import { LEVELS, overall, summary } from "@/lib/assessment";
import { AFTER_TEST, LEVEL_TEXT } from "@/lib/copy";
import { CRITERIA, type Scores } from "@/lib/feedback";
import { SkillRadar } from "@/components/SkillRadar";

export const Route = createFileRoute("/_authenticated/assessment/result/$testId")({
  head: () => ({
    meta: [
      { title: `Результат теста — ${GAME_TITLE}` },
      { name: "description", content: "Ваши баллы по шкалам теста и по 6 общим навыкам общения." },
      { property: "og:title", content: `Результат теста — ${GAME_TITLE}` },
      { property: "og:description", content: "Профиль эмоционального интеллекта и коммуникации." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Result,
});

type Row = { scores: Scores; test_scores: Record<string, number> | null; scale_mapping: CommonMapping | null; level: string; completed_at: string };

function Result() {
  const { testId } = Route.useParams();
  const test = getTest(testId);
  const [row, setRow] = useState<Row | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("assessment_results").select("scores, test_scores, scale_mapping, level, completed_at")
        .eq("user_id", user.id).eq("test_id", testId).order("completed_at", { ascending: false }).limit(1).maybeSingle();
      setRow((data as Row) ?? null);
    });
  }, [testId]);

  if (row === undefined) return <main className="p-6 text-muted-foreground">Загрузка…</main>;
  if (!row || !test) return <main className="p-6">Результата пока нет. <Link to="/assessment" className="text-primary underline">Выбрать тест</Link></main>;
  const mapping = row.scale_mapping ?? DEFAULT_MAPPING;
  const title = (id: string) => test.scales.find((s) => s.id === id)?.title ?? id;
  const sum = summary(row.scores);
  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold">{test.title}</h1>
      <p className="text-sm text-muted-foreground">Пройден {new Date(row.completed_at).toLocaleDateString("ru")}</p>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold">Шкалы теста</h2>
        <div className="space-y-2">
          {test.scales.map((s) => {
            const v = row.test_scores?.[s.id] ?? 0;
            return (
              <div key={s.id}>
                <div className="flex justify-between text-sm"><span>{s.title}</span><b>{v}/5</b></div>
                <div className="h-2.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${(v / 5) * 100}%` }} /></div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold">{AFTER_TEST.title}</h2>
        <SkillRadar scores={row.scores} />
        <p>Уровень: <b>{LEVELS[row.level as keyof typeof LEVELS] ?? row.level}</b> · средний балл {overall(row.scores)} из 5</p>
        <p className="text-sm leading-relaxed">{(LEVEL_TEXT[row.level as keyof typeof LEVEL_TEXT] ?? LEVEL_TEXT.beginner)(sum.strong[0] ?? "—", sum.grow[0] ?? "—")}</p>
        <p>💪 Сильные стороны: <b>{sum.strong.join(", ")}</b></p>
        <p>🌱 Зоны роста: <b>{sum.grow.join(", ")}</b></p>
        <details className="text-sm">
          <summary className="cursor-pointer text-primary">Как считаются общие навыки</summary>
          <ul className="mt-2 space-y-1">
            {CRITERIA.map(([k, l]) => <li key={k}><b>{l}</b> = среднее из: {(mapping[k] ?? []).map(title).join(", ")}</li>)}
          </ul>
        </details>
      </section>
      <div className="flex flex-wrap gap-2">
        <Link to="/join" className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">{AFTER_TEST.toGame}</Link>
        <Link to="/assessment" className="rounded-md border border-border px-4 py-2">{AFTER_TEST.another}</Link>
        <Link to="/profile/communication" className="rounded-md border border-border px-4 py-2">Сводный профиль</Link>
      </div>
    </main>
  );
}
