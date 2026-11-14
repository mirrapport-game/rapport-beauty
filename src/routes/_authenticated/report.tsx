import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useProgress } from "@/lib/use-progress";
import { AchievementsGrid, HistoryList, ProgressSummary } from "@/components/ProgressBlocks";

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({ meta: [{ title: "Мой отчёт — Раппорт" }] }),
  component: Report,
});

function Report() {
  const { user } = useUser();
  const p = useProgress(user?.id);
  const [prof, setProf] = useState<{ display_name: string; clinic: string | null; city: string | null } | null>(null);
  useEffect(() => {
    if (user) supabase.from("profiles").select("display_name,clinic,city").eq("id", user.id).maybeSingle().then(({ data }) => setProf(data));
  }, [user]);
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 pb-24 print:p-0">
      <div className="flex justify-between print:hidden">
        <Link to="/dashboard" className="text-sm text-primary">← Кабинет</Link>
        <button onClick={() => window.print()} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">📄 Сохранить PDF</button>
      </div>
      <header>
        <h1 className="text-2xl font-bold">Отчёт: {prof?.display_name || user?.email}</h1>
        <div className="text-sm text-muted-foreground">{[prof?.clinic, prof?.city].filter(Boolean).join(" · ")} · {new Date().toLocaleDateString("ru-RU")}</div>
      </header>
      <ProgressSummary p={p} />
      <HistoryList p={p} />
      <AchievementsGrid p={p} />
    </main>
  );
}
