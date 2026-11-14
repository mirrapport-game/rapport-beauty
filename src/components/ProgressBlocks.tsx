import { SkillRadar } from "@/components/SkillRadar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ACHIEVEMENT_CARD, EMPTY, TEAM_CARD } from "@/lib/copy";
import type { useProgress } from "@/lib/use-progress";

type P = ReturnType<typeof useProgress>;

export function ProgressSummary({ p }: { p: P }) {
  const empty = Object.keys(p.radar).length === 0;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="font-semibold">Мой прогресс</h2>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {[["Сессий", p.sessions], ["Средний балл", p.overall ?? "—"], ["Дней подряд", p.streak]].map(([l, v]) => (
          <div key={l as string} className="rounded-lg bg-muted p-2"><div className="text-xl font-bold text-primary">{v}</div><div className="text-xs text-muted-foreground">{l}</div></div>
        ))}
      </div>
      {empty ? <p className="mt-4 text-center text-sm text-muted-foreground">{EMPTY.dynamics}</p> : <SkillRadar scores={p.radar} />}
    </div>
  );
}

/** Dashboard banner: the achievement the player unlocked most recently. */
export function AchievementBanner({ p, onSeeAll }: { p: P; onSeeAll: () => void }) {
  const earned = p.achievements.filter((a) => a.earned_at);
  if (!earned.length) return null;
  const newest = earned.sort((a, b) => (a.earned_at! < b.earned_at! ? 1 : -1))[0]!;
  if (Date.now() - new Date(newest.earned_at!).getTime() > 7 * 864e5) return null;
  return (
    <div className="rounded-2xl border border-primary/40 bg-accent p-4 shadow-sm">
      <div className="text-lg font-bold">{newest.icon} {ACHIEVEMENT_CARD.newTitle}</div>
      <p className="text-sm">{ACHIEVEMENT_CARD.text(newest.title, newest.description)}</p>
      <button onClick={onSeeAll} className="mt-2 rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
        {ACHIEVEMENT_CARD.all}
      </button>
    </div>
  );
}

/** Team card: the clinic's combined streak, for players who joined a clinic. */
export function TeamCard() {
  const [data, setData] = useState<{ name: string; members: number; streak_sum: number } | null>(null);
  useEffect(() => {
    supabase.rpc("clinic_streak").then(({ data }) => setData((data as unknown as { name: string; members: number; streak_sum: number }) ?? null));
  }, []);
  if (!data?.name) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="font-semibold">👥 {TEAM_CARD.title}</div>
      <p className="text-sm text-muted-foreground">{TEAM_CARD.text(data.name, data.streak_sum)}</p>
    </div>
  );
}

export function AchievementsGrid({ p }: { p: P }) {
  const [all, setAll] = useState(false);
  const earned = p.achievements.filter((a) => a.earned_at);
  const shown = all ? p.achievements : earned;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="font-semibold">Достижения</h2>
      {earned.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{EMPTY.achievements}</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {shown.map((a) => (
            <div key={a.id} title={a.description ?? ""} className={`rounded-xl border border-border p-2 text-center ${a.earned_at ? "" : "opacity-40 grayscale"}`}>
              <div className="text-3xl">{a.earned_at ? a.icon : "🔒"}</div>
              <div className="text-xs font-medium">{a.title}</div>
              <div className="text-[10px] text-muted-foreground">{a.earned_at ? new Date(a.earned_at).toLocaleDateString("ru-RU") : a.description}</div>
            </div>
          ))}
        </div>
      )}
      {all ? null : (
        <button onClick={() => setAll(true)} className="mt-3 text-sm text-primary underline">{ACHIEVEMENT_CARD.all}</button>
      )}
    </div>
  );
}

export function HistoryList({ p }: { p: P }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="font-semibold">История игр</h2>
      {p.history.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{EMPTY.sessions}</p> : (
        <div className="mt-2 divide-y divide-border text-sm">
          {p.history.map((h) => (
            <div key={h.session_id} className="flex justify-between gap-2 py-2">
              <span><span className="font-medium">{h.title}</span> <span className="text-muted-foreground">· {new Date(h.date).toLocaleDateString("ru-RU")}</span></span>
              <span className="shrink-0 text-muted-foreground">{h.overall != null ? `★ ${h.overall}` : "—"} · {h.feedback} отз.</span>
            </div>
          ))}
        </div>
      )}
      {p.skills.length > 0 && (
        <>
          <h3 className="mt-4 font-semibold">Навыки, которые я применял</h3>
          <div className="mt-1 divide-y divide-border text-sm">
            {p.skills.map((k) => <div key={k.skill_id} className="flex justify-between py-1.5"><span>{k.title}</span><span className="text-muted-foreground">{k.sessions_count}× · {k.avg_score || "—"}</span></div>)}
          </div>
        </>
      )}
    </div>
  );
}
