import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GAME_TITLE } from "@/lib/game";
import { EI_TESTS } from "@/lib/ei-tests";
import { overall } from "@/lib/assessment";
import type { Scores } from "@/lib/feedback";

export const Route = createFileRoute("/_authenticated/assessment/")({
  head: () => ({
    meta: [
      { title: `Тесты коммуникации — ${GAME_TITLE}` },
      { name: "description", content: "Три теста эмоционального интеллекта: Холл, ЭмИн, Гоулман — и сводный профиль." },
      { property: "og:title", content: `Тесты коммуникации — ${GAME_TITLE}` },
      { property: "og:description", content: "Выберите тест и узнайте свой профиль общения." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pick,
});

function Pick() {
  const [last, setLast] = useState<Record<string, { scores: Scores; at: string }>>({});
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("assessment_results").select("test_id, scores, completed_at").eq("user_id", user.id).order("completed_at");
      const m: Record<string, { scores: Scores; at: string }> = {};
      for (const r of data ?? []) m[r.test_id] = { scores: r.scores as Scores, at: r.completed_at };
      setLast(m);
    });
  }, []);
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold">🧭 Тесты коммуникации</h1>
      <p className="text-sm text-muted-foreground">Выберите тест. Каждый — 15 ситуаций из салона. Результаты сводятся в единый профиль по 6 навыкам.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {EI_TESTS.map((t) => {
          const l = last[t.id];
          return (
            <div key={t.id} className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="font-bold">{t.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t.author_concept}</div>
              <p className="mt-2 flex-1 text-sm">{t.description}</p>
              <div className="mt-2 text-xs text-muted-foreground">{t.questions.length} вопросов · ~{t.estimated_minutes} мин</div>
              {l && (
                <Link to="/assessment/result/$testId" params={{ testId: t.id }} className="mt-2 text-sm text-primary underline">
                  Результат: {overall(l.scores)} из 5 · {new Date(l.at).toLocaleDateString("ru")}
                </Link>
              )}
              <Link to="/assessment/$testId/run" params={{ testId: t.id }} className="mt-3 rounded-md bg-primary px-4 py-2 text-center font-semibold text-primary-foreground">
                {l ? "Пройти заново" : "Начать"}
              </Link>
            </div>
          );
        })}
      </div>
      <Link to="/profile/communication" className="block rounded-2xl border border-primary/40 bg-accent p-5 shadow-sm">
        <div className="text-lg font-bold">📊 Сводный профиль</div>
        <p className="text-sm">Все тесты, игры и тренировки на одном радаре по 6 навыкам — и динамика по каждому.</p>
      </Link>
    </main>
  );
}
