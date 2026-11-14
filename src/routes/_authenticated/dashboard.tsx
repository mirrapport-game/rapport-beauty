import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-roles";
import { GAME_TITLE } from "@/lib/game";
import { useProgress } from "@/lib/use-progress";
import { TodayFlow } from "@/components/TodayFlow";
import { useSkillHistory } from "@/lib/use-skill-history";
import { CommunicationProfile } from "@/components/SkillDynamics";
import { AchievementBanner, AchievementsGrid, HistoryList, ProgressSummary, TeamCard } from "@/components/ProgressBlocks";
import { OnboardingOnce } from "@/components/Onboarding";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: `Личный кабинет — ${GAME_TITLE}` }] }),
  component: Dashboard,
});

const ROLE_RU = { player: "Игрок", leader: "Ведущий", admin: "Администратор" } as const;

function Dashboard() {
  const { user, roles } = useRoles();
  const [name, setName] = useState("");
  const [more, setMore] = useState(false);
  const progress = useProgress(user?.id);
  const skills = useSkillHistory(user?.id);
  const [stats, setStats] = useState({ games: 0, feedback: 0, scenarios: 0 });
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle().then(({ data }) => setName(data?.display_name ?? ""));
    Promise.all([
      supabase.from("session_participants").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("feedback").select("id", { count: "exact", head: true }).eq("from_user", user.id),
      supabase.from("user_scenarios").select("id", { count: "exact", head: true }).eq("author_id", user.id),
    ]).then(([a, b, c]) => setStats({ games: a.count ?? 0, feedback: b.count ?? 0, scenarios: c.count ?? 0 }));
  }, [user]);

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 pb-24">
      {user && <OnboardingOnce userId={user.id} />}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Здравствуйте{name ? `, ${name}` : ""}!</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          {roles.map((r) => <span key={r} className="rounded-full bg-accent px-3 py-1 text-xs font-medium">{ROLE_RU[r]}</span>)}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/profile" className="rounded-2xl border border-border bg-card p-5 font-semibold shadow-sm">👤 Мой профиль</Link>
        <Link to="/profile/communication" className="rounded-2xl border border-border bg-card p-5 font-semibold shadow-sm">💬 Моя коммуникация</Link>
      </div>
      <CommunicationProfile points={skills} />
      <button onClick={() => setMore((m) => !m)} aria-expanded={more} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left font-semibold shadow-sm">
        <span>Ещё: задания, игры, достижения, история</span>
        <span className={`transition-transform ${more ? "rotate-180" : ""}`}>▾</span>
      </button>
      {more && (
        <div className="space-y-5">
          {user && <TodayFlow userId={user.id} />}
          <AchievementBanner p={progress} onSeeAll={() => {}} />
          <TeamCard />
          <div className="grid grid-cols-3 gap-3">
            {[["Игр", stats.games], ["Отзывов дано", stats.feedback], ["Моих сценариев", stats.scenarios]].map(([l, v]) => (
              <div key={l} className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-primary">{v}</div>
                <div className="text-xs text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
          <Link to="/scenarios/new" className="block rounded-2xl border border-border bg-card p-4 font-semibold shadow-sm">✍️ Добавить свой сценарий</Link>
          <ProgressSummary p={progress} />
          <AchievementsGrid p={progress} />
          <HistoryList p={progress} />
          <Link to="/report" className="block rounded-2xl border border-border bg-card p-4 text-center font-semibold shadow-sm">📄 Скачать мой отчёт (PDF)</Link>
        </div>
      )}
    </main>
  );
}
