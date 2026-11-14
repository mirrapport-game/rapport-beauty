import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Scores } from "@/lib/feedback";

export type SkillPoint = { at: string; source: "assessment" | "session" | "solo"; sourceId: string; scores: Scores; testId?: string };

/** All 6-scale results of the user in time order: entry test, game sessions, AI trainings. */
export function useSkillHistory(userId: string | null | undefined, reloadKey: unknown = 0) {
  const [points, setPoints] = useState<SkillPoint[] | null>(null);
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [a, r, s] = await Promise.all([
        supabase.from("assessment_results").select("id, test_id, scores, completed_at").eq("user_id", userId),
        supabase.from("session_results").select("session_id, scores_avg, completed_at, completed").eq("user_id", userId).eq("completed", true),
        supabase.from("solo_sessions").select("id, solo_feedback(scores, created_at)").eq("user_id", userId),
      ]);
      const pts: SkillPoint[] = [
        ...(a.data ?? []).map((x) => ({ at: x.completed_at, source: "assessment" as const, sourceId: x.id, testId: x.test_id, scores: x.scores as Scores })),
        ...(r.data ?? []).filter((x) => x.completed_at).map((x) => ({ at: x.completed_at!, source: "session" as const, sourceId: x.session_id, scores: x.scores_avg as Scores })),
        ...(s.data ?? []).flatMap((x) =>
          ((x.solo_feedback ?? []) as { scores: unknown; created_at: string }[]).filter((f) => f.scores).map((f) => ({ at: f.created_at, source: "solo" as const, sourceId: x.id, scores: f.scores as Scores })),
        ),
      ];
      pts.sort((p, q) => p.at.localeCompare(q.at));
      setPoints(pts);
    })();
  }, [userId, reloadKey]);
  return points;
}
