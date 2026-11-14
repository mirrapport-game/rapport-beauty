import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { avgScores, longestStreak, mean, type Scores } from "@/lib/feedback";

export type HistoryRow = { session_id: string; title: string; date: string; role: string | null; overall: number | null; feedback: number };
export type Achievement = { id: string; title: string; description: string | null; icon: string; earned_at?: string | undefined };

/** Player's progress across all sessions: radar averages, history, achievements, streak. */
export function useProgress(userId: string | undefined) {
  const [state, setState] = useState({
    radar: {} as Scores, overall: null as number | null, sessions: 0, streak: 0,
    history: [] as HistoryRow[], achievements: [] as Achievement[], loaded: false,
    skills: [] as { skill_id: string; title: string; sessions_count: number; avg_score: number }[],
  });
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [res, parts, ach, mine, sp] = await Promise.all([
        supabase.from("session_results").select("session_id,scores_avg,overall_avg,feedback_count,completed").eq("user_id", userId),
        supabase.from("session_participants").select("id,session_id,joined_at").eq("user_id", userId),
        supabase.from("achievements").select("*").order("id"),
        supabase.from("user_achievements").select("achievement_id,earned_at").eq("user_id", userId),
        supabase.from("skill_progress").select("skill_id,sessions_count,avg_score").eq("user_id", userId),
      ]);
      const pRows = parts.data ?? [];
      const sids = pRows.map((p) => p.session_id);
      const [sess, sk] = await Promise.all([
        sids.length ? supabase.from("game_sessions").select("id,title,created_at").in("id", sids) : Promise.resolve({ data: [] }),
        (sp.data ?? []).length ? supabase.from("cards").select("id,title").in("id", (sp.data ?? []).map((s) => s.skill_id)) : Promise.resolve({ data: [] }),
      ]);
      const results = res.data ?? [];
      const history: HistoryRow[] = pRows.map((p) => {
        const s = (sess.data ?? []).find((x) => x.id === p.session_id);
        const r = results.find((x) => x.session_id === p.session_id);
        return { session_id: p.session_id, title: s?.title ?? "Сессия", date: s?.created_at ?? p.joined_at, role: null,
          overall: r?.overall_avg != null ? Number(r.overall_avg) : null, feedback: r?.feedback_count ?? 0 };
      }).sort((a, b) => b.date.localeCompare(a.date));
      const earned = new Map((mine.data ?? []).map((m) => [m.achievement_id, m.earned_at]));
      setState({
        radar: avgScores(results.map((r) => r.scores_avg as Scores)),
        overall: mean(results.map((r) => (r.overall_avg != null ? Number(r.overall_avg) : null))),
        sessions: results.filter((r) => r.completed).length,
        streak: longestStreak(pRows.map((p) => p.joined_at)),
        history,
        achievements: (ach.data ?? []).map((a) => ({ ...a, earned_at: earned.get(a.id) })),
        skills: (sp.data ?? []).map((s) => ({ ...s, avg_score: Number(s.avg_score), title: (sk.data ?? []).find((c) => c.id === s.skill_id)?.title ?? s.skill_id })),
        loaded: true,
      });
    })();
  }, [userId]);
  return state;
}
